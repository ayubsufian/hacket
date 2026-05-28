const prisma = require('../../config/database');

const BANNED_WORDS = ['profanity', 'spam', 'hate', 'abuse']; // Basic moderation array

class DiscussionsService {
  _checkModeration(text) {
    const lower = text.toLowerCase();
    for (const word of BANNED_WORDS) {
      if (lower.includes(word)) return true;
    }
    return false;
  }

  async createPost(hackathonId, authorId, title, body, category) {
    const isFlagged = this._checkModeration(title + ' ' + body);
    
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
      metadata: isFlagged ? { prompt: 'Your post is under review.' } : { prompt: null }
    };
  }

  async createComment(discussionId, authorId, parentId, body) {
    const isFlagged = this._checkModeration(body);

    const comment = await prisma.discussionComment.create({
      data: {
        discussionId,
        authorId,
        parentId,
        body,
        status: isFlagged ? 'UNDER_REVIEW' : 'PUBLISHED',
      },
    });

    return {
      comment,
      metadata: isFlagged ? { prompt: 'Your post is under review.' } : { prompt: null }
    };
  }
}

module.exports = new DiscussionsService();
