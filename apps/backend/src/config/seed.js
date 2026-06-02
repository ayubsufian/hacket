// =============================================================================
// HackET — Comprehensive MVP Database Seed Script
// Seeds realistic hackathons, teams, submissions, and judging data for demo.
// Run: npx prisma db seed (configured in backend's package.json)
// =============================================================================

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const hash = (pwd) => bcrypt.hash(pwd, 12);

// Cover images from Unsplash
const COVER_IMAGES = [
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80',
  'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&q=80',
  'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80',
  'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&q=80',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80',
];

const TEAM_NAMES = [
  'Code Warriors', 'Tech Titans', 'Digital Dreamers', 'Pixel Pirates', 'Byte Brigade',
  'Cyber Squad', 'Logic Legends', 'Data Dragons', 'App Avengers', 'Cloud Chasers',
  'Script Spartans', 'Binary Bandits', 'Dev Dynasty', 'Hack Heroes', 'Node Ninjas',
];

const PROJECT_NAMES = [
  'Ethiopay', 'MediConnect', 'FarmAI', 'EduTech Pro', 'SmartCity',
  'TransitHub', 'AgriTech Plus', 'HealthGuard', 'FinWallet', 'ShopEasy',
  'TravelEthio', 'FoodLink', 'CleanWater Monitor', 'SolarTrack', 'BizManager',
];

async function main() {
  console.log('🌱 Seeding HackET database with MVP data...\n');

  // Create Admin
  let admin = await prisma.user.findUnique({ where: { email: 'admin@hacket.et' } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: 'admin@hacket.et',
        password: await hash('admin123'),
        role: 'ADMIN',
        verificationStatus: 'VERIFIED',
        profile: { create: { firstName: 'System', lastName: 'Admin', preferredLocale: 'en' } },
      },
    });
    console.log('  ✅ Admin created');
  }

  // Create Organizers
  const organizers = [];
  const orgData = [
    { email: 'abel@hacket.et', firstName: 'Abel', lastName: 'Tesfaye', city: 'Addis Ababa' },
    { email: 'selam@hacket.et', firstName: 'Selam', lastName: 'Bekele', city: 'Hawassa' },
    { email: 'dawit@hacket.et', firstName: 'Dawit', lastName: 'Alemu', city: 'Bahir Dar' },
  ];
  for (const o of orgData) {
    let u = await prisma.user.findUnique({ where: { email: o.email } });
    if (!u) {
      u = await prisma.user.create({
        data: {
          email: o.email,
          password: await hash('organizer123'),
          role: 'ORGANIZER',
          verificationStatus: 'VERIFIED',
          profile: { create: { firstName: o.firstName, lastName: o.lastName, city: o.city, preferredLocale: 'en' } },
        },
      });
      console.log(`  ✅ Organizer: ${o.email}`);
    }
    organizers.push(u);
  }

  // Create Judges
  const judges = [];
  const judgeData = [
    { email: 'prof.abebe@hacket.et', firstName: 'Prof. Abebe', lastName: 'Kebede' },
    { email: 'dr.sara@hacket.et', firstName: 'Dr. Sara', lastName: 'Hailu' },
    { email: 'mentor.dawit@hacket.et', firstName: 'Dawit', lastName: 'Mengistu' },
    { email: 'lead.meron@hacket.et', firstName: 'Meron', lastName: 'Tadesse' },
  ];
  for (const j of judgeData) {
    let u = await prisma.user.findUnique({ where: { email: j.email } });
    if (!u) {
      u = await prisma.user.create({
        data: {
          email: j.email,
          password: await hash('judge123'),
          role: 'JUDGE',
          verificationStatus: 'VERIFIED',
          profile: { create: { firstName: j.firstName, lastName: j.lastName, preferredLocale: 'en' } },
        },
      });
      console.log(`  ✅ Judge: ${j.email}`);
    }
    judges.push(u);
  }

  // Create 15 Participants
  const participants = [];
  const participantData = [
    { email: 'sara@hacket.et', firstName: 'Sara', lastName: 'Bekele', skills: ['react', 'node.js'] },
    { email: 'dawit.p@hacket.et', firstName: 'Dawit', lastName: 'Hailu', skills: ['python', 'django'] },
    { email: 'meron.p@hacket.et', firstName: 'Meron', lastName: 'Alemu', skills: ['flutter', 'dart'] },
    { email: 'yonas@hacket.et', firstName: 'Yonas', lastName: 'Kassa', skills: ['java', 'spring'] },
    { email: 'hiwot@hacket.et', firstName: 'Hiwot', lastName: 'Girma', skills: ['vue.js', 'javascript'] },
    { email: 'kidus@hacket.et', firstName: 'Kidus', lastName: 'Tadesse', skills: ['react-native', 'ios'] },
    { email: 'bethlehem@hacket.et', firstName: 'Bethlehem', lastName: 'Mulu', skills: ['ui-design', 'figma'] },
    { email: 'temesgen@hacket.et', firstName: 'Temesgen', lastName: 'Abebe', skills: ['ml', 'python'] },
    { email: 'firehiwot@hacket.et', firstName: 'Firehiwot', lastName: 'Daniel', skills: ['php', 'laravel'] },
    { email: 'eden@hacket.et', firstName: 'Eden', lastName: 'Tefera', skills: ['angular', 'typescript'] },
    { email: 'nahom@hacket.et', firstName: 'Nahom', lastName: 'Gedefaw', skills: ['go', 'kubernetes'] },
    { email: 'rahel@hacket.et', firstName: 'Rahel', lastName: 'Habte', skills: ['data-science', 'python'] },
    { email: 'eyob@hacket.et', firstName: 'Eyob', lastName: 'Tamiru', skills: ['blockchain', 'solidity'] },
    { email: 'kalkidan@hacket.et', firstName: 'Kalkidan', lastName: 'Mesfin', skills: ['ruby', 'rails'] },
    { email: 'solomon@hacket.et', firstName: 'Solomon', lastName: 'Berhe', skills: ['devops', 'aws'] },
  ];
  for (const p of participantData) {
    let u = await prisma.user.findUnique({ where: { email: p.email } });
    if (!u) {
      u = await prisma.user.create({
        data: {
          email: p.email,
          password: await hash('participant123'),
          role: 'PARTICIPANT',
          verificationStatus: 'VERIFIED',
          profile: { create: { firstName: p.firstName, lastName: p.lastName, skills: p.skills, preferredLocale: 'en' } },
        },
      });
      console.log(`  ✅ Participant: ${p.email}`);
    }
    participants.push(u);
  }

  const now = new Date();

  // Helper to create hackathon
  async function createHackathon(data) {
    let h = await prisma.hackathon.findUnique({ where: { slug: data.slug } });
    if (!h) {
      h = await prisma.hackathon.create({
        data: {
          ...data,
          maxTeamSize: 5,
          minTeamSize: 2,
          maxParticipants: 100,
          tags: { create: data.tags.map(t => ({ tag: t })) },
        },
      });
      console.log(`  ✅ Hackathon: ${data.title}`);
    }
    return h;
  }

  // Create multiple hackathons with different statuses
  const hackathon1 = await createHackathon({
    slug: 'fintech-hackathon-2024',
    title: 'FinTech Hackathon 2024',
    description: 'Build innovative financial solutions for Ethiopia',
    status: 'COMPLETED',
    organizerId: organizers[0].id,
    coverImageUrl: COVER_IMAGES[0],
    registrationStart: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000),
    registrationEnd: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
    eventStart: new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000),
    eventEnd: new Date(now.getTime() - 73 * 24 * 60 * 60 * 1000),
    submissionDeadline: new Date(now.getTime() - 73 * 24 * 60 * 60 * 1000),
    judgingPhase: 'COMPLETE',
    region: 'Addis Ababa',
    venue: 'AAU Science Campus',
    isVirtual: false,
    tags: ['fintech', 'payments', 'banking'],
  });

  const hackathon2 = await createHackathon({
    slug: 'health-innovation-2025',
    title: 'Health Innovation Hackathon 2025',
    description: 'Healthcare technology solutions for Ethiopia',
    status: 'IN_PROGRESS',
    organizerId: organizers[1].id,
    coverImageUrl: COVER_IMAGES[1],
    registrationStart: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
    registrationEnd: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
    eventStart: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    eventEnd: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
    submissionDeadline: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
    judgingPhase: 'NOT_STARTED',
    region: 'Hawassa',
    venue: 'Hawassa Tech Hub',
    isVirtual: false,
    tags: ['healthtech', 'telemedicine', 'AI'],
  });

  const hackathon3 = await createHackathon({
    slug: 'agritech-summit-2025',
    title: 'AgriTech Summit 2025',
    description: 'Smart farming and agricultural innovation',
    status: 'JUDGING',
    organizerId: organizers[2].id,
    coverImageUrl: COVER_IMAGES[2],
    registrationStart: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
    registrationEnd: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    eventStart: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
    eventEnd: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000),
    submissionDeadline: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000),
    judgingPhase: 'IN_PROGRESS',
    region: 'Bahir Dar',
    venue: 'BD Innovation Center',
    isVirtual: false,
    tags: ['agriculture', 'iot', 'smart-farming'],
  });

  const hackathon4 = await createHackathon({
    slug: 'ethio-hack-2026',
    title: 'EthioHack 2026 — Build the Future',
    description: 'Ethiopia premier hackathon',
    status: 'REGISTRATION_OPEN',
    organizerId: organizers[0].id,
    coverImageUrl: COVER_IMAGES[3],
    registrationStart: now,
    registrationEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    eventStart: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
    eventEnd: new Date(now.getTime() + 47 * 24 * 60 * 60 * 1000),
    submissionDeadline: new Date(now.getTime() + 47 * 24 * 60 * 60 * 1000),
    judgingPhase: 'NOT_STARTED',
    region: 'Addis Ababa',
    venue: 'AAU Main Campus',
    isVirtual: false,
    tags: ['fintech', 'healthtech', 'agriculture', 'AI'],
  });

  const hackathon5 = await createHackathon({
    slug: 'women-in-tech-2025',
    title: 'Women in Tech Hackathon 2025',
    description: 'Empowering women in technology',
    status: 'UPCOMING',
    organizerId: organizers[1].id,
    coverImageUrl: COVER_IMAGES[4],
    registrationStart: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
    registrationEnd: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
    eventStart: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
    eventEnd: new Date(now.getTime() + 62 * 24 * 60 * 60 * 1000),
    submissionDeadline: new Date(now.getTime() + 62 * 24 * 60 * 60 * 1000),
    judgingPhase: 'NOT_STARTED',
    region: 'Addis Ababa',
    venue: 'IceAddis',
    isVirtual: true,
    tags: ['women-in-tech', 'diversity', 'social-impact'],
  });

  const hackathon6 = await createHackathon({
    slug: 'edu-innovation-2025',
    title: 'Education Innovation Challenge',
    description: 'Transforming education through technology',
    status: 'DRAFT',
    organizerId: organizers[2].id,
    coverImageUrl: COVER_IMAGES[5],
    registrationStart: null,
    registrationEnd: null,
    eventStart: null,
    eventEnd: null,
    submissionDeadline: null,
    judgingPhase: 'NOT_STARTED',
    region: 'Mekelle',
    venue: 'Mekelle University',
    isVirtual: false,
    tags: ['education', 'edtech', 'e-learning'],
  });

  // Create judging criteria for each active hackathon
  const criteriaDefs = [
    { name: 'Innovation', description: 'Originality and creativity', maxScore: 10, weight: 2 },
    { name: 'Technical Execution', description: 'Code quality and architecture', maxScore: 10, weight: 2.5 },
    { name: 'Impact', description: 'Potential impact on society', maxScore: 10, weight: 2 },
    { name: 'Presentation', description: 'Demo and communication', maxScore: 10, weight: 1.5 },
    { name: 'Completeness', description: 'Working prototype', maxScore: 10, weight: 2 },
  ];

  for (const hackathon of [hackathon1, hackathon2, hackathon3, hackathon4]) {
    const existing = await prisma.judgingCriteria.count({ where: { hackathonId: hackathon.id } });
    if (existing === 0) {
      for (let i = 0; i < criteriaDefs.length; i++) {
        await prisma.judgingCriteria.create({
          data: { ...criteriaDefs[i], sortOrder: i + 1, hackathonId: hackathon.id },
        });
      }
      console.log(`  ✅ Criteria for: ${hackathon.title}`);
    }
  }

  // Helper to create teams and submissions for completed/judging hackathons
  async function createTeamsAndSubmissions(hackathon, participantPool, numTeams = 5) {
    const criteria = await prisma.judgingCriteria.findMany({ where: { hackathonId: hackathon.id } });
    
    for (let i = 0; i < numTeams; i++) {
      const teamName = TEAM_NAMES[i % TEAM_NAMES.length];
      const projectName = PROJECT_NAMES[i % PROJECT_NAMES.length];
      
      // Create team
      let team = await prisma.team.findFirst({ where: { hackathonId: hackathon.id, name: teamName } });
      if (!team) {
        team = await prisma.team.create({
          data: {
            hackathonId: hackathon.id,
            name: teamName,
            description: `Building ${projectName} for ${hackathon.title}`,
            isOpen: false,
          },
        });

        // Add 2-4 members
        const numMembers = 2 + Math.floor(Math.random() * 3);
        for (let j = 0; j < numMembers; j++) {
          const participant = participantPool[(i * 3 + j) % participantPool.length];
          await prisma.teamMember.create({
            data: {
              teamId: team.id,
              userId: participant.id,
              role: j === 0 ? 'LEADER' : 'MEMBER',
            },
          });
        }
        console.log(`    ✅ Team: ${teamName}`);
      }

      // Create submission for completed/judging hackathons
      if (hackathon.status === 'COMPLETED' || hackathon.status === 'JUDGING') {
        let submission = await prisma.submission.findUnique({ where: { teamId: team.id } });
        if (!submission) {
          submission = await prisma.submission.create({
            data: {
              teamId: team.id,
              hackathonId: hackathon.id,
              title: projectName,
              description: `An innovative solution for ${hackathon.title}. Built with modern technologies.`,
              githubUrl: `https://github.com/${teamName.toLowerCase().replace(/\s/g, '-')}/${projectName.toLowerCase()}`,
              demoUrl: `https://${projectName.toLowerCase().replace(/\s/g, '-')}.demo.app`,
              status: hackathon.status === 'COMPLETED' ? 'SCORED' : 'SUBMITTED',
              submittedAt: hackathon.submissionDeadline,
            },
          });

          // Create scores if completed
          if (hackathon.status === 'COMPLETED' && criteria.length > 0) {
            for (const judge of judges.slice(0, 2)) {
              let totalScore = 0;
              for (const c of criteria) {
                const score = 6 + Math.floor(Math.random() * 5); // 6-10
                totalScore += score * c.weight;
                await prisma.score.create({
                  data: {
                    submissionId: submission.id,
                    judgeId: judge.id,
                    criteriaId: c.id,
                    value: score,
                    comment: `Good ${c.name.toLowerCase()}. ${score >= 8 ? 'Excellent work!' : 'Could improve.'}`,
                  },
                });
              }
              // Update submission with final score (simplified)
              await prisma.submission.update({
                where: { id: submission.id },
                data: { finalScore: totalScore / criteria.reduce((a, c) => a + c.weight, 0) },
              });
            }
          }
          console.log(`    ✅ Submission: ${projectName}`);
        }
      }
    }
  }

  // Create teams and submissions
  console.log('\n  Creating teams and submissions...');
  await createTeamsAndSubmissions(hackathon1, participants, 8); // Completed
  await createTeamsAndSubmissions(hackathon3, participants.slice(5), 6); // Judging

  // Create localized strings
  const localizedCount = await prisma.localizedString.count();
  if (localizedCount === 0) {
    await prisma.localizedString.createMany({
      data: [
        { key: 'app.name', locale: 'en', value: 'HackET', context: 'ui' },
        { key: 'app.name', locale: 'am', value: 'ሃክኢት', context: 'ui' },
        { key: 'nav.events', locale: 'en', value: 'Events', context: 'ui' },
        { key: 'nav.events', locale: 'am', value: 'ክስተቶች', context: 'ui' },
      ],
    });
    console.log('\n  ✅ Localized strings created');
  }

  console.log('\n🎉 MVP Seed completed successfully!\n');
  console.log('Hackathons created:');
  console.log('  - FinTech Hackathon 2024 (COMPLETED with scores)');
  console.log('  - Health Innovation 2025 (IN_PROGRESS)');
  console.log('  - AgriTech Summit 2025 (JUDGING)');
  console.log('  - EthioHack 2026 (REGISTRATION_OPEN)');
  console.log('  - Women in Tech 2025 (UPCOMING)');
  console.log('  - Education Innovation (DRAFT)');
  console.log('\nLogin credentials:');
  console.log('  Admin: admin@hacket.et / admin123');
  console.log('  Organizer: abel@hacket.et / organizer123');
  console.log('  Judge: prof.abebe@hacket.et / judge123');
  console.log('  Participant: sara@hacket.et / participant123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
