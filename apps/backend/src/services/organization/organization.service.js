// =============================================================================
// HackET — Organization Service
// =============================================================================

const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const eventBus = require('../../utils/eventBus');
const { normalizePagination, buildPagination } = require('../../utils/pagination');

class OrganizationService {
  async listPublic(query = {}) {
    const { q, region, city } = query;
    const { page, limit, skip } = normalizePagination(query, { defaultLimit: 20, maxLimit: 100 });
    const where = {};
    if (region) where.region = { contains: region, mode: 'insensitive' };
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { region: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await prisma.$transaction([
      prisma.organization.count({ where }),
      prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: this._publicSelect(),
      }),
    ]);

    return { data, pagination: buildPagination({ page, limit, total }) };
  }

  async getPublicById(id) {
    const organization = await prisma.organization.findUnique({
      where: { id },
      select: {
        ...this._publicSelect(),
        members: {
          where: { role: 'ADMIN' },
          select: {
            user: { select: { id: true, profile: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
          },
          take: 5,
        },
      },
    });
    if (!organization) throw new AppError('Organization not found.', 404);
    return organization;
  }

  async listHackathons(id, query = {}) {
    const exists = await prisma.organization.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new AppError('Organization not found.', 404);

    const { page, limit, skip } = normalizePagination(query, { defaultLimit: 20, maxLimit: 100 });
    const where = { organizationId: id };
    if (query.status) where.status = query.status;

    const [total, data] = await prisma.$transaction([
      prisma.hackathon.count({ where }),
      prisma.hackathon.findMany({
        where,
        skip,
        take: limit,
        orderBy: { eventStart: 'desc' },
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          coverImageUrl: true,
          status: true,
          region: true,
          venue: true,
          isVirtual: true,
          registrationStart: true,
          registrationEnd: true,
          eventStart: true,
          eventEnd: true,
        },
      }),
    ]);

    return { data, pagination: buildPagination({ page, limit, total }) };
  }

  /**
   * Get the organization profile for the current user.
   */
  async getOrganizationProfile(userId) {
    const membership = await prisma.organizationMember.findFirst({
      where: { userId },
      include: {
        organization: true,
      },
    });

    if (!membership || !membership.organization) return null;

    return membership.organization;
  }

  /**
   * Update the organization profile details.
   */
  async updateOrganizationProfile(userId, updateData) {
    // Check membership and role
    const membership = await prisma.organizationMember.findFirst({
      where: { userId },
      include: {
        organization: true,
      },
    });

    if (!membership || !membership.organization) {
      throw new AppError('You do not belong to an organization.', 404);
    }

    if (membership.role !== 'ADMIN') {
      throw new AppError('You must be an organization ADMIN to update the host profile.', 403);
    }

    const updatedOrganization = await prisma.organization.update({
      where: { id: membership.organizationId },
      data: updateData,
    });

    eventBus.emit('audit:log', {
      actorId: userId,
      action: 'UPDATE',
      entity: 'organization',
      entityId: membership.organizationId,
    });

    return updatedOrganization;
  }

  _publicSelect() {
    return {
      id: true,
      name: true,
      nameAm: true,
      slug: true,
      description: true,
      descriptionAm: true,
      logoUrl: true,
      websiteUrl: true,
      contactEmail: true,
      city: true,
      region: true,
      createdAt: true,
      _count: { select: { hackathons: true, bookmarks: true } },
    };
  }
}

module.exports = new OrganizationService();
