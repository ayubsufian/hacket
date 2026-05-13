import { apiRequest } from './client'
import type { Hackathon, Pagination, Team } from '../types/models'

export interface ListEventsInput {
  status?: string
  region?: string
  theme?: string
  search?: string
  page?: number
  limit?: number
}

function createQuery(params: ListEventsInput) {
  const query = new URLSearchParams()
  if (params.status) query.set('status', params.status)
  if (params.region) query.set('region', params.region)
  if (params.theme) query.set('theme', params.theme)
  if (params.search) query.set('search', params.search)
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  const queryString = query.toString()
  return queryString ? `?${queryString}` : ''
}

export async function listEvents(input: ListEventsInput = {}) {
  const response = await apiRequest<Hackathon[]>(`/events${createQuery(input)}`)
  return {
    data: response.data,
    pagination: response.pagination as Pagination,
  }
}

export async function getEvent(idOrSlug: string) {
  const response = await apiRequest<{ hackathon: Hackathon }>(`/events/${idOrSlug}`)
  return response.data.hackathon
}

export async function registerForEvent(eventId: string) {
  const response = await apiRequest<{ team: Team }>(`/events/${eventId}/register`, {
    method: 'POST',
    auth: true,
  })

  return response.data.team
}

export async function createEvent(input: Record<string, unknown>) {
  const response = await apiRequest<{ hackathon: Hackathon }>('/events', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(input),
  })
  return response.data.hackathon
}

export async function updateEvent(eventId: string, input: Record<string, unknown>) {
  const response = await apiRequest<{ hackathon: Hackathon }>(`/events/${eventId}`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify(input),
  })
  return response.data.hackathon
}
