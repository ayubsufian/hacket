import { useEffect, useState } from 'react'
import { Activity, Calendar, Globe, Loader2, ShieldAlert, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { listEvents } from '../api/events'
import { useAuth } from '../contexts/AuthContext'
import type { Hackathon } from '../types/models'

export default function AdminPage() {
    const { user } = useAuth()
    const [events, setEvents] = useState<Hackathon[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const loadData = async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await listEvents({ limit: 100 })
            setEvents(response.data)
        } catch (err: any) {
            setError(err.message || 'Unable to connect to admin services')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { void loadData() }, [])

    if (user?.role !== 'ADMIN') return (
        <div className="py-20 text-center max-w-md mx-auto">
            <h1 className="text-xl font-bold text-gray-900">Access Denied</h1>
            <p className="mt-2 text-gray-500">You must be a system administrator to view this page.</p>
            <p className="mt-4 text-sm text-gray-400">Log in with an <strong className="text-gray-600">ADMIN</strong> role account (e.g. the <code className="bg-gray-100 px-1 rounded">INITIAL_ADMIN_EMAIL</code> set in your backend <code className="bg-gray-100 px-1 rounded">.env</code>), then navigate to <code className="bg-gray-100 px-1 rounded">/admin</code>.</p>
        </div>
    )

    if (loading) return <div className="p-8 flex justify-center"><Loader2 size={32} className="animate-spin text-accent-500" /></div>

    if (error) return (
        <div className="max-w-5xl mx-auto alert-error flex flex-col items-center justify-center py-12 px-4 text-center bg-white border border-red-100 rounded-xl shadow-sm">
            <Globe className="text-red-400 mb-3" size={32} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Systems Offline</h3>
            <p className="text-sm text-gray-500 max-w-sm mb-6">{error}</p>
            <button onClick={() => void loadData()} className="btn-primary shadow-red-500/20 from-red-500 to-red-600">Retry Connection</button>
        </div>
    )

    const registrationOpen = events.filter(event => event.status === 'REGISTRATION_OPEN').length
    const inProgress = events.filter(event => event.status === 'IN_PROGRESS').length
    const completed = events.filter(event => event.status === 'COMPLETED').length

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-up">
            <div className="card-elevated mb-2 flex flex-col gap-4 border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,247,251,0.94))] p-6 sm:flex-row sm:items-end">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/20">
                    <ShieldAlert size={24} />
                </div>
                <div>
                    <p className="section-title text-accent-600 mb-1">Administrative oversight</p>
                    <h1 className="text-2xl font-bold text-navy-900">System administration</h1>
                    <p className="text-sm text-slate-500">Read-only operational overview powered by the backend routes that are currently exposed.</p>
                </div>
            </div>

            <div className="alert-warn">
                <strong>Admin access:</strong> This page is only accessible to accounts with the <code className="bg-amber-100 px-1 rounded text-xs">ADMIN</code> role. Logged in as <strong>{user?.email}</strong>. Advanced admin mutations are read-only until dedicated backend admin endpoints are exposed.
            </div>

            <div className="grid gap-6 md:grid-cols-4 mb-8">
                <div className="card p-6 border-transparent hover:border-gray-200">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Users size={24} /></div>
                        <div><p className="text-sm font-medium text-gray-500">Admin Role</p><p className="text-lg font-bold text-gray-900">{user?.email}</p></div>
                    </div>
                </div>
                <div className="card p-6 border-transparent hover:border-gray-200">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-accent-100 text-accent-600 flex items-center justify-center"><Calendar size={24} /></div>
                        <div><p className="text-sm font-medium text-gray-500">Total Events</p><p className="text-3xl font-bold text-gray-900">{events.length}</p></div>
                    </div>
                </div>
                <div className="card p-6 border-transparent hover:border-gray-200">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><Activity size={24} /></div>
                        <div><p className="text-sm font-medium text-gray-500">Registration Open</p><p className="text-3xl font-bold text-gray-900">{registrationOpen}</p></div>
                    </div>
                </div>
                <div className="card p-6 border-transparent hover:border-gray-200">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center"><Activity size={24} /></div>
                        <div><p className="text-sm font-medium text-gray-500">Completed</p><p className="text-3xl font-bold text-gray-900">{completed}</p></div>
                    </div>
                </div>
            </div>

            <div className="card-elevated overflow-hidden border border-gray-100">
                <div className="border-b border-gray-100 bg-gray-50/50 p-5 flex items-center justify-between gap-4">
                    <h2 className="text-lg font-bold text-gray-900">Platform Event Overview</h2>
                    <span className="badge badge-blue">{inProgress} in progress</span>
                </div>
                <table className="tbl !border-t-0">
                    <thead><tr><th className="pl-6">Title</th><th>Organizer</th><th>Status</th><th className="pr-6">Timeline</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                        {events.length === 0 ? <tr className="!bg-white"><td colSpan={4} className="py-10 text-center text-gray-500">No events found</td></tr> :
                            events.map(ev => (
                                <tr key={ev.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="pl-6"><Link to={`/events/${ev.id}`} className="font-semibold text-gray-900 hover:text-accent-600">{ev.title}</Link></td>
                                    <td className="text-gray-600 text-sm">{ev.organizerId || 'Unknown'}</td>
                                    <td><span className="badge badge-gray">{ev.status.replace(/_/g, ' ')}</span></td>
                                    <td className="pr-6 text-sm text-gray-500">{new Date(ev.eventStart).toLocaleDateString()} - {new Date(ev.eventEnd).toLocaleDateString()}</td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
