// =============================================================================
// HackET - Submissions Service
// Project submission management with version history and authorization.
// =============================================================================

const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const eventBus = require('../../utils/eventBus');

const SUBMISSION_EDIT_STATUSES = new Set(['DRAFT', 'SUBMITTED']);
const SUBMISSION_ACCEPTING_EVENT_STATUSES = new Set(['IN_PROGRESS']);
const STAFF_SUBMISSION_ROLES = ['CO_ORGANIZER', 'TECHNICAL_LEAD', 'JUDGE'];

const clampLimit = (value, fallback = 20, max = 100) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

const positivePage = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
};

class SubmissionsService {
  /**
   * Create or replace the editable submission payload for a team.
   */
  async upsert({ teamId, userId, data }) {
    const membership = await this._ensureTeamMember(teamId, userId);
    const team = await this._getTeamForSubmission(teamId);

    this._assertSubmissionWindowOpen(team.hackathon);

    const submissionData = this._buildSubmissionData(data, { partial: false });
    this._validateFileUrls(submissionData.fileUrls);

    let submission;

    if (team.submission) {
      this._assertEditable(team.submission);
      await this._archiveVersion(team.submission, userId);

      submission = await prisma.submission.update({
        where: { id: team.submission.id },
        data: {
          ...submissionData,
          version: { increment: 1 },
        },
      });
    } else {
      submission = await prisma.submission.create({
        data: {
          ...submissionData,
          teamId,
          hackathonId: team.hackathon.id,
          status: 'DRAFT',
        },
      });

      eventBus.emit('submission:created', {
        submissionId: submission.id,
        teamId,
        hackathonId: team.hackathon.id,
      });
    }

    this._emitAudit(userId, team.submission ? 'SUBMISSION_UPDATED' : 'SUBMISSION_CREATED', submission.id, {
      teamId,
      membershipRole: membership.role,
    });

    return submission;
  }

  /**
   * Partially update an existing submission.
   */
  async patch(submissionId, userId, data) {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        team: {
          include: {
            members: true,
            hackathon: true,
          },
        },
      },
    });

    if (!submission) throw new AppError('Submission not found.', 404);
    this._ensureUserInSubmissionTeam(submission, userId);
    this._assertSubmissionWindowOpen(submission.team.hackathon);
    this._assertEditable(submission);

    const patchData = this._buildSubmissionData(data, { partial: true });
    if (patchData.fileUrls) this._validateFileUrls(patchData.fileUrls);

    await this._archiveVersion(submission, userId);

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        ...patchData,
        version: { increment: 1 },
      },
    });

    this._emitAudit(userId, 'SUBMISSION_UPDATED', submissionId, {
      teamId: submission.teamId,
      fields: Object.keys(patchData),
      partial: true,
    });

    return updated;
  }

  /**
   * Finalize (submit) a draft submission.
   */
  async submit(submissionId, userId) {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        team: {
          include: {
            members: true,
            hackathon: true,
          },
        },
      },
    });

    if (!submission) throw new AppError('Submission not found.', 404);
    this._ensureUserInSubmissionTeam(submission, userId);
    this._assertSubmissionWindowOpen(submission.team.hackathon);

    if (submission.status !== 'DRAFT') {
      throw new AppError(`Submission is already ${submission.status.toLowerCase()}.`, 400);
    }

    if (
      !submission.title ||
      (!submission.githubUrl &&
        !submission.videoUrl &&
        !submission.demoUrl &&
        submission.fileUrls.length === 0)
    ) {
      throw new AppError(
        'Submission must have a title and at least one project link or file.',
        400
      );
    }

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
    });

    this._emitAudit(userId, 'SUBMISSION_SUBMITTED', submissionId, {
      teamId: submission.teamId,
      hackathonId: submission.hackathonId,
    });

    return updated;
  }

  /**
   * Withdraw a submitted project back to draft before the deadline.
   */
  async withdraw(submissionId, userId) {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        team: {
          include: {
            members: true,
            hackathon: true,
          },
        },
      },
    });

    if (!submission) throw new AppError('Submission not found.', 404);
    this._ensureUserInSubmissionTeam(submission, userId);
    this._assertSubmissionWindowOpen(submission.team.hackathon);

    if (submission.status === 'SCORED' || submission.status === 'UNDER_REVIEW') {
      throw new AppError('Submissions under review or scored cannot be withdrawn.', 409);
    }

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: 'DRAFT',
        submittedAt: null,
      },
    });

    this._emitAudit(userId, 'SUBMISSION_WITHDRAWN', submissionId, {
      teamId: submission.teamId,
      hackathonId: submission.hackathonId,
    });

    return updated;
  }

  /**
   * Get a submission by ID with optional richer includes.
   */
  async getById(submissionId, user, { include = '' } = {}) {
    const includeSet = new Set(
      String(include || 'team')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    );

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        team: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
                  },
                },
              },
            },
          },
        },
        hackathon: true,
      },
    });

    if (!submission) throw new AppError('Submission not found.', 404);

    const access = await this._authorizeSubmissionAccess(user, submission);
    const response = { ...submission };

    if (!includeSet.has('team')) {
      delete response.team;
    }

    if (includeSet.has('scores')) {
      if (!access.canViewScores) {
        throw new AppError('Scores are not visible for this submission yet.', 403);
      }
      response.scores = await prisma.score.findMany({
        where: { submissionId },
        include: {
          criteria: { select: { id: true, name: true, maxScore: true, weight: true, sortOrder: true } },
          judge: {
            select: {
              id: true,
              email: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: [{ criteria: { sortOrder: 'asc' } }, { createdAt: 'asc' }],
      });
    }

    return response;
  }

  /**
   * Get previous versions for a submission.
   */
  async getHistory(submissionId, user) {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        team: { include: { members: true } },
        hackathon: true,
      },
    });

    if (!submission) throw new AppError('Submission not found.', 404);
    await this._authorizeSubmissionAccess(user, submission);

    return prisma.submissionHistory.findMany({
      where: { submissionId },
      orderBy: { changedAt: 'desc' },
      include: {
        changedByUser: {
          select: {
            id: true,
            email: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  async getFiles(submissionId, user) {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        team: { include: { members: true } },
        hackathon: true,
      },
    });

    if (!submission) throw new AppError('Submission not found.', 404);
    await this._authorizeSubmissionAccess(user, submission);

    return submission.fileUrls.map((url) => ({
      url,
      downloadUrl: url,
      filename: url.split('/').pop(),
    }));
  }

  /**
   * List submissions for teams the authenticated participant belongs to.
   */
  async listMine(userId, { page = 1, limit = 20, hackathonId, status } = {}) {
    const normalizedPage = positivePage(page);
    const normalizedLimit = clampLimit(limit);
    const offset = (normalizedPage - 1) * normalizedLimit;

    const where = {
      team: { members: { some: { userId } } },
      ...(hackathonId ? { hackathonId } : {}),
      ...(status ? { status } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: offset,
        take: normalizedLimit,
        include: {
          team: { select: { id: true, name: true } },
          hackathon: { select: { id: true, slug: true, title: true, status: true } },
        },
      }),
      prisma.submission.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page: normalizedPage,
        limit: normalizedLimit,
        total,
        totalPages: Math.ceil(total / normalizedLimit),
      },
    };
  }

  /**
   * List submissions for a hackathon.
   */
  async listByHackathon(hackathonId, { page = 1, limit = 20, status } = {}) {
    const normalizedPage = positivePage(page);
    const normalizedLimit = clampLimit(limit);
    const offset = (normalizedPage - 1) * normalizedLimit;

    const where = {
      hackathonId,
      ...(status ? { status } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: normalizedLimit,
        include: {
          team: { select: { id: true, name: true } },
          hackathon: { select: { id: true, title: true, status: true } },
        },
      }),
      prisma.submission.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page: normalizedPage,
        limit: normalizedLimit,
        total,
        totalPages: Math.ceil(total / normalizedLimit),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  async _ensureTeamMember(teamId, userId) {
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!membership) {
      throw new AppError('You are not a member of this team.', 403);
    }
    return membership;
  }

  _ensureUserInSubmissionTeam(submission, userId) {
    const isMember = submission.team.members.some((member) => member.userId === userId);
    if (!isMember) {
      throw new AppError('You are not a member of this team.', 403);
    }
  }

  async _getTeamForSubmission(teamId) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        hackathon: true,
        submission: true,
      },
    });

    if (!team) throw new AppError('Team not found.', 404);
    return team;
  }

  _assertSubmissionWindowOpen(hackathon) {
    if (!SUBMISSION_ACCEPTING_EVENT_STATUSES.has(hackathon.status)) {
      throw new AppError('Submissions are not being accepted at this time.', 409);
    }

    if (hackathon.submissionDeadline && new Date() > hackathon.submissionDeadline) {
      throw new AppError('Submission deadline has passed. Submission is locked.', 409);
    }
  }

  _assertEditable(submission) {
    if (!SUBMISSION_EDIT_STATUSES.has(submission.status)) {
      throw new AppError(`Submission cannot be edited while ${submission.status.toLowerCase()}.`, 409);
    }
  }

  _buildSubmissionData(data, { partial }) {
    const allowed = [
      'title',
      'description',
      'githubUrl',
      'videoUrl',
      'demoUrl',
      'slidesUrl',
      'fileUrls',
    ];

    const result = {};
    for (const field of allowed) {
      if (data[field] !== undefined) result[field] = data[field];
    }

    if (!partial) {
      return {
        title: result.title,
        description: result.description,
        githubUrl: result.githubUrl,
        videoUrl: result.videoUrl,
        demoUrl: result.demoUrl,
        slidesUrl: result.slidesUrl,
        fileUrls: result.fileUrls || [],
      };
    }

    return result;
  }

  _validateFileUrls(fileUrls = []) {
    const urls = Array.isArray(fileUrls) ? fileUrls : [];
    for (const url of urls) {
      const value = String(url || '');
      const isStorageUrl =
        value.startsWith('/api/v1/storage/submissions/') ||
        value.startsWith('/uploads/tmp/') ||
        /^https?:\/\/[^/]+\/api\/v1\/storage\/submissions\//i.test(value);

      if (!isStorageUrl) {
        throw new AppError('Submission files must use authorized HackET submission storage URLs.', 400);
      }
    }
  }

  async _archiveVersion(submission, changedBy) {
    await prisma.submissionHistory.create({
      data: {
        submissionId: submission.id,
        previousTitle: submission.title,
        previousDescription: submission.description,
        previousFileUrls: submission.fileUrls,
        changedBy,
      },
    });
  }

  async _authorizeSubmissionAccess(user, submission) {
    const isTeamMember = submission.team.members.some((member) => member.userId === user.id);
    const isOrganizer = submission.hackathon.organizerId === user.id;

    if (user.role === 'ADMIN' || isTeamMember || isOrganizer) {
      return {
        canViewScores: user.role === 'ADMIN' || isOrganizer || this._isFeedbackReleased(submission),
      };
    }

    const staffAssignment = await prisma.staffAssignment.findFirst({
      where: {
        userId: user.id,
        hackathonId: submission.hackathonId,
        staffRole: { in: STAFF_SUBMISSION_ROLES },
        isActive: true,
      },
      select: { staffRole: true },
    });

    if (!staffAssignment) {
      throw new AppError('You do not have access to this submission.', 403);
    }

    return { canViewScores: true, staffRole: staffAssignment.staffRole };
  }

  _isFeedbackReleased(submission) {
    return (
      submission.isFeedbackVisible ||
      (submission.hackathon.feedbackVisibility === 'RELEASED' &&
        ['COMPLETED', 'ARCHIVED'].includes(submission.hackathon.status))
    );
  }

  _emitAudit(actorId, action, submissionId, details) {
    eventBus.emit('audit:log', {
      actorId,
      action,
      entity: 'submission',
      entityId: submissionId,
      details,
    });
  }
}

module.exports = new SubmissionsService();
