import { apiRequest } from './client'
import type { Pagination, Submission } from '../types/models'

export interface UpsertSubmissionInput {
  teamId: string
  title: string
  description?: string
  githubUrl?: string
  videoUrl?: string
  demoUrl?: string
  slidesUrl?: string
  fileUrls?: string[]
}

export async function upsertSubmission(input: UpsertSubmissionInput) {
  const response = await apiRequest<{ submission: Submission }>('/submissions', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(input),
  })
  return response.data.submission
}

export async function submitSubmission(submissionId: string) {
  const response = await apiRequest<{ submission: Submission }>(`/submissions/${submissionId}/submit`, {
    method: 'POST',
    auth: true,
  })
  return response.data.submission
}

export async function getSubmission(submissionId: string) {
  const response = await apiRequest<{ submission: Submission }>(`/submissions/${submissionId}`, {
    auth: true,
  })
  return response.data.submission
}

export async function listSubmissionsByHackathon(hackathonId: string, page = 1, limit = 20) {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) })
  const response = await apiRequest<Submission[]>(`/submissions/hackathon/${hackathonId}?${query.toString()}`, {
    auth: true,
  })

  return {
    data: response.data,
    pagination: response.pagination as Pagination,
  }
}
