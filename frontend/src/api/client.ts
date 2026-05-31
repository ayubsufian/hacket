import type { ApiErrorShape, ApiResponse } from '../types/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'
const TOKEN_STORAGE_KEY = 'hacket_token'
const REQUEST_TIMEOUT = 10_000

export class ApiError extends Error {
  status: number
  payload?: ApiErrorShape

  constructor(message: string, status: number, payload?: ApiErrorShape) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

export const authTokenStore = {
  get: () => localStorage.getItem(TOKEN_STORAGE_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_STORAGE_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_STORAGE_KEY),
}

interface RequestOptions extends RequestInit {
  auth?: boolean
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')

  if (options.auth) {
    const token = authTokenStore.get()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  // Abort controller for timeout
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeout)
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('Request timed out. The server may be unavailable.', 0)
    }
    throw new ApiError(
      'Unable to connect to the server. Please check your connection and make sure the backend is running.',
      0,
    )
  } finally {
    clearTimeout(timeout)
  }

  const text = await response.text()
  const body = text ? (JSON.parse(text) as ApiResponse<T> | ApiErrorShape) : null

  if (!response.ok) {
    const payload = body as ApiErrorShape | null
    const msg =
      payload?.message ||
      (response.status === 401
        ? 'Invalid credentials. Please check your email and password.'
        : response.status === 409
          ? 'An account with this email already exists.'
          : response.status === 422
            ? 'Please check your input and try again.'
            : response.status >= 500
              ? 'Server error. Please try again later.'
              : 'Something went wrong.')
    throw new ApiError(msg, response.status, payload || undefined)
  }

  return body as ApiResponse<T>
}
