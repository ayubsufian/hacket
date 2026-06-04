// =============================================================================
// HackET Platform — Complete Production Seed
// All workflows: Registration → Team Formation → Submission → Judging → Leaderboard
// =============================================================================

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env') });

const { PrismaClient, HackathonStatus, JudgingPhase, TeamMemberRole, UserRole, InvitationStatus, SubmissionStatus, VerificationStatus, StaffRole } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Add it to the repo root .env file.');
}
const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: DATABASE_URL })) });

const UUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = Math.random() * 16 | 0;
  return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
});

// Use bcryptjs with 12 salt rounds (matches backend auth.service.js)
const BCRYPT_SALT_ROUNDS = 12;
const hash = (p) => bcrypt.hash(p, BCRYPT_SALT_ROUNDS);


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
  console.log('🌱 HackET Seed - All Workflows\n');

  // Clean slate
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
    prisma.staffInvitation.deleteMany(),
    prisma.hackathonTag.deleteMany(),
    prisma.registration.deleteMany(),
    prisma.hackathon.deleteMany(),
    prisma.userProfile.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // =============================================================================
  // WORKFLOW 1: USER REGISTRATION & ROLES
  // =============================================================================
  console.log('1️⃣ USER REGISTRATION & AUTHENTICATION');
  const users = [];
  const cfg = [
    { email: 'admin@hacket.et', pass: 'Admin@HackET2026', role: UserRole.ADMIN, first: 'Yonas', last: 'Bekele' },
    { email: 'organizer@hacket.et', pass: 'Organizer@123', role: UserRole.ORGANIZER, first: 'Sarah', last: 'Tadesse' },
    { email: 'organizer2@hacket.et', pass: 'Organizer@123', role: UserRole.ORGANIZER, first: 'Daniel', last: 'Girma' },
    { email: 'judge@hacket.et', pass: 'Judge@123', role: UserRole.JUDGE, first: 'Helen', last: 'Hailu' },
    { email: 'judge2@hacket.et', pass: 'Judge@123', role: UserRole.JUDGE, first: 'Kaleb', last: 'Alemu' },
    { email: 'mentor@hacket.et', pass: 'Mentor@123', role: UserRole.MENTOR, first: 'Maria', last: 'Bekele' },
    { email: 'mentor2@hacket.et', pass: 'Mentor@123', role: UserRole.MENTOR, first: 'Solomon', last: 'Tadesse' },
    ...[1,2,3,4,5].map(i => ({ email: `participant${i}@hacket.et`, pass: 'Participant@123', role: UserRole.PARTICIPANT, first: ['Tigist','Alex','Abeba','James','Almaz'][i-1], last: ['Girma','Hailu','Alemu','Bekele','Tadesse'][i-1] })),
  ];

  for (const c of cfg) {
    const user = await prisma.user.create({
      data: {
        id: UUID(),
        email: c.email,
        password: await hash(c.pass),
        role: c.role,
        verificationStatus: VerificationStatus.VERIFIED,
        isActive: true,
        profile: {
          create: {
            firstName: c.first,
            lastName: c.last,
            preferredLocale: 'en',
            isSeekingTeam: c.role === UserRole.PARTICIPANT,
          }
        }
      },
      include: { profile: true }
    });
    users.push({ ...user, _pass: c.pass });
    console.log(`  ✓ ${c.role.padEnd(12)} ${c.email} (${c.first} ${c.last})`);
  }

  const [admin, org1, org2, judge1, judge2, mentor1, mentor2, ...participants] = users;

  // =============================================================================
  // WORKFLOW 2: HACKATHON CREATION WITH COVER IMAGES
  // =============================================================================
  console.log('\n2️⃣ HACKATHON CREATION & MANAGEMENT');
  
  const now = new Date();
  const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // COMPLETED Hackathon (for Leaderboard workflow)
  const completed = await prisma.hackathon.create({
    data: {
      id: UUID(),
      slug: 'hacket-grand-challenge-2025',
      title: 'HackET Grand Challenge 2025',
      description: 'Africa premier hackathon. 48 hours of innovation, collaboration, and groundbreaking solutions.',
      status: HackathonStatus.COMPLETED,
      organizerId: org1.id,
      coverImageUrl: COVERS.grand2025,
      maxTeamSize: 5,
      minTeamSize: 2,
      judgingPhase: JudgingPhase.COMPLETE,
      judgingMode: 'MINIMUM_REVIEWS',
      requiredReviewsPerSubmission: 2,
      registrationStart: new Date(lastMonth.getTime() - 60 * 24 * 60 * 60 * 1000),
      registrationEnd: new Date(lastMonth.getTime() - 45 * 24 * 60 * 60 * 1000),
      eventStart: new Date(lastMonth.getTime() - 30 * 24 * 60 * 60 * 1000),
      eventEnd: new Date(lastMonth.getTime() - 28 * 24 * 60 * 60 * 1000),
      submissionDeadline: new Date(lastMonth.getTime() - 28 * 24 * 60 * 60 * 1000),
      judgingStart: new Date(lastMonth.getTime() - 27 * 24 * 60 * 60 * 1000),
      judgingEnd: new Date(lastMonth.getTime() - 20 * 24 * 60 * 60 * 1000),
      resultsPublishedAt: new Date(lastMonth.getTime() - 18 * 24 * 60 * 60 * 1000),
      scoreboardType: 'FINAL_ONLY',
      prizes: { first: '$10,000', second: '$5,000', third: '$2,500' },
      region: 'Africa',
      isVirtual: true,
    }
  });
  console.log(`  ✓ COMPLETED: ${completed.title}`);

  // ACTIVE Hackathon (Registration Open)
  const active = await prisma.hackathon.create({
    data: {
      id: UUID(),
      slug: 'hacket-summer-2026',
      title: 'HackET Summer Hackathon 2026',
      description: 'Join us for an exciting summer hackathon focused on climate tech and sustainability.',
      status: HackathonStatus.REGISTRATION_OPEN,
      organizerId: org2.id,
      coverImageUrl: COVERS.summer2026,
      maxTeamSize: 4,
      minTeamSize: 2,
      judgingPhase: JudgingPhase.NOT_STARTED,
      registrationStart: new Date(),
      registrationEnd: nextMonth,
      eventStart: new Date(nextMonth.getTime() + 7 * 24 * 60 * 60 * 1000),
      eventEnd: new Date(nextMonth.getTime() + 9 * 24 * 60 * 60 * 1000),
      submissionDeadline: new Date(nextMonth.getTime() + 9 * 24 * 60 * 60 * 1000),
      prizes: { first: '$5,000', second: '$3,000', third: '$1,500' },
      region: 'Africa',
      isVirtual: false,
      venue: 'iHub Nairobi, Kenya',
    }
  });
  console.log(`  ✓ ACTIVE: ${active.title}`);

  // DRAFT Hackathon (AI Challenge - Not published yet)
  const draftHackathon = await prisma.hackathon.create({
    data: {
      id: UUID(),
      slug: 'hacket-ai-challenge-2026',
      title: 'HackET AI Challenge 2026',
      description: 'Push the boundaries of AI. Build innovative machine learning solutions for African challenges.',
      status: HackathonStatus.DRAFT,
      organizerId: org1.id,
      coverImageUrl: COVERS.aiChallenge,
      maxTeamSize: 5,
      minTeamSize: 3,
      judgingPhase: JudgingPhase.NOT_STARTED,
      registrationStart: new Date(nextMonth.getTime() + 15 * 24 * 60 * 60 * 1000),
      registrationEnd: new Date(nextMonth.getTime() + 45 * 24 * 60 * 60 * 1000),
      eventStart: new Date(nextMonth.getTime() + 60 * 24 * 60 * 60 * 1000),
      eventEnd: new Date(nextMonth.getTime() + 62 * 24 * 60 * 60 * 1000),
      submissionDeadline: new Date(nextMonth.getTime() + 62 * 24 * 60 * 60 * 1000),
      prizes: { first: '$15,000', second: '$8,000', third: '$4,000' },
      region: 'Africa',
      isVirtual: true,
    }
  });
  console.log(`  ✓ DRAFT: ${draftHackathon.title}`);

  // UPCOMING Hackathon (FinTech - Published but registration not open yet)
  const upcomingHackathon = await prisma.hackathon.create({
    data: {
      id: UUID(),
      slug: 'hacket-fintech-innovation-2026',
      title: 'HackET FinTech Innovation 2026',
      description: 'Revolutionizing finance in Africa. Build the next generation of financial technology solutions.',
      status: HackathonStatus.UPCOMING,
      organizerId: org2.id,
      coverImageUrl: COVERS.fintech,
      maxTeamSize: 4,
      minTeamSize: 2,
      judgingPhase: JudgingPhase.NOT_STARTED,
      registrationStart: new Date(nextMonth.getTime() + 10 * 24 * 60 * 60 * 1000),
      registrationEnd: new Date(nextMonth.getTime() + 40 * 24 * 60 * 60 * 1000),
      eventStart: new Date(nextMonth.getTime() + 45 * 24 * 60 * 60 * 1000),
      eventEnd: new Date(nextMonth.getTime() + 47 * 24 * 60 * 60 * 1000),
      submissionDeadline: new Date(nextMonth.getTime() + 47 * 24 * 60 * 60 * 1000),
      prizes: { first: '$12,000', second: '$6,000', third: '$3,000' },
      region: 'Africa',
      isVirtual: false,
      venue: 'Cairo, Egypt',
    }
  });
  console.log(`  ✓ UPCOMING: ${upcomingHackathon.title}`);

  // IN_PROGRESS Hackathon (HealthTech - Currently running)
  const inProgressHackathon = await prisma.hackathon.create({
    data: {
      id: UUID(),
      slug: 'hacket-healthtech-summit-2025',
      title: 'HackET HealthTech Summit 2025',
      description: 'Transforming healthcare through technology. Building solutions for better health outcomes.',
      status: HackathonStatus.IN_PROGRESS,
      organizerId: org1.id,
      coverImageUrl: COVERS.health,
      maxTeamSize: 5,
      minTeamSize: 2,
      judgingPhase: JudgingPhase.NOT_STARTED,
      registrationStart: new Date(lastMonth.getTime() - 10 * 24 * 60 * 60 * 1000),
      registrationEnd: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      eventStart: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      eventEnd: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      submissionDeadline: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      prizes: { first: '$8,000', second: '$4,000', third: '$2,000' },
      region: 'Africa',
      isVirtual: true,
    }
  });
  console.log(`  ✓ IN_PROGRESS: ${inProgressHackathon.title}`);

  // JUDGING Hackathon (Education - Submissions closed, judging active)
  const judgingHackathon = await prisma.hackathon.create({
    data: {
      id: UUID(),
      slug: 'hacket-edtech-showcase-2025',
      title: 'HackET EdTech Showcase 2025',
      description: 'Reimagining education. Create innovative tools for learning and teaching.',
      status: HackathonStatus.JUDGING,
      organizerId: org2.id,
      coverImageUrl: COVERS.education,
      maxTeamSize: 4,
      minTeamSize: 2,
      judgingPhase: JudgingPhase.IN_PROGRESS,
      judgingMode: 'MINIMUM_REVIEWS',
      requiredReviewsPerSubmission: 2,
      registrationStart: new Date(lastMonth.getTime() - 25 * 24 * 60 * 60 * 1000),
      registrationEnd: new Date(lastMonth.getTime() - 10 * 24 * 60 * 60 * 1000),
      eventStart: new Date(lastMonth.getTime() - 8 * 24 * 60 * 60 * 1000),
      eventEnd: new Date(lastMonth.getTime() - 6 * 24 * 60 * 60 * 1000),
      submissionDeadline: new Date(lastMonth.getTime() - 6 * 24 * 60 * 60 * 1000),
      judgingStart: new Date(lastMonth.getTime() - 5 * 24 * 60 * 60 * 1000),
      judgingEnd: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      prizes: { first: '$6,000', second: '$3,000', third: '$1,500' },
      region: 'Africa',
      isVirtual: true,
    }
  });
  console.log(`  ✓ JUDGING: ${judgingHackathon.title}`);

  // Additional Hackathons with new cover images
  
  // Agriculture Hackathon
  const agriHackathon = await prisma.hackathon.create({
    data: {
      id: UUID(),
      slug: 'hacket-agritech-harvest-2026',
      title: 'HackET AgriTech Harvest 2026',
      description: 'Smart farming solutions for Africa. Revolutionizing agriculture through technology and innovation.',
      status: HackathonStatus.REGISTRATION_OPEN,
      organizerId: org1.id,
      coverImageUrl: COVERS.agriculture,
      maxTeamSize: 5,
      minTeamSize: 2,
      judgingPhase: JudgingPhase.NOT_STARTED,
      registrationStart: new Date(),
      registrationEnd: new Date(nextMonth.getTime() + 15 * 24 * 60 * 60 * 1000),
      eventStart: new Date(nextMonth.getTime() + 20 * 24 * 60 * 60 * 1000),
      eventEnd: new Date(nextMonth.getTime() + 22 * 24 * 60 * 60 * 1000),
      submissionDeadline: new Date(nextMonth.getTime() + 22 * 24 * 60 * 60 * 1000),
      prizes: { first: '$7,000', second: '$3,500', third: '$1,800' },
      region: 'Africa',
      isVirtual: false,
      venue: 'Nairobi, Kenya',
    }
  });
  console.log(`  ✓ REGISTRATION_OPEN: ${agriHackathon.title}`);

  // Clean Energy Hackathon
  const energyHackathon = await prisma.hackathon.create({
    data: {
      id: UUID(),
      slug: 'hacket-green-energy-2026',
      title: 'HackET Green Energy 2026',
      description: 'Powering the future with clean technology. Sustainable energy solutions for African communities.',
      status: HackathonStatus.UPCOMING,
      organizerId: org2.id,
      coverImageUrl: COVERS.energy,
      maxTeamSize: 4,
      minTeamSize: 2,
      judgingPhase: JudgingPhase.NOT_STARTED,
      registrationStart: new Date(nextMonth.getTime() + 5 * 24 * 60 * 60 * 1000),
      registrationEnd: new Date(nextMonth.getTime() + 35 * 24 * 60 * 60 * 1000),
      eventStart: new Date(nextMonth.getTime() + 40 * 24 * 60 * 60 * 1000),
      eventEnd: new Date(nextMonth.getTime() + 42 * 24 * 60 * 60 * 1000),
      submissionDeadline: new Date(nextMonth.getTime() + 42 * 24 * 60 * 60 * 1000),
      prizes: { first: '$9,000', second: '$4,500', third: '$2,200' },
      region: 'Africa',
      isVirtual: true,
    }
  });
  console.log(`  ✓ UPCOMING: ${energyHackathon.title}`);

  // Smart Transport Hackathon
  const transportHackathon = await prisma.hackathon.create({
    data: {
      id: UUID(),
      slug: 'hacket-smart-transport-2026',
      title: 'HackET Smart Transport 2026',
      description: 'Revolutionizing mobility in Africa. Build the future of transportation and logistics.',
      status: HackathonStatus.DRAFT,
      organizerId: org1.id,
      coverImageUrl: COVERS.transport,
      maxTeamSize: 6,
      minTeamSize: 3,
      judgingPhase: JudgingPhase.NOT_STARTED,
      registrationStart: new Date(nextMonth.getTime() + 30 * 24 * 60 * 60 * 1000),
      registrationEnd: new Date(nextMonth.getTime() + 60 * 24 * 60 * 60 * 1000),
      eventStart: new Date(nextMonth.getTime() + 65 * 24 * 60 * 60 * 1000),
      eventEnd: new Date(nextMonth.getTime() + 67 * 24 * 60 * 60 * 1000),
      submissionDeadline: new Date(nextMonth.getTime() + 67 * 24 * 60 * 60 * 1000),
      prizes: { first: '$11,000', second: '$5,500', third: '$2,800' },
      region: 'Africa',
      isVirtual: false,
      venue: 'Lagos, Nigeria',
    }
  });
  console.log(`  ✓ DRAFT: ${transportHackathon.title}`);

  console.log(`\n✅ Created 9 hackathons with cover images`);

  // =============================================================================
  // WORKFLOW 3: STAFF ASSIGNMENT (Judges & Mentors)
  // =============================================================================
  console.log('\n3️⃣ STAFF ASSIGNMENT');
  
  for (const judge of [judge1, judge2]) {
    await prisma.staffAssignment.create({
      data: {
        id: UUID(),
        userId: judge.id,
        hackathonId: completed.id,
        staffRole: StaffRole.JUDGE,
        isLead: judge.id === judge1.id,
        isActive: true,
      }
    });
  }
  console.log(`  ✓ Assigned 2 Judges to ${completed.title}`);

  for (const mentor of [mentor1, mentor2]) {
    await prisma.staffAssignment.create({
      data: {
        id: UUID(),
        userId: mentor.id,
        hackathonId: active.id,
        staffRole: StaffRole.MENTOR,
        isLead: false,
        isActive: true,
      }
    });
  }
  console.log(`  ✓ Assigned 2 Mentors to ${active.title}`);

  // =============================================================================
  // WORKFLOW 4: TEAM FORMATION
  // =============================================================================
  console.log('\n4️⃣ TEAM FORMATION & INVITATIONS');

  // Winning Teams (Completed Hackathon)
  const winners = [
    { name: 'CodeNinjas', members: [participants[0], participants[1]], rank: 1, score: 9.2, title: 'Smart Health Monitor' },
    { name: 'TechTitans', members: [participants[2], participants[3]], rank: 2, score: 8.7, title: 'AgriTech Platform' },
    { name: 'InnovateAfrica', members: [participants[4], participants[1]], rank: 3, score: 8.4, title: 'EduConnect' },
  ];

  const winningTeamIds = [];
  for (const w of winners) {
    const team = await prisma.team.create({
      data: {
        id: UUID(),
        hackathonId: completed.id,
        name: w.name,
        description: `Winning team - ${w.title}`,
        neededSkills: [],
        isOpen: false,
        members: {
          create: w.members.map((m, i) => ({
            id: UUID(),
            userId: m.id,
            role: i === 0 ? TeamMemberRole.LEADER : TeamMemberRole.MEMBER,
            joinedAt: new Date(lastMonth.getTime() - 25 * 24 * 60 * 60 * 1000),
          }))
        }
      }
    });
    winningTeamIds.push({ id: team.id, ...w });
    console.log(`  ✓ Winner #${w.rank}: ${w.name}`);
  }

  // Open Teams (Active Hackathon)
  const openTeams = [
    { name: 'ClimateGuardians', leader: participants[0], skills: ['React', 'Python', 'IoT'], open: true },
    { name: 'GreenTechies', leader: participants[2], skills: ['Mobile', 'Node.js'], open: true },
    { name: 'EcoWarriors', leader: participants[3], skills: ['ML', 'Backend'], open: true },
    { name: 'SolarMinds', leader: participants[4], skills: [], open: false },
  ];

  for (const t of openTeams) {
    await prisma.team.create({
      data: {
        id: UUID(),
        hackathonId: active.id,
        name: t.name,
        description: t.open ? 'Looking for team members!' : 'Team is full',
        neededSkills: t.skills,
        isOpen: t.open,
        members: {
          create: [{
            id: UUID(),
            userId: t.leader.id,
            role: TeamMemberRole.LEADER,
            joinedAt: new Date(),
          }]
        }
      }
    });
    console.log(`  ✓ ${t.open ? 'OPEN' : 'CLOSED'}: ${t.name}`);
  }

  // Team Invitations
  await prisma.teamInvitation.create({
    data: {
      id: UUID(),
      teamId: (await prisma.team.findFirst({ where: { name: 'ClimateGuardians' } })).id,
      senderId: participants[0].id,
      receiverId: participants[1].id,
      status: InvitationStatus.PENDING,
      type: 'INVITATION',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }
  });
  console.log(`  ✓ Team invitation sent`);

  // =============================================================================
  // WORKFLOW 5: JUDGING CRITERIA
  // =============================================================================
  console.log('\n5️⃣ JUDGING CRITERIA SETUP');

  const criteria = await Promise.all([
    prisma.judgingCriteria.create({
      data: { id: UUID(), hackathonId: completed.id, name: 'Innovation', maxScore: 10, weight: 1.5, sortOrder: 1 }
    }),
    prisma.judgingCriteria.create({
      data: { id: UUID(), hackathonId: completed.id, name: 'Technical Execution', maxScore: 10, weight: 1.5, sortOrder: 2 }
    }),
    prisma.judgingCriteria.create({
      data: { id: UUID(), hackathonId: completed.id, name: 'Impact', maxScore: 10, weight: 1.0, sortOrder: 3 }
    }),
    prisma.judgingCriteria.create({
      data: { id: UUID(), hackathonId: completed.id, name: 'Presentation', maxScore: 10, weight: 1.0, sortOrder: 4 }
    }),
  ]);
  console.log(`  ✓ Created ${criteria.length} judging criteria`);

  // =============================================================================
  // WORKFLOW 6: SUBMISSIONS → JUDGING → SCORING → LEADERBOARD
  // =============================================================================
  console.log('\n6️⃣ SUBMISSIONS → JUDGING → SCORING → LEADERBOARD');

  for (const team of winningTeamIds) {
    const submissionId = UUID();
    
    // 6a. Submission
    await prisma.submission.create({
      data: {
        id: submissionId,
        teamId: team.id,
        hackathonId: completed.id,
        title: team.title,
        description: 'Award-winning project submission',
        githubUrl: `https://github.com/hacket/${team.name.toLowerCase()}`,
        demoUrl: `https://${team.name.toLowerCase()}.demo.hacket.dev`,
        status: SubmissionStatus.SCORED,
        submittedAt: new Date(lastMonth.getTime() - 28 * 24 * 60 * 60 * 1000),
        finalScore: team.score,
        rank: team.rank,
        version: 1,
      }
    });
    console.log(`  ✓ #${team.rank} Submission: ${team.title}`);

    // 6b. Judging Assignments
    for (const judge of [judge1, judge2]) {
      await prisma.judgingAssignment.create({
        data: {
          id: UUID(),
          hackathonId: completed.id,
          submissionId: submissionId,
          judgeId: judge.id,
        }
      });
    }

    // 6c. Scoring
    for (const judge of [judge1, judge2]) {
      for (const c of criteria) {
        const base = team.rank === 1 ? 9 : team.rank === 2 ? 8.5 : 8;
        const score = Math.min(10, Math.max(7, base + (Math.random() - 0.5)));
        await prisma.score.create({
          data: {
            id: UUID(),
            submissionId: submissionId,
            judgeId: judge.id,
            criteriaId: c.id,
            value: Math.round(score * 100) / 100,
            comment: score > 8.5 ? 'Exceptional work!' : 'Great implementation',
            isCommentPublic: true,
          }
        });
      }
    }
    console.log(`     └─ Scored by 2 judges across ${criteria.length} criteria`);

    // 6d. Leaderboard Entry
    await prisma.scoreboardEntry.create({
      data: {
        id: UUID(),
        hackathonId: completed.id,
        submissionId: submissionId,
        finalScore: team.score,
        rank: team.rank,
      }
    });
    console.log(`     └─ Leaderboard: Rank #${team.rank} (${team.score})`);
  }

  // =============================================================================
  // WORKFLOW 7: EVENT REGISTRATION
  // =============================================================================
  console.log('\n7️⃣ EVENT REGISTRATION');
  
  for (const p of participants) {
    await prisma.registration.create({
      data: {
        id: UUID(),
        userId: p.id,
        hackathonId: active.id,
        status: 'REGISTERED',
      }
    });
  }
  console.log(`  ✓ ${participants.length} participants registered for ${active.title}`);

  // =============================================================================
  // SUMMARY
  // =============================================================================
  console.log('\n' + '='.repeat(70));
  console.log('🎉 SEED COMPLETED - ALL WORKFLOWS DEMONSTRATED');
  console.log('='.repeat(70));
  console.log('\n📊 DATA SUMMARY:');
  console.log(`   • Users: ${users.length} (with Amharic names)`);
  console.log(`   • Hackathons: 9 (6 public + 3 draft)`);
  console.log(`   • Teams: ${winners.length + openTeams.length} (${winners.length} judged, ${openTeams.length} open)`);
  console.log(`   • Submissions: ${winners.length} (all scored)`);
  console.log(`   • Judging Criteria: ${criteria.length}`);
  console.log(`   • Staff: 4 (2 Judges, 2 Mentors)`);
  console.log(`   • Registrations: ${participants.length}`);
  console.log('\n🏆 LEADERBOARD (Completed Hackathon):');
  console.log(`   🥇 1st: CodeNinjas - Smart Health Monitor (9.2)`);
  console.log(`   🥈 2nd: TechTitans - AgriTech Platform (8.7)`);
  console.log(`   🥉 3rd: InnovateAfrica - EduConnect (8.4)`);
  console.log('\n🔓 OPEN TEAMS (Join Now):');
  console.log(`   • ClimateGuardians (React, Python, IoT)`);
  console.log(`   • GreenTechies (Mobile, Node.js)`);
  console.log(`   • EcoWarriors (ML, Backend)`);
  console.log('\n🔑 LOGIN CREDENTIALS:');
  console.log(`   Admin:       admin@hacket.et / Admin@HackET2026`);
  console.log(`   Organizer:   organizer@hacket.et / Organizer@123`);
  console.log(`   Judge:       judge@hacket.et / Judge@123`);
  console.log(`   Mentor:      mentor@hacket.et / Mentor@123`);
  console.log(`   Participant: participant1@hacket.et / Participant@123`);
  console.log('='.repeat(70));
}

async function clearEventsListCache() {
  try {
    const { createClient } = require('redis');
    const client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    await client.connect();
    await client.del('events:active');
    await client.quit();
    console.log('  ✓ Cleared events list Redis cache');
  } catch (err) {
    console.warn('  ⚠ Could not clear Redis cache:', err.message);
  }
}

main()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => {
    await clearEventsListCache();
    await prisma.$disconnect();
  });
