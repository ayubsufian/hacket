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
  const response = await apiRequest<Team[]>(`/teams?hackathonId=${hackathonId}`, {
    auth: true,
  }).catch(() => null)
  const teams = response?.data
  return (Array.isArray(teams) ? teams[0] : null) ?? null
}

// Get pending invitations for the current user
export async function getMyInvitations() {
  try {
    const response = await apiRequest<TeamInvitation[]>('/teams/invitations', {
      auth: true,
    })
    return Array.isArray(response.data) ? response.data : []
  } catch {
    return []
  }
}
