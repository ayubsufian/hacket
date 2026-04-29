// =============================================================================
// HackET — Notification Service
// In-app notifications, deadline triggers, and certificate issuance.
// =============================================================================

const prisma = require('../../config/database');
const eventBus = require('../../utils/eventBus');

class NotificationService {
  constructor() {
    this._registerEventListeners();
  }

  /**
   * Create an in-app notification.
   */
  async create({ userId, type, title, message, metadata }) {
    return prisma.notification.create({
      data: { userId, type, title, message, metadata },
    });
  }

  /**
   * Send a notification to multiple users.
   */
  async broadcast({ userIds, type, title, message, metadata }) {
    return prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type,
        title,
        message,
        metadata,
      })),
    });
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
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
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
  async issueCertificate({ userId, hackathonId, title, type, metadata }) {
    const certificate = await prisma.certificate.create({
      data: { userId, hackathonId, title, type, metadata },
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

  // ─── Event Listeners ──────────────────────────────────────────────────

  _registerEventListeners() {
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

    // Scores updated
    eventBus.on('scores:updated', async ({ hackathonId }) => {
      try {
        const hackathon = await prisma.hackathon.findUnique({
          where: { id: hackathonId },
          select: { title: true },
        });

        // Notify all participants
        const members = await prisma.teamMember.findMany({
          where: { team: { hackathonId } },
          select: { userId: true },
        });

        const userIds = [...new Set(members.map((m) => m.userId))];

        await this.broadcast({
          userIds,
          type: 'SCORE_PUBLISHED',
          title: 'Scores Updated',
          message: `Scores have been updated for "${hackathon?.title}". Check the leaderboard!`,
          metadata: { hackathonId },
        });
      } catch (err) {
        console.error('[Notification] Failed to process scores:updated:', err.message);
      }
    });
  }
}

module.exports = new NotificationService();
