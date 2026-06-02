// =============================================================================
// HackET — Bookmark Service
// =============================================================================

const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const eventBus = require('../../utils/eventBus');
const { normalizePagination, buildPagination } = require('../../utils/pagination');

const MAX_BOOKMARKS = 100;

class BookmarkService {
  /**
   * Add an organization to the user's favorites.
   */
  async addBookmark(userId, organizationId) {
    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new AppError('Organization not found.', 404);
    }

    // Check if already bookmarked
    const existing = await prisma.bookmark.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (existing) {
      return existing; // Idempotent
    }

    // Enforce MAX limit
    const currentCount = await prisma.bookmark.count({
      where: { userId },
    });

    if (currentCount >= MAX_BOOKMARKS) {
      throw new AppError(
        'Maximum number of favorites reached. Please remove an existing one to add a new one.',
        400
      );
    }

    // Create bookmark
    const bookmark = await prisma.bookmark.create({
      data: {
        userId,
        organizationId,
      },
    });

    eventBus.emit('audit:log', {
      actorId: userId,
      action: 'CREATE',
      entity: 'bookmark',
      entityId: bookmark.id,
      details: { organizationId },
    });

    return bookmark;
  }

  /**
   * Remove an organization from the user's favorites.
   */
  async removeBookmark(userId, organizationId) {
    const existing = await prisma.bookmark.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!existing) {
      throw new AppError('Bookmark not found.', 404);
    }

    await prisma.bookmark.delete({
      where: { id: existing.id },
    });

    eventBus.emit('audit:log', {
      actorId: userId,
      action: 'DELETE',
      entity: 'bookmark',
      entityId: existing.id,
      details: { organizationId },
    });
  }

  /**
   * Fetch user's bookmarks
   */
  async getMyBookmarks(userId, query = {}) {
    const { page, limit, skip } = normalizePagination(query, { defaultLimit: 20, maxLimit: 100 });
    const where = { userId };

    const [total, data] = await prisma.$transaction([
      prisma.bookmark.count({ where }),
      prisma.bookmark.findMany({
        where,
        skip,
        take: limit,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              description: true,
              city: true,
              region: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return {
      data,
      pagination: buildPagination({ page, limit, total }),
    };
  }

  async checkBookmark(userId, organizationId) {
    return prisma.bookmark.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      select: { id: true },
    });
  }

  async bulkAddBookmarks(userId, organizationIds) {
    const uniqueOrganizationIds = [...new Set(organizationIds)];
    const organizations = await prisma.organization.findMany({
      where: { id: { in: uniqueOrganizationIds } },
      select: { id: true },
    });
    const foundIds = new Set(organizations.map((organization) => organization.id));
    const missingIds = uniqueOrganizationIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      throw new AppError('One or more organizations were not found.', 404);
    }

    const currentCount = await prisma.bookmark.count({ where: { userId } });
    if (currentCount + uniqueOrganizationIds.length > MAX_BOOKMARKS) {
      throw new AppError('Bulk add would exceed the maximum number of favorites.', 400);
    }

    const result = await prisma.bookmark.createMany({
      data: uniqueOrganizationIds.map((organizationId) => ({ userId, organizationId })),
      skipDuplicates: true,
    });

    eventBus.emit('audit:log', {
      actorId: userId,
      action: 'CREATE',
      entity: 'bookmark',
      details: { organizationIds: uniqueOrganizationIds, createdCount: result.count },
    });

    return {
      createdCount: result.count,
      organizationIds: uniqueOrganizationIds,
    };
  }
}

module.exports = new BookmarkService();
