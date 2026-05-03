// =============================================================================
// HackET — Events (Hackathon) Service
// CRUD operations + discovery/filtering for hackathons.
// =============================================================================

const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const eventBus = require('../../utils/eventBus');

class EventsService {
  /**
   * Create a new hackathon.
   * @param {string} organizerId - The organizer's user ID
   * @param {object} data - Hackathon fields
   * @returns {object} Created hackathon
   */
  async create(organizerId, data) {
    const { tags, ...hackathonData } = data;

    // Generate slug from title
    const slug = this._generateSlug(hackathonData.title);

    const hackathon = await prisma.hackathon.create({
      data: {
        ...hackathonData,
        slug,
        organizerId,
        tags: tags
          ? { create: tags.map((tag) => ({ tag })) }
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
  async list({ status, region, theme, search, page = 1, limit = 12 } = {}) {
    const where = {};

    if (status) {
      where.status = Array.isArray(status) ? { in: status } : status;
    }
    if (region) where.region = { equals: region, mode: 'insensitive' };
    if (theme) {
      where.tags = { some: { tag: { equals: theme, mode: 'insensitive' } } };
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
   * @returns {object}
   */
  async update(hackathonId, organizerId, data) {
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
    });

    if (!hackathon) {
      throw new AppError('Hackathon not found.', 404);
    }

    if (hackathon.organizerId !== organizerId) {
      throw new AppError('You can only edit hackathons you organize.', 403);
    }

    const { tags, ...updateData } = data;

    const updated = await prisma.hackathon.update({
      where: { id: hackathonId },
      data: {
        ...updateData,
        tags: tags
          ? {
              deleteMany: {},
              create: tags.map((tag) => ({ tag })),
            }
          : undefined,
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

    if (hackathon.organizerId !== organizerId) {
      throw new AppError('You can only delete hackathons you organize.', 403);
    }

    await prisma.hackathon.delete({ where: { id: hackathonId } });

    eventBus.emit('audit:log', {
      actorId: organizerId,
      action: 'DELETE',
      entity: 'hackathon',
      entityId: hackathonId,
    });
  }

  /**
   * Register a participant for a hackathon (creates a solo team).
   * @param {string} hackathonId
   * @param {string} userId
   * @returns {object} Created team membership
   */
  async registerParticipant(hackathonId, userId) {
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
    });

    if (!hackathon) throw new AppError('Hackathon not found.', 404);

    const now = new Date();
    if (hackathon.status !== 'REGISTRATION_OPEN') {
      throw new AppError('Registration is not currently open.', 400);
    }
    if (now < hackathon.registrationStart || now > hackathon.registrationEnd) {
      throw new AppError('Registration window is closed.', 400);
    }

    // Check if already registered
    const existing = await prisma.teamMember.findFirst({
      where: {
        userId,
        team: { hackathonId },
      },
    });

    if (existing) {
      throw new AppError('You are already registered for this hackathon.', 409);
    }

    // Check max participants
    if (hackathon.maxParticipants) {
      const count = await prisma.teamMember.count({
        where: { team: { hackathonId } },
      });
      if (count >= hackathon.maxParticipants) {
        throw new AppError('This hackathon has reached maximum capacity.', 400);
      }
    }

    // Get user profile for naming
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { firstName: true, lastName: true },
    });

    const teamName = profile
      ? `${profile.firstName}'s Team`
      : `Team-${userId.substring(0, 8)}`;

    // Create solo team + membership
    const team = await prisma.team.create({
      data: {
        hackathonId,
        name: teamName,
        members: {
          create: { userId, role: 'leader' },
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, email: true } },
          },
        },
      },
    });

    return team;
  }

  // ─── Private ──────────────────────────────────────────────────────────

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
}

module.exports = new EventsService();
