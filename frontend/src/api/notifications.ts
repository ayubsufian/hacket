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

export interface NotificationPreferences {
    id: string
    userId: string
    email: boolean
    push: boolean
    sms: boolean
    inApp: boolean
    types: string[]
    createdAt: string
    updatedAt: string
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

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
    const response = await apiRequest<NotificationPreferences>('/notifications/preferences', { auth: true })
    return response.data
}

export async function updateNotificationPreferences(
    preferences: Partial<Omit<NotificationPreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
) {
    return apiRequest<NotificationPreferences>('/notifications/preferences', {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify(preferences),
    })
}
