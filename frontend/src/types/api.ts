export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ApiErrorShape {
  success: false
  message: string
  error?: string
  details?: unknown
}
