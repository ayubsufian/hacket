// =============================================================================
// HackET — Bookmark Service
// =============================================================================

const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const eventBus = require('../../utils/eventBus');

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
  async getMyBookmarks(userId) {
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            description: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return bookmarks;
  }
}

module.exports = new BookmarkService();
