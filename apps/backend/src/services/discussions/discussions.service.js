const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const eventBus = require('../../utils/eventBus');
const { normalizePagination, buildPagination } = require('../../utils/pagination');

const BANNED_WORDS = ['profanity', 'spam', 'hate', 'abuse'];

class DiscussionsService {
  _checkModeration(text) {
    const lower = String(text || '').toLowerCase();
    for (const word of BANNED_WORDS) {
      if (lower.includes(word)) return true;
    }
    return false;
  }

  async list(query = {}, user) {
    const { page, limit, skip } = normalizePagination(query, { defaultLimit: 20, maxLimit: 100 });
    const where = {
      deletedAt: null,
    };

    if (query.hackathonId) where.hackathonId = query.hackathonId;
    if (query.category) where.category = query.category;
    if (query.pinned !== undefined) where.isPinned = query.pinned === 'true';
    if (query.isArchived !== undefined) where.isArchived = query.isArchived === 'true';
    if (query.status) {
      await this._assertModeratorForHackathon(query.hackathonId, user);
      where.status = query.status;
    } else {
      where.OR = [
        { status: 'PUBLISHED' },
        { authorId: user.id },
      ];
    }

    const [total, data] = await prisma.$transaction([
      prisma.discussion.count({ where }),
      prisma.discussion.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: {
          author: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
          _count: { select: { comments: true } },
        },
      }),
    ]);

    return {
      data,
      pagination: buildPagination({ page, limit, total }),
    };
  }

  async getById(id, query = {}, user) {
    const discussion = await prisma.discussion.findFirst({
      where: { id, deletedAt: null },
      include: {
        author: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
      },
    });
    if (!discussion) throw new AppError('Discussion not found.', 404);
    if (discussion.status !== 'PUBLISHED' && discussion.authorId !== user.id) {
      await this._assertModeratorForHackathon(discussion.hackathonId, user);
    }

    const comments = await this.listComments(id, query, user);
    return { ...discussion, comments };
  }

  async createPost(hackathonId, authorId, title, body, category) {
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
      select: { id: true, status: true },
    });
    if (!hackathon) throw new AppError('Hackathon not found.', 404);
    if (hackathon.status === 'ARCHIVED') throw new AppError('Archived hackathon discussions are read only.', 409);

    const isFlagged = this._checkModeration(`${title} ${body}`);
    const post = await prisma.discussion.create({
      data: {
        hackathonId,
        authorId,
        title,
        body,
        category: category || 'general',
        status: isFlagged ? 'UNDER_REVIEW' : 'PUBLISHED',
      },
    });

    return {
      post,
      metadata: isFlagged ? { prompt: 'Your post is under review.' } : { prompt: null },
    };
  }

  async updatePost(id, authorId, data) {
    const existing = await prisma.discussion.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new AppError('Discussion not found.', 404);
    if (existing.authorId !== authorId) throw new AppError('You can only edit your own discussion.', 403);
    this._assertWritable(existing);

    const isFlagged = this._checkModeration(`${data.title || existing.title} ${data.body || existing.body}`);
    const post = await prisma.discussion.update({
      where: { id },
      data: {
        ...data,
        category: data.category || existing.category,
        status: isFlagged ? 'UNDER_REVIEW' : existing.status,
      },
    });

    this._audit(authorId, 'DISCUSSION_UPDATED', 'discussion', id);
    return {
      post,
      metadata: isFlagged ? { prompt: 'Your post is under review.' } : { prompt: null },
    };
  }

  async deletePost(id, user) {
    const discussion = await prisma.discussion.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { comments: true } } },
    });
    if (!discussion) throw new AppError('Discussion not found.', 404);
    if (discussion.authorId !== user.id && user.role !== 'ADMIN') {
      throw new AppError('You can only delete your own discussion.', 403);
    }
    this._assertWritable(discussion);

    if (discussion._count.comments === 0) {
      await prisma.discussion.delete({ where: { id } });
      this._audit(user.id, 'DISCUSSION_DELETED', 'discussion', id, { hardDelete: true });
      return { message: 'Discussion deleted.' };
    }

    await prisma.discussion.update({
      where: { id },
      data: {
        title: '[deleted]',
        body: '[deleted]',
        deletedAt: new Date(),
        deletedBy: user.id,
      },
    });
    this._audit(user.id, 'DISCUSSION_DELETED', 'discussion', id, { hardDelete: false });
    return { message: 'Discussion removed.' };
  }

  async createComment(discussionId, authorId, parentId, body) {
    const discussion = await prisma.discussion.findFirst({ where: { id: discussionId, deletedAt: null } });
    if (!discussion) throw new AppError('Discussion not found.', 404);
    this._assertWritable(discussion);

    if (parentId) {
      const parent = await prisma.discussionComment.findFirst({
        where: { id: parentId, discussionId, deletedAt: null },
      });
      if (!parent) throw new AppError('Parent comment not found.', 404);
    }

    const isFlagged = this._checkModeration(body);
    const comment = await prisma.discussionComment.create({
      data: {
        discussionId,
        authorId,
        parentId: parentId || null,
        body,
        status: isFlagged ? 'UNDER_REVIEW' : 'PUBLISHED',
      },
    });

    return {
      comment,
      metadata: isFlagged ? { prompt: 'Your comment is under review.' } : { prompt: null },
    };
  }

  async listComments(discussionId, query = {}, user) {
    const discussion = await prisma.discussion.findFirst({ where: { id: discussionId, deletedAt: null } });
    if (!discussion) throw new AppError('Discussion not found.', 404);

    const { page, limit, skip } = normalizePagination(query, { defaultLimit: 50, maxLimit: 100 });
    const where = {
      discussionId,
      deletedAt: null,
      OR: [
        { status: 'PUBLISHED' },
        { authorId: user.id },
      ],
    };

    const [total, data] = await prisma.$transaction([
      prisma.discussionComment.count({ where }),
      prisma.discussionComment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ parentId: 'asc' }, { createdAt: 'asc' }],
        include: {
          author: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
          replies: {
            where: { deletedAt: null, status: 'PUBLISHED' },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
    ]);

    return {
      data,
      pagination: buildPagination({ page, limit, total }),
    };
  }

  async updateComment(commentId, authorId, body) {
    const existing = await prisma.discussionComment.findFirst({
      where: { id: commentId, deletedAt: null },
      include: { discussion: true },
    });
    if (!existing) throw new AppError('Comment not found.', 404);
    if (existing.authorId !== authorId) throw new AppError('You can only edit your own comment.', 403);
    this._assertWritable(existing.discussion);

    const isFlagged = this._checkModeration(body);
    const comment = await prisma.discussionComment.update({
      where: { id: commentId },
      data: {
        body,
        status: isFlagged ? 'UNDER_REVIEW' : existing.status,
      },
    });

    this._audit(authorId, 'DISCUSSION_COMMENT_UPDATED', 'discussionComment', commentId);
    return {
      comment,
      metadata: isFlagged ? { prompt: 'Your comment is under review.' } : { prompt: null },
    };
  }

  async deleteComment(commentId, user) {
    const comment = await prisma.discussionComment.findFirst({
      where: { id: commentId, deletedAt: null },
      include: { discussion: true, replies: { select: { id: true } } },
    });
    if (!comment) throw new AppError('Comment not found.', 404);
    if (comment.authorId !== user.id && user.role !== 'ADMIN') {
      throw new AppError('You can only delete your own comment.', 403);
    }
    this._assertWritable(comment.discussion);

    if (comment.replies.length === 0) {
      await prisma.discussionComment.delete({ where: { id: commentId } });
      this._audit(user.id, 'DISCUSSION_COMMENT_DELETED', 'discussionComment', commentId, { hardDelete: true });
      return { message: 'Comment deleted.' };
    }

    await prisma.discussionComment.update({
      where: { id: commentId },
      data: {
        body: '[deleted]',
        deletedAt: new Date(),
        deletedBy: user.id,
      },
    });
    this._audit(user.id, 'DISCUSSION_COMMENT_DELETED', 'discussionComment', commentId, { hardDelete: false });
    return { message: 'Comment removed.' };
  }

  async updateStatus(id, user, status) {
    const discussion = await prisma.discussion.findFirst({ where: { id, deletedAt: null } });
    if (!discussion) throw new AppError('Discussion not found.', 404);
    await this._assertModeratorForHackathon(discussion.hackathonId, user);

    const updated = await prisma.discussion.update({ where: { id }, data: { status } });
    this._audit(user.id, 'DISCUSSION_STATUS_CHANGED', 'discussion', id, { status });
    return updated;
  }

  async setPinned(id, user, isPinned) {
    const discussion = await prisma.discussion.findFirst({ where: { id, deletedAt: null } });
    if (!discussion) throw new AppError('Discussion not found.', 404);
    await this._assertModeratorForHackathon(discussion.hackathonId, user);

    const updated = await prisma.discussion.update({ where: { id }, data: { isPinned } });
    this._audit(user.id, isPinned ? 'DISCUSSION_PINNED' : 'DISCUSSION_UNPINNED', 'discussion', id);
    return updated;
  }

  async flagPost(discussionId, reporterId, { reason, details }) {
    const discussion = await prisma.discussion.findFirst({ where: { id: discussionId, deletedAt: null } });
    if (!discussion) throw new AppError('Discussion not found.', 404);

    const flag = await prisma.discussionFlag.create({
      data: { reporterId, discussionId, reason, details: details || null },
    });
    this._audit(reporterId, 'DISCUSSION_FLAGGED', 'discussion', discussionId, { reason, flagId: flag.id });
    return flag;
  }

  async flagComment(commentId, reporterId, { reason, details }) {
    const comment = await prisma.discussionComment.findFirst({ where: { id: commentId, deletedAt: null } });
    if (!comment) throw new AppError('Comment not found.', 404);

    const flag = await prisma.discussionFlag.create({
      data: { reporterId, commentId, reason, details: details || null },
    });
    this._audit(reporterId, 'DISCUSSION_FLAGGED', 'discussionComment', commentId, { reason, flagId: flag.id });
    return flag;
  }

  _assertWritable(discussion) {
    if (discussion.isArchived || discussion.status === 'ARCHIVED') {
      throw new AppError('Archived discussions are read only.', 409);
    }
    if (discussion.isLocked) {
      throw new AppError('This discussion is locked.', 409);
    }
  }

  async _assertModeratorForHackathon(hackathonId, user) {
    if (user.role === 'ADMIN') return;
    if (!hackathonId) throw new AppError('Hackathon ID is required for moderation.', 400);

    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
      select: { organizerId: true },
    });
    if (!hackathon) throw new AppError('Hackathon not found.', 404);
    if (hackathon.organizerId === user.id) return;

    const staff = await prisma.staffAssignment.findFirst({
      where: {
        hackathonId,
        userId: user.id,
        isActive: true,
        staffRole: { in: ['CO_ORGANIZER', 'COMMUNICATIONS'] },
      },
    });
    if (staff) return;

    throw new AppError('You do not have moderation access for this hackathon.', 403);
  }

  _audit(actorId, action, entity, entityId, details = {}) {
    eventBus.emit('audit:log', { actorId, action, entity, entityId, details });
  }
}

module.exports = new DiscussionsService();
