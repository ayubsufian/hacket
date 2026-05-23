import { apiRequest } from './client'
import type { Team, TeamInvitation } from '../types/models'

export interface CreateTeamInput {
  hackathonId: string
  name: string
  description?: string
  neededSkills?: string[]
}

export interface UpdateTeamInput {
  name?: string
  description?: string
  neededSkills?: string[]
  isOpen?: boolean
}

export async function createTeam(input: CreateTeamInput) {
  const response = await apiRequest<{ team: Team }>('/teams', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(input),
  })

  return response.data.team
}

export async function getTeam(teamId: string) {
  const response = await apiRequest<{ team: Team }>(`/teams/${teamId}`, {
    auth: true,
  })

  return response.data.team
}

export async function updateTeam(teamId: string, input: UpdateTeamInput) {
  const response = await apiRequest<{ team: Team }>(`/teams/${teamId}`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify(input),
  })

  return response.data.team
}

export async function leaveTeam(teamId: string) {
  return apiRequest<null>(`/teams/${teamId}/leave`, {
    method: 'POST',
    auth: true,
  })
}

export async function sendTeamInvitation(teamId: string, input: { receiverId: string; message?: string }) {
  const response = await apiRequest<{ invitation: TeamInvitation }>(`/teams/${teamId}/invite`, {
    method: 'POST',
    auth: true,
    body: JSON.stringify(input),
  })

  return response.data.invitation
}

export async function respondToInvitation(invitationId: string, accept: boolean) {
  return apiRequest<{ status: string }>(`/teams/invitations/${invitationId}/respond`, {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ accept }),
  })
}

// Get user's current team (will need to be implemented in backend)
export async function getMyTeam(hackathonId: string) {
  // For now, we'll use a workaround by checking user's team membership
  // This will be updated when backend adds the endpoint
  const response = await apiRequest<{ team: Team }>(`/teams/my-team?hackathonId=${hackathonId}`, {
    auth: true,
  }).catch(() => null)
  
  return response?.data?.team || null
}

// Get pending invitations for the current user
export async function getMyInvitations() {
  // This will need to be implemented in backend
  try {
    const response = await apiRequest<{ invitations: TeamInvitation[] }>('/teams/invitations/my', {
      auth: true,
    })
    return response.data.invitations
  } catch {
    return []
  }
}
