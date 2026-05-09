import { apiRequest } from './client'

export interface Notification {
    id: string
    type: string
    title: string
    message: string
    metadata?: Record<string, unknown>
    isRead: boolean
    readAt?: string | null
    createdAt: string
}

export async function getNotifications() {
    const response = await apiRequest<Notification[]>('/notifications', { auth: true })
    return response.data
}

export async function markAsRead(notificationId: string) {
    return apiRequest<null>(`/notifications/${notificationId}/read`, {
        method: 'PATCH',
        auth: true,
    })
}

export async function markAllAsRead() {
    return apiRequest<null>('/notifications/read-all', {
        method: 'PATCH',
        auth: true,
    })
}
