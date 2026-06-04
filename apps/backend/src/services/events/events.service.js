// =============================================================================
// HackET — Events (Hackathon) Service
// CRUD operations + discovery/filtering for hackathons.
// =============================================================================

const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const eventBus = require('../../utils/eventBus');
const { levenshteinDistance } = require('../../utils/levenshtein');
const { categorizeDescription } = require('../../utils/categorizer');
const { redisClient } = require('../../config/redis');
const scoringService = require('../judging/scoring.service');
const { toEthiopianFromDate, formatEAT, formatEATTime } = require('../../utils/ethiopianDate');

class EventsService {
  /**
   * Create a new hackathon.
   * @param {string} organizerId - The organizer's user ID
   * @param {object} data - Hackathon fields
   * @returns {object} Created hackathon
   */
  async create(organizerId, data) {
    const { tags, overrideConflict, ...hackathonData } = data;

    this._validateEventConfiguration(hackathonData);

    // AF3: Check duplicate title
    const isConflictOverridden = await this._checkDuplicateTitle(hackathonData.title, overrideConflict);

    // Generate slug from title
    let slug = this._generateSlug(hackathonData.title);
    if (isConflictOverridden) {
      slug += '-' + Date.now().toString(36).slice(-4);
    }

    // UC0013: Run Categorizer
    const autoTags = categorizeDescription(hackathonData.description);
    const finalTagsMap = new Map();
    autoTags.forEach(t => finalTagsMap.set(t.tag, t));
    
    if (tags) {
      tags.forEach(t => finalTagsMap.set(t, { tag: t, isPending: false }));
    }
    const finalTagsArray = Array.from(finalTagsMap.values());

    const hackathon = await prisma.hackathon.create({
      data: {
        ...hackathonData,
        slug,
        organizerId,
        tags: finalTagsArray.length > 0
          ? { create: finalTagsArray }
          : undefined,
      },
      include: { tags: true },
    });

    eventBus.emit('audit:log', {
      actorId: organizerId,
      action: 'CREATE',
      entity: 'hackathon',
      entityId: hackathon.id,
      details: { title: hackathon.title },
    });

    await redisClient.del('events:active');

    return hackathon;
  }

  /**
   * Get a single hackathon by ID or slug.
   * @param {string} identifier - UUID or slug
   * @returns {object}
   */
  async getById(identifier) {
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        identifier
      );

    const hackathon = await prisma.hackathon.findUnique({
      where: isUUID ? { id: identifier } : { slug: identifier },
      include: {
        tags: { select: { tag: true } },
        judgingCriteria: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { teams: true, submissions: true } },
      },
    });

    if (!hackathon) {
      throw new AppError('Hackathon not found.', 404);
    }

    return {
      ...hackathon,
      tags: hackathon.tags.map((t) => t.tag),
    };
  }

  /**
   * Get all registered participants for a hackathon.
   * Used by Sponsors for recruiting and Organizers for management.
   * @param {string} hackathonId 
   * @returns {array}
   */
  async getParticipants(hackathonId) {
    const registrations = await prisma.registration.findMany({
      where: {
        hackathonId,
        status: { in: ['REGISTERED', 'CHECKED_IN', 'WAITLISTED'] },
      },
      orderBy: [
        { status: 'asc' },
        { waitlistPosition: 'asc' },
        { createdAt: 'asc' },
      ],
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                skills: true,
                githubUrl: true,
                linkedinUrl: true,
                avatarUrl: true,
                university: true,
                city: true,
                region: true,
                isSeekingTeam: true,
              }
            }
          }
        },
      }
    });

    const memberships = await prisma.teamMember.findMany({
      where: {
        userId: { in: registrations.map((registration) => registration.userId) },
        team: { hackathonId },
      },
      include: {
        team: { select: { id: true, name: true } },
      },
    });

    const membershipByUserId = new Map(
      memberships.map((membership) => [membership.userId, membership]),
    );

    return registrations.map((registration) => {
      const membership = membershipByUserId.get(registration.userId);
      return {
        ...registration.user,
        registration: {
          id: registration.id,
          status: registration.status,
          waitlistPosition: registration.waitlistPosition,
          checkedInAt: registration.checkedInAt,
          registeredAt: registration.createdAt,
        },
        team: membership?.team || null,
        role: membership?.role || null,
      };
    });
  }

  /**
   * List hackathons with filtering & pagination.
   * @param {object} [filters]
   * @param {string} [filters.status]
   * @param {string} [filters.region]
   * @param {string} [filters.theme] - Tag to filter by
   * @param {string} [filters.search] - Full-text search on title/description
   * @param {number} [filters.page=1]
   * @param {number} [filters.limit=12]
   * @returns {{ data: Array, pagination: object }}
   */
  async list({ status, region, theme, category, schedule, search, page = 1, limit = 12, actorId } = {}) {
    const hashField = JSON.stringify({ status, region, theme, category, schedule, search, page, limit });
    if (!actorId) { // Only cache general searches, not actor-specific logs
      try {
        const cached = await redisClient.hGet('events:active', hashField);
        if (cached) return JSON.parse(cached);
      } catch (err) {
        console.warn('[Events] Redis cache get error:', err.message);
      }
    }

    const where = {};

    if (status) {
      where.status = Array.isArray(status) ? { in: status } : status;
    }
    if (region) where.region = { equals: region, mode: 'insensitive' };
    
    if (theme && !category) {
      where.tags = { some: { tag: { equals: theme, mode: 'insensitive' } } };
    } else if (category && !theme) {
      where.tags = { some: { tag: { equals: category, mode: 'insensitive' } } };
    } else if (theme && category) {
      where.AND = [
        { tags: { some: { tag: { equals: theme, mode: 'insensitive' } } } },
        { tags: { some: { tag: { equals: category, mode: 'insensitive' } } } }
      ];
    }

    if (schedule) {
      const now = new Date();
      if (schedule === 'upcoming') {
        where.eventStart = { gte: now };
      } else if (schedule === 'past') {
        where.eventEnd = { lt: now };
      } else if (schedule === 'ongoing') {
        where.eventStart = { lte: now };
        where.eventEnd = { gte: now };
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { titleAm: { contains: search, mode: 'insensitive' } },
      ];
    }

    const offset = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.hackathon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          tags: { select: { tag: true } },
          _count: { select: { teams: true } },
        },
      }),
      prisma.hackathon.count({ where }),
    ]);

    // Search Logging
    if (search) {
      await prisma.searchLog.create({
        data: {
          query: search,
          actorId: actorId || null,
          resultCount: total,
        }
      }).catch(err => console.error('Failed to log search:', err));
    }

    let suggestion = null;

    // AF2: Auto-correction
    if (search && total === 0) {
      const candidates = await prisma.hackathon.findMany({
        where: { status: { in: ['REGISTRATION_OPEN', 'IN_PROGRESS', 'JUDGING'] } },
        select: { title: true, region: true },
        take: 100,
      });

      let bestMatch = null;
      let lowestDistance = Infinity;

      for (const candidate of candidates) {
        const titleDist = levenshteinDistance(search.toLowerCase(), candidate.title.toLowerCase());
        if (titleDist < lowestDistance) {
          lowestDistance = titleDist;
          bestMatch = candidate.title;
        }
        
        if (candidate.region) {
          const regionDist = levenshteinDistance(search.toLowerCase(), candidate.region.toLowerCase());
          if (regionDist < lowestDistance) {
            lowestDistance = regionDist;
            bestMatch = candidate.region;
          }
        }
      }

      // If distance is small enough (typo threshold)
      if (bestMatch && lowestDistance <= 3) {
        suggestion = bestMatch;
      }
    }

    const result = {
      data: data.map((h) => ({
        ...h,
        tags: h.tags.map((t) => t.tag),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      suggestion,
    };

    if (!actorId) {
      try {
        await redisClient.hSet('events:active', hashField, JSON.stringify(result));
        await redisClient.expire('events:active', 60 * 60); // 1 Hour cache
      } catch (err) {
        console.warn('[Events] Redis cache set error:', err.message);
      }
    }

    return result;
  }

  /**
   * List hackathons owned by the authenticated organizer (includes DRAFT).
   * Admins receive all hackathons.
   */
  async listMine(userId, role, { page = 1, limit = 50 } = {}) {
    const where = role === 'ADMIN' ? {} : { organizerId: userId };
    const offset = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.hackathon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          tags: { select: { tag: true } },
          _count: { select: { teams: true } },
        },
      }),
      prisma.hackathon.count({ where }),
    ]);

    return {
      data: data.map((h) => ({
        ...h,
        tags: h.tags.map((t) => t.tag),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update a hackathon.
   * @param {string} hackathonId
   * @param {string} organizerId - For permission check
   * @param {object} data
   * @param {string} staffRole - Role of the staff member performing the update
   * @returns {object}
   */
  async update(hackathonId, organizerId, data, staffRole) {
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
    });

    if (!hackathon) {
      throw new AppError('Hackathon not found.', 404);
    }

    // 2026 Enterprise Standard: Field-Level Role-Based Access Control (RBAC)
    let allowedFields = [];
    if (staffRole === 'ADMIN' || staffRole === 'PRIMARY_ORGANIZER' || staffRole === 'CO_ORGANIZER') {
      allowedFields = Object.keys(data); // Can edit everything
    } else if (staffRole === 'COMMUNICATIONS') {
      allowedFields = ['title', 'titleAm', 'description', 'descriptionAm', 'coverImageUrl', 'websiteUrl', 'contactEmail', 'tags'];
    } else if (staffRole === 'TECHNICAL_LEAD') {
      allowedFields = ['judgingStart', 'judgingEnd', 'judgingMode', 'requiredReviewsPerSubmission', 'rules', 'rulesAm', 'submissionDeadline'];
    } else if (staffRole === 'LOGISTICS') {
      allowedFields = ['eventStart', 'eventEnd', 'venue', 'region', 'isVirtual'];
    } else if (staffRole === 'FINANCE') {
      allowedFields = ['prizes'];
    }

    // Filter incoming data strictly to allowed fields
    const filteredData = Object.keys(data)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = data[key];
        return obj;
      }, {});

    if (Object.keys(filteredData).length === 0) {
      throw new AppError(`Forbidden. As a ${staffRole}, you do not have permission to modify the provided fields.`, 403);
    }

    const { tags, overrideConflict, ...updateData } = filteredData;

    // Merge existing hackathon with incoming updates to validate lifecycle and schedule integrity
    const mergedData = { ...hackathon, ...updateData };
    this._validateEventConfiguration(mergedData);

    // Check duplicate title (excluding current hackathon)
    if (updateData.title) {
      const isConflictOverridden = await this._checkDuplicateTitle(updateData.title, overrideConflict, hackathonId);
      if (isConflictOverridden) {
        updateData.slug = this._generateSlug(updateData.title) + '-' + Date.now().toString(36).slice(-4);
      } else {
        updateData.slug = this._generateSlug(updateData.title);
      }
    }

    // UC0013: Run Categorizer if description or tags are updated
    let tagsPayload = undefined;
    if (tags || updateData.description) {
      const autoTags = categorizeDescription(mergedData.description);
      const finalTagsMap = new Map();
      
      // Preserve existing tags from DB if user didn't explicitly override them
      if (!tags && hackathon.tags) {
         // Assuming hackathon included tags? wait, update() doesn't include tags when finding unique!
         // We should just use tags from payload, or autoTags.
      }
      
      autoTags.forEach(t => finalTagsMap.set(t.tag, t));
      
      if (tags) {
        tags.forEach(t => finalTagsMap.set(t, { tag: t, isPending: false }));
      }
      const finalTagsArray = Array.from(finalTagsMap.values());
      
      tagsPayload = {
        deleteMany: {},
        create: finalTagsArray,
      };
    }

    const updated = await prisma.hackathon.update({
      where: { id: hackathonId },
      data: {
        ...updateData,
        tags: tagsPayload,
      },
      include: { tags: true },
    });

    eventBus.emit('audit:log', {
      actorId: organizerId,
      action: 'UPDATE',
      entity: 'hackathon',
      entityId: hackathonId,
      details: { updatedFields: Object.keys(updateData) },
    });

    await redisClient.del('events:active');

    return updated;
  }

  /**
   * Delete a hackathon.
   * @param {string} hackathonId
   * @param {string} organizerId
   */
  async delete(hackathonId, organizerId) {
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
    });

    if (!hackathon) {
      throw new AppError('Hackathon not found.', 404);
    }

    if (hackathon.status !== 'DRAFT') {
      throw new AppError('Only DRAFT hackathons can be hard-deleted. Published hackathons must be cancelled or archived to preserve audit integrity.', 403);
    }

    await prisma.hackathon.delete({ where: { id: hackathonId } });

    eventBus.emit('audit:log', {
      actorId: organizerId,
      action: 'DELETE',
      entity: 'hackathon',
      entityId: hackathonId,
    });

    await redisClient.del('events:active');
  }

  /**
   * Kick a participant from a hackathon (Organizer only).
   */
  async kickParticipant(hackathonId, participantUserId, organizerId, reason) {
    if (!reason) throw new AppError('A reason is required to kick a participant.', 400);

    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId }
    });

    if (!hackathon) throw new AppError('Hackathon not found.', 404);

    const registration = await prisma.registration.findFirst({
      where: { hackathonId, userId: participantUserId }
    });

    if (!registration || registration.status === 'WITHDRAWN') {
      throw new AppError('Participant is not actively registered for this hackathon.', 404);
    }

    const membership = await prisma.teamMember.findFirst({
      where: {
        userId: participantUserId,
        team: { hackathonId }
      },
      include: {
        team: {
          include: {
            members: true
          }
        }
      }
    });

    const result = await prisma.$transaction(async (tx) => {
      // 1. Soft delete registration
      const updatedReg = await tx.registration.update({
        where: { id: registration.id },
        data: { status: 'WITHDRAWN', waitlistPosition: null }
      });

      // 2. Handle team membership
      if (membership) {
        const team = membership.team;
        if (team.members.length === 1) {
          // Sole member, delete team
          await tx.teamMember.delete({ where: { id: membership.id } });
          await tx.team.delete({ where: { id: team.id } });
        } else {
          // Multiple members
          await tx.teamMember.delete({ where: { id: membership.id } });
          
          // Reassign leadership if kicked user was leader
          if (team.leaderId === participantUserId) {
            const nextMember = team.members.find(m => m.userId !== participantUserId);
            if (nextMember) {
              await tx.team.update({
                where: { id: team.id },
                data: { leaderId: nextMember.userId }
              });
            }
          }
        }
      }

      if (registration.status === 'WAITLISTED' && registration.waitlistPosition) {
        await tx.registration.updateMany({
          where: {
            hackathonId,
            status: 'WAITLISTED',
            waitlistPosition: { gt: registration.waitlistPosition },
          },
          data: {
            waitlistPosition: { decrement: 1 },
          },
        });
      }

      const promotedRegistration = registration.status === 'WAITLISTED'
        ? null
        : await this._promoteNextWaitlistedParticipant(tx, hackathonId);

      return { registration: updatedReg, promotedRegistration };
    });

    eventBus.emit('audit:log', {
      actorId: organizerId,
      action: 'PARTICIPANT_KICKED',
      entity: 'registration',
      entityId: registration.id,
      details: { hackathonId, participantUserId, reason }
    });

    // 2026 Standard: Emit notification event for trust & safety kicks
    eventBus.emit('notification:kick', {
      userId: participantUserId,
      hackathonId,
      hackathonTitle: hackathon.title,
      reason
    });

    await redisClient.del('events:active');

    return result;
  }

  /**
   * Register a participant for a hackathon.
   * @param {string} hackathonId
   * @param {string} userId
   * @returns {object} Registration result. Team membership is created explicitly
   * or lazily for solo submissions.
   */
  async registerParticipant(hackathonId, userId, { inviteToken = null } = {}) {
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
    });

    if (!hackathon) throw new AppError('Hackathon not found.', 404);

    const now = new Date();
    if (hackathon.status !== 'REGISTRATION_OPEN') {
      throw new AppError('Registration is not currently open.', 409);
    }
    if (!hackathon.registrationStart || !hackathon.registrationEnd) {
      throw new AppError('Registration window is not configured for this hackathon.', 409);
    }
    if (now < hackathon.registrationStart || now > hackathon.registrationEnd) {
      throw new AppError('Registration window is closed.', 409);
    }

    // Check if already registered
    const existingRegistration = await prisma.registration.findUnique({
      where: {
        userId_hackathonId: { userId, hackathonId },
      },
    });

    if (existingRegistration && existingRegistration.status !== 'WITHDRAWN') {
      throw new AppError('You are already registered for this hackathon.', 409);
    }

    // Security & Conflict of Interest Check (2026 Standard)
    // A user cannot compete in a hackathon if they are the Lead Organizer, Judge, or Mentor.
    if (hackathon.organizerId === userId) {
      throw new AppError('Conflict of Interest: You cannot register as a participant in a hackathon that you are organizing.', 403);
    }

    const staffAssignment = await prisma.staffAssignment.findFirst({
      where: {
        userId,
        hackathonId,
        isActive: true
      }
    });

    if (staffAssignment) {
      throw new AppError(`You cannot register as a participant because you are assigned as a ${staffAssignment.staffRole} for this hackathon.`, 403);
    }

    // Get user profile for naming & prerequisite validation
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { firstName: true, lastName: true, dateOfBirth: true, skills: true, interests: true },
    });

    // AF3: Pre-requisite validation
    if (hackathon.prerequisites && profile) {
      const prereqs = typeof hackathon.prerequisites === 'string' 
        ? JSON.parse(hackathon.prerequisites) 
        : hackathon.prerequisites;
        
      if (prereqs.minimumAge) {
        if (!profile.dateOfBirth) {
          throw new AppError('You do not meet the required criteria to register for this event.', 403);
        }
        const age = new Date().getFullYear() - new Date(profile.dateOfBirth).getFullYear();
        if (age < prereqs.minimumAge) {
          throw new AppError('You do not meet the required criteria to register for this event.', 403);
        }
      }
      
      if (prereqs.requiredSkills && prereqs.requiredSkills.length > 0) {
        const hasSkill = prereqs.requiredSkills.some(skill => profile.skills.includes(skill));
        if (!hasSkill) {
          throw new AppError('You do not meet the required criteria to register for this event.', 403);
        }
      }

      if (prereqs.requiredTags && prereqs.requiredTags.length > 0) {
        const participantTags = new Set([...(profile.skills || []), ...(profile.interests || [])]);
        const hasTag = prereqs.requiredTags.some(tag => participantTags.has(tag));
        if (!hasTag) {
          throw new AppError('You do not meet the required criteria to register for this event.', 403);
        }
      }

      const requiredInviteToken = prereqs.inviteToken || prereqs.requiredInviteToken;
      if (requiredInviteToken && inviteToken !== requiredInviteToken) {
        throw new AppError('A valid invitation token is required to register for this event.', 403);
      }
    }

    // Create Registration atomically. Teams are formed explicitly, and solo
    // submission teams are created lazily by the submissions service when needed.
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "hackathons" WHERE id = ${hackathonId}::uuid FOR UPDATE`;

      const lockedHackathon = await tx.hackathon.findUnique({
        where: { id: hackathonId },
        select: {
          status: true,
          registrationStart: true,
          registrationEnd: true,
          maxParticipants: true,
          waitlistEnabled: true,
          waitlistLimit: true,
        },
      });

      if (!lockedHackathon) {
        throw new AppError('Hackathon not found.', 404);
      }

      const lockedNow = new Date();
      if (lockedHackathon.status !== 'REGISTRATION_OPEN') {
        throw new AppError('Registration is not currently open.', 409);
      }
      if (!lockedHackathon.registrationStart || !lockedHackathon.registrationEnd) {
        throw new AppError('Registration window is not configured for this hackathon.', 409);
      }
      if (lockedNow < lockedHackathon.registrationStart || lockedNow > lockedHackathon.registrationEnd) {
        throw new AppError('Registration window is closed.', 409);
      }

      const currentRegistration = await tx.registration.findUnique({
        where: {
          userId_hackathonId: { userId, hackathonId },
        },
      });

      if (currentRegistration && currentRegistration.status !== 'WITHDRAWN') {
        throw new AppError('You are already registered for this hackathon.', 409);
      }

      const [registeredCount, waitlistedCount, lastWaitlistPosition] = await Promise.all([
        tx.registration.count({
          where: {
            hackathonId,
            status: { in: ['REGISTERED', 'CHECKED_IN'] },
          },
        }),
        tx.registration.count({
          where: {
            hackathonId,
            status: 'WAITLISTED',
          },
        }),
        tx.registration.aggregate({
          where: {
            hackathonId,
            status: 'WAITLISTED',
          },
          _max: { waitlistPosition: true },
        }),
      ]);

      const hasCapacity = !lockedHackathon.maxParticipants || registeredCount < lockedHackathon.maxParticipants;
      const nextStatus = hasCapacity ? 'REGISTERED' : 'WAITLISTED';

      if (!hasCapacity) {
        if (!lockedHackathon.waitlistEnabled) {
          throw new AppError('This hackathon has reached maximum capacity.', 409);
        }

        if (lockedHackathon.waitlistLimit && waitlistedCount >= lockedHackathon.waitlistLimit) {
          throw new AppError('This hackathon and its waitlist are full.', 409);
        }
      }

      const waitlistPosition = nextStatus === 'WAITLISTED'
        ? (lastWaitlistPosition._max.waitlistPosition || 0) + 1
        : null;

      const registration = currentRegistration
        ? await tx.registration.update({
          where: { id: currentRegistration.id },
          data: {
            status: nextStatus,
            waitlistPosition,
            checkedInAt: null,
          },
        })
        : await tx.registration.create({
          data: {
            userId,
            hackathonId,
            status: nextStatus,
            waitlistPosition,
          },
        });

      if (nextStatus === 'WAITLISTED') {
        return { registration, team: null, status: nextStatus, waitlistPosition };
      }

      const existingTeam = await tx.teamMember.findFirst({
        where: {
          userId,
          team: { hackathonId },
        },
      });

      if (existingTeam && !currentRegistration) {
        throw new AppError('You are already a member of a team for this hackathon.', 409);
      }

      return { registration, team: null, status: nextStatus, waitlistPosition: null };
    });

    return result;
  }

  /**
   * Clone an existing hackathon for a new iteration.
   * Deep copies metadata, criteria, and tags. Does NOT copy teams, submissions, or dates.
   * @param {string} hackathonId
   * @param {string} organizerId
   * @returns {object} The cloned hackathon
   */
  async cloneEvent(hackathonId, organizerId) {
    const original = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
      include: {
        tags: true,
        judgingCriteria: true,
      }
    });

    if (!original) throw new AppError('Hackathon not found to clone.', 404);

    const now = new Date();
    // Default dates for the cloned event to avoid validation errors, typically set to future dates
    const oneMonthFromNow = new Date(now.setMonth(now.getMonth() + 1));
    const twoMonthsFromNow = new Date(now.setMonth(now.getMonth() + 2));

    const clonedTitle = `Copy of ${original.title}`;
    
    // Check title conflict and resolve slug
    const slugBase = this._generateSlug(clonedTitle);
    const uniqueSlug = `${slugBase}-${Date.now().toString(36).slice(-4)}`;

    const cloned = await prisma.hackathon.create({
      data: {
        title: clonedTitle,
        slug: uniqueSlug,
        description: original.description,
        coverImageUrl: original.coverImageUrl,
        status: 'DRAFT',
        organizerId,
        organizationId: original.organizationId,
        maxTeamSize: original.maxTeamSize,
        minTeamSize: original.minTeamSize,
        maxParticipants: original.maxParticipants,
        waitlistEnabled: original.waitlistEnabled,
        waitlistLimit: original.waitlistLimit,
        
        // Setup placeholder dates
        registrationStart: oneMonthFromNow,
        registrationEnd: twoMonthsFromNow,
        eventStart: twoMonthsFromNow,
        eventEnd: twoMonthsFromNow,
        submissionDeadline: twoMonthsFromNow,

        rules: original.rules,
        prizes: original.prizes,
        prerequisites: original.prerequisites,
        region: original.region,
        venue: original.venue,
        isVirtual: original.isVirtual,
        websiteUrl: original.websiteUrl,
        contactEmail: original.contactEmail,
        
        // Deep copy tags
        tags: {
          create: original.tags.map(t => ({ tag: t.tag, isPending: false }))
        },
        // Deep copy judging criteria
        judgingCriteria: {
          create: original.judgingCriteria.map(c => ({
            name: c.name,
            description: c.description,
            maxScore: c.maxScore,
            weight: c.weight,
            sortOrder: c.sortOrder
          }))
        }
      },
      include: {
        tags: true,
        judgingCriteria: true
      }
    });

    eventBus.emit('audit:log', {
      actorId: organizerId,
      action: 'CREATE',
      entity: 'hackathon',
      entityId: cloned.id,
      details: { clonedFrom: original.id },
    });

    return cloned;
  }

  /**
   * Unregister a user from a hackathon.
   * If they are the leader of a multi-member team, require transferring leadership first.
   * If they are the only member, disband the team.
   * @param {string} hackathonId
   * @param {string} userId
   */
  async unregisterParticipant(hackathonId, userId) {
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
      select: { eventStart: true, status: true }
    });

    if (!hackathon) throw new AppError('Hackathon not found.', 404);

    if (!hackathon.eventStart) {
      throw new AppError('Event start date is not configured for this hackathon.', 409);
    }

    if (new Date() >= hackathon.eventStart || hackathon.status !== 'REGISTRATION_OPEN') {
      throw new AppError('Cannot unregister after the event has started or registration is closed.', 400);
    }

    const registration = await prisma.registration.findUnique({
      where: {
        userId_hackathonId: { userId, hackathonId },
      },
    });

    if (!registration || registration.status === 'WITHDRAWN') {
      throw new AppError('You are not registered for this hackathon.', 400);
    }

    if (registration.status === 'WAITLISTED') {
      await prisma.$transaction(async (tx) => {
        await tx.registration.update({
          where: { id: registration.id },
          data: { status: 'WITHDRAWN', waitlistPosition: null },
        });

        if (registration.waitlistPosition) {
          await tx.registration.updateMany({
            where: {
              hackathonId,
              status: 'WAITLISTED',
              waitlistPosition: { gt: registration.waitlistPosition },
            },
            data: {
              waitlistPosition: { decrement: 1 },
            },
          });
        }
      });

      eventBus.emit('audit:log', {
        actorId: userId,
        action: 'DELETE',
        entity: 'registration',
        entityId: registration.id,
        details: { hackathonId, previousStatus: 'WAITLISTED' }
      });
      return;
    }

    const membership = await prisma.teamMember.findFirst({
      where: {
        userId,
        team: { hackathonId }
      },
      include: {
        team: {
          include: {
            members: true
          }
        }
      }
    });

    if (!membership) {
      await prisma.$transaction(async (tx) => {
        await tx.registration.updateMany({
          where: { userId, hackathonId },
          data: { status: 'WITHDRAWN', waitlistPosition: null },
        });

        await this._promoteNextWaitlistedParticipant(tx, hackathonId);
      });

      eventBus.emit('audit:log', {
        actorId: userId,
        action: 'DELETE',
        entity: 'registration',
        entityId: userId,
        details: { hackathonId },
      });
      return;
    }

    const team = membership.team;
    
    // 2026 Platform Standard: Team leadership integrity
    if (membership.role === 'LEADER' && team.members.length > 1) {
      throw new AppError('You are the leader of a multi-member team. Please assign a new leader before unregistering.', 403);
    }

    // Unregister logic
    await prisma.$transaction(async (tx) => {
      if (team.members.length === 1) {
        // Sole member, disband team
        await tx.team.delete({ where: { id: team.id } });
      } else {
        // Just remove the user from the team
        await tx.teamMember.delete({ where: { id: membership.id } });
      }
      
      // Instead of deleting, soft-delete the registration to preserve drop-out analytics
      await tx.registration.updateMany({
        where: { userId, hackathonId },
        data: { status: 'WITHDRAWN', waitlistPosition: null }
      });

      await this._promoteNextWaitlistedParticipant(tx, hackathonId);
    });

    eventBus.emit('audit:log', {
      actorId: userId,
      action: 'DELETE',
      entity: 'registration',
      entityId: userId,
      details: { hackathonId }
    });
  }

  /**
   * Check-in a participant at the event.
   * @param {string} hackathonId
   * @param {string} userId
   * @param {string} organizerId - The staff member performing the check-in
   */
  async checkInParticipant(hackathonId, userId, staffId) {
    const registration = await prisma.registration.findFirst({
      where: { hackathonId, userId },
    });

    if (!registration) throw new AppError('Registration not found.', 404);

    if (registration.status === 'WITHDRAWN') {
      throw new AppError('Participant has withdrawn their registration and cannot be checked in.', 400);
    }

    if (registration.status === 'WAITLISTED') {
      throw new AppError('Waitlisted participants cannot be checked in until they are registered.', 409);
    }
    
    if (registration.status === 'CHECKED_IN') {
      throw new AppError('Participant is already checked in.', 400);
    }

    const updated = await prisma.registration.update({
      where: { id: registration.id },
      data: { 
        status: 'CHECKED_IN',
        checkedInAt: new Date()
      }
    });

    eventBus.emit('audit:log', { 
      actorId: staffId, 
      action: 'PARTICIPANT_CHECKIN', 
      entity: 'registration', 
      entityId: registration.id,
      details: { hackathonId, userId }
    });

    return updated;
  }

  async undoCheckIn(hackathonId, userId, staffId) {
    const registration = await prisma.registration.findFirst({
      where: { hackathonId, userId },
    });

    if (!registration) throw new AppError('Registration not found.', 404);

    if (registration.status !== 'CHECKED_IN') {
      throw new AppError('Participant is not currently checked in.', 400);
    }

    const updated = await prisma.registration.update({
      where: { id: registration.id },
      data: { 
        status: 'REGISTERED',
        checkedInAt: null
      }
    });

    eventBus.emit('audit:log', { 
      actorId: staffId, 
      action: 'PARTICIPANT_UNDO_CHECKIN', 
      entity: 'registration', 
      entityId: registration.id,
      details: { hackathonId, userId, reason: 'Manual reversion by staff' }
    });

    return updated;
  }

  async getContext(hackathonId, userId) {
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
      select: { id: true, status: true, organizationId: true }
    });
    if (!hackathon) throw new AppError('Hackathon not found.', 404);

    const [staff, registration, teamMember] = await Promise.all([
      prisma.staffAssignment.findFirst({
        where: { hackathonId, userId, isActive: true },
        select: { staffRole: true, isLead: true }
      }),
      prisma.registration.findUnique({
        where: { userId_hackathonId: { userId, hackathonId } }
      }),
      prisma.teamMember.findFirst({
        where: { userId, team: { hackathonId } },
        select: { role: true, teamId: true }
      })
    ]);

    return {
      status: hackathon.status,
      staffRole: staff ? staff.staffRole : null,
      isLead: staff ? staff.isLead : false,
      isRegistered: !!registration || !!teamMember,
      teamId: teamMember ? teamMember.teamId : null,
      teamRole: teamMember ? teamMember.role : null,
    };
  }

  async publishEvent(hackathonId, organizerId) {
    const hackathon = await prisma.hackathon.findUnique({ where: { id: hackathonId } });
    if (!hackathon) throw new AppError('Hackathon not found.', 404);

    let newStatus = 'REGISTRATION_OPEN';
    if (hackathon.registrationStart && new Date() < hackathon.registrationStart) {
      newStatus = 'UPCOMING';
    }

    const updatedData = { ...hackathon, status: newStatus };
    this._validateEventConfiguration(updatedData);

    const judgingStartData = await this._buildJudgingStartData(hackathonId, hackathon.status, newStatus);
    await this._assertTeamsWithinSizeBoundsForStatus(hackathonId, newStatus);

    const updated = await prisma.hackathon.update({
      where: { id: hackathonId },
      data: { status: newStatus, ...judgingStartData }
    });

    eventBus.emit('audit:log', { actorId: organizerId, action: 'STATUS_CHANGE', entity: 'hackathon', entityId: hackathonId, details: { status: newStatus } });
    await redisClient.del('events:active');
    return updated;
  }

  async cancelEvent(hackathonId, organizerId, reason = null) {
    const hackathon = await prisma.hackathon.findUnique({ where: { id: hackathonId } });
    if (!hackathon) throw new AppError('Hackathon not found.', 404);

    if (hackathon.status === 'JUDGING' || hackathon.status === 'COMPLETED') {
      throw new AppError(`Hackathons in the ${hackathon.status} phase cannot be cancelled. Intellectual Property has already been submitted.`, 403);
    }

    if (hackathon.status === 'IN_PROGRESS' && !reason) {
      throw new AppError('A reason is required to cancel a hackathon that is currently in progress.', 400);
    }

    await this._assertTeamsWithinSizeBoundsForStatus(hackathonId, 'CANCELLED');

    // Use a transaction to update hackathon and cascade to registrations
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Cancel the hackathon
      const h = await tx.hackathon.update({
        where: { id: hackathonId },
        data: { status: 'CANCELLED' }
      });

      // 2. Cascade withdrawal to all registrations so participant dashboards reflect the voided status
      await tx.registration.updateMany({
        where: { hackathonId, status: { in: ['REGISTERED', 'CHECKED_IN', 'WAITLISTED'] } },
        data: { status: 'WITHDRAWN' }
      });

      return h;
    });

    eventBus.emit('audit:log', { 
      actorId: organizerId, 
      action: 'STATUS_CHANGE', 
      entity: 'hackathon', 
      entityId: hackathonId, 
      details: { status: 'CANCELLED', reason } 
    });
    
    await redisClient.del('events:active');
    return updated;
  }

  async suspendEvent(hackathonId, organizerId, reason) {
    if (!reason) throw new AppError('A reason is required to suspend a hackathon.', 400);

    const hackathon = await prisma.hackathon.findUnique({ where: { id: hackathonId } });
    if (!hackathon) throw new AppError('Hackathon not found.', 404);

    if (['DRAFT', 'COMPLETED', 'CANCELLED', 'ARCHIVED'].includes(hackathon.status)) {
      throw new AppError(`Hackathons in the ${hackathon.status} state cannot be suspended.`, 409);
    }

    await this._assertTeamsWithinSizeBoundsForStatus(hackathonId, 'SUSPENDED');

    const updated = await prisma.hackathon.update({
      where: { id: hackathonId },
      data: { status: 'SUSPENDED' }
    });
    eventBus.emit('audit:log', { actorId: organizerId, action: 'STATUS_CHANGE', entity: 'hackathon', entityId: hackathonId, details: { status: 'SUSPENDED', reason } });
    await redisClient.del('events:active');
    return updated;
  }

  async resumeEvent(hackathonId, organizerId) {
    const hackathon = await prisma.hackathon.findUnique({ where: { id: hackathonId } });
    if (!hackathon) throw new AppError('Hackathon not found.', 404);

    if (hackathon.status !== 'SUSPENDED') {
      throw new AppError('Only suspended hackathons can be resumed.', 400);
    }

    const newStatus = this._calculateCurrentPhase(hackathon);
    this._validateEventConfiguration({ ...hackathon, status: newStatus });

    const judgingStartData = await this._buildJudgingStartData(hackathonId, hackathon.status, newStatus);
    await this._assertTeamsWithinSizeBoundsForStatus(hackathonId, newStatus);

    const updated = await prisma.hackathon.update({
      where: { id: hackathonId },
      data: { status: newStatus, ...judgingStartData }
    });
    
    eventBus.emit('audit:log', { 
      actorId: organizerId, 
      action: 'STATUS_CHANGE', 
      entity: 'hackathon', 
      entityId: hackathonId, 
      details: { status: newStatus, reason: 'Resumed from suspension' } 
    });
    
    await redisClient.del('events:active');
    return updated;
  }

  async updateSchedule(hackathonId, organizerId, scheduleData) {
    const hackathon = await prisma.hackathon.findUnique({ where: { id: hackathonId } });
    if (!hackathon) throw new AppError('Hackathon not found.', 404);

    // Save the new dates
    const mergedData = { ...hackathon, ...scheduleData };
    
    // Only recalculate phase if the event is in an active lifecycle state
    const inactiveStates = ['DRAFT', 'COMPLETED', 'CANCELLED', 'SUSPENDED', 'ARCHIVED'];
    let newStatus = hackathon.status;

    if (!inactiveStates.includes(hackathon.status)) {
      newStatus = this._calculateCurrentPhase(mergedData);
    }

    this._validateEventConfiguration({ ...mergedData, status: newStatus });

    const judgingStartData = await this._buildJudgingStartData(hackathonId, hackathon.status, newStatus);
    await this._assertTeamsWithinSizeBoundsForStatus(hackathonId, newStatus);

    const updated = await prisma.hackathon.update({
      where: { id: hackathonId },
      data: { 
        ...scheduleData,
        ...judgingStartData,
        status: newStatus 
      }
    });

    eventBus.emit('audit:log', { 
      actorId: organizerId, 
      action: 'SCHEDULE_UPDATED', 
      entity: 'hackathon', 
      entityId: hackathonId, 
      details: { updatedFields: Object.keys(scheduleData), newStatus } 
    });

    await redisClient.del('events:active');
    return updated;
  }

  async _assertTeamsWithinSizeBoundsForStatus(hackathonId, newStatus) {
    const competitionLockedStatuses = ['IN_PROGRESS', 'JUDGING', 'COMPLETED', 'CANCELLED', 'SUSPENDED', 'ARCHIVED'];
    if (!competitionLockedStatuses.includes(newStatus)) return;

    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
      select: { minTeamSize: true, maxTeamSize: true },
    });
    if (!hackathon) throw new AppError('Hackathon not found.', 404);

    const teams = await prisma.team.findMany({
      where: { hackathonId },
      include: { _count: { select: { members: true } } },
    });

    const invalidTeams = teams.filter((team) => (
      team._count.members < hackathon.minTeamSize ||
      team._count.members > hackathon.maxTeamSize
    ));

    if (invalidTeams.length > 0) {
      throw Object.assign(
        new AppError('Hackathon cannot enter this phase while teams violate size limits.', 409),
        {
          data: {
            invalidTeams: invalidTeams.map((team) => ({
              id: team.id,
              name: team.name,
              memberCount: team._count.members,
              minTeamSize: hackathon.minTeamSize,
              maxTeamSize: hackathon.maxTeamSize,
            })),
          },
        }
      );
    }
  }

  _calculateCurrentPhase(hackathon) {
    const now = new Date();
    let calculatedStatus = 'UPCOMING';

    if (hackathon.registrationStart && now >= hackathon.registrationStart) {
      calculatedStatus = 'REGISTRATION_OPEN';
    }

    const regCutoff = hackathon.registrationEnd || hackathon.eventStart;
    if (regCutoff && now >= regCutoff) {
      calculatedStatus = 'REGISTRATION_CLOSED';
    }

    if (hackathon.eventStart && now >= hackathon.eventStart) {
      calculatedStatus = 'IN_PROGRESS';
    }

    if (hackathon.submissionDeadline && now >= hackathon.submissionDeadline) {
      calculatedStatus = 'JUDGING';
    }

    return calculatedStatus;
  }

  async getQuickStats(hackathonId) {
    // 2026 Enterprise Standard: Optimized DB aggregations for live dashboard
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
      select: { maxParticipants: true, status: true }
    });
    
    if (!hackathon) throw new AppError('Hackathon not found.', 404);

    const registrationStats = await prisma.registration.groupBy({
      by: ['status'],
      where: { hackathonId },
      _count: { status: true }
    });

    const teamCount = await prisma.team.count({
      where: { hackathonId }
    });

    const submissionCount = await prisma.submission.count({
      where: { hackathonId }
    });

    // Format the group by results
    const counts = {
      REGISTERED: 0,
      WAITLISTED: 0,
      CHECKED_IN: 0,
      WITHDRAWN: 0
    };

    registrationStats.forEach(stat => {
      counts[stat.status] = stat._count.status;
    });

    return {
      eventStatus: hackathon.status,
      capacity: {
        max: hackathon.maxParticipants,
        current: counts.REGISTERED + counts.CHECKED_IN,
        waitlisted: counts.WAITLISTED
      },
      registrations: counts,
      teams: teamCount,
      submissions: submissionCount,
      timestamp: new Date()
    };
  }

  async completeEvent(hackathonId, organizerId, { reason = null, source = 'MANUAL' } = {}) {
    const hackathon = await prisma.hackathon.findUnique({ where: { id: hackathonId } });
    if (!hackathon) throw new AppError('Hackathon not found.', 404);

    if (hackathon.status === 'COMPLETED') {
      throw new AppError('Hackathon judging is already completed.', 409);
    }

    if (hackathon.status !== 'JUDGING') {
      throw new AppError('Hackathon can only be completed from the JUDGING state.', 409);
    }

    if (!hackathon.judgingEnd) {
      throw new AppError('Judging deadline must be configured before completing judging.', 409);
    }

    const now = new Date();
    const completedEarly = now < new Date(hackathon.judgingEnd);
    const normalizedReason = typeof reason === 'string' ? reason.trim() : '';

    if (completedEarly && !normalizedReason) {
      throw new AppError('A reason is required to complete judging before the judging deadline.', 400);
    }

    const scoringCompleteness = await this._getJudgingCompleteness(hackathonId);
    if (!scoringCompleteness.isComplete) {
      eventBus.emit('audit:log', {
        actorId: source === 'SCHEDULER' ? null : organizerId,
        action: 'WARNING_INSUFFICIENT_SCORES',
        entity: 'hackathon',
        entityId: hackathonId,
        details: {
          source,
          attemptedStatus: 'COMPLETED',
          completedEarly,
          scoringCompleteness,
        },
      });

      throw Object.assign(
        new AppError('Judging cannot be completed because required scoring is incomplete.', 409),
        {
          data: {
            status: 'SCORING_INCOMPLETE',
            scoringCompleteness,
          },
        },
      );
    }

    await this._assertTeamsWithinSizeBoundsForStatus(hackathonId, 'COMPLETED');

    const leaderboard = scoringCompleteness.eligibleSubmissions > 0
      ? await scoringService.normalizeAndRank(hackathonId)
      : [];

    const updated = await prisma.hackathon.update({
      where: { id: hackathonId },
      data: { status: 'COMPLETED' }
    });
    eventBus.emit('audit:log', {
      actorId: source === 'SCHEDULER' ? null : organizerId,
      action: 'STATUS_CHANGE',
      entity: 'hackathon',
      entityId: hackathonId,
      details: {
        status: 'COMPLETED',
        source,
        completedEarly,
        reason: completedEarly ? normalizedReason : null,
        scoringCompleteness: {
          eligibleSubmissions: scoringCompleteness.eligibleSubmissions,
          activeJudges: scoringCompleteness.activeJudges,
          criteria: scoringCompleteness.criteria,
          requiredScores: scoringCompleteness.requiredScores,
          submittedScores: scoringCompleteness.submittedScores,
        },
      },
    });
    await redisClient.del('events:active');
    return {
      hackathon: updated,
      completion: {
        completedEarly,
        reason: completedEarly ? normalizedReason : null,
        completedAt: new Date(),
        source,
      },
      scoringCompleteness,
      leaderboard,
    };
  }

  // ─── Private ──────────────────────────────────────────────────────────

  async _getJudgingCompleteness(hackathonId) {
    const [hackathon, eligibleSubmissions, criteria, activeJudges, assignments] = await Promise.all([
      prisma.hackathon.findUnique({
        where: { id: hackathonId },
        select: {
          judgingMode: true,
          requiredReviewsPerSubmission: true,
          effectiveRequiredReviewsPerSubmission: true,
        },
      }),
      prisma.submission.findMany({
        where: {
          hackathonId,
          status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'SCORED'] },
        },
        select: {
          id: true,
          title: true,
          team: { select: { name: true } },
        },
        orderBy: { submittedAt: 'asc' },
      }),
      prisma.judgingCriteria.findMany({
        where: { hackathonId },
        select: { id: true, name: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.staffAssignment.findMany({
        where: {
          hackathonId,
          staffRole: 'JUDGE',
          isActive: true,
        },
        select: {
          userId: true,
          user: {
            select: {
              email: true,
              profile: {
                select: { firstName: true, lastName: true },
              },
            },
          },
        },
      }),
      prisma.judgingAssignment.findMany({
        where: { hackathonId },
        select: {
          submissionId: true,
          judgeId: true,
        },
      }),
    ]);

    if (!hackathon) {
      throw new AppError('Hackathon not found.', 404);
    }

    const judgeById = new Map(activeJudges.map((judge) => [judge.userId, judge]));
    const assignmentMap = new Map();
    for (const assignment of assignments) {
      if (!assignmentMap.has(assignment.submissionId)) {
        assignmentMap.set(assignment.submissionId, new Set());
      }
      assignmentMap.get(assignment.submissionId).add(assignment.judgeId);
    }

    const effectiveRequiredReviewsPerSubmission = hackathon.effectiveRequiredReviewsPerSubmission
      ?? Math.min(hackathon.requiredReviewsPerSubmission || 3, activeJudges.length);

    if (eligibleSubmissions.length === 0) {
      return {
        isComplete: true,
        judgingMode: hackathon.judgingMode,
        requiredReviewsPerSubmission: hackathon.requiredReviewsPerSubmission,
        effectiveRequiredReviewsPerSubmission,
        eligibleSubmissions: 0,
        activeJudges: activeJudges.length,
        criteria: criteria.length,
        requiredScores: 0,
        submittedScores: 0,
        missingScores: [],
      };
    }

    const setupProblems = [];
    if (criteria.length === 0) setupProblems.push('NO_JUDGING_CRITERIA');
    if (activeJudges.length === 0) setupProblems.push('NO_ACTIVE_JUDGES');
    if (hackathon.judgingMode === 'MINIMUM_REVIEWS' && effectiveRequiredReviewsPerSubmission < 1) {
      setupProblems.push('NO_EFFECTIVE_REVIEW_REQUIREMENT');
    }
    if (hackathon.judgingMode === 'ASSIGNED_JUDGES' && assignments.length === 0) {
      setupProblems.push('NO_JUDGING_ASSIGNMENTS');
    }

    if (setupProblems.length > 0) {
      return {
        isComplete: false,
        judgingMode: hackathon.judgingMode,
        requiredReviewsPerSubmission: hackathon.requiredReviewsPerSubmission,
        effectiveRequiredReviewsPerSubmission,
        eligibleSubmissions: eligibleSubmissions.length,
        activeJudges: activeJudges.length,
        criteria: criteria.length,
        requiredScores: 0,
        submittedScores: 0,
        setupProblems,
        missingScores: [],
      };
    }

    const scores = await prisma.score.findMany({
      where: {
        submissionId: { in: eligibleSubmissions.map((submission) => submission.id) },
        judgeId: { in: activeJudges.map((judge) => judge.userId) },
        criteriaId: { in: criteria.map((criterion) => criterion.id) },
      },
      select: {
        submissionId: true,
        judgeId: true,
        criteriaId: true,
      },
    });

    const completeReviewKeys = new Set();
    const submittedScoreKeys = new Set(
      scores.map((score) => `${score.submissionId}:${score.judgeId}:${score.criteriaId}`),
    );
    for (const submission of eligibleSubmissions) {
      for (const judge of activeJudges) {
        const hasAllCriteria = criteria.every((criterion) => (
          submittedScoreKeys.has(`${submission.id}:${judge.userId}:${criterion.id}`)
        ));
        if (hasAllCriteria) {
          completeReviewKeys.add(`${submission.id}:${judge.userId}`);
        }
      }
    }

    const missingScores = [];
    const missingReviews = [];
    let requiredScores = 0;

    const expectedJudgeIdsForSubmission = (submissionId) => {
      if (hackathon.judgingMode === 'ALL_JUDGES_ALL_SUBMISSIONS') {
        return activeJudges.map((judge) => judge.userId);
      }
      if (hackathon.judgingMode === 'ASSIGNED_JUDGES') {
        return Array.from(assignmentMap.get(submissionId) || []);
      }
      return activeJudges.map((judge) => judge.userId);
    };

    for (const submission of eligibleSubmissions) {
      const expectedJudgeIds = expectedJudgeIdsForSubmission(submission.id);
      const completeReviewJudgeIds = expectedJudgeIds.filter((judgeId) => (
        completeReviewKeys.has(`${submission.id}:${judgeId}`)
      ));

      if (hackathon.judgingMode === 'MINIMUM_REVIEWS') {
        if (completeReviewJudgeIds.length < effectiveRequiredReviewsPerSubmission) {
          missingReviews.push({
            submissionId: submission.id,
            submissionTitle: submission.title,
            teamName: submission.team?.name || null,
            requiredCompleteReviews: effectiveRequiredReviewsPerSubmission,
            completedReviews: completeReviewJudgeIds.length,
          });
        }
        requiredScores += effectiveRequiredReviewsPerSubmission * criteria.length;
        continue;
      }

      if (hackathon.judgingMode === 'ASSIGNED_JUDGES' && expectedJudgeIds.length === 0) {
        missingReviews.push({
          submissionId: submission.id,
          submissionTitle: submission.title,
          teamName: submission.team?.name || null,
          requiredCompleteReviews: 1,
          completedReviews: 0,
          reason: 'NO_ASSIGNED_JUDGES',
        });
        continue;
      }

      requiredScores += expectedJudgeIds.length * criteria.length;

      for (const judgeId of expectedJudgeIds) {
        const judge = judgeById.get(judgeId);
        if (!judge) {
          missingReviews.push({
            submissionId: submission.id,
            submissionTitle: submission.title,
            teamName: submission.team?.name || null,
            judgeId,
            reason: 'ASSIGNED_JUDGE_INACTIVE_OR_NOT_FOUND',
          });
          continue;
        }
        for (const criterion of criteria) {
          const key = `${submission.id}:${judgeId}:${criterion.id}`;
          if (!submittedScoreKeys.has(key)) {
            missingScores.push({
              submissionId: submission.id,
              submissionTitle: submission.title,
              teamName: submission.team?.name || null,
              judgeId,
              judgeEmail: judge.user.email,
              judgeName: [
                judge.user.profile?.firstName,
                judge.user.profile?.lastName,
              ].filter(Boolean).join(' ') || null,
              criteriaId: criterion.id,
              criteriaName: criterion.name,
            });
          }
        }
      }
    }

    return {
      isComplete: missingScores.length === 0 && missingReviews.length === 0,
      judgingMode: hackathon.judgingMode,
      requiredReviewsPerSubmission: hackathon.requiredReviewsPerSubmission,
      effectiveRequiredReviewsPerSubmission,
      eligibleSubmissions: eligibleSubmissions.length,
      activeJudges: activeJudges.length,
      criteria: criteria.length,
      requiredScores,
      submittedScores: scores.length,
      missingScores,
      missingReviews,
    };
  }

  async _buildJudgingStartData(hackathonId, previousStatus, nextStatus) {
    if (nextStatus !== 'JUDGING' || previousStatus === 'JUDGING') {
      return {};
    }

    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
      select: {
        requiredReviewsPerSubmission: true,
      },
    });

    if (!hackathon) {
      throw new AppError('Hackathon not found.', 404);
    }

    const activeJudges = await prisma.staffAssignment.count({
      where: {
        hackathonId,
        staffRole: 'JUDGE',
        isActive: true,
      },
    });

    return {
      judgingPhase: 'IN_PROGRESS',
      effectiveRequiredReviewsPerSubmission: Math.min(
        hackathon.requiredReviewsPerSubmission || 3,
        activeJudges,
      ),
    };
  }

  async _promoteNextWaitlistedParticipant(tx, hackathonId) {
    const nextRegistration = await tx.registration.findFirst({
      where: {
        hackathonId,
        status: 'WAITLISTED',
      },
      orderBy: [
        { waitlistPosition: 'asc' },
        { createdAt: 'asc' },
      ],
      include: {
        user: {
          select: {
            profile: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!nextRegistration) return null;

    const promotedRegistration = await tx.registration.update({
      where: { id: nextRegistration.id },
      data: {
        status: 'REGISTERED',
        waitlistPosition: null,
        checkedInAt: null,
      },
    });

    if (nextRegistration.waitlistPosition) {
      await tx.registration.updateMany({
        where: {
          hackathonId,
          status: 'WAITLISTED',
          waitlistPosition: { gt: nextRegistration.waitlistPosition },
        },
        data: {
          waitlistPosition: { decrement: 1 },
        },
      });
    }

    return promotedRegistration;
  }

  _validateEventConfiguration(data) {
    if (data.minTeamSize && data.maxTeamSize && data.minTeamSize > data.maxTeamSize) {
      throw new AppError('Minimum team size cannot be greater than maximum team size.', 400);
    }

    const assertAfter = (laterField, earlierField, allowEqual = false) => {
      if (!data[laterField] || !data[earlierField]) return;

      const later = new Date(data[laterField]);
      const earlier = new Date(data[earlierField]);
      const isInvalid = allowEqual ? later < earlier : later <= earlier;

      if (isInvalid) {
        throw new AppError(`${laterField} must be after ${earlierField}.`, 400);
      }
    };

    assertAfter('registrationEnd', 'registrationStart');
    assertAfter('eventStart', 'registrationEnd');
    assertAfter('eventEnd', 'eventStart');
    assertAfter('submissionDeadline', 'eventStart');
    assertAfter('judgingStart', 'submissionDeadline', true);
    assertAfter('judgingEnd', 'judgingStart');
    assertAfter('judgingEnd', 'submissionDeadline');

    this._validatePublishingFields(data);
  }

  _validatePublishingFields(data) {
    const configuredStatuses = [
      'UPCOMING',
      'REGISTRATION_OPEN',
      'REGISTRATION_CLOSED',
      'IN_PROGRESS',
      'JUDGING',
      'COMPLETED',
    ];

    if (!configuredStatuses.includes(data.status)) return;

    const required = [
      'description',
      'registrationStart',
      'registrationEnd',
      'eventStart',
      'eventEnd',
      'submissionDeadline',
    ];

    const missing = required.filter((field) => (
      data[field] === null
      || data[field] === undefined
      || (typeof data[field] === 'string' && data[field].trim() === '')
    ));

    if (missing.length > 0) {
      throw new AppError(
        `Missing mandatory fields before publishing: ${missing.join(', ')}`,
        400
      );
    }
  }

  async _checkDuplicateTitle(title, overrideConflict, excludeId = null) {
    if (!title) return false;

    const existing = await prisma.hackathon.findFirst({
      where: {
        title: { equals: title, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

    if (existing) {
      if (!overrideConflict) {
        throw new AppError('A hackathon with this title already exists. Please review it or pass overrideConflict=true to proceed.', 409);
      }
      return true; // conflict overridden
    }
    return false;
  }

  _generateSlug(title) {
    const base = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 200);

    const suffix = Date.now().toString(36);
    return `${base}-${suffix}`;
  }

  // ─── Calendar Schedule ───────────────────────────────────────────────

  /**
   * Get the full lifecycle schedule for a hackathon in dual calendar format.
   * Returns each deadline in both Gregorian (ISO 8601 / EAT) and Ethiopian Calendar.
   * This allows the frontend to toggle between calendar formats without additional API calls.
   *
   * @param {string} hackathonId
   * @returns {object} schedule payload
   */
  async getSchedule(hackathonId) {
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
      select: {
        id: true,
        title: true,
        titleAm: true,
        registrationStart: true,
        registrationEnd: true,
        eventStart: true,
        eventEnd: true,
        submissionDeadline: true,
        feedbackDeadline: true,
        scoreboardReleaseAt: true,
        feedbackReleaseAt: true,
        status: true,
      },
    });

    if (!hackathon) {
      throw new AppError('Hackathon not found.', 404);
    }

    const buildDeadline = (label, labelAm, date, phase) => {
      if (!date) return null;
      const ethAm = toEthiopianFromDate(date, 'am');
      const ethEn = toEthiopianFromDate(date, 'en');
      return {
        phase,
        label,
        labelAm,
        gregorian: {
          iso: new Date(date).toISOString(),
          eat: formatEAT(date),
          eatTime: formatEATTime(date),
        },
        ethiopian: {
          formatted: ethEn.formatted,
          formattedAm: ethAm.formatted,
          year: ethAm.ethiopian.year,
          month: ethAm.ethiopian.month,
          day: ethAm.ethiopian.day,
        },
      };
    };

    const deadlines = [
      buildDeadline('Registration Opens', 'ምዝገባ ይጀምራል', hackathon.registrationStart, 'REGISTRATION_START'),
      buildDeadline('Registration Closes', 'ምዝገባ ይዘጋል', hackathon.registrationEnd, 'REGISTRATION_END'),
      buildDeadline('Event Starts', 'ክስተቱ ይጀምራል', hackathon.eventStart, 'EVENT_START'),
      buildDeadline('Event Ends', 'ክስተቱ ያልቃል', hackathon.eventEnd, 'EVENT_END'),
      buildDeadline('Submission Deadline', 'የማስረከቢያ ግዜ', hackathon.submissionDeadline, 'SUBMISSION_DEADLINE'),
      buildDeadline('Judging Deadline', 'የዳኝነት ግዜ', hackathon.feedbackDeadline, 'JUDGING_DEADLINE'),
      buildDeadline('Feedback Release', 'አስተያየት ይለቀቃል', hackathon.feedbackReleaseAt, 'FEEDBACK_RELEASE'),
      buildDeadline('Results Release', 'ውጤት ይለቀቃል', hackathon.scoreboardReleaseAt, 'RESULTS_RELEASE'),
    ].filter(Boolean);

    // Sort chronologically
    deadlines.sort((a, b) => new Date(a.gregorian.iso) - new Date(b.gregorian.iso));

    return {
      hackathonId: hackathon.id,
      title: hackathon.title,
      titleAm: hackathon.titleAm,
      status: hackathon.status,
      timezone: 'Africa/Addis_Ababa',
      utcOffset: '+03:00',
      deadlines,
    };
  }
}

module.exports = new EventsService();
