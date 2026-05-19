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

    if (!mentorUser) {
      throw new AppError('Mentor not found.', 404);
    }

    // Ensure team exists and get its hackathonId
    const team = await prisma.team.findUnique({
      where: { id: teamId }
    });
    
    if (!team) {
      throw new AppError('Team not found.', 404);
    }

    // 2026 Security: Verify the requested mentor is actually assigned as a MENTOR for this hackathon
    const staffAssignment = await prisma.staffAssignment.findFirst({
      where: {
        userId: mentorId,
        hackathonId: team.hackathonId,
        staffRole: 'MENTOR',
        isActive: true
      }
    });

    if (!staffAssignment) {
      throw new AppError('The requested user is not assigned as a Mentor for this hackathon.', 403);
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

    // Ensure team exists
    const teamExists = await prisma.team.findUnique({
      where: { id: teamId },
    });
    
    if (!teamExists) {
      throw new AppError('Team not found.', 404);
    }

    // 2026 Security: Ensure the user is actually assigned as a MENTOR for this hackathon
    const staffAssignment = await prisma.staffAssignment.findFirst({
      where: {
        userId: mentorId,
        hackathonId: teamExists.hackathonId,
        staffRole: 'MENTOR',
        isActive: true
      }
    });

    if (!staffAssignment) {
      throw new AppError('Forbidden. You must be assigned as a MENTOR to log interactions for this event.', 403);
    }

    // 2. If it doesn't exist (interaction outside app), create it on the fly
    if (!assignment) {
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

  /**
   * Get all incoming mentor requests for the authenticated mentor.
   * @param {string} mentorId
   */
  async getIncomingRequests(mentorId) {
    const requests = await prisma.mentorRequest.findMany({
      where: { mentorId },
      orderBy: { createdAt: 'desc' },
      include: {
        requester: {
          select: {
            id: true,
            email: true,
            profile: {
              select: { firstName: true, lastName: true, skills: true }
            }
          }
        },
        team: {
          select: { id: true, name: true, description: true }
        }
      }
    });

    return requests;
  }

  /**
   * Accept or decline a mentor request.
   * If accepted, automatically creates a MentorAssignment.
   * @param {string} mentorId
   * @param {string} requestId
   * @param {string} status - 'ACCEPTED' or 'DECLINED'
   */
  async respondToRequest(mentorId, requestId, status) {
    const request = await prisma.mentorRequest.findUnique({
      where: { id: requestId },
      include: { team: true }
    });

    if (!request) {
      throw new AppError('Mentor request not found.', 404);
    }

    if (request.mentorId !== mentorId) {
      throw new AppError('Forbidden. This request is not addressed to you.', 403);
    }

    if (request.status !== 'PENDING') {
      throw new AppError(`This request has already been ${request.status.toLowerCase()}.`, 400);
    }

    // Update the request status
    const updated = await prisma.mentorRequest.update({
      where: { id: requestId },
      data: { status }
    });

    // If accepted, automatically create a MentorAssignment (idempotent via upsert)
    if (status === 'ACCEPTED' && request.teamId) {
      await prisma.mentorAssignment.upsert({
        where: {
          mentorId_teamId: {
            mentorId,
            teamId: request.teamId
          }
        },
        update: { isActive: true },
        create: {
          mentorId,
          teamId: request.teamId,
          isActive: true
        }
      });
    }

    return updated;
  }

  /**
   * Get all teams currently assigned to this mentor.
   * @param {string} mentorId
   */
  async getAssignments(mentorId) {
    const assignments = await prisma.mentorAssignment.findMany({
      where: { mentorId, isActive: true },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            description: true,
            hackathon: {
              select: { id: true, title: true, status: true }
            },
            members: {
              select: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    profile: { select: { firstName: true, lastName: true } }
                  }
                },
                role: true
              }
            }
          }
        },
        interactions: {
          orderBy: { createdAt: 'desc' },
          take: 5, // Show last 5 interactions
          select: {
            id: true,
            notes: true,
            durationMinutes: true,
            createdAt: true
          }
        }
      }
    });

    return assignments;
  }
}

module.exports = new MentorshipService();
