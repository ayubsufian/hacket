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
  console.log('\n  Refreshing localized strings...');
  await prisma.localizedString.deleteMany();
  
  const localizationData = [
      // ── BASIC UI ─────────────────────────────────────────────────────────────
      { key: 'app.name', locale: 'en', value: 'HackET', context: 'ui' },
      { key: 'app.name', locale: 'am', value: 'ሃክኢት', context: 'ui' },
      { key: 'nav.events', locale: 'en', value: 'Events', context: 'ui' },
      { key: 'nav.events', locale: 'am', value: 'ክስተቶች', context: 'ui' },
      
      // ── ENUMS (Context: enum) ────────────────────────────────────────────────
      // User Roles
      { key: 'enum.UserRole.PARTICIPANT', locale: 'en', value: 'Participant', context: 'enum' },
      { key: 'enum.UserRole.PARTICIPANT', locale: 'am', value: 'ተሳታፊ', context: 'enum' },
      { key: 'enum.UserRole.ORGANIZER', locale: 'en', value: 'Organizer', context: 'enum' },
      { key: 'enum.UserRole.ORGANIZER', locale: 'am', value: 'አዘጋጅ', context: 'enum' },
      { key: 'enum.UserRole.JUDGE', locale: 'en', value: 'Judge', context: 'enum' },
      { key: 'enum.UserRole.JUDGE', locale: 'am', value: 'ዳኛ', context: 'enum' },
      { key: 'enum.UserRole.MENTOR', locale: 'en', value: 'Mentor', context: 'enum' },
      { key: 'enum.UserRole.MENTOR', locale: 'am', value: 'አማካሪ', context: 'enum' },
      { key: 'enum.UserRole.ADMIN', locale: 'en', value: 'Admin', context: 'enum' },
      { key: 'enum.UserRole.ADMIN', locale: 'am', value: 'አስተዳዳሪ', context: 'enum' },

      // Hackathon Status
      { key: 'enum.HackathonStatus.DRAFT', locale: 'en', value: 'Draft', context: 'enum' },
      { key: 'enum.HackathonStatus.DRAFT', locale: 'am', value: 'ረቂቅ', context: 'enum' },
      { key: 'enum.HackathonStatus.UPCOMING', locale: 'en', value: 'Upcoming', context: 'enum' },
      { key: 'enum.HackathonStatus.UPCOMING', locale: 'am', value: 'ቀጣይ', context: 'enum' },
      { key: 'enum.HackathonStatus.REGISTRATION_OPEN', locale: 'en', value: 'Registration Open', context: 'enum' },
      { key: 'enum.HackathonStatus.REGISTRATION_OPEN', locale: 'am', value: 'ምዝገባ ክፍት ነው', context: 'enum' },
      { key: 'enum.HackathonStatus.REGISTRATION_CLOSED', locale: 'en', value: 'Registration Closed', context: 'enum' },
      { key: 'enum.HackathonStatus.REGISTRATION_CLOSED', locale: 'am', value: 'ምዝገባ ተዘግቷል', context: 'enum' },
      { key: 'enum.HackathonStatus.IN_PROGRESS', locale: 'en', value: 'In Progress', context: 'enum' },
      { key: 'enum.HackathonStatus.IN_PROGRESS', locale: 'am', value: 'በሂደት ላይ', context: 'enum' },
      { key: 'enum.HackathonStatus.JUDGING', locale: 'en', value: 'Judging', context: 'enum' },
      { key: 'enum.HackathonStatus.JUDGING', locale: 'am', value: 'ግምገማ ላይ', context: 'enum' },
      { key: 'enum.HackathonStatus.COMPLETED', locale: 'en', value: 'Completed', context: 'enum' },
      { key: 'enum.HackathonStatus.COMPLETED', locale: 'am', value: 'ተጠናቋል', context: 'enum' },
      { key: 'enum.HackathonStatus.CANCELLED', locale: 'en', value: 'Cancelled', context: 'enum' },
      { key: 'enum.HackathonStatus.CANCELLED', locale: 'am', value: 'ተሰርዟል', context: 'enum' },
      { key: 'enum.HackathonStatus.SUSPENDED', locale: 'en', value: 'Suspended', context: 'enum' },
      { key: 'enum.HackathonStatus.SUSPENDED', locale: 'am', value: 'ታግዷል', context: 'enum' },
      { key: 'enum.HackathonStatus.ARCHIVED', locale: 'en', value: 'Archived', context: 'enum' },
      { key: 'enum.HackathonStatus.ARCHIVED', locale: 'am', value: 'ተመዝግቦ ተቀምጧል', context: 'enum' },

      // Registration Status
      { key: 'enum.RegistrationStatus.REGISTERED', locale: 'en', value: 'Registered', context: 'enum' },
      { key: 'enum.RegistrationStatus.REGISTERED', locale: 'am', value: 'ተመዝግቧል', context: 'enum' },
      { key: 'enum.RegistrationStatus.WAITLISTED', locale: 'en', value: 'Waitlisted', context: 'enum' },
      { key: 'enum.RegistrationStatus.WAITLISTED', locale: 'am', value: 'በተጠባባቂነት', context: 'enum' },
      { key: 'enum.RegistrationStatus.CHECKED_IN', locale: 'en', value: 'Checked In', context: 'enum' },
      { key: 'enum.RegistrationStatus.CHECKED_IN', locale: 'am', value: 'ተገኝቷል', context: 'enum' },
      { key: 'enum.RegistrationStatus.WITHDRAWN', locale: 'en', value: 'Withdrawn', context: 'enum' },
      { key: 'enum.RegistrationStatus.WITHDRAWN', locale: 'am', value: 'አቋርጧል', context: 'enum' },

      // Submission Status
      { key: 'enum.SubmissionStatus.DRAFT', locale: 'en', value: 'Draft', context: 'enum' },
      { key: 'enum.SubmissionStatus.DRAFT', locale: 'am', value: 'ረቂቅ', context: 'enum' },
      { key: 'enum.SubmissionStatus.SUBMITTED', locale: 'en', value: 'Submitted', context: 'enum' },
      { key: 'enum.SubmissionStatus.SUBMITTED', locale: 'am', value: 'ገብቷል', context: 'enum' },
      { key: 'enum.SubmissionStatus.UNDER_REVIEW', locale: 'en', value: 'Under Review', context: 'enum' },
      { key: 'enum.SubmissionStatus.UNDER_REVIEW', locale: 'am', value: 'በግምገማ ላይ', context: 'enum' },
      { key: 'enum.SubmissionStatus.SCORED', locale: 'en', value: 'Scored', context: 'enum' },
      { key: 'enum.SubmissionStatus.SCORED', locale: 'am', value: 'ውጤት ተሰጥቷል', context: 'enum' },

      // Staff Roles
      { key: 'enum.StaffRole.CO_ORGANIZER', locale: 'en', value: 'Co-Organizer', context: 'enum' },
      { key: 'enum.StaffRole.CO_ORGANIZER', locale: 'am', value: 'ተባባሪ አዘጋጅ', context: 'enum' },
      { key: 'enum.StaffRole.JUDGE', locale: 'en', value: 'Judge', context: 'enum' },
      { key: 'enum.StaffRole.JUDGE', locale: 'am', value: 'ዳኛ', context: 'enum' },
      { key: 'enum.StaffRole.MENTOR', locale: 'en', value: 'Mentor', context: 'enum' },
      { key: 'enum.StaffRole.MENTOR', locale: 'am', value: 'አማካሪ', context: 'enum' },
      { key: 'enum.StaffRole.SPONSOR', locale: 'en', value: 'Sponsor', context: 'enum' },
      { key: 'enum.StaffRole.SPONSOR', locale: 'am', value: 'ስፖንሰር', context: 'enum' },
      { key: 'enum.StaffRole.TECHNICAL_LEAD', locale: 'en', value: 'Technical Lead', context: 'enum' },
      { key: 'enum.StaffRole.TECHNICAL_LEAD', locale: 'am', value: 'የቴክኒክ መሪ', context: 'enum' },
      { key: 'enum.StaffRole.LOGISTICS', locale: 'en', value: 'Logistics', context: 'enum' },
      { key: 'enum.StaffRole.LOGISTICS', locale: 'am', value: 'ሎጀስቲክስ', context: 'enum' },
      { key: 'enum.StaffRole.COMMUNICATIONS', locale: 'en', value: 'Communications', context: 'enum' },
      { key: 'enum.StaffRole.COMMUNICATIONS', locale: 'am', value: 'ግንኙነት', context: 'enum' },
      { key: 'enum.StaffRole.FINANCE', locale: 'en', value: 'Finance', context: 'enum' },
      { key: 'enum.StaffRole.FINANCE', locale: 'am', value: 'ፋይናንስ', context: 'enum' },

      // Verification Status
      { key: 'enum.VerificationStatus.UNVERIFIED', locale: 'en', value: 'Unverified', context: 'enum' },
      { key: 'enum.VerificationStatus.UNVERIFIED', locale: 'am', value: 'ያልተረጋገጠ', context: 'enum' },
      { key: 'enum.VerificationStatus.PENDING', locale: 'en', value: 'Pending', context: 'enum' },
      { key: 'enum.VerificationStatus.PENDING', locale: 'am', value: 'በመጠባበቅ ላይ', context: 'enum' },
      { key: 'enum.VerificationStatus.UNDER_REVIEW', locale: 'en', value: 'Under Review', context: 'enum' },
      { key: 'enum.VerificationStatus.UNDER_REVIEW', locale: 'am', value: 'በግምገማ ላይ', context: 'enum' },
      { key: 'enum.VerificationStatus.VERIFIED', locale: 'en', value: 'Verified', context: 'enum' },
      { key: 'enum.VerificationStatus.VERIFIED', locale: 'am', value: 'የተረጋገጠ', context: 'enum' },
      { key: 'enum.VerificationStatus.REJECTED', locale: 'en', value: 'Rejected', context: 'enum' },
      { key: 'enum.VerificationStatus.REJECTED', locale: 'am', value: 'ተቀባይነት አላገኘም', context: 'enum' },

      // Judging Phase
      { key: 'enum.JudgingPhase.NOT_STARTED', locale: 'en', value: 'Not Started', context: 'enum' },
      { key: 'enum.JudgingPhase.NOT_STARTED', locale: 'am', value: 'አልተጀመረም', context: 'enum' },
      { key: 'enum.JudgingPhase.IN_PROGRESS', locale: 'en', value: 'In Progress', context: 'enum' },
      { key: 'enum.JudgingPhase.IN_PROGRESS', locale: 'am', value: 'በሂደት ላይ', context: 'enum' },
      { key: 'enum.JudgingPhase.COMPLETE', locale: 'en', value: 'Complete', context: 'enum' },
      { key: 'enum.JudgingPhase.COMPLETE', locale: 'am', value: 'ተጠናቋል', context: 'enum' },

      // ── API RESPONSES (Context: api) ─────────────────────────────────────────
      // Success Messages
      { key: 'api.success.registration', locale: 'en', value: 'Registration successful.', context: 'api' },
      { key: 'api.success.registration', locale: 'am', value: 'ምዝገባው ተሳክቷል።', context: 'api' },
      { key: 'api.success.login', locale: 'en', value: 'Login successful.', context: 'api' },
      { key: 'api.success.login', locale: 'am', value: 'በተሳካ ሁኔታ ገብተዋል።', context: 'api' },
      { key: 'api.success.logout', locale: 'en', value: 'Logged out successfully.', context: 'api' },
      { key: 'api.success.logout', locale: 'am', value: 'በተሳካ ሁኔታ ወጥተዋል።', context: 'api' },
      { key: 'api.success.hackathon_created', locale: 'en', value: 'Hackathon created successfully.', context: 'api' },
      { key: 'api.success.hackathon_created', locale: 'am', value: 'የሃካቶን ዝግጅቱ በተሳካ ሁኔታ ተፈጥሯል።', context: 'api' },
      { key: 'api.success.participant_checked_in', locale: 'en', value: 'Participant checked in successfully.', context: 'api' },
      { key: 'api.success.participant_checked_in', locale: 'am', value: 'ተሳታፊው በተሳካ ሁኔታ ተመዝግቧል።', context: 'api' },

      // Error Messages
      { key: 'api.error.invalid_credentials', locale: 'en', value: 'Invalid credentials.', context: 'api' },
      { key: 'api.error.invalid_credentials', locale: 'am', value: 'የተሳሳተ መረጃ።', context: 'api' },
      { key: 'api.error.route_not_found', locale: 'en', value: 'Route not found.', context: 'api' },
      { key: 'api.error.route_not_found', locale: 'am', value: 'ገጹ አልተገኘም።', context: 'api' },
      { key: 'api.error.too_many_requests', locale: 'en', value: 'Too many requests. Please try again later.', context: 'api' },
      { key: 'api.error.too_many_requests', locale: 'am', value: 'በጣም ብዙ ጥያቄዎች ቀርበዋል። እባክዎ ትንሽ ቆይተው እንደገና ይሞክሩ።', context: 'api' },
      { key: 'api.error.record_not_found', locale: 'en', value: 'Record not found.', context: 'api' },
      { key: 'api.error.record_not_found', locale: 'am', value: 'መረጃው አልተገኘም።', context: 'api' },

      // ── NOTIFICATIONS (Context: notification) ──────────────────────────────
      { key: 'notification.title.deadline_warning', locale: 'en', value: 'Action Required: 24 Hours Left!', context: 'notification' },
      { key: 'notification.title.deadline_warning', locale: 'am', value: 'እርምጃ ያስፈልጋል: 24 ሰዓታት ቀርተዋል!', context: 'notification' },
      { key: 'notification.title.team_invite', locale: 'en', value: 'New Team Invitation', context: 'notification' },
      { key: 'notification.title.team_invite', locale: 'am', value: 'አዲስ የቡድን ጥሪ', context: 'notification' },
      { key: 'notification.title.score_published', locale: 'en', value: 'Final Scores & Feedback Released!', context: 'notification' },
      { key: 'notification.title.score_published', locale: 'am', value: 'የመጨረሻ ውጤቶች እና ግብረ መልስ ተለቀዋል!', context: 'notification' },
      { key: 'notification.title.certificate_issued', locale: 'en', value: 'New Certificate Issued!', context: 'notification' },
      { key: 'notification.title.certificate_issued', locale: 'am', value: 'አዲስ የምስክር ወረቀት ተሰጥቷል!', context: 'notification' },

      // ── EMAILS (Context: email) ──────────────────────────────────────────
      { key: 'email.subject.verification', locale: 'en', value: 'Welcome to HackET - Please verify your email', context: 'email' },
      { key: 'email.subject.verification', locale: 'am', value: 'እንኳን ወደ ሃክኢት በደህና መጡ - እባክዎ ኢሜልዎን ያረጋግጡ', context: 'email' },
      { key: 'email.subject.password_reset', locale: 'en', value: 'HackET - Password Reset', context: 'email' },
      { key: 'email.subject.password_reset', locale: 'am', value: 'ሃክኢት - የይለፍ ቃል ማስተካከያ', context: 'email' },
      { key: 'email.subject.account_verified', locale: 'en', value: 'HackET - Your account has been verified', context: 'email' },
      { key: 'email.subject.account_verified', locale: 'am', value: 'ሃክኢት - አካውንትዎ ተረጋግጧል', context: 'email' },
    ];

    await prisma.localizedString.createMany({
      data: localizationData
    });
    console.log('\n  ✅ Localized strings created');

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
