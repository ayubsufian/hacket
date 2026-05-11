const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');

class MentorshipService {
  /**
   * Request a mentor (Participant action)
   */
  async requestMentor(requesterId, mentorId, teamId, message) {
    // 1. Verify mentor exists and has a profile
    const mentorUser = await prisma.user.findUnique({
      where: { id: mentorId },
      include: { profile: true },
    });

    if (!mentorUser || mentorUser.role !== 'MENTOR') {
      throw new AppError('Mentor not found or invalid role.', 404);
    }

    // 2. AF2: Check daily interaction limits
    const maxDaily = mentorUser.profile?.mentorMaxDailyInteractions;
    if (maxDaily) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const todaysInteractionsCount = await prisma.mentorInteraction.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
          mentorAssignment: {
            mentorId: mentorId,
          },
        },
      });

      if (todaysInteractionsCount >= maxDaily) {
        throw new AppError('Mentor is currently unavailable. Try another mentor or send an asynchronous message.', 400);
      }
    }

    // 3. Create MentorRequest
    const request = await prisma.mentorRequest.create({
      data: {
        requesterId,
        mentorId,
        teamId,
        message,
        status: 'PENDING',
      },
    });

    return request;
  }

  /**
   * Log an interaction (Mentor action)
   */
  async logInteraction(mentorId, teamId, durationMinutes, notes) {
    // 1. AF1: Check if an assignment already exists
    let assignment = await prisma.mentorAssignment.findFirst({
      where: { mentorId, teamId },
    });

    // 2. If it doesn't exist (interaction outside app), create it on the fly
    if (!assignment) {
      // Ensure team exists
      const teamExists = await prisma.team.findUnique({
        where: { id: teamId },
      });
      if (!teamExists) {
        throw new AppError('Team not found.', 404);
      }

      assignment = await prisma.mentorAssignment.create({
        data: {
          mentorId,
          teamId,
          isActive: true,
        },
      });
    }

    // 3. Log the interaction
    const interaction = await prisma.mentorInteraction.create({
      data: {
        mentorAssignmentId: assignment.id,
        durationMinutes,
        notes,
      },
    });

    return interaction;
  }
}

module.exports = new MentorshipService();
