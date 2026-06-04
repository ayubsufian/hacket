import { apiRequest, authTokenStore } from './client'
import type { AuthPayload, User } from '../types/models'

export interface RegisterInput {
  email: string
  password: string
  firstName: string
  lastName: string
  role?: 'PARTICIPANT' | 'ORGANIZER' | 'JUDGE' | 'MENTOR'
}

export async function login(input: { email: string; password: string }) {
  const response = await apiRequest<AuthPayload>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  })

  authTokenStore.set(response.data.token)
  return response.data
}

export async function register(input: RegisterInput) {
  const response = await apiRequest<AuthPayload>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  })

  authTokenStore.set(response.data.token)
  return response.data
}

export async function getMe() {
  const response = await apiRequest<{ user: User }>('/auth/me', {
    auth: true,
  })

  return response.data.user
}

export async function logout() {
  await apiRequest<null>('/auth/logout', {
    method: 'POST',
    auth: true,
  })
  authTokenStore.clear()
}

// TODO: Implement forgot-password functionality when backend endpoint is available
// export async function requestPasswordReset(input: { email: string }) {
//   return apiRequest<null>('/auth/forgot-password', {
//     method: 'POST',
//     body: JSON.stringify(input),
//   })
// }

export async function submitVerification(verificationDocUrl: string) {
  const response = await apiRequest<{ success: boolean; message: string }>('/auth/submit-verification', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ verificationDocUrl }),
  })
  return response.data
}

export async function forgotPassword(email: string) {
  const response = await apiRequest<{ message: string; resetOtp?: string; note?: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
  return response.data
}

export async function resetPassword(email: string, otp: string, newPassword: string) {
  const response = await apiRequest<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, otp, newPassword }),
  })
  return response.data
}

export async function verifyEmail(email: string, otp: string) {
  const response = await apiRequest<{ message: string }>('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  })
  return response.data
}

export async function resendVerificationEmail(email: string) {
  const response = await apiRequest<{ message: string; verificationOtp?: string; note?: string }>('/auth/resend-verification-email', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
  return response.data
}

// TODO: Implement staff invitation functionality when backend endpoint is available
// export async function acceptStaffInvitation(eventId: string, token: string) {
//   return apiRequest<{ message: string }>(`/events/${eventId}/staff/invitations/accept`, {
//     method: 'POST',
//     auth: true,
//     body: JSON.stringify({ token }),
//   })
// }
