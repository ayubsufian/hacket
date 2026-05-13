import { useEffect, useState } from 'react'
import { Bell, Check, Globe } from 'lucide-react'
import { getNotifications, markAllAsRead, markAsRead, type Notification } from '../api/notifications'

export default function NotificationsPage() {
    const [notifs, setNotifs] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const load = async () => {
        try {
            setLoading(true); setError(null)
            const data = await getNotifications()
            setNotifs(data)
        } catch (err: any) { setError(err.message || 'Failed to load') }
        finally { setLoading(false) }
    }

    useEffect(() => { void load() }, [])

    const markRead = async (id: string, currentlyRead: boolean) => {
        if (currentlyRead) return
        setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
        try { await markAsRead(id) } catch { /* ignore optimistic fail */ }
    }

    const markAllRead = async () => {
        if (!notifs.some(n => !n.isRead)) return
        setNotifs(prev => prev.map(n => ({ ...n, isRead: true })))
        try { await markAllAsRead() } catch { }
    }

    if (loading) return (
        <div className="max-w-3xl mx-auto space-y-4">
            <div className="skeleton h-12 w-full rounded-2xl" />
            <div className="skeleton h-24 w-full rounded-2xl" />
            <div className="skeleton h-24 w-full rounded-2xl" />
        </div>
    )

    if (error) return (
        <div className="max-w-3xl mx-auto">
            <div className="alert-error flex flex-col items-center justify-center py-12 px-4 text-center bg-white border border-red-100 rounded-xl shadow-sm">
                <Globe className="text-red-400 mb-3" size={32} />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Systems Offline</h3>
                <p className="text-sm text-gray-500 max-w-sm mb-6">{error}</p>
                <button onClick={() => void load()} className="btn-primary shadow-red-500/20 from-red-500 to-red-600 border border-transparent hover:border-red-600 hover:to-red-700">Retry Connection</button>
            </div>
        </div>
    )

    const unreadCount = notifs.filter(n => !n.isRead).length

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            <div className="card-elevated flex flex-col gap-4 border border-white/70 bg-white/92 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                        <Bell size={20} />
                    </div>
                    <div>
                        <p className="section-title text-accent-600 mb-1">Operational inbox</p>
                        <h1 className="text-2xl font-bold text-navy-900 leading-tight">Notifications</h1>
                        <p className="text-sm text-slate-500">{unreadCount} unread message{unreadCount !== 1 ? 's' : ''} across the workflows you currently use.</p>
                    </div>
                </div>
                {unreadCount > 0 && <button onClick={() => void markAllRead()} className="btn-secondary text-sm h-9"><Check size={14} /> Mark all read</button>}
            </div>

            <div className="card-elevated border border-gray-100 divide-y divide-gray-100 bg-white overflow-hidden">
                {notifs.length === 0 ? <div className="p-10 text-center text-gray-500">You're all caught up!</div> : (
                    notifs.map(n => (
                        <div key={n.id} onClick={() => void markRead(n.id, n.isRead)}
                            className={`p-5 transition-colors cursor-pointer group flex items-start gap-4 ${n.isRead ? 'opacity-70 hover:opacity-100 hover:bg-gray-50/50' : 'bg-blue-50/30 hover:bg-blue-50/60'}`}>
                            <div className={`mt-1 h-3 w-3 rounded-full shrink-0 transition-opacity ${n.isRead ? 'bg-transparent border-2 border-gray-300' : 'bg-blue-500 border border-blue-600 shadow-[0_0_8px_rgba(59,130,246,0.5)]'}`} />
                            <div className="flex-1">
                                <p className={`text-sm ${n.isRead ? 'text-gray-700' : 'text-gray-900 font-semibold'}`}>{n.message}</p>
                                <div className="mt-2 text-xs text-gray-400 font-medium">
                                    {new Date(n.createdAt).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
