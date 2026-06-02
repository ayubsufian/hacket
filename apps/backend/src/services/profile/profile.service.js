// =============================================================================
// HackET — Profile Service
// =============================================================================

const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const eventBus = require('../../utils/eventBus');
const { redisClient } = require('../../config/redis');
const path = require('path');
const storageService = require('../storage/storage.service');

const ALLOWED_SKILLS = new Set([
  'javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'go', 'rust', 'php', 'ruby',
  'react', 'vue', 'angular', 'node.js', 'express', 'django', 'flask', 'spring', 'laravel',
  'html', 'css', 'tailwind', 'sql', 'postgresql', 'mysql', 'mongodb', 'redis',
  'machine learning', 'ai', 'data science', 'data analysis', 'cybersecurity', 'cloud',
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'devops', 'ui/ux', 'figma',
  'product management', 'business', 'pitching', 'iot', 'mobile', 'flutter', 'react native',
]);

class ProfileService {
  /**
   * Get user profile along with current submissions and past participation.
   */
  async getProfileWithHistory(userId) {
    const cacheKey = `user:profile:v2:${userId}`;
    try {
      const cached = await redisClient.hGetAll(cacheKey);
      if (cached && Object.keys(cached).length > 0) {
        return {
          profile: JSON.parse(cached.profile),
          currentSubmissions: JSON.parse(cached.currentSubmissions),
          pastParticipation: JSON.parse(cached.pastParticipation),
        };
      }
    } catch (err) {
      console.warn('[Profile] Redis cache get error:', err.message);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        profile: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            bio: true,
            avatarUrl: true,
            phone: true,
            university: true,
            graduationYear: true,
            skills: true,
            interests: true,
            githubUrl: true,
            linkedinUrl: true,
            preferredLocale: true,
            city: true,
            region: true,
            representativeName: true,
            dateOfBirth: true,
            isSeekingTeam: true,
            mentorMaxDailyInteractions: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!user || !user.profile) {
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

    const result = {
      profile: user.profile,
      currentSubmissions,
      pastParticipation,
    };

    try {
      await redisClient.hSet(cacheKey, {
        profile: JSON.stringify(user.profile),
        currentSubmissions: JSON.stringify(currentSubmissions),
        pastParticipation: JSON.stringify(pastParticipation),
      });
      await redisClient.expire(cacheKey, 60 * 60 * 4); // 4 hours TTL
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

    const normalizedData = { ...updateData };
    if (Object.prototype.hasOwnProperty.call(normalizedData, 'firstName')) {
      normalizedData.firstName = normalizedData.firstName?.trim();
      if (!normalizedData.firstName || normalizedData.firstName === 'New') {
        throw new AppError('A valid first name is required.', 400);
      }
    }
    if (Object.prototype.hasOwnProperty.call(normalizedData, 'lastName')) {
      normalizedData.lastName = normalizedData.lastName?.trim();
      if (!normalizedData.lastName || normalizedData.lastName === 'User') {
        throw new AppError('A valid last name is required.', 400);
      }
    }
    if (Object.prototype.hasOwnProperty.call(normalizedData, 'skills')) {
      normalizedData.skills = this._normalizeSkills(normalizedData.skills);
    }

    const updatedProfile = await prisma.userProfile.update({
      where: { userId },
      data: normalizedData,
    });

    eventBus.emit('audit:log', {
      actorId: userId,
      action: 'UPDATE',
      entity: 'userProfile',
      entityId: profile.id,
    });

    try {
      await redisClient.del(`user:profile:v2:${userId}`);
      await redisClient.del(`user:profile:${userId}`);
    } catch (err) {
      console.warn('[Profile] Redis cache del error:', err.message);
    }

    return updatedProfile;
  }

  async uploadAvatar(userId, file, req) {
    if (!file) {
      throw new AppError('Avatar file is required.', 400);
    }

    const extension = path.extname(file.originalname || '').toLowerCase() || '.png';
    const filename = `avatar-${Date.now()}${extension}`;
    const storageKey = `/profiles/${userId}/${filename}`;
    await storageService.moveToBlobStorage(file.path, storageKey);

    const avatarUrl = `${req.protocol}://${req.get('host')}/api/v1/storage/profiles/${userId}/${filename}`;
    const profile = await prisma.userProfile.update({
      where: { userId },
      data: { avatarUrl },
    });

    eventBus.emit('audit:log', {
      actorId: userId,
      action: 'PROFILE_AVATAR_UPDATED',
      entity: 'userProfile',
      entityId: profile.id,
      details: { storageKey },
    });

    await this._clearProfileCaches(userId);
    return profile;
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

  /**
   * Get public profile of another user (for team formation/networking).
   */
  async getPublicProfile(userId) {
    const cacheKey = `user:profile:public:${userId}`;
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (err) {
      console.warn('[Profile] Redis cache get error:', err.message);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId, isActive: true },
      select: {
        id: true,
        role: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            bio: true,
            avatarUrl: true,
            skills: true,
            interests: true,
            university: true,
            githubUrl: true,
            linkedinUrl: true,
            isSeekingTeam: true,
            city: true,
            region: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User profile not found.', 404);
    }

    try {
      await redisClient.setEx(cacheKey, 60 * 60, JSON.stringify(user)); // 1 hour TTL
    } catch (err) {
      console.warn('[Profile] Redis cache set error:', err.message);
    }

    return user;
  }

  _normalizeSkills(skills = []) {
    const normalized = [...new Set(skills.map((skill) => String(skill).trim()).filter(Boolean))];
    const invalid = normalized.filter((skill) => !ALLOWED_SKILLS.has(skill.toLowerCase()));
    if (invalid.length > 0) {
      throw new AppError(`Unsupported skill value(s): ${invalid.join(', ')}.`, 400);
    }
    return normalized;
  }

  async _clearProfileCaches(userId) {
    try {
      await redisClient.del(`user:profile:v2:${userId}`);
      await redisClient.del(`user:profile:${userId}`);
      await redisClient.del(`user:profile:public:${userId}`);
    } catch (err) {
      console.warn('[Profile] Redis cache del error:', err.message);
    }
  }
}

module.exports = new ProfileService();
