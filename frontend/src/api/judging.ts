import { apiRequest } from './client'
import type { LeaderboardEntry, Pagination } from '../types/models'

export interface SubmitScoreInput {
  submissionId: string
  criteriaId: string
  value: number
  comment?: string
}

export interface ScoreBreakdown {
  criteriaId: string
  criteriaName: string
  value: number
  weight: number
  comment?: string
  judgeName?: string
}

export async function submitScore(input: SubmitScoreInput) {
  const response = await apiRequest<{ score: unknown }>('/judging/scores', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(input),
  })
  return response.data.score
}

export async function normalizeScores(hackathonId: string) {
  return apiRequest<null>(`/judging/normalize/${hackathonId}`, {
    method: 'POST',
    auth: true,
  })
}

export async function getLeaderboard(hackathonId: string, page = 1, limit = 10) {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) })
  const response = await apiRequest<LeaderboardEntry[]>(`/judging/leaderboard/${hackathonId}?${query.toString()}`, {
    auth: true,
  })

  return {
    data: response.data,
    pagination: response.pagination as Pagination,
  }
}

export async function getScoreBreakdown(submissionId: string) {
  const response = await apiRequest<ScoreBreakdown[]>(`/judging/breakdown/${submissionId}`, {
    auth: true,
  })
  return response.data
}
