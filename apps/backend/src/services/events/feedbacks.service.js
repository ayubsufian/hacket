const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const eventBus = require('../../utils/eventBus');
const { normalizePagination, buildPagination } = require('../../utils/pagination');
const { createObjectCsvStringifier } = require('csv-writer');

class FeedbacksService {
  async getMyFeedback(userId, hackathonId) {
    return prisma.eventFeedback.findUnique({
      where: { userId_hackathonId: { userId, hackathonId } },
    });
  }

  async listForHackathon(hackathonId, query = {}, viewer) {
    const { page, limit, skip } = normalizePagination(query, { defaultLimit: 25, maxLimit: 100 });
    const where = { hackathonId };

    const [total, data, summary] = await prisma.$transaction([
      prisma.eventFeedback.count({ where }),
      prisma.eventFeedback.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      this._summaryQuery(hackathonId),
    ]);

    this._auditViewed(viewer, hackathonId, { page, limit });
    return {
      data,
      summary: this._formatSummary(summary),
      pagination: buildPagination({ page, limit, total }),
    };
  }

  async getSummary(hackathonId, viewer) {
    const summary = await this._summaryQuery(hackathonId);
    this._auditViewed(viewer, hackathonId, { summaryOnly: true });
    return this._formatSummary(summary);
  }

  async exportCsv(hackathonId, viewer) {
    const feedbacks = await prisma.eventFeedback.findMany({
      where: { hackathonId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            email: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'createdAt', title: 'Submitted At' },
        { id: 'email', title: 'User Email' },
        { id: 'name', title: 'Name' },
        { id: 'orgRating', title: 'Organization Rating' },
        { id: 'rulesRating', title: 'Rules Rating' },
        { id: 'judgingRating', title: 'Judging Rating' },
        { id: 'comment', title: 'Comment' },
      ],
    });

    this._auditViewed(viewer, hackathonId, { export: 'csv' });
    return csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(
      feedbacks.map((feedback) => ({
        createdAt: feedback.createdAt.toISOString(),
        email: feedback.user.email,
        name: [feedback.user.profile?.firstName, feedback.user.profile?.lastName].filter(Boolean).join(' '),
        orgRating: feedback.orgRating,
        rulesRating: feedback.rulesRating,
        judgingRating: feedback.judgingRating,
        comment: feedback.comment || '',
      }))
    );
  }

  async submitRating(userId, hackathonId, orgRating, rulesRating, judgingRating, comment) {
    // Check if feedback already submitted
    const existingFeedback = await prisma.eventFeedback.findFirst({
      where: { userId, hackathonId }
    });

    if (existingFeedback) {
      throw new AppError('You have already submitted feedback for this event.', 400);
    }

    // 1. AF2: Check if rating period is closed
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
      select: { feedbackDeadline: true, eventEnd: true },
    });

    if (!hackathon) {
      throw new AppError('Hackathon not found.', 404);
    }

    const deadline = hackathon.feedbackDeadline || hackathon.eventEnd;
    
    if (new Date() > new Date(deadline)) {
      throw new AppError('The rating period for this event is closed.', 400);
    }

    // 2. Insert rating
    const feedback = await prisma.eventFeedback.create({
      data: {
        userId,
        hackathonId,
        orgRating,
        rulesRating,
        judgingRating,
        comment,
      },
    });

    // Notify organizer
    eventBus.emit('feedback:submitted', { hackathonId, userId, feedbackId: feedback.id });

    return feedback;
  }

  _summaryQuery(hackathonId) {
    return prisma.eventFeedback.aggregate({
      where: { hackathonId },
      _count: { id: true },
      _avg: {
        orgRating: true,
        rulesRating: true,
        judgingRating: true,
      },
    });
  }

  _formatSummary(summary) {
    return {
      total: summary._count.id,
      averages: {
        orgRating: Number((summary._avg.orgRating || 0).toFixed(2)),
        rulesRating: Number((summary._avg.rulesRating || 0).toFixed(2)),
        judgingRating: Number((summary._avg.judgingRating || 0).toFixed(2)),
      },
    };
  }

  _auditViewed(viewer, hackathonId, details = {}) {
    eventBus.emit('audit:log', {
      actorId: viewer.id,
      action: 'FEEDBACK_VIEWED',
      entity: 'hackathon',
      entityId: hackathonId,
      details,
    });
  }
}

module.exports = new FeedbacksService();
