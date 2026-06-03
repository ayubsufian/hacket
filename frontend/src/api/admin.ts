import { apiRequest } from './client'

export interface OrganizerVerification {
  id: string
  email: string
  verificationStatus: 'PENDING' | 'UNDER_REVIEW' | 'REJECTED' | 'VERIFIED'
  authProvider: string
  createdAt: string
  updatedAt: string
  profile: {
    firstName: string
    lastName: string
    representativeName?: string
  }
  organizationMemberships: Array<{
    role: string
    organization: {
      id: string
      name: string
      contactEmail: string
      verificationDocUrl?: string
      createdAt: string
      updatedAt: string
    }
  }>
}

export interface OrganizerVerificationsResponse {
  organizers: OrganizerVerification[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export async function listOrganizerVerifications(status: string = 'UNDER_REVIEW', page: number = 1, limit: number = 25) {
  const response = await apiRequest<OrganizerVerificationsResponse>(`/admin/organizer-verifications?status=${status}&page=${page}&limit=${limit}`, {
    auth: true,
  })
  return response.data
}

export async function approveOrganizer(userId: string) {
  const response = await apiRequest<{ success: boolean; message: string }>(`/admin/users/${userId}/approve`, {
    method: 'PATCH',
    auth: true,
  })
  return response.data
}

export async function rejectOrganizer(userId: string) {
  const response = await apiRequest<{ success: boolean; message: string }>(`/admin/users/${userId}/reject`, {
    method: 'PATCH',
    auth: true,
  })
  return response.data
}
