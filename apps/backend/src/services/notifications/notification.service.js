// =============================================================================
// HackET — Notification Service
// In-app notifications, deadline triggers, and certificate issuance.
// =============================================================================

const prisma = require('../../config/database');
const eventBus = require('../../utils/eventBus');
const AppError = require('../../utils/AppError');
const { normalizePagination, buildPagination } = require('../../utils/pagination');
const localizationService = require('../localization/localization.service');

class NotificationService {
  constructor() {
    this._registerEventListeners();
  }

  /**
   * Create an in-app notification.
   */
  async create({ userId, type, title, message, metadata }) {
    const notif = await prisma.notification.create({
      data: { userId, type, title, message, metadata },
    });

    try {
      const { redisClient } = require('../../config/redis');
      const key = `notif:tray:${userId}`;
      await redisClient.lPush(key, JSON.stringify(notif));
      await redisClient.expire(key, 7 * 24 * 60 * 60); // 7 Days TTL
    } catch (err) {
      console.warn('[Notification] Redis lPush error:', err.message);
    }

    return notif;
  }

  /**
   * Send a notification to multiple users.
   */
  async broadcast({ userIds, type, title, message, metadata }) {
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type,
        title,
        message,
        metadata,
      })),
    });

    try {
      const { redisClient } = require('../../config/redis');
      const multi = redisClient.multi();
      userIds.forEach((userId) => {
        const key = `notif:tray:${userId}`;
        const notif = { userId, type, title, message, metadata, createdAt: new Date() };
        multi.lPush(key, JSON.stringify(notif));
        multi.expire(key, 7 * 24 * 60 * 60); // 7 Days TTL
      });
      await multi.exec();
    } catch (err) {
      console.warn('[Notification] Redis broadcast error:', err.message);
    }
  }

  /**
   * Get notifications for a user.
   */
  async getForUser(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
    const where = { userId };
    if (unreadOnly) where.isRead = false;

    const offset = (page - 1) * limit;

    const [data, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      data,
      unreadCount,
      pagination: buildPagination({ page, limit, total }),
    };
  }

  async getPreferences(userId) {
    return prisma.userNotificationPreference.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async updatePreferences(userId, data) {
    const preferences = await prisma.userNotificationPreference.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });

    eventBus.emit('audit:log', {
      actorId: userId,
      action: 'NOTIFICATION_PREFERENCES_UPDATED',
      entity: 'userNotificationPreference',
      entityId: preferences.id,
      details: data,
    });

    return preferences;
  }

  /**
   * Mark a notification as read.
   */
  async markAsRead(notificationId, userId) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      const AppError = require('../../utils/AppError');
      throw new AppError('Notification not found.', 404);
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllAsRead(userId) {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Issue a digital certificate/badge.
   */
  async issueCertificate({ userId, hackathonId, title, type = 'CERTIFICATE', awardTier = 'participation', issuedBy = null, metadata }) {
    const certificate = await prisma.certificate.upsert({
      where: {
        userId_hackathonId_type_awardTier: {
          userId,
          hackathonId,
          type,
          awardTier,
        },
      },
      update: {
        title,
        metadata,
        issuedBy,
      },
      create: { userId, hackathonId, title, type, awardTier, issuedBy, metadata },
    });

    // Notify user
    await this.create({
      userId,
      type: 'CERTIFICATE_ISSUED',
      title: 'New Certificate Issued! 🎉',
      message: `You have received a "${title}" certificate.`,
      metadata: { certificateId: certificate.id, hackathonId },
    });

    eventBus.emit('certificate:issued', {
      userId,
      hackathonId,
      certificateId: certificate.id,
    });

    return certificate;
  }

  // ─── Real-Time Transport ──────────────────────────────────────────────

  /**
   * Real SMTP Transport (Production Ready via Nodemailer)
   */
  async _sendRealTimeEmail(userId, email, title, message, retryCount = 0) {
    try {
      const nodemailer = require('nodemailer');

      // 2026 Enterprise Standard: Brevo (Sendinblue) Transactional SMTP
      // This is explicitly configured for Brevo to handle programmatic bulk bursts safely.
      // Ensure SMTP_USER and SMTP_PASS are set in your .env file from your Brevo account.
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
        port: process.env.SMTP_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS, 
        },
      });

      const mailOptions = {
        from: `"HackET Platform" <${process.env.SMTP_FROM || 'no-reply@hacket.com'}>`, // Best practice: use a verified custom domain
        to: email,
        subject: title,
        text: message, // Can be updated to `html` to support rich templates
      };

      // Only attempt to send if credentials exist, otherwise fallback to logging
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        await transporter.sendMail(mailOptions);
        console.log(`[Email Transport] Successfully delivered to ${email}: ${title}`);
      } else {
        console.log(`[Email Transport - MOCK MODE] Successfully delivered to ${email}: ${title} (Configure SMTP_USER/PASS in .env to send real emails)`);
      }

    } catch (err) {
      console.warn(`[Email Transport] Failed to deliver to ${email}. Reason: ${err.message}`);
      
      if (retryCount < 3) {
        const backoffTime = Math.pow(2, retryCount) * 1000;
        console.log(`[Email Transport] Retrying delivery to ${email} in ${backoffTime}ms...`);
        // We do not await this setTimeout to prevent blocking the current execution thread
        setTimeout(() => {
          this._sendRealTimeEmail(userId, email, title, message, retryCount + 1).catch(() => {});
        }, backoffTime);
      } else {
        console.error(`[Email Transport] CRITICAL: Delivery to ${email} permanently failed after 3 retries.`);
      }
    }
  }

  // ─── Event Listeners ──────────────────────────────────────────────────

  _registerEventListeners() {
    // Mass Broadcast Pipeline (COMMUNICATIONS/SPONSOR)
    eventBus.on('notification:broadcast_created', async ({ broadcastId, hackathonId }) => {
      try {
        const broadcast = await prisma.notificationBroadcast.findUnique({
          where: { id: broadcastId }
        });

        if (!broadcast || broadcast.status === 'CANCELLED') return;

        await prisma.notificationBroadcast.update({
          where: { id: broadcastId },
          data: { status: 'RUNNING' },
        });

        // Fetch all active participants in the hackathon, including their notification preferences
        const members = await prisma.teamMember.findMany({
          where: { team: { hackathonId } },
          select: { 
            userId: true, 
            user: { 
              select: { 
                email: true,
                notificationPreference: true,
                profile: { select: { preferredLocale: true } }
              } 
            } 
          },
        });

        // Deduplicate users and filter based on preferences
        const uniqueUsers = new Map();
        for (const m of members) {
          uniqueUsers.set(m.userId, {
            email: m.user.email,
            wantsEmail: m.user.notificationPreference ? m.user.notificationPreference.email : true,
            locale: m.user.profile?.preferredLocale || 'en'
          });
        }

        const usersArray = Array.from(uniqueUsers.entries());
        if (usersArray.length === 0) {
          await prisma.notificationBroadcast.update({
            where: { id: broadcastId },
            data: { status: 'SENT', sentAt: new Date() },
          });
          return;
        }

        const dictEn = await localizationService.getDictionary('en');
        const dictAm = await localizationService.getDictionary('am');
        const dicts = { en: dictEn, am: dictAm };

        // 2026 Standard 1: Bulk Database Insert (In-App notifications always trigger)
        const notificationPayloads = usersArray.map(([userId, data]) => {
          const dict = dicts[data.locale] || dicts.en;
          let localizedTitle = broadcast.title;
          
          if (broadcast.type === 'SCORE_PUBLISHED') {
             localizedTitle = dict['notification.title.score_published'] || broadcast.title;
          }
          
          return {
            userId,
            type: broadcast.type,
            title: localizedTitle,
            message: broadcast.message,
            metadata: { broadcastId, hackathonId },
            broadcastId,
            isRead: false
          };
        });

        await prisma.notification.createMany({
          data: notificationPayloads,
          skipDuplicates: true
        });

        // 2026 Standard 2: Concurrent Email Dispatch WITH Preference Filtering
        const emailRecipients = usersArray.filter(([userId, data]) => data.wantsEmail);
        
        const CHUNK_SIZE = 50;
        for (let i = 0; i < emailRecipients.length; i += CHUNK_SIZE) {
          const chunk = emailRecipients.slice(i, i + CHUNK_SIZE);
          
          const emailPromises = chunk.map(([userId, data]) => {
            let localizedTitle = broadcast.title;
            if (broadcast.type === 'SCORE_PUBLISHED') {
               const dict = dicts[data.locale] || dicts.en;
               localizedTitle = dict['notification.title.score_published'] || broadcast.title;
            }
            return this._sendRealTimeEmail(userId, data.email, localizedTitle, broadcast.message)
              .catch(err => console.error(`[Broadcast] Failed to email ${data.email}:`, err.message));
          });
          
          await Promise.allSettled(emailPromises);
        }

        await prisma.notificationBroadcast.update({
          where: { id: broadcastId },
          data: { status: 'SENT', sentAt: new Date() },
        });

        console.log(`[Notification Service] Successfully processed broadcast ${broadcastId} for ${usersArray.length} users (${emailRecipients.length} emails sent).`);
      } catch (err) {
        await prisma.notificationBroadcast.update({
          where: { id: broadcastId },
          data: { status: 'FAILED', error: { message: err.message } },
        }).catch(() => {});
        console.error('[Notification Service] Failed to process broadcast:', err);
      }
    });

    // Deadline Upcoming (UC0026)
    eventBus.on('deadline:upcoming', async ({ hackathonId, hackathonTitle, deadline, deadlineType }) => {
      try {
        const members = await prisma.teamMember.findMany({
          where: { team: { hackathonId } },
          select: { userId: true, user: { select: { email: true, profile: { select: { preferredLocale: true } } } } },
        });

        const uniqueUsers = new Map();
        for (const m of members) uniqueUsers.set(m.userId, { email: m.user.email, locale: m.user.profile?.preferredLocale || 'en' });

        for (const [userId, { email, locale }] of uniqueUsers.entries()) {
          const dict = await localizationService.getDictionary(locale);
          const title = dict['notification.title.deadline_warning'] || `🚨 Action Required: 24 Hours Left!`;
          const message = `The submission deadline for "${hackathonTitle}" is strictly closing in 24 hours.`;
          // 1. Create In-App Notification (Always)
          await this.create({
            userId,
            type: 'DEADLINE_WARNING',
            title,
            message,
            metadata: { hackathonId, deadline }
          });

          // 2. Fetch User Preferences (AF1)
          const prefs = await prisma.userNotificationPreference.findUnique({
            where: { userId }
          });

          // 3. Trigger Real-Time Transport if opted in
          if (!prefs || prefs.email === true) {
            this._sendRealTimeEmail(userId, email, title, message);
          } else {
            console.log(`[Notification] User ${userId} opted out of emails. Bypassing transport.`);
          }
        }
      } catch (err) {
        console.error('[Notification] Failed to process deadline:upcoming:', err.message);
      }
    });

    // Team invitation
    eventBus.on('team:invited', async ({ teamId, senderId, receiverId }) => {
      try {
        const team = await prisma.team.findUnique({
          where: { id: teamId },
          select: { name: true },
        });

        await this.create({
          userId: receiverId,
          type: 'TEAM_INVITE',
          title: 'New Team Invitation',
          message: `You've been invited to join team "${team?.name}".`,
          metadata: { teamId, senderId },
        });
      } catch (err) {
        console.error('[Notification] Failed to process team:invited:', err.message);
      }
    });

    // Scores published (UC0027 - Release Feedback)
    eventBus.on('scores:published', async ({ hackathonId, title, releasedBy }) => {
      try {
        console.log(`[Notification] Processing scores:published for ${hackathonId}`);
        // Create an official broadcast record to piggyback on the dual-delivery pipeline
        const broadcast = await prisma.notificationBroadcast.create({
          data: {
            hackathonId,
            title: `🏆 Final Scores & Feedback Released!`,
            message: `The final scores and judge feedback for "${title}" are now available on your dashboard.`,
            type: 'SCORE_PUBLISHED',
            createdBy: releasedBy
          }
        });

        // Trigger the background pipeline exactly like a manual announcement
        eventBus.emit('notification:broadcast_created', { 
          broadcastId: broadcast.id, 
          hackathonId 
        });

      } catch (err) {
        console.error('[Notification] Failed to process scores:published:', err.message);
      }
    });
  }

  /**
   * Create a broadcast announcement for a hackathon.
   * Dispatches notifications to all active participants in the background.
   */
  async createBroadcast({ hackathonId, title, message, type, sentBy }) {
    // Create the broadcast record
    const broadcast = await prisma.notificationBroadcast.create({
      data: {
        hackathonId,
        title,
        message,
        type,
        createdBy: sentBy
      }
    });

    // Fire event to allow background worker to generate individual notifications
    // This prevents the HTTP request from hanging while inserting potentially thousands of rows
    eventBus.emit('notification:broadcast_created', { broadcastId: broadcast.id, hackathonId });

    return broadcast;
  }

  async listBroadcasts(hackathonId, query = {}) {
    const { page, limit, skip } = normalizePagination(query, { defaultLimit: 20, maxLimit: 100 });
    const where = { hackathonId };
    if (query.status) where.status = query.status;

    const [total, data] = await prisma.$transaction([
      prisma.notificationBroadcast.count({ where }),
      prisma.notificationBroadcast.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdByUser: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } },
          _count: { select: { notifications: true } },
        },
      }),
    ]);

    return { data, pagination: buildPagination({ page, limit, total }) };
  }

  async cancelBroadcast({ broadcastId, actor, reason }) {
    const broadcast = await prisma.notificationBroadcast.findUnique({
      where: { id: broadcastId },
      include: { hackathon: { select: { organizerId: true } } },
    });
    if (!broadcast) throw new AppError('Broadcast not found.', 404);
    if (!['QUEUED', 'RUNNING'].includes(broadcast.status)) {
      throw new AppError('Only queued or running broadcasts can be cancelled.', 409);
    }

    if (actor.role !== 'ADMIN' && broadcast.hackathon?.organizerId !== actor.id) {
      const staff = await prisma.staffAssignment.findFirst({
        where: {
          userId: actor.id,
          hackathonId: broadcast.hackathonId,
          isActive: true,
          staffRole: { in: ['CO_ORGANIZER', 'COMMUNICATIONS'] },
        },
      });
      if (!staff) throw new AppError('You do not have access to cancel this broadcast.', 403);
    }

    const updated = await prisma.notificationBroadcast.update({
      where: { id: broadcastId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason || null,
      },
    });

    eventBus.emit('audit:log', {
      actorId: actor.id,
      action: 'BROADCAST_CANCELLED',
      entity: 'notificationBroadcast',
      entityId: broadcastId,
      details: { reason: reason || null },
    });

    return updated;
  }
}

module.exports = new NotificationService();
