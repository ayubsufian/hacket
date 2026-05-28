// =============================================================================
// HackET — System Deadline Scheduler (UC0026)
// =============================================================================

const prisma = require('../config/database');
const eventBus = require('../utils/eventBus');
const { redisClient } = require('../config/redis');
const eventsService = require('../services/events/events.service');

class SchedulerWorker {
  constructor() {
    this.interval = null;
    this.POLL_RATE_MS = 1000 * 60; // Every 1 minute for demo
    // Track notified hackathons with timestamps (auto-prunes to prevent memory leak)
    this.notifiedHackathons = new Map(); // hackathonId -> timestamp
    this.blockedCompletionHackathons = new Map(); // hackathonId -> timestamp
    this.PRUNE_AFTER_MS = 48 * 60 * 60 * 1000; // Prune after 48 hours
    this.BLOCKED_COMPLETION_RETRY_MS = 5 * 60 * 1000;
  }

  start() {
    console.log('[Scheduler] Starting system clock...');
    this.interval = setInterval(() => this._tick(), this.POLL_RATE_MS);
    // Run immediately on boot
    this._tick();
  }

  async _tick() {
    const now = new Date();
    await this._processStateTransitions(now);
    await this._checkDeadlines(now);
  }

  async _processStateTransitions(now) {
    try {
      const activeHackathons = await prisma.hackathon.findMany({
        where: {
          status: { in: ['UPCOMING', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'IN_PROGRESS', 'JUDGING'] }
        },
        select: {
          id: true,
          status: true,
          registrationStart: true,
          registrationEnd: true,
          eventStart: true,
          submissionDeadline: true,
          judgingEnd: true,
          requiredReviewsPerSubmission: true
        }
      });

      let stateChanged = false;

      for (const h of activeHackathons) {
        let newStatus = null;

        if (h.status === 'UPCOMING') {
          if (h.registrationStart && now >= h.registrationStart) {
            newStatus = 'REGISTRATION_OPEN';
          }
        }

        if (h.status === 'REGISTRATION_OPEN' || newStatus === 'REGISTRATION_OPEN') {
          const cutoff = h.registrationEnd || h.eventStart;
          if (cutoff && now >= cutoff) {
            newStatus = 'REGISTRATION_CLOSED';
          }
        } 
        
        if (h.status === 'REGISTRATION_CLOSED' || newStatus === 'REGISTRATION_CLOSED') {
          if (h.eventStart && now >= h.eventStart) {
            newStatus = 'IN_PROGRESS';
          }
        }

        if (h.status === 'IN_PROGRESS' || newStatus === 'IN_PROGRESS') {
          if (h.submissionDeadline && now >= h.submissionDeadline) {
            newStatus = 'JUDGING';
          }
        }

        if (h.status === 'JUDGING' || newStatus === 'JUDGING') {
          if (h.judgingEnd && now >= h.judgingEnd) {
            newStatus = 'COMPLETED';
          }
        }

        if (newStatus && newStatus !== h.status) {
          if (newStatus === 'COMPLETED') {
            const lastBlockedAt = this.blockedCompletionHackathons.get(h.id);
            if (lastBlockedAt && Date.now() - lastBlockedAt < this.BLOCKED_COMPLETION_RETRY_MS) {
              continue;
            }

            try {
              if (h.status !== 'JUDGING') {
                const activeJudges = await prisma.staffAssignment.count({
                  where: {
                    hackathonId: h.id,
                    staffRole: 'JUDGE',
                    isActive: true,
                  },
                });
                console.log(`[Scheduler] Auto-transitioning hackathon ${h.id} from ${h.status} to JUDGING before completion checks.`);
                await prisma.hackathon.update({
                  where: { id: h.id },
                  data: {
                    status: 'JUDGING',
                    judgingPhase: 'IN_PROGRESS',
                    effectiveRequiredReviewsPerSubmission: Math.min(
                      h.requiredReviewsPerSubmission || 3,
                      activeJudges,
                    ),
                  }
                });
                eventBus.emit('audit:log', {
                  actorId: null,
                  action: 'STATUS_CHANGE',
                  entity: 'hackathon',
                  entityId: h.id,
                  details: { status: 'JUDGING', reason: 'Automated submission deadline cutoff reached' }
                });
              }

              console.log(`[Scheduler] Attempting completion for hackathon ${h.id} after judging deadline.`);
              await eventsService.completeEvent(h.id, null, { source: 'SCHEDULER' });
              this.blockedCompletionHackathons.delete(h.id);
              stateChanged = true;
            } catch (err) {
              if (err.statusCode === 409) {
                this.blockedCompletionHackathons.set(h.id, Date.now());
                console.warn(`[Scheduler] Hackathon ${h.id} remains in JUDGING: ${err.message}`);
                continue;
              }
              throw err;
            }
            continue;
          }

          console.log(`[Scheduler] Auto-transitioning hackathon ${h.id} from ${h.status} to ${newStatus}`);
          const transitionData = { status: newStatus };
          if (newStatus === 'JUDGING') {
            const activeJudges = await prisma.staffAssignment.count({
              where: {
                hackathonId: h.id,
                staffRole: 'JUDGE',
                isActive: true,
              },
            });
            transitionData.judgingPhase = 'IN_PROGRESS';
            transitionData.effectiveRequiredReviewsPerSubmission = Math.min(
              h.requiredReviewsPerSubmission || 3,
              activeJudges,
            );
          }
          await prisma.hackathon.update({
            where: { id: h.id },
            data: transitionData
          });
          eventBus.emit('audit:log', {
            actorId: 'SYSTEM_SCHEDULER',
            action: 'STATUS_CHANGE',
            entity: 'hackathon',
            entityId: h.id,
            details: { status: newStatus, reason: 'Automated schedule cutoff reached' }
          });
          stateChanged = true;
        }
      }

      if (stateChanged) {
        await redisClient.del('events:active');
      }
    } catch (err) {
      console.error('[Scheduler] Error processing state transitions:', err);
    }
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      console.log('[Scheduler] System clock stopped.');
    }
  }

  async _checkDeadlines(now) {
    try {
      // Look 24 hours ahead
      const targetTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Find hackathons where submissionDeadline is within the next 24 hours
      // but hasn't passed yet.
      const hackathons = await prisma.hackathon.findMany({
        where: {
          submissionDeadline: {
            gt: now,
            lte: targetTime,
          },
          status: {
            in: ['REGISTRATION_OPEN', 'IN_PROGRESS', 'JUDGING']
          }
        },
        select: { id: true, title: true, submissionDeadline: true },
      });

      for (const hackathon of hackathons) {
        if (!this.notifiedHackathons.has(hackathon.id)) {
          console.log(`[Scheduler] Critical deadline detected for: ${hackathon.title}`);
          this.notifiedHackathons.set(hackathon.id, Date.now());
          
          eventBus.emit('deadline:upcoming', {
            hackathonId: hackathon.id,
            hackathonTitle: hackathon.title,
            deadline: hackathon.submissionDeadline,
            deadlineType: 'SUBMISSION_24HR'
          });
        }
      }

      // Auto-prune stale entries to prevent memory leak
      const cutoff = Date.now() - this.PRUNE_AFTER_MS;
      for (const [id, timestamp] of this.notifiedHackathons) {
        if (timestamp < cutoff) {
          this.notifiedHackathons.delete(id);
        }
      }
      for (const [id, timestamp] of this.blockedCompletionHackathons) {
        if (timestamp < cutoff) {
          this.blockedCompletionHackathons.delete(id);
        }
      }
    } catch (err) {
      console.error('[Scheduler] Error checking deadlines:', err);
    }
  }
}

module.exports = new SchedulerWorker();
