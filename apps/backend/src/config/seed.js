// =============================================================================
// HackET — Database Seed Script
// Seeds the database with initial admin user, sample hackathon, and criteria.
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

async function main() {
  console.log('🌱 Seeding HackET database...\n');

  // ── 1. Admin User ─────────────────────────────────────────────────────
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@hacket.et';
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'secure_password_123';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  let adminUser;
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN',
        profile: {
          create: {
            firstName: 'HackET',
            lastName: 'Admin',
            bio: 'Platform administrator for HackET.',
            preferredLocale: 'en',
          },
        },
      },
    });
    console.log(`  ✅ Admin user created: ${adminEmail}`);
  } else {
    adminUser = existingAdmin;
    console.log(`  ⏭️  Admin user already exists: ${adminEmail}`);
  }

  // ── 2. Sample Organizer ───────────────────────────────────────────────
  const organizerEmail = 'organizer@hacket.et';
  let organizer = await prisma.user.findUnique({
    where: { email: organizerEmail },
  });

  if (!organizer) {
    const hashedPassword = await bcrypt.hash('organizer123', 12);
    organizer = await prisma.user.create({
      data: {
        email: organizerEmail,
        password: hashedPassword,
        role: 'ORGANIZER',
        profile: {
          create: {
            firstName: 'Abel',
            lastName: 'Tesfaye',
            bio: 'Hackathon organizer based in Addis Ababa.',
            skills: ['event-management', 'community-building'],
            interests: ['technology', 'entrepreneurship', 'AI'],
            city: 'Addis Ababa',
            region: 'Addis Ababa',
            preferredLocale: 'en',
          },
        },
      },
    });
    console.log(`  ✅ Organizer created: ${organizerEmail}`);
  } else {
    console.log(`  ⏭️  Organizer already exists: ${organizerEmail}`);
  }

  // ── 3. Sample Participants ────────────────────────────────────────────
  const participants = [
    {
      email: 'participant1@hacket.et',
      firstName: 'Sara',
      lastName: 'Bekele',
      skills: ['javascript', 'react', 'node.js', 'python'],
      interests: ['web-development', 'AI', 'fintech'],
      city: 'Addis Ababa',
      region: 'Addis Ababa',
    },
    {
      email: 'participant2@hacket.et',
      firstName: 'Dawit',
      lastName: 'Hailu',
      skills: ['python', 'machine-learning', 'data-science', 'tensorflow'],
      interests: ['AI', 'healthtech', 'agriculture'],
      city: 'Bahir Dar',
      region: 'Amhara',
    },
    {
      email: 'participant3@hacket.et',
      firstName: 'Meron',
      lastName: 'Alemu',
      skills: ['ui-design', 'figma', 'flutter', 'dart'],
      interests: ['mobile-development', 'education', 'social-impact'],
      city: 'Hawassa',
      region: 'Sidama',
    },
  ];

  for (const p of participants) {
    const existing = await prisma.user.findUnique({ where: { email: p.email } });
    if (!existing) {
      const hashedPassword = await bcrypt.hash('participant123', 12);
      await prisma.user.create({
        data: {
          email: p.email,
          password: hashedPassword,
          role: 'PARTICIPANT',
          profile: {
            create: {
              firstName: p.firstName,
              lastName: p.lastName,
              skills: p.skills,
              interests: p.interests,
              city: p.city,
              region: p.region,
              preferredLocale: 'en',
            },
          },
        },
      });
      console.log(`  ✅ Participant created: ${p.email}`);
    } else {
      console.log(`  ⏭️  Participant already exists: ${p.email}`);
    }
  }

  // ── 4. Sample Judge ───────────────────────────────────────────────────
  const judgeEmail = 'judge@hacket.et';
  let judge = await prisma.user.findUnique({ where: { email: judgeEmail } });
  if (!judge) {
    const hashedPassword = await bcrypt.hash('judge123', 12);
    judge = await prisma.user.create({
      data: {
        email: judgeEmail,
        password: hashedPassword,
        role: 'JUDGE',
        profile: {
          create: {
            firstName: 'Prof. Abebe',
            lastName: 'Kebede',
            bio: 'Computer Science professor at AAU.',
            skills: ['software-engineering', 'AI', 'systems-design'],
            preferredLocale: 'am',
          },
        },
      },
    });
    console.log(`  ✅ Judge created: ${judgeEmail}`);
  } else {
    console.log(`  ⏭️  Judge already exists: ${judgeEmail}`);
  }

  // ── 5. Sample Hackathon ───────────────────────────────────────────────
  const hackathonSlug = 'ethio-hack-2026';
  let hackathon = await prisma.hackathon.findUnique({
    where: { slug: hackathonSlug },
  });

  if (!hackathon) {
    const now = new Date();
    hackathon = await prisma.hackathon.create({
      data: {
        slug: hackathonSlug,
        title: 'EthioHack 2026 — Build the Future',
        titleAm: 'ኢትዮሃክ 2026 — የወደፊቱን ስሩ',
        description:
          'Ethiopia\'s premier hackathon bringing together the brightest minds to solve real-world challenges in fintech, healthtech, and agriculture.',
        descriptionAm:
          'በፋይናንስ ቴክ፣ በጤና ቴክ እና በግብርና ውስጥ የገሃዱ ዓለም ተግዳሮቶችን ለመፍታት ብሩህ አዕምሮዎችን የሚያቀራርብ የኢትዮጵያ ቀዳሚ ሃካቶን።',
        status: 'REGISTRATION_OPEN',
        organizerId: organizer.id,
        maxTeamSize: 5,
        minTeamSize: 2,
        maxParticipants: 200,
        registrationStart: now,
        registrationEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        eventStart: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
        eventEnd: new Date(now.getTime() + 47 * 24 * 60 * 60 * 1000),
        submissionDeadline: new Date(now.getTime() + 47 * 24 * 60 * 60 * 1000),
        rules: 'Teams must submit a working prototype. All code must be original.',
        region: 'Addis Ababa',
        venue: 'Addis Ababa University, Science Campus',
        isVirtual: false,
        contactEmail: 'organizer@hacket.et',
        tags: {
          create: [
            { tag: 'fintech' },
            { tag: 'healthtech' },
            { tag: 'agriculture' },
            { tag: 'AI' },
            { tag: 'mobile' },
          ],
        },
      },
    });
    console.log(`  ✅ Hackathon created: ${hackathon.title}`);
  } else {
    console.log(`  ⏭️  Hackathon already exists: ${hackathonSlug}`);
  }

  // ── 6. Judging Criteria ───────────────────────────────────────────────
  const criteriaCount = await prisma.judgingCriteria.count({
    where: { hackathonId: hackathon.id },
  });

  if (criteriaCount === 0) {
    const criteria = [
      { name: 'Innovation', nameAm: 'ፈጠራ', description: 'Originality and creativity of the solution', maxScore: 10, weight: 2.0, sortOrder: 1 },
      { name: 'Technical Execution', nameAm: 'ቴክኒካል አፈጻጸም', description: 'Code quality, architecture, and implementation', maxScore: 10, weight: 2.5, sortOrder: 2 },
      { name: 'Impact & Relevance', nameAm: 'ተፅዕኖ እና አግባብነት', description: 'Potential impact on Ethiopian society', maxScore: 10, weight: 2.0, sortOrder: 3 },
      { name: 'Presentation', nameAm: 'ገለጻ', description: 'Clarity, quality of demo, and communication', maxScore: 10, weight: 1.5, sortOrder: 4 },
      { name: 'Completeness', nameAm: 'ሙሉነት', description: 'Working prototype with core features', maxScore: 10, weight: 2.0, sortOrder: 5 },
    ];

    for (const c of criteria) {
      await prisma.judgingCriteria.create({
        data: { ...c, hackathonId: hackathon.id },
      });
    }
    console.log(`  ✅ Judging criteria created (${criteria.length} criteria)`);
  } else {
    console.log(`  ⏭️  Judging criteria already exist`);
  }

  // ── 7. Localized Strings (sample) ────────────────────────────────────
  const localizedCount = await prisma.localizedString.count();
  if (localizedCount === 0) {
    await prisma.localizedString.createMany({
      data: [
        { key: 'app.name', locale: 'en', value: 'HackET', context: 'ui' },
        { key: 'app.name', locale: 'am', value: 'ሃክኢት', context: 'ui' },
        { key: 'app.tagline', locale: 'en', value: 'Ethiopia\'s Hackathon Hub', context: 'ui' },
        { key: 'app.tagline', locale: 'am', value: 'የኢትዮጵያ ሃካቶን ማዕከል', context: 'ui' },
        { key: 'nav.events', locale: 'en', value: 'Events', context: 'ui' },
        { key: 'nav.events', locale: 'am', value: 'ክስተቶች', context: 'ui' },
        { key: 'nav.teams', locale: 'en', value: 'Teams', context: 'ui' },
        { key: 'nav.teams', locale: 'am', value: 'ቡድኖች', context: 'ui' },
        { key: 'badge.participant', locale: 'en', value: 'Participation Certificate', context: 'badge' },
        { key: 'badge.participant', locale: 'am', value: 'የተሳትፎ ሰርተፊኬት', context: 'badge' },
      ],
    });
    console.log('  ✅ Localized strings created');
  } else {
    console.log('  ⏭️  Localized strings already exist');
  }

  console.log('\n🎉 Seed completed!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
