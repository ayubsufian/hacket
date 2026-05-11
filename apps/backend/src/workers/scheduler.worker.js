// =============================================================================
// HackET — System Deadline Scheduler (UC0026)
// =============================================================================

const prisma = require('../config/database');
const eventBus = require('../utils/eventBus');

class SchedulerWorker {
  constructor() {
    this.interval = null;
    this.POLL_RATE_MS = 1000 * 60; // Every 1 minute for demo
    // Keep track of notified hackathons to avoid duplicate triggers
    this.notifiedHackathons = new Set();
  }

  start() {
    console.log('[Scheduler] Starting system clock...');
    this.interval = setInterval(() => this._checkDeadlines(), this.POLL_RATE_MS);
    // Run immediately on boot
    this._checkDeadlines();
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      console.log('[Scheduler] System clock stopped.');
    }
  }

  async _checkDeadlines() {
    try {
      const now = new Date();
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
          this.notifiedHackathons.add(hackathon.id);
          
          eventBus.emit('deadline:upcoming', {
            hackathonId: hackathon.id,
            hackathonTitle: hackathon.title,
            deadline: hackathon.submissionDeadline,
            deadlineType: 'SUBMISSION_24HR'
          });
        }
      }
    } catch (err) {
      console.error('[Scheduler] Error checking deadlines:', err);
    }
  }
}

module.exports = new SchedulerWorker();
