import { apiRequest } from './client'

export interface AnalyticsReport {
    totalTeams: number
    totalSubmissions: number
    totalParticipants: number
    registrationTrend: Array<{ date: string; count: number }>
    submissionsByStatus: Record<string, number>
    topScores: Array<{ teamName: string; score: number }>
}

export async function getAnalyticsReport(hackathonId: string) {
    const response = await apiRequest<AnalyticsReport>(`/analytics/${hackathonId}/report`, {
        auth: true,
    })
    return response.data
}

export async function exportAnalyticsReport(hackathonId: string, format: 'csv' | 'pdf' | 'json' = 'json') {
    const response = await apiRequest<{ url: string }>(`/analytics/${hackathonId}/export?format=${format}`, {
        auth: true,
    })
    return response.data
}
