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
