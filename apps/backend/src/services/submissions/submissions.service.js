// =============================================================================
// HackET — Submissions Service
// Project submission management with deadline enforcement.
// =============================================================================

const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const eventBus = require('../../utils/eventBus');

class SubmissionsService {
  /**
   * Create or update a submission for a team.
   */
  async upsert({ teamId, userId, data }) {
    // Verify user is on the team
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!membership) {
      throw new AppError('You are not a member of this team.', 403);
    }

    // Get team + hackathon for deadline enforcement
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        hackathon: {
          select: {
            id: true,
            submissionDeadline: true,
            status: true,
          },
        },
        submission: true,
      },
    });

    if (!team) throw new AppError('Team not found.', 404);

    // Deadline check
    const now = new Date();
    if (now > team.hackathon.submissionDeadline) {
      throw new AppError('Submission deadline has passed. Submission is locked.', 400);
    }

    if (!['IN_PROGRESS', 'JUDGING'].includes(team.hackathon.status)) {
      throw new AppError(
        'Submissions are not being accepted at this time.',
        400
      );
    }

    const submissionData = {
      title: data.title,
      description: data.description,
      githubUrl: data.githubUrl,
      videoUrl: data.videoUrl,
      demoUrl: data.demoUrl,
      slidesUrl: data.slidesUrl,
      fileUrls: data.fileUrls || [],
    };

    let submission;

    if (team.submission) {
      // AF3: Archive previous version metadata
      await prisma.submissionHistory.create({
        data: {
          submissionId: team.submission.id,
          previousTitle: team.submission.title,
          previousDescription: team.submission.description,
          previousFileUrls: team.submission.fileUrls,
          changedBy: userId
        }
      });

      // Update existing
      submission = await prisma.submission.update({
        where: { id: team.submission.id },
        data: submissionData,
      });
    } else {
      // Create new
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

    eventBus.emit('audit:log', {
      actorId: userId,
      action: team.submission ? 'UPDATE' : 'CREATE',
      entity: 'submission',
      entityId: submission.id,
      details: { teamId },
    });

    return submission;
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
            members: { select: { userId: true } },
            hackathon: { select: { submissionDeadline: true } },
          },
        },
      },
    });

    if (!submission) throw new AppError('Submission not found.', 404);

    // Verify the user is a team member
    const isMember = submission.team.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new AppError('You are not a member of this team.', 403);
    }

    if (submission.status !== 'DRAFT') {
      throw new AppError(`Submission is already ${submission.status.toLowerCase()}.`, 400);
    }

    // Deadline check
    if (new Date() > submission.team.hackathon.submissionDeadline) {
      throw new AppError('Submission deadline has passed. Submission is locked.', 400);
    }

    // Require at least a title and one link
    if (
      !submission.title ||
      (!submission.githubUrl && !submission.videoUrl && !submission.demoUrl && submission.fileUrls.length === 0)
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

    return updated;
  }

  /**
   * Get a submission by ID.
   */
  async getById(submissionId) {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        team: {
          select: {
            name: true,
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    profile: { select: { firstName: true, lastName: true } },
                  },
                },
              },
            },
          },
        },
        scores: {
          include: {
            criteria: { select: { name: true, maxScore: true } },
          },
        },
      },
    });

    if (!submission) throw new AppError('Submission not found.', 404);
    return submission;
  }

  /**
   * List submissions for a hackathon.
   */
  async listByHackathon(hackathonId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.submission.findMany({
        where: { hackathonId },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          team: { select: { name: true } },
        },
      }),
      prisma.submission.count({ where: { hackathonId } }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new SubmissionsService();
