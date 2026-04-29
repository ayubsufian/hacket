// =============================================================================
// HackET — Analytics Service
// Registration/submission trend aggregation with PDF/CSV export.
// =============================================================================

const prisma = require('../../config/database');
const PDFDocument = require('pdfkit');
const { createObjectCsvStringifier } = require('csv-writer');
const AppError = require('../../utils/AppError');

class AnalyticsService {
  /**
   * Get full analytics report data for a hackathon.
   */
  async getReport(hackathonId) {
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
      select: { id: true, title: true, eventStart: true, eventEnd: true },
    });

    if (!hackathon) throw new AppError('Hackathon not found.', 404);

    const [
      teamCount,
      participantCount,
      submissionCount,
      submissionsByStatus,
      topTeams,
      skillDistribution,
    ] = await Promise.all([
      prisma.team.count({ where: { hackathonId } }),
      prisma.teamMember.count({ where: { team: { hackathonId } } }),
      prisma.submission.count({ where: { hackathonId } }),
      prisma.submission.groupBy({
        by: ['status'],
        where: { hackathonId },
        _count: { id: true },
      }),
      prisma.submission.findMany({
        where: { hackathonId, finalScore: { not: null } },
        orderBy: { rank: 'asc' },
        take: 10,
        select: {
          rank: true,
          finalScore: true,
          title: true,
          team: { select: { name: true } },
        },
      }),
      this._getSkillDistribution(hackathonId),
    ]);

    return {
      hackathon,
      summary: {
        totalTeams: teamCount,
        totalParticipants: participantCount,
        totalSubmissions: submissionCount,
      },
      submissionsByStatus: submissionsByStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      topTeams: topTeams.map((t) => ({
        rank: t.rank,
        teamName: t.team.name,
        projectTitle: t.title,
        finalScore: t.finalScore,
      })),
      skillDistribution,
    };
  }

  /**
   * Generate a PDF report.
   * @returns {Buffer}
   */
  async generatePDF(hackathonId) {
    const data = await this.getReport(hackathonId);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Title ───────────────────────────────────────────────────────
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .text(`HackET Analytics Report`, { align: 'center' });
      doc.moveDown(0.5);
      doc
        .fontSize(16)
        .font('Helvetica')
        .text(data.hackathon.title, { align: 'center' });
      doc.moveDown(1);

      // ── Summary ─────────────────────────────────────────────────────
      doc.fontSize(14).font('Helvetica-Bold').text('Summary');
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica');
      doc.text(`Total Teams: ${data.summary.totalTeams}`);
      doc.text(`Total Participants: ${data.summary.totalParticipants}`);
      doc.text(`Total Submissions: ${data.summary.totalSubmissions}`);
      doc.moveDown(1);

      // ── Submission Status Breakdown ─────────────────────────────────
      doc.fontSize(14).font('Helvetica-Bold').text('Submissions by Status');
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica');
      for (const item of data.submissionsByStatus) {
        doc.text(`  ${item.status}: ${item.count}`);
      }
      doc.moveDown(1);

      // ── Top Teams ───────────────────────────────────────────────────
      if (data.topTeams.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Top Teams');
        doc.moveDown(0.3);
        doc.fontSize(11).font('Helvetica');
        for (const team of data.topTeams) {
          doc.text(
            `  #${team.rank} — ${team.teamName} (${team.projectTitle}) — Score: ${team.finalScore}`
          );
        }
        doc.moveDown(1);
      }

      // ── Skill Distribution ──────────────────────────────────────────
      if (data.skillDistribution.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Skill Distribution');
        doc.moveDown(0.3);
        doc.fontSize(11).font('Helvetica');
        for (const skill of data.skillDistribution.slice(0, 15)) {
          doc.text(`  ${skill.skill}: ${skill.count} participant(s)`);
        }
      }

      // ── Footer ──────────────────────────────────────────────────────
      doc.moveDown(2);
      doc
        .fontSize(9)
        .fillColor('#888888')
        .text(`Generated on ${new Date().toISOString()} by HackET Platform`, {
          align: 'center',
        });

      doc.end();
    });
  }

  /**
   * Generate a CSV report.
   * @returns {string} CSV string
   */
  async generateCSV(hackathonId) {
    const data = await this.getReport(hackathonId);

    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'metric', title: 'Metric' },
        { id: 'value', title: 'Value' },
      ],
    });

    const records = [
      { metric: 'Hackathon', value: data.hackathon.title },
      { metric: 'Total Teams', value: data.summary.totalTeams },
      { metric: 'Total Participants', value: data.summary.totalParticipants },
      { metric: 'Total Submissions', value: data.summary.totalSubmissions },
      { metric: '---', value: '---' },
      ...data.submissionsByStatus.map((s) => ({
        metric: `Submissions (${s.status})`,
        value: s.count,
      })),
      { metric: '---', value: '---' },
      ...data.topTeams.map((t) => ({
        metric: `#${t.rank} ${t.teamName}`,
        value: `Score: ${t.finalScore}`,
      })),
    ];

    return (
      csvStringifier.getHeaderString() +
      csvStringifier.stringifyRecords(records)
    );
  }

  // ─── Private ──────────────────────────────────────────────────────────

  async _getSkillDistribution(hackathonId) {
    const members = await prisma.teamMember.findMany({
      where: { team: { hackathonId } },
      include: {
        user: {
          select: {
            profile: { select: { skills: true } },
          },
        },
      },
    });

    const skillCounts = {};
    for (const member of members) {
      if (member.user.profile?.skills) {
        for (const skill of member.user.profile.skills) {
          const normalized = skill.toLowerCase().trim();
          skillCounts[normalized] = (skillCounts[normalized] || 0) + 1;
        }
      }
    }

    return Object.entries(skillCounts)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count);
  }
}

module.exports = new AnalyticsService();
