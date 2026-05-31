import { apiRequest } from './client'
import type { Team } from '../types/models'

export interface TeamSuggestion {
    team: Team
    matchScore: number
    matchedSkills: string[]
}

export interface MemberSuggestion {
    userId: string
    email: string
    firstName?: string
    lastName?: string
    skills: string[]
    matchScore: number
}

export interface EventRecommendation {
    hackathonId: string
    title: string
    matchScore: number
    tags: string[]
}

export async function suggestTeams(hackathonId: string) {
    const response = await apiRequest<TeamSuggestion[]>(`/matching/teams/${hackathonId}`, {
        auth: true,
    })
    return response.data
}

export async function suggestMembers(teamId: string) {
    const response = await apiRequest<MemberSuggestion[]>(`/matching/members/${teamId}`, {
        auth: true,
    })
    return response.data
}

export async function recommendEvents() {
    const response = await apiRequest<EventRecommendation[]>('/matching/recommendations', {
        auth: true,
    })
    return response.data
}
