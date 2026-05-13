export type UserRole = 'PARTICIPANT' | 'ORGANIZER' | 'JUDGE' | 'MENTOR' | 'ADMIN'

export type HackathonStatus =
  | 'DRAFT'
  | 'REGISTRATION_OPEN'
  | 'REGISTRATION_CLOSED'
  | 'IN_PROGRESS'
  | 'JUDGING'
  | 'COMPLETED'
  | 'ARCHIVED'

export interface Notification {
  id: string
  message: string
  isRead: boolean
  createdAt: string
}

export interface UserProfile {
  firstName: string
  lastName: string
  avatarUrl?: string | null
  bio?: string | null
  city?: string | null
  region?: string | null
  skills?: string[]
}

export interface User {
  id: string
  email: string
  role: UserRole
  isActive?: boolean
  createdAt?: string
  profile?: UserProfile | null
}

export interface AuthPayload {
  token: string
  user: User
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface Hackathon {
  id: string
  slug: string
  title: string
  titleAm?: string | null
  description: string
  descriptionAm?: string | null
  coverImageUrl?: string | null
  status: HackathonStatus
  organizerId: string
  maxTeamSize: number
  minTeamSize: number
  maxParticipants?: number | null
  registrationStart: string
  registrationEnd: string
  eventStart: string
  eventEnd: string
  submissionDeadline: string
  judgingStart?: string | null
  judgingEnd?: string | null
  rules?: string | null
  rulesAm?: string | null
  prizes?: Record<string, unknown> | null
  region?: string | null
  venue?: string | null
  isVirtual: boolean
  websiteUrl?: string | null
  contactEmail?: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
  _count?: {
    teams?: number
    submissions?: number
  }
}

export interface TeamMember {
  id: string
  userId: string
  role: string
  joinedAt: string
  user?: {
    id: string
    email: string
    profile?: UserProfile | null
  }
}

export interface Team {
  id: string
  hackathonId: string
  name: string
  description?: string | null
  neededSkills: string[]
  isOpen: boolean
  createdAt: string
  updatedAt: string
  members?: TeamMember[]
  hackathon?: {
    id: string
    title: string
    maxTeamSize: number
    status: HackathonStatus
  }
  submission?: {
    id: string
    status: string
    title: string
  } | null
}

export interface TeamInvitation {
  id: string
  teamId: string
  senderId: string
  receiverId: string
  status: string
  message?: string | null
  expiresAt: string
  createdAt: string
}

export interface Submission {
  id: string
  teamId: string
  hackathonId: string
  version: number
  title: string
  description?: string | null
  githubUrl?: string | null
  videoUrl?: string | null
  demoUrl?: string | null
  slidesUrl?: string | null
  fileUrls: string[]
  status: string
  submittedAt?: string | null
  createdAt: string
  updatedAt: string
  team?: {
    name: string
  }
}

export interface LeaderboardEntry {
  rank: number
  finalScore: number | null
  submissionId: string
  teamName?: string
  submissionTitle?: string
  submission?: {
    id: string
    title: string
    team?: {
      name: string
    }
  }
}
