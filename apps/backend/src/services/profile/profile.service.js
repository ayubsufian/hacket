// =============================================================================
// HackET — Profile Service
// =============================================================================

const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const eventBus = require('../../utils/eventBus');
const { redisClient } = require('../../config/redis');

class ProfileService {
  /**
   * Get user profile along with current submissions and past participation.
   */
  async getProfileWithHistory(userId) {
    const cacheKey = `profile:${userId}`;
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (err) {
      console.warn('[Profile] Redis cache get error:', err.message);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new AppError('User not found.', 404);
    }

    // Fetch team memberships to determine participation history
    const memberships = await prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          include: {
            hackathon: {
              select: {
                id: true,
                title: true,
                status: true,
                eventEnd: true,
              },
            },
            submission: {
              select: {
                id: true,
                status: true,
                title: true,
              },
            },
          },
        },
      },
    });

    const currentSubmissions = [];
    const pastParticipation = [];

    memberships.forEach((m) => {
      const hackathon = m.team.hackathon;
      if (!hackathon) return;

      const isCompleted = hackathon.status === 'COMPLETED' || hackathon.status === 'ARCHIVED';
      
      const record = {
        hackathonId: hackathon.id,
        eventName: hackathon.title,
        date: hackathon.eventEnd,
        role: m.role,
        teamName: m.team.name,
      };

      if (isCompleted) {
        pastParticipation.push(record);
      } else {
        currentSubmissions.push({
          ...record,
          submissionStatus: m.team.submission ? m.team.submission.status : 'NOT_STARTED',
          submissionTitle: m.team.submission ? m.team.submission.title : null,
        });
      }
    });

    // Remove sensitive data
    const { password, ...safeUser } = user;

    const result = {
      user: safeUser,
      currentSubmissions,
      pastParticipation,
    };

    try {
      await redisClient.set(cacheKey, JSON.stringify(result), { EX: 60 * 15 }); // 15 min cache
    } catch (err) {
      console.warn('[Profile] Redis cache set error:', err.message);
    }

    return result;
  }

  /**
   * Update the user profile details.
   */
  async updateProfile(userId, updateData) {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new AppError('Profile not found.', 404);
    }

    const updatedProfile = await prisma.userProfile.update({
      where: { userId },
      data: updateData,
    });

    eventBus.emit('audit:log', {
      actorId: userId,
      action: 'UPDATE',
      entity: 'userProfile',
      entityId: profile.id,
    });

    try {
      await redisClient.del(`profile:${userId}`);
    } catch (err) {
      console.warn('[Profile] Redis cache del error:', err.message);
    }

    return updatedProfile;
  }

  /**
   * Get specific details for a past participation item.
   */
  async getParticipationDetails(userId, hackathonId) {
    const membership = await prisma.teamMember.findFirst({
      where: {
        userId,
        team: {
          hackathonId,
        },
      },
      include: {
        team: {
          include: {
            hackathon: true,
            members: {
              include: {
                user: {
                  include: {
                    profile: {
                      select: { firstName: true, lastName: true },
                    },
                  },
                },
              },
            },
            submission: true,
          },
        },
      },
    });

    if (!membership) {
      throw new AppError('Participation record not found or access denied.', 404);
    }

    return membership;
  }
}

module.exports = new ProfileService();
