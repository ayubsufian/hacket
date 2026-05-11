const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const eventBus = require('../../utils/eventBus');

class FeedbacksService {
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
}

module.exports = new FeedbacksService();
