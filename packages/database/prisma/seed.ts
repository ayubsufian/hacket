// =============================================================================
// HackET Platform — Seed Data for Development/Demo
// Location: packages/database/prisma/seed.ts
//
// This seed file creates comprehensive demo data including:
// - Teams that are open to accept participants (isOpen: true)
// - Teams with judged submissions (finalScore, rank populated)
// - Winner teams (rank 1, 2, 3) for leaderboard display
// - Scoreboard entries for fast leaderboard queries
// =============================================================================

import { PrismaClient, HackathonStatus, JudgingPhase, TeamMemberRole, UserRole, InvitationStatus, SubmissionStatus } from '@prisma/client'

const prisma = new PrismaClient()

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

async function main() {
  console.log('🌱 Starting HackET seed...')

  // Clear existing data
  await prisma.score.deleteMany()
  await prisma.judgingAssignment.deleteMany()
  await prisma.scoreboardEntry.deleteMany()
  await prisma.submission.deleteMany()
  await prisma.teamInvitation.deleteMany()
  await prisma.teamMember.deleteMany()
  await prisma.team.deleteMany()
  await prisma.judgingCriteria.deleteMany()
  await prisma.hackathonTag.deleteMany()
  await prisma.hackathon.deleteMany()
  await prisma.userProfile.deleteMany()
  await prisma.user.deleteMany()

  // Create Organizer
  const organizer = await prisma.user.create({
    data: {
      id: generateUUID(),
      email: 'organizer@hacket.dev',
      password: '$2a$10$hashed',
      role: UserRole.ORGANIZER,
      verificationStatus: 'VERIFIED',
      profile: {
        create: {
          firstName: 'Sarah',
          lastName: 'Chen',
          bio: 'Tech event organizer passionate about fostering innovation',
          skills: ['Event Management', 'Community Building'],
          city: 'Addis Ababa',
        }
      }
    },
    include: { profile: true }
  })

  // Create Judges
  const judges = await Promise.all([
    prisma.user.create({
      data: {
        id: generateUUID(),
        email: 'judge1@hacket.dev',
        password: '$2a$10$hashed',
        role: UserRole.JUDGE,
        verificationStatus: 'VERIFIED',
        profile: {
          create: {
            firstName: 'Dr. Alex',
            lastName: 'Morrison',
            bio: 'Senior Engineer at Google, 15+ years in software architecture',
            skills: ['System Design', 'AI/ML', 'Cloud Architecture'],
            city: 'San Francisco',
          }
        }
      },
      include: { profile: true }
    }),
    prisma.user.create({
      data: {
        id: generateUUID(),
        email: 'judge2@hacket.dev',
        password: '$2a$10$hashed',
        role: UserRole.JUDGE,
        verificationStatus: 'VERIFIED',
        profile: {
          create: {
            firstName: 'Maria',
            lastName: 'Rodriguez',
            bio: 'Product Lead at Microsoft, startup mentor',
            skills: ['Product Management', 'UX Research', 'Strategy'],
            city: 'Seattle',
          }
        }
      },
      include: { profile: true }
    }),
    prisma.user.create({
      data: {
        id: generateUUID(),
        email: 'judge3@hacket.dev',
        password: '$2a$10$hashed',
        role: UserRole.JUDGE,
        verificationStatus: 'VERIFIED',
        profile: {
          create: {
            firstName: 'James',
            lastName: 'Okonkwo',
            bio: 'CTO at AfriTech Ventures, blockchain specialist',
            skills: ['Blockchain', 'FinTech', 'Startup Scaling'],
            city: 'Lagos',
          }
        }
      },
      include: { profile: true }
    })
  ])

  // Create Participants
  const participants = await Promise.all([
    prisma.user.create({
      data: {
        id: generateUUID(),
        email: 'alice@hacket.dev',
        password: '$2a$10$hashed',
        role: UserRole.PARTICIPANT,
        verificationStatus: 'VERIFIED',
        profile: {
          create: {
            firstName: 'Alice',
            lastName: 'Johnson',
            bio: 'Full-stack developer, React enthusiast',
            skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
            city: 'Nairobi',
            isSeekingTeam: false,
          }
        }
      },
      include: { profile: true }
    }),
    prisma.user.create({
      data: {
        id: generateUUID(),
        email: 'bob@hacket.dev',
        password: '$2a$10$hashed',
        role: UserRole.PARTICIPANT,
        verificationStatus: 'VERIFIED',
        profile: {
          create: {
            firstName: 'Bob',
            lastName: 'Smith',
            bio: 'Mobile developer with Flutter expertise',
            skills: ['Flutter', 'Dart', 'Firebase', 'UI/UX'],
            city: 'Nairobi',
            isSeekingTeam: false,
          }
        }
      },
      include: { profile: true }
    }),
    prisma.user.create({
      data: {
        id: generateUUID(),
        email: 'carol@hacket.dev',
        password: '$2a$10$hashed',
        role: UserRole.PARTICIPANT,
        verificationStatus: 'VERIFIED',
        profile: {
          create: {
            firstName: 'Carol',
            lastName: 'Williams',
            bio: 'ML engineer and data scientist',
            skills: ['Python', 'TensorFlow', 'Data Science', 'NLP'],
            city: 'Accra',
            isSeekingTeam: false,
          }
        }
      },
      include: { profile: true }
    }),
    prisma.user.create({
      data: {
        id: generateUUID(),
        email: 'david@hacket.dev',
        password: '$2a$10$hashed',
        role: UserRole.PARTICIPANT,
        verificationStatus: 'VERIFIED',
        profile: {
          create: {
            firstName: 'David',
            lastName: 'Brown',
            bio: 'DevOps specialist and cloud architect',
            skills: ['AWS', 'Kubernetes', 'Docker', 'CI/CD'],
            city: 'Accra',
            isSeekingTeam: false,
          }
        }
      },
      include: { profile: true }
    }),
    // Winners - 1st Place
    prisma.user.create({
      data: {
        id: generateUUID(),
        email: 'emma@hacket.dev',
        password: '$2a$10$hashed',
        role: UserRole.PARTICIPANT,
        verificationStatus: 'VERIFIED',
        profile: {
          create: {
            firstName: 'Emma',
            lastName: 'Davis',
            bio: 'Creative technologist and AR/VR developer',
            skills: ['Unity', 'C#', 'AR/VR', '3D Modeling', 'Blender'],
            city: 'Cape Town',
            isSeekingTeam: false,
          }
        }
      },
      include: { profile: true }
    }),
    prisma.user.create({
      data: {
        id: generateUUID(),
        email: 'frank@hacket.dev',
        password: '$2a$10$hashed',
        role: UserRole.PARTICIPANT,
        verificationStatus: 'VERIFIED',
        profile: {
          create: {
            firstName: 'Frank',
            lastName: 'Miller',
            bio: 'Hardware hacker and IoT specialist',
            skills: ['Arduino', 'Raspberry Pi', 'IoT', 'Embedded C'],
            city: 'Cape Town',
            isSeekingTeam: false,
          }
        }
      },
      include: { profile: true }
    }),
    // 2nd Place
    prisma.user.create({
      data: {
        id: generateUUID(),
        email: 'grace@hacket.dev',
        password: '$2a$10$hashed',
        role: UserRole.PARTICIPANT,
        verificationStatus: 'VERIFIED',
        profile: {
          create: {
            firstName: 'Grace',
            lastName: 'Lee',
            bio: 'Security researcher and ethical hacker',
            skills: ['Cybersecurity', 'Penetration Testing', 'Cryptography'],
            city: 'Kigali',
            isSeekingTeam: false,
          }
        }
      },
      include: { profile: true }
    }),
    prisma.user.create({
      data: {
        id: generateUUID(),
        email: 'henry@hacket.dev',
        password: '$2a$10$hashed',
        role: UserRole.PARTICIPANT,
        verificationStatus: 'VERIFIED',
        profile: {
          create: {
            firstName: 'Henry',
            lastName: 'Wilson',
            bio: 'Backend engineer specialized in distributed systems',
            skills: ['Go', 'Rust', 'Microservices', 'Kafka', 'Redis'],
            city: 'Kigali',
            isSeekingTeam: false,
          }
        }
      },
      include: { profile: true }
    }),
    // 3rd Place
    prisma.user.create({
      data: {
        id: generateUUID(),
        email: 'iris@hacket.dev',
        password: '$2a$10$hashed',
        role: UserRole.PARTICIPANT,
        verificationStatus: 'VERIFIED',
        profile: {
          create: {
            firstName: 'Iris',
            lastName: 'Garcia',
            bio: 'Frontend wizard with eye for design systems',
            skills: ['Vue.js', 'Design Systems', 'Figma', 'CSS'],
            city: 'Lagos',
            isSeekingTeam: false,
          }
        }
      },
      include: { profile: true }
    }),
    prisma.user.create({
      data: {
        id: generateUUID(),
        email: 'jack@hacket.dev',
        password: '$2a$10$hashed',
        role: UserRole.PARTICIPANT,
        verificationStatus: 'VERIFIED',
        profile: {
          create: {
            firstName: 'Jack',
            lastName: 'Taylor',
            bio: 'Game developer and graphics programmer',
            skills: ['Unreal Engine', 'C++', 'Shader Programming', 'OpenGL'],
            city: 'Lagos',
            isSeekingTeam: false,
          }
        }
      },
      include: { profile: true }
    }),
    // Solo participants seeking teams
    prisma.user.create({
      data: {
        id: generateUUID(),
        email: 'kevin@hacket.dev',
        password: '$2a$10$hashed',
        role: UserRole.PARTICIPANT,
        verificationStatus: 'VERIFIED',
        profile: {
          create: {
            firstName: 'Kevin',
            lastName: 'Anderson',
            bio: 'Looking for a team! Full-stack JavaScript developer',
            skills: ['JavaScript', 'React', 'Node.js', 'MongoDB'],
            city: 'Addis Ababa',
            isSeekingTeam: true,
          }
        }
      },
      include: { profile: true }
    }),
    prisma.user.create({
      data: {
        id: generateUUID(),
        email: 'lisa@hacket.dev',
        password: '$2a$10$hashed',
        role: UserRole.PARTICIPANT,
        verificationStatus: 'VERIFIED',
        profile: {
          create: {
            firstName: 'Lisa',
            lastName: 'Martinez',
            bio: 'Data analyst looking to join a team',
            skills: ['Python', 'Pandas', 'SQL', 'Data Visualization'],
            city: 'Addis Ababa',
            isSeekingTeam: true,
          }
        }
      },
      include: { profile: true }
    })
  ])

  console.log(`✅ Created ${participants.length + judges.length + 1} users`)

  // Create Hackathons
  const now = new Date()
  const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const completedHackathon = await prisma.hackathon.create({
    data: {
      id: generateUUID(),
      slug: 'hacket-2025-grand-challenge',
      title: 'HackET 2025 Grand Challenge',
      description: 'The biggest hackathon of 2025! 48 hours of coding, innovation, and collaboration.',
      status: HackathonStatus.COMPLETED,
      organizerId: organizer.id,
      maxTeamSize: 5,
      minTeamSize: 2,
      judgingPhase: JudgingPhase.COMPLETE,
      judgingMode: 'MINIMUM_REVIEWS',
      requiredReviewsPerSubmission: 3,
      registrationStart: new Date(lastMonth.getTime() - 60 * 24 * 60 * 60 * 1000),
      registrationEnd: new Date(lastMonth.getTime() - 45 * 24 * 60 * 60 * 1000),
      eventStart: new Date(lastMonth.getTime() - 30 * 24 * 60 * 60 * 1000),
      eventEnd: new Date(lastMonth.getTime() - 28 * 24 * 60 * 60 * 1000),
      submissionDeadline: new Date(lastMonth.getTime() - 28 * 24 * 60 * 60 * 1000),
      judgingStart: new Date(lastMonth.getTime() - 27 * 24 * 60 * 60 * 1000),
      judgingEnd: new Date(lastMonth.getTime() - 20 * 24 * 60 * 60 * 1000),
      scoreboardType: 'FINAL_ONLY',
      resultsPublishedAt: new Date(lastMonth.getTime() - 18 * 24 * 60 * 60 * 1000),
      prizes: JSON.stringify({
        first: '$10,000 + mentorship',
        second: '$5,000 + cloud credits',
        third: '$2,500 + hardware kit',
        participants: 'Certificate'
      }),
      region: 'Africa',
      isVirtual: true,
    }
  })

  const activeHackathon = await prisma.hackathon.create({
    data: {
      id: generateUUID(),
      slug: 'hacket-summer-2026',
      title: 'HackET Summer Hackathon 2026',
      description: 'Join us this summer for an exciting hackathon focused on climate tech!',
      status: HackathonStatus.REGISTRATION_OPEN,
      organizerId: organizer.id,
      maxTeamSize: 4,
      minTeamSize: 2,
      judgingPhase: JudgingPhase.NOT_STARTED,
      registrationStart: new Date(),
      registrationEnd: nextMonth,
      eventStart: new Date(nextMonth.getTime() + 7 * 24 * 60 * 60 * 1000),
      eventEnd: new Date(nextMonth.getTime() + 9 * 24 * 60 * 60 * 1000),
      submissionDeadline: new Date(nextMonth.getTime() + 9 * 24 * 60 * 60 * 1000),
      prizes: JSON.stringify({
        first: '$5,000 + incubator access',
        second: '$3,000 + AWS credits',
        third: '$1,500',
        participants: 'Certificate'
      }),
      region: 'Africa',
      isVirtual: false,
      venue: 'iHub Nairobi, Kenya',
    }
  })

  console.log('✅ Created 2 hackathon events')

  // Create Judging Criteria
  const criteria = await Promise.all([
    prisma.judgingCriteria.create({
      data: {
        id: generateUUID(),
        hackathonId: completedHackathon.id,
        name: 'Innovation & Creativity',
        description: 'How unique and creative is the solution?',
        maxScore: 10,
        weight: 1.5,
        sortOrder: 1
      }
    }),
    prisma.judgingCriteria.create({
      data: {
        id: generateUUID(),
        hackathonId: completedHackathon.id,
        name: 'Technical Implementation',
        description: 'Quality of code, architecture, and technical execution',
        maxScore: 10,
        weight: 1.5,
        sortOrder: 2
      }
    }),
    prisma.judgingCriteria.create({
      data: {
        id: generateUUID(),
        hackathonId: completedHackathon.id,
        name: 'Impact & Feasibility',
        description: 'Potential impact and real-world feasibility',
        maxScore: 10,
        weight: 1.0,
        sortOrder: 3
      }
    }),
    prisma.judgingCriteria.create({
      data: {
        id: generateUUID(),
        hackathonId: completedHackathon.id,
        name: 'Presentation & Demo',
        description: 'Quality of presentation and demo delivery',
        maxScore: 10,
        weight: 1.0,
        sortOrder: 4
      }
    })
  ])

  console.log('✅ Created judging criteria')

  // Helper to create team with submission and scores
  async function createCompleteTeam(
    hackathonId: string,
    name: string,
    description: string,
    neededSkills: string[],
    isOpen: boolean,
    members: typeof participants,
    submissionData: {
      title: string
      description: string
      finalScore: number
      rank: number
      status: SubmissionStatus
    }
  ) {
    const teamId = generateUUID()
    const submissionId = generateUUID()

    const team = await prisma.team.create({
      data: {
        id: teamId,
        hackathonId,
        name,
        description,
        neededSkills,
        isOpen,
        members: {
          create: members.map((user, index) => ({
            id: generateUUID(),
            userId: user.id,
            role: index === 0 ? TeamMemberRole.LEADER : TeamMemberRole.MEMBER,
            joinedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
          }))
        }
      },
      include: { members: { include: { user: { include: { profile: true } } } } }
    })

    const submission = await prisma.submission.create({
      data: {
        id: submissionId,
        teamId,
        hackathonId,
        title: submissionData.title,
        description: submissionData.description,
        githubUrl: `https://github.com/hacket/${name.toLowerCase().replace(/\s+/g, '-')}`,
        demoUrl: `https://${name.toLowerCase().replace(/\s+/g, '-')}.demo.hacket.dev`,
        status: submissionData.status,
        submittedAt: new Date(lastMonth.getTime() - 28 * 24 * 60 * 60 * 1000),
        finalScore: submissionData.finalScore,
        rank: submissionData.rank,
        version: 1
      }
    })

    // Create scores from each judge
    for (const judge of judges) {
      await prisma.judgingAssignment.create({
        data: {
          id: generateUUID(),
          hackathonId,
          submissionId,
          judgeId: judge.id,
          assignedAt: new Date(lastMonth.getTime() - 27 * 24 * 60 * 60 * 1000)
        }
      })

      for (const criterion of criteria) {
        const baseScore = submissionData.rank === 1 ? 9 : submissionData.rank === 2 ? 8.5 : submissionData.rank === 3 ? 8 : 6 + Math.random() * 2
        const variance = (Math.random() - 0.5) * 1.5
        const score = Math.min(10, Math.max(1, baseScore + variance))

        await prisma.score.create({
          data: {
            id: generateUUID(),
            submissionId,
            judgeId: judge.id,
            criteriaId: criterion.id,
            value: Math.round(score * 100) / 100,
            comment: score > 8 ? 'Excellent work!' : score > 7 ? 'Great implementation' : 'Good effort',
            isCommentPublic: true
          }
        })
      }
    }

    // Create scoreboard entry
    await prisma.scoreboardEntry.create({
      data: {
        id: generateUUID(),
        hackathonId,
        submissionId,
        finalScore: submissionData.finalScore,
        rank: submissionData.rank,
        aggregatedAt: new Date(lastMonth.getTime() - 18 * 24 * 60 * 60 * 1000)
      }
    })

    return { team, submission }
  }

  // Create Judged Teams (Winners and Ranked)
  await createCompleteTeam(
    completedHackathon.id,
    'VisionaryAR',
    'Revolutionizing education through augmented reality experiences.',
    ['Unity Developer', '3D Artist', 'Education Specialist'],
    false,
    [participants[4], participants[5]], // Emma, Frank
    {
      title: 'EduAR: Immersive Learning Platform',
      description: 'An AR-based educational platform for African students.',
      finalScore: 9.15,
      rank: 1,
      status: SubmissionStatus.SCORED
    }
  )

  await createCompleteTeam(
    completedHackathon.id,
    'SecureFlow',
    'Building secure, decentralized identity solutions.',
    ['Blockchain Developer', 'Security Analyst'],
    false,
    [participants[6], participants[7]], // Grace, Henry
    {
      title: 'AfriID: Decentralized Identity',
      description: 'Blockchain-based digital identity for underserved populations.',
      finalScore: 8.73,
      rank: 2,
      status: SubmissionStatus.SCORED
    }
  )

  await createCompleteTeam(
    completedHackathon.id,
    'EcoTrackers',
    'Monitoring environmental impact through IoT sensors.',
    ['IoT Engineer', 'Data Scientist'],
    false,
    [participants[8], participants[9]], // Iris, Jack
    {
      title: 'EcoSense: Environmental Monitoring',
      description: 'IoT-based environmental monitoring with predictive analytics.',
      finalScore: 8.42,
      rank: 3,
      status: SubmissionStatus.SCORED
    }
  )

  // Additional teams 4th-8th place
  for (let i = 0; i < 5; i++) {
    const rank = i + 4
    const score = 7.8 - (i * 0.4)
    await createCompleteTeam(
      completedHackathon.id,
      `Team Innovate${i + 1}`,
      'Building innovative tech solutions.',
      ['Developer', 'Designer'],
      false,
      [participants[i % participants.length], participants[(i + 1) % participants.length]],
      {
        title: `Project ${['HealthBridge', 'AgriTech AI', 'FinAccess', 'LearnConnect', 'SmartGrid'][i]}`,
        description: 'An innovative solution addressing key challenges.',
        finalScore: Math.round(score * 100) / 100,
        rank,
        status: SubmissionStatus.SCORED
      }
    )
  }

  console.log('✅ Created 8 judged teams with scores and leaderboard entries')

  // Create Open Teams for Active Hackathon
  const openTeam1 = await prisma.team.create({
    data: {
      id: generateUUID(),
      hackathonId: activeHackathon.id,
      name: 'ClimateGuardians',
      description: 'Building solutions to combat climate change. Looking for passionate developers!',
      neededSkills: ['React', 'Python', 'Data Visualization', 'Climate Science'],
      isOpen: true,
      members: {
        create: [{
          id: generateUUID(),
          userId: participants[0].id,
          role: TeamMemberRole.LEADER,
          joinedAt: new Date()
        }]
      }
    }
  })

  const openTeam2 = await prisma.team.create({
    data: {
      id: generateUUID(),
      hackathonId: activeHackathon.id,
      name: 'GreenTech Innovators',
      description: 'Sustainable tech for agriculture. Join us to make farming smarter!',
      neededSkills: ['IoT', 'Embedded Systems', 'Agriculture Knowledge'],
      isOpen: true,
      members: {
        create: [
          {
            id: generateUUID(),
            userId: participants[4].id,
            role: TeamMemberRole.LEADER,
            joinedAt: new Date()
          },
          {
            id: generateUUID(),
            userId: participants[5].id,
            role: TeamMemberRole.MEMBER,
            joinedAt: new Date()
          }
        ]
      }
    }
  })

  const openTeam3 = await prisma.team.create({
    data: {
      id: generateUUID(),
      hackathonId: activeHackathon.id,
      name: 'WaterWise',
      description: 'Smart water management systems. Need full-stack devs!',
      neededSkills: ['Full-Stack', 'Machine Learning', 'Hardware'],
      isOpen: true,
      members: {
        create: [{
          id: generateUUID(),
          userId: participants[6].id,
          role: TeamMemberRole.LEADER,
          joinedAt: new Date()
        }]
      }
    }
  })

  const closedTeam = await prisma.team.create({
    data: {
      id: generateUUID(),
      hackathonId: activeHackathon.id,
      name: 'SolarSync',
      description: 'Optimizing solar energy distribution.',
      neededSkills: [],
      isOpen: false,
      members: {
        create: [
          {
            id: generateUUID(),
            userId: participants[2].id,
            role: TeamMemberRole.LEADER,
            joinedAt: new Date()
          },
          {
            id: generateUUID(),
            userId: participants[3].id,
            role: TeamMemberRole.MEMBER,
            joinedAt: new Date()
          }
        ]
      }
    }
  })

  console.log('✅ Created 4 teams for active hackathon (3 open, 1 closed)')

  // Create Team Invitations
  await prisma.teamInvitation.create({
    data: {
      id: generateUUID(),
      teamId: openTeam1.id,
      senderId: participants[0].id,
      receiverId: participants[10].id,
      status: InvitationStatus.PENDING,
      type: 'INVITATION',
      message: 'Hey Kevin! Would love to have you on our ClimateGuardians team.',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date()
    }
  })

  await prisma.teamInvitation.create({
    data: {
      id: generateUUID(),
      teamId: openTeam2.id,
      senderId: participants[4].id,
      receiverId: participants[11].id,
      status: InvitationStatus.PENDING,
      type: 'INVITATION',
      message: 'Lisa, we need a data analyst for our agricultural project!',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date()
    }
  })

  console.log('✅ Created team invitations')

  console.log('\n🎉 Seed completed successfully!')
  console.log('\n📊 Summary:')
  console.log('   • 1 Organizer, 3 Judges, 12 Participants')
  console.log('   • 1 Completed hackathon with judging (8 teams, 3 winners)')
  console.log('   • 1 Active hackathon with registration open (4 teams, 3 open)')
  console.log('   • Leaderboard populated with 8 ranked entries')
  console.log('   • Team invitations for joining open teams')
  console.log('\n🏆 Winners (Completed Hackathon):')
  console.log('   1st Place: VisionaryAR (9.15) - EduAR Platform')
  console.log('   2nd Place: SecureFlow (8.73) - AfriID Identity')
  console.log('   3rd Place: EcoTrackers (8.42) - EcoSense Monitoring')
  console.log('\n🔓 Open Teams (Accepting Members):')
  console.log('   • ClimateGuardians - needs React/Python devs')
  console.log('   • GreenTech Innovators - needs IoT/Agriculture experts')
  console.log('   • WaterWise - needs Full-Stack/ML engineers')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
