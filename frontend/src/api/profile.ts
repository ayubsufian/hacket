import { apiRequest } from './client'
import type { UserProfile } from '../types/models'

export interface ProfileWithHistory {
  profile: UserProfile & {
    id: string
    userId: string
    phone?: string | null
    university?: string | null
    graduationYear?: number | null
    interests?: string[]
    githubUrl?: string | null
    linkedinUrl?: string | null
    preferredLocale?: 'en' | 'am'
    dateOfBirth?: string | null
    isSeekingTeam?: boolean
    mentorMaxDailyInteractions?: number | null
    createdAt: string
    updatedAt: string
  }
  currentSubmissions: Array<{
    hackathonId: string
    eventName: string
    date: string
    role: string
    teamName: string
    submissionStatus?: string
    submissionTitle?: string | null
  }>
  pastParticipation: Array<{
    hackathonId: string
    eventName: string
    date: string
    role: string
    teamName: string
  }>
}

export interface PublicProfile {
  id: string
  email: string
  role: string
  profile: UserProfile & {
    githubUrl?: string | null
    linkedinUrl?: string | null
    university?: string | null
    graduationYear?: number | null
    skills?: string[]
    interests?: string[]
  }
  createdAt: string
  stats?: {
    hackathonsParticipated: number
    hackathonsOrganized?: number
    teamsJoined: number
  }
}

export interface ProfileUpdateData {
  firstName?: string
  lastName?: string
  bio?: string | null
  phone?: string | null
  university?: string | null
  graduationYear?: number | null
  skills?: string[]
  interests?: string[]
  githubUrl?: string | null
  linkedinUrl?: string | null
  city?: string | null
  region?: string | null
  isSeekingTeam?: boolean
  preferredLocale?: 'en' | 'am'
}

export async function getMyProfile(): Promise<ProfileWithHistory> {
  const response = await apiRequest<ProfileWithHistory>('/profile/me', { auth: true })
  return response.data
}

export async function getPublicProfile(userId: string): Promise<PublicProfile> {
  const response = await apiRequest<{ user: PublicProfile }>(`/profile/${userId}`, { auth: true })
  return response.data.user
}

export async function updateProfile(data: ProfileUpdateData): Promise<{ profile: UserProfile }> {
  const response = await apiRequest<{ profile: UserProfile }>('/profile/me', {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify(data),
  })
  return response.data
}

export async function uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
  const formData = new FormData()
  formData.append('avatar', file)

  const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/profile/me/avatar`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Upload failed' }))
    throw new Error(error.message || 'Failed to upload avatar')
  }

  return response.json()
}
