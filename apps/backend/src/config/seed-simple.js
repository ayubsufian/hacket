// Simple seed - creates 9 hackathons with cover images
const { PrismaClient, HackathonStatus, JudgingPhase, TeamMemberRole, UserRole, VerificationStatus, StaffRole } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const DATABASE_URL = process.env.DATABASE_URL;
const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: DATABASE_URL })) });

const UUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = Math.random() * 16 | 0;
  return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
});

const hash = (p) => bcrypt.hash(p, 12);

const COVERS = {
  grand2025: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&h=600&fit=crop',
  summer2026: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&h=600&fit=crop',
  fintech: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&h=600&fit=crop',
  aiChallenge: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=600&fit=crop',
  health: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&h=600&fit=crop',
  education: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=1200&h=600&fit=crop',
  agriculture: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1200&h=600&fit=crop',
  energy: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&h=600&fit=crop',
  transport: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1200&h=600&fit=crop',
};

async function main() {
  console.log('🌱 Starting simple seed...\n');

  // Clean all data
  console.log('Cleaning database...');
  await prisma.$transaction([
    prisma.score.deleteMany(),
    prisma.judgingAssignment.deleteMany(),
    prisma.scoreboardEntry.deleteMany(),
    prisma.submission.deleteMany(),
    prisma.teamInvitation.deleteMany(),
    prisma.teamMember.deleteMany(),
    prisma.team.deleteMany(),
    prisma.judgingCriteria.deleteMany(),
    prisma.staffAssignment.deleteMany(),
    prisma.registration.deleteMany(),
    prisma.hackathon.deleteMany(),
    prisma.userProfile.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // Create users
  console.log('\nCreating users...');
  const users = [];
  const userData = [
    { email: 'admin@hacket.et', password: 'Admin@HackET2026', role: UserRole.ADMIN, first: 'Yonas', last: 'Bekele' },
    { email: 'organizer@hacket.et', password: 'Organizer@123', role: UserRole.ORGANIZER, first: 'Sarah', last: 'Tadesse' },
    { email: 'organizer2@hacket.et', password: 'Organizer@123', role: UserRole.ORGANIZER, first: 'Daniel', last: 'Girma' },
    { email: 'judge@hacket.et', password: 'Judge@123', role: UserRole.JUDGE, first: 'Helen', last: 'Hailu' },
    { email: 'judge2@hacket.et', password: 'Judge@123', role: UserRole.JUDGE, first: 'Kaleb', last: 'Alemu' },
    { email: 'mentor@hacket.et', password: 'Mentor@123', role: UserRole.MENTOR, first: 'Maria', last: 'Bekele' },
    { email: 'mentor2@hacket.et', password: 'Mentor@123', role: UserRole.MENTOR, first: 'Solomon', last: 'Tadesse' },
    { email: 'participant1@hacket.et', password: 'Participant@123', role: UserRole.PARTICIPANT, first: 'Tigist', last: 'Girma' },
    { email: 'participant2@hacket.et', password: 'Participant@123', role: UserRole.PARTICIPANT, first: 'Alex', last: 'Hailu' },
    { email: 'participant3@hacket.et', password: 'Participant@123', role: UserRole.PARTICIPANT, first: 'Abeba', last: 'Alemu' },
    { email: 'participant4@hacket.et', password: 'Participant@123', role: UserRole.PARTICIPANT, first: 'James', last: 'Bekele' },
    { email: 'participant5@hacket.et', password: 'Participant@123', role: UserRole.PARTICIPANT, first: 'Almaz', last: 'Tadesse' },
  ];

  for (const u of userData) {
    const user = await prisma.user.create({
      data: {
        id: UUID(),
        email: u.email,
        password: await hash(u.password),
        role: u.role,
        verificationStatus: VerificationStatus.VERIFIED,
        isActive: true,
        profile: {
          create: {
            firstName: u.first,
            lastName: u.last,
            preferredLocale: 'en',
            isSeekingTeam: u.role === UserRole.PARTICIPANT,
          }
        }
      }
    });
    users.push(user);
    console.log(`  ✓ ${u.role}: ${u.email}`);
  }

  const [admin, org1, org2, judge1, judge2, mentor1, mentor2, ...participants] = users;

  // Create 9 hackathons
  console.log('\nCreating 9 hackathons with cover images...');
  const now = new Date();
  const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const hackathons = [
    {
      title: 'HackET Grand Challenge 2025',
      slug: 'hacket-grand-challenge-2025',
      status: HackathonStatus.COMPLETED,
      cover: COVERS.grand2025,
      organizer: org1,
      regStart: new Date(lastMonth.getTime() - 60 * 24 * 60 * 60 * 1000),
      regEnd: new Date(lastMonth.getTime() - 45 * 24 * 60 * 60 * 1000),
      eventStart: new Date(lastMonth.getTime() - 30 * 24 * 60 * 60 * 1000),
      eventEnd: new Date(lastMonth.getTime() - 28 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'HackET Summer Hackathon 2026',
      slug: 'hacket-summer-2026',
      status: HackathonStatus.REGISTRATION_OPEN,
      cover: COVERS.summer2026,
      organizer: org2,
      regStart: new Date(),
      regEnd: nextMonth,
      eventStart: new Date(nextMonth.getTime() + 7 * 24 * 60 * 60 * 1000),
      eventEnd: new Date(nextMonth.getTime() + 9 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'HackET AI Challenge 2026',
      slug: 'hacket-ai-challenge-2026',
      status: HackathonStatus.DRAFT,
      cover: COVERS.aiChallenge,
      organizer: org1,
      regStart: new Date(nextMonth.getTime() + 15 * 24 * 60 * 60 * 1000),
      regEnd: new Date(nextMonth.getTime() + 45 * 24 * 60 * 60 * 1000),
      eventStart: new Date(nextMonth.getTime() + 60 * 24 * 60 * 60 * 1000),
      eventEnd: new Date(nextMonth.getTime() + 62 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'HackET FinTech Innovation 2026',
      slug: 'hacket-fintech-2026',
      status: HackathonStatus.UPCOMING,
      cover: COVERS.fintech,
      organizer: org2,
      regStart: new Date(nextMonth.getTime() + 10 * 24 * 60 * 60 * 1000),
      regEnd: new Date(nextMonth.getTime() + 40 * 24 * 60 * 60 * 1000),
      eventStart: new Date(nextMonth.getTime() + 45 * 24 * 60 * 60 * 1000),
      eventEnd: new Date(nextMonth.getTime() + 47 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'HackET HealthTech Summit 2025',
      slug: 'hacket-healthtech-2025',
      status: HackathonStatus.IN_PROGRESS,
      cover: COVERS.health,
      organizer: org1,
      regStart: new Date(lastMonth.getTime() - 10 * 24 * 60 * 60 * 1000),
      regEnd: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      eventStart: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      eventEnd: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'HackET EdTech Showcase 2025',
      slug: 'hacket-edtech-2025',
      status: HackathonStatus.JUDGING,
      cover: COVERS.education,
      organizer: org2,
      regStart: new Date(lastMonth.getTime() - 25 * 24 * 60 * 60 * 1000),
      regEnd: new Date(lastMonth.getTime() - 10 * 24 * 60 * 60 * 1000),
      eventStart: new Date(lastMonth.getTime() - 8 * 24 * 60 * 60 * 1000),
      eventEnd: new Date(lastMonth.getTime() - 6 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'HackET AgriTech Harvest 2026',
      slug: 'hacket-agritech-2026',
      status: HackathonStatus.REGISTRATION_OPEN,
      cover: COVERS.agriculture,
      organizer: org1,
      regStart: new Date(),
      regEnd: new Date(nextMonth.getTime() + 15 * 24 * 60 * 60 * 1000),
      eventStart: new Date(nextMonth.getTime() + 20 * 24 * 60 * 60 * 1000),
      eventEnd: new Date(nextMonth.getTime() + 22 * 24 * 60 * 60 * 1000),
      venue: 'Nairobi, Kenya',
    },
    {
      title: 'HackET Green Energy 2026',
      slug: 'hacket-green-energy-2026',
      status: HackathonStatus.UPCOMING,
      cover: COVERS.energy,
      organizer: org2,
      regStart: new Date(nextMonth.getTime() + 5 * 24 * 60 * 60 * 1000),
      regEnd: new Date(nextMonth.getTime() + 35 * 24 * 60 * 60 * 1000),
      eventStart: new Date(nextMonth.getTime() + 40 * 24 * 60 * 60 * 1000),
      eventEnd: new Date(nextMonth.getTime() + 42 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'HackET Smart Transport 2026',
      slug: 'hacket-smart-transport-2026',
      status: HackathonStatus.DRAFT,
      cover: COVERS.transport,
      organizer: org1,
      regStart: new Date(nextMonth.getTime() + 30 * 24 * 60 * 60 * 1000),
      regEnd: new Date(nextMonth.getTime() + 60 * 24 * 60 * 60 * 1000),
      eventStart: new Date(nextMonth.getTime() + 65 * 24 * 60 * 60 * 1000),
      eventEnd: new Date(nextMonth.getTime() + 67 * 24 * 60 * 60 * 1000),
      venue: 'Lagos, Nigeria',
    },
  ];

  let count = 0;
  for (const h of hackathons) {
    try {
      await prisma.hackathon.create({
        data: {
          id: UUID(),
          title: h.title,
          slug: h.slug,
          description: `Join us for ${h.title}. An amazing hackathon experience!`,
          status: h.status,
          organizerId: h.organizer.id,
          coverImageUrl: h.cover,
          maxTeamSize: 5,
          minTeamSize: 2,
          judgingPhase: JudgingPhase.NOT_STARTED,
          registrationStart: h.regStart,
          registrationEnd: h.regEnd,
          eventStart: h.eventStart,
          eventEnd: h.eventEnd,
          submissionDeadline: h.eventEnd,
          prizes: JSON.stringify({ first: '$10,000', second: '$5,000', third: '$2,500' }),
          region: 'Africa',
          isVirtual: !h.venue,
          venue: h.venue || null,
        }
      });
      count++;
      console.log(`  ✓ ${h.status}: ${h.title}`);
    } catch (e) {
      console.error(`  ✗ FAILED: ${h.title} - ${e.message}`);
    }
  }

  console.log(`\n✅ Created ${count} hackathons`);

  // Create staff assignments
  console.log('\nAssigning judges and mentors...');
  const allHackathons = await prisma.hackathon.findMany();
  const completed = allHackathons.find(h => h.status === 'COMPLETED');
  const active = allHackathons.find(h => h.status === 'REGISTRATION_OPEN');

  if (completed) {
    for (const judge of [judge1, judge2]) {
      await prisma.staffAssignment.create({
        data: {
          id: UUID(),
          userId: judge.id,
          hackathonId: completed.id,
          staffRole: StaffRole.JUDGE,
          isActive: true,
        }
      });
    }
    console.log(`  ✓ 2 judges assigned to ${completed.title}`);
  }

  if (active) {
    for (const mentor of [mentor1, mentor2]) {
      await prisma.staffAssignment.create({
        data: {
          id: UUID(),
          userId: mentor.id,
          hackathonId: active.id,
          staffRole: StaffRole.MENTOR,
          isActive: true,
        }
      });
    }
    console.log(`  ✓ 2 mentors assigned to ${active.title}`);
  }

  // Create teams for completed hackathon
  if (completed) {
    console.log('\nCreating teams...');
    const teamData = [
      { name: 'CodeNinjas', members: [participants[0], participants[1]], rank: 1, score: 9.2 },
      { name: 'TechTitans', members: [participants[2], participants[3]], rank: 2, score: 8.7 },
      { name: 'InnovateAfrica', members: [participants[4], participants[1]], rank: 3, score: 8.4 },
    ];

    for (const t of teamData) {
      const team = await prisma.team.create({
        data: {
          id: UUID(),
          hackathonId: completed.id,
          name: t.name,
          description: `Team ${t.name}`,
          isOpen: false,
          members: {
            create: t.members.map((m, i) => ({
              id: UUID(),
              userId: m.id,
              role: i === 0 ? TeamMemberRole.LEADER : TeamMemberRole.MEMBER,
            }))
          }
        }
      });

      // Create submission
      const submission = await prisma.submission.create({
        data: {
          id: UUID(),
          teamId: team.id,
          hackathonId: completed.id,
          title: `${t.name} Project`,
          description: 'Amazing project submission',
          status: 'SCORED',
          finalScore: t.score,
          rank: t.rank,
          submittedAt: new Date(),
        }
      });

      // Create leaderboard entry
      await prisma.scoreboardEntry.create({
        data: {
          id: UUID(),
          hackathonId: completed.id,
          submissionId: submission.id,
          finalScore: t.score,
          rank: t.rank,
        }
      });

      console.log(`  ✓ #${t.rank} ${t.name} (${t.score})`);
    }
  }

  // Create open teams for active hackathon
  if (active) {
    const openTeams = [
      { name: 'ClimateGuardians', leader: participants[0], skills: ['React', 'Python', 'IoT'] },
      { name: 'GreenTechies', leader: participants[2], skills: ['Mobile', 'Node.js'] },
      { name: 'EcoWarriors', leader: participants[3], skills: ['ML', 'Backend'] },
    ];

    for (const t of openTeams) {
      await prisma.team.create({
        data: {
          id: UUID(),
          hackathonId: active.id,
          name: t.name,
          description: `Join ${t.name}!`,
          neededSkills: t.skills,
          isOpen: true,
          members: {
            create: [{
              id: UUID(),
              userId: t.leader.id,
              role: TeamMemberRole.LEADER,
            }]
          }
        }
      });
      console.log(`  ✓ Open team: ${t.name}`);
    }
  }

  console.log('\n🎉 SEED COMPLETED!');
  console.log('\n📊 Summary:');
  console.log(`   Users: ${users.length}`);
  console.log(`   Hackathons: ${count}`);
  console.log(`   Teams: 6 (3 judged + 3 open)`);
  console.log('\n🔑 Login with:');
  console.log('   admin@hacket.et / Admin@HackET2026');
  console.log('   organizer@hacket.et / Organizer@123');
  console.log('   judge@hacket.et / Judge@123');
  console.log('   participant1@hacket.et / Participant@123');
}

main()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
