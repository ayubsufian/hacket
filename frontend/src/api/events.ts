import { apiRequest } from './client'
import type { Hackathon, Pagination, StaffAssignment, StaffInvitation, StaffRole, Team } from '../types/models'

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

export async function deleteEvent(eventId: string) {
  return apiRequest<null>(`/events/${eventId}`, {
    method: 'DELETE',
    auth: true,
  })
}

export async function generateStaffInvitationLink(
  eventId: string,
  input: { email: string; role: StaffRole }
) {
  const response = await apiRequest<{ invitationUrl: string; expiresAt: string; token?: string }>(
    `/events/${eventId}/staff/invitations?debug=true`,
    {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ email: input.email, staffRole: input.role }),
    }
  )
  // Use token to build correct URL with current origin (backend may have wrong FRONTEND_URL)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const token = response.data.token
  const invitationLink = token ? `${baseUrl}/staff/accept-invitation?token=${token}` : response.data.invitationUrl
  return { invitationLink, expiresAt: response.data.expiresAt, token }
}

export async function getStaffAssignments(eventId: string) {
  const response = await apiRequest<StaffAssignment[]>(`/events/${eventId}/staff`, {
    auth: true,
  })
  return response.data
}

export async function acceptStaffInvitation(token: string) {
  await apiRequest<null>(
    `/staff/invitations/accept`,
    {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ token }),
    }
  )
}

export async function getStaffInvitations(eventId: string, status?: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED') {
  const query = status ? `?status=${status}` : ''
  const response = await apiRequest<{ data: StaffInvitation[]; pagination: Pagination }>(
    `/events/${eventId}/staff/invitations${query}`,
    { auth: true }
  )
  return response.data
}

export async function cancelStaffInvitation(eventId: string, invitationId: string) {
  return apiRequest<null>(`/events/${eventId}/staff/invitations/${invitationId}`, {
    method: 'DELETE',
    auth: true,
  })
}

export async function getCalendar(eventId: string, calendarType?: 'GREGORIAN' | 'ETHIOPIAN') {
  const query = calendarType ? `?calendar=${calendarType}` : ''
  const response = await apiRequest<string>(`/events/${eventId}/calendar${query}`, {
    auth: false,
  })
  return response.data
}

export interface ScheduleInfo {
  gregorian: {
    registrationStart: string
    registrationEnd: string
    eventStart: string
    eventEnd: string
    submissionDeadline: string
    judgingStart?: string | null
    judgingEnd?: string | null
  }
  ethiopian?: {
    registrationStart: string
    registrationEnd: string
    eventStart: string
    eventEnd: string
    submissionDeadline: string
    judgingStart?: string | null
    judgingEnd?: string | null
  } | null
}

export async function getSchedule(eventId: string): Promise<ScheduleInfo> {
  const response = await apiRequest<{ schedule: ScheduleInfo }>(`/events/${eventId}/schedule`, {
    auth: false,
  })
  return response.data.schedule
}
