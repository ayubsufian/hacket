---
description: Complete HackET System Workflows Documentation
---

# HackET Platform — System Workflows

This document outlines all major workflows in the HackET hackathon management platform.

---

## Workflow 1: User Registration & Authentication (UC0001, UC0002)

### Description
Users register with role-based access control (Admin, Organizer, Judge, Mentor, Participant).

### Flow
1. User submits registration form with email, password, role
2. System validates and hashes password (bcrypt)
3. Profile created with Amharic name support (firstNameAm, lastNameAm)
4. Verification email sent (if enabled)
5. User logs in with JWT token issued

### Demo Users (from seed)
| Role | Email | Password |
|------|-------|----------|
| ADMIN | admin@hacket.et | Admin@HackET2026 |
| ORGANIZER | organizer@hacket.et | Organizer@123 |
| ORGANIZER | organizer2@hacket.et | Organizer@123 |
| JUDGE | judge@hacket.et | Judge@123 |
| JUDGE | judge2@hacket.et | Judge@123 |
| MENTOR | mentor@hacket.et | Mentor@123 |
| MENTOR | mentor2@hacket.et | Mentor@123 |
| PARTICIPANT | participant1-5@hacket.et | Participant@123 |

### API Endpoints
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/verify-email` - Email verification
- `GET /auth/me` - Get current user

---

## Workflow 2: Hackathon Creation & Management (UC0010)

### Description
Organizers create and manage hackathon events with full configuration.

### Flow
1. Organizer creates hackathon with title, description, dates
2. Upload cover image (stored in cloud storage)
3. Configure team size limits (min/max)
4. Set registration and event dates
5. Define prizes and judging criteria
6. Publish or save as draft

### States
- `DRAFT` - Configuring, not visible to public
- `REGISTRATION_OPEN` - Accepting participant registrations
- `REGISTRATION_CLOSED` - Registration ended, event pending
- `IN_PROGRESS` - Event ongoing
- `JUDGING` - Submissions being reviewed
- `COMPLETED` - Event finished, results published

### Demo Hackathons
| Status | Title | Cover Image |
|--------|-------|-------------|
| COMPLETED | HackET Grand Challenge 2025 | ✅ Yes |
| REGISTRATION_OPEN | HackET Summer Hackathon 2026 | ✅ Yes |
| DRAFT | (Additional hackathons) | ✅ Yes |

### API Endpoints
- `POST /hackathons` - Create hackathon
- `PUT /hackathons/:id` - Update hackathon
- `GET /hackathons` - List hackathons
- `GET /hackathons/:id` - Get hackathon details

---

## Workflow 3: Staff Assignment (UC0020, UC0021)

### Description
Organizers assign Judges and Mentors to hackathons.

### Flow
1. Organizer invites staff by email
2. Staff receives invitation with role (Judge/Mentor)
3. Staff accepts and joins hackathon
4. Staff can be assigned as lead

### Roles
- **Judge**: Reviews submissions and assigns scores
- **Mentor**: Provides guidance to teams during event
- **Co-Organizer**: Helps manage the event

### Demo Staff
| Hackathon | Staff | Role |
|-----------|-------|------|
| Grand Challenge 2025 | Helen Hailu (ሄለን ሀይሉ) | Judge (Lead) |
| Grand Challenge 2025 | Kaleb Alemu (ካሌብ አሌሙ) | Judge |
| Summer 2026 | Maria Bekele (ማርያም በቀለ) | Mentor |
| Summer 2026 | Solomon Tadesse (ሰለሞን ታደሰ) | Mentor |

---

## Workflow 4: Team Formation (UC0030, UC0031, UC0032)

### Description
Participants create teams or join existing teams.

### Flow Options

#### Option A: Create Team
1. Participant creates team with name, description
2. Sets needed skills for recruitment
3. Sets team as open or closed
4. Becomes team leader

#### Option B: Join Open Team
1. Participant browses open teams
2. Sends join request or accepts invitation
3. Team leader approves
4. Participant becomes team member

#### Option C: Accept Invitation
1. Team leader sends invitation to participant
2. Participant receives notification
3. Participant accepts/declines
4. If accepted, joins team

### Demo Teams - Completed Hackathon
| Rank | Team | Project | Members |
|------|------|---------|---------|
| 🥇 1 | CodeNinjas | Smart Health Monitor | 2 members |
| 🥈 2 | TechTitans | AgriTech Platform | 2 members |
| 🥉 3 | InnovateAfrica | EduConnect | 2 members |

### Demo Teams - Active Hackathon (Open)
| Team | Skills Needed | Status |
|------|---------------|--------|
| ClimateGuardians | React, Python, IoT | ✅ Open |
| GreenTechies | Mobile, Node.js | ✅ Open |
| EcoWarriors | ML, Backend | ✅ Open |
| SolarMinds | (Full) | ❌ Closed |

### API Endpoints
- `POST /teams` - Create team
- `GET /teams?hackathonId=X` - List teams
- `POST /teams/:id/join` - Join team
- `POST /teams/invitations` - Send invitation
- `POST /teams/invitations/:id/respond` - Respond to invitation

---

## Workflow 5: Submission Management (UC0040)

### Description
Teams submit their projects before the deadline.

### Flow
1. Team works on project during event
2. Submission created in DRAFT status
3. Team adds: title, description, GitHub URL, demo URL
4. Files uploaded (screenshots, videos, documents)
5. Submit before deadline → status becomes SUBMITTED

### Submission Status
- `DRAFT` - Working on submission
- `SUBMITTED` - Officially submitted
- `UNDER_REVIEW` - Being reviewed by judges
- `SCORED` - Judging complete

### Demo Submissions
| Rank | Project | Team | Status |
|------|---------|------|--------|
| 1 | Smart Health Monitor | CodeNinjas | SCORED |
| 2 | AgriTech Platform | TechTitans | SCORED |
| 3 | EduConnect | InnovateAfrica | SCORED |

### API Endpoints
- `POST /submissions` - Create submission
- `PUT /submissions/:id` - Update submission
- `POST /submissions/:id/submit` - Finalize submission
- `GET /submissions/:id` - View submission

---

## Workflow 6: Judging & Scoring (UC0050)

### Description
Judges review submissions and assign scores based on criteria.

### Flow
1. Organizer creates judging criteria (Innovation, Technical, Impact, Presentation)
2. Each criterion has max score (10) and weight (1.0-1.5)
3. Judges assigned to submissions
4. Judge reviews submission (code, demo, docs)
5. Judge assigns scores per criterion
6. Adds written feedback/comments
7. All judges complete → submission status = SCORED

### Judging Criteria (Demo)
| Criterion | Max Score | Weight |
|-----------|-----------|--------|
| Innovation & Creativity | 10 | 1.5 |
| Technical Execution | 10 | 1.5 |
| Impact & Feasibility | 10 | 1.0 |
| Presentation & Demo | 10 | 1.0 |

### Score Calculation
```
Final Score = Σ(Score × Weight) / Σ(Weights)
```

### API Endpoints
- `POST /judging/scores` - Submit score
- `GET /judging/assignments/:hackathonId` - Get my assignments
- `GET /judging/breakdown/:submissionId` - View score breakdown

---

## Workflow 7: Leaderboard & Results (UC0060)

### Description
Real-time and final leaderboard display with rankings.

### Flow
1. Scores aggregated from all judges
2. Final scores calculated with weighting
3. Teams ranked by final score
4. Leaderboard entries created
5. Results published at specified time
6. Participants view rankings

### Leaderboard Types
- `HIDDEN` - Scores not visible
- `REALTIME` - Live score updates
- `FINAL_ONLY` - Only final results shown

### Demo Leaderboard (Grand Challenge 2025)
| Rank | Team | Project | Score |
|------|------|---------|-------|
| 🥇 1 | CodeNinjas | Smart Health Monitor | 9.20 |
| 🥈 2 | TechTitans | AgriTech Platform | 8.70 |
| 🥉 3 | InnovateAfrica | EduConnect | 8.40 |

### API Endpoints
- `GET /judging/leaderboard/:hackathonId` - View leaderboard
- `GET /hackathons/:id/results` - Published results

---

## Workflow 8: Event Registration (UC0070)

### Description
Participants register for hackathon events.

### Flow
1. Participant finds hackathon
2. Clicks "Register" button
3. Registration record created
4. Confirmation sent
5. Can withdraw if needed

### Registration Status
- `REGISTERED` - Confirmed participation
- `WAITLISTED` - Event full, on waitlist
- `CHECKED_IN` - Arrived at event
- `WITHDRAWN` - Cancelled registration

### Demo Registrations
| Participant | Hackathon | Status |
|-------------|-----------|--------|
| participant1@hacket.et | Summer 2026 | REGISTERED |
| participant2@hacket.et | Summer 2026 | REGISTERED |
| participant3@hacket.et | Summer 2026 | REGISTERED |
| participant4@hacket.et | Summer 2026 | REGISTERED |
| participant5@hacket.et | Summer 2026 | REGISTERED |

### API Endpoints
- `POST /registrations` - Register for event
- `GET /registrations` - My registrations
- `DELETE /registrations/:id` - Withdraw

---

## Workflow 9: Notifications (UC0080)

### Description
System sends notifications for important events.

### Trigger Events
- Team invitation received
- Submission deadline approaching
- Scores published
- New announcement
- Registration confirmed

### Channels
- In-app notifications
- Email
- Push (mobile)

---

## Workflow 10: Certificates (UC0090)

### Description
Generate and issue certificates for participants.

### Flow
1. Event completes
2. System generates certificates
3. Participants download certificates
4. Winners get special certificates

### Certificate Types
- Participation Certificate
- Winner Certificate (1st, 2nd, 3rd)
- Mentor/Appreciation Certificate

---

## Quick Start Commands

```bash
# Reset database and seed
npm run db:reset

# Run seed only
npm run db:seed

# Start backend
npm run dev --workspace=apps/backend

# Start frontend
npm run dev --workspace=frontend
```

---

## Demo Data Summary

| Entity | Count |
|--------|-------|
| Users | 12 |
| Hackathons | 2 |
| Teams | 7 |
| Submissions | 3 |
| Scores | 24 (3 teams × 2 judges × 4 criteria) |
| Staff | 4 |
| Registrations | 5 |

All users have Amharic names (e.g., "ሳራ በቀለ" for Sarah Bekele).
