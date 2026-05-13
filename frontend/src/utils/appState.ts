import type { UserRole } from '../types/models'

const ACTIVE_TEAM_ID_KEY = 'hacket_active_team_id'
const ACTIVE_HACKATHON_ID_KEY = 'hacket_active_hackathon_id'

export function getDashboardRoute(role?: UserRole | null) {
  switch (role) {
    case 'ADMIN':
      return '/admin'
    case 'ORGANIZER':
      return '/organizer'
    case 'JUDGE':
      return '/judge'
    default:
      return '/dashboard'
  }
}

export function getActiveTeamId() {
  return localStorage.getItem(ACTIVE_TEAM_ID_KEY)
}

export function getActiveHackathonId() {
  return localStorage.getItem(ACTIVE_HACKATHON_ID_KEY)
}

export function setActiveWorkspace(input: { teamId?: string | null; hackathonId?: string | null }) {
  if (input.teamId) {
    localStorage.setItem(ACTIVE_TEAM_ID_KEY, input.teamId)
  }

  if (input.hackathonId) {
    localStorage.setItem(ACTIVE_HACKATHON_ID_KEY, input.hackathonId)
  }
}

export function clearActiveWorkspace() {
  localStorage.removeItem(ACTIVE_TEAM_ID_KEY)
  localStorage.removeItem(ACTIVE_HACKATHON_ID_KEY)
}
