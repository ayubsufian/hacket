import { useEffect, useState } from 'react'
import { Activity, Calendar, Globe, Loader2, ShieldAlert, Users, CheckCircle, XCircle, Building2, Clock, FileText, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { listEvents } from '../api/events'
import { listOrganizerVerifications, approveOrganizer, rejectOrganizer } from '../api/admin'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import type { Hackathon } from '../types/models'
import type { OrganizerVerification } from '../api/admin'

export default function AdminPage() {
    const { user } = useAuth()
    const { success, error: toastError } = useToast()
    const [events, setEvents] = useState<Hackathon[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    
    // Organizer verifications state
    const [organizers, setOrganizers] = useState<OrganizerVerification[]>([])
    const [organizersLoading, setOrganizersLoading] = useState(false)
    const [organizersError, setOrganizersError] = useState<string | null>(null)
    const [verificationFilter, setVerificationFilter] = useState<'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED'>('UNDER_REVIEW')

    const loadData = async () => {
        try {
            setLoading(true)
            setError(null)
            const [eventsRes] = await Promise.all([
                listEvents({ limit: 100 }),
            ])
            setEvents(eventsRes.data)
        } catch (err: any) {
            setError(err.message || 'Unable to connect to admin services')
        } finally {
            setLoading(false)
        }
    }

    const loadOrganizers = async () => {
        try {
            setOrganizersLoading(true)
            setOrganizersError(null)
            const res = await listOrganizerVerifications(verificationFilter, 1, 50)
            setOrganizers(res.organizers)
        } catch (err: any) {
            setOrganizersError(err.message || 'Failed to load organizers')
        } finally {
            setOrganizersLoading(false)
        }
    }

    useEffect(() => { void loadData() }, [])
    useEffect(() => { 
        if (user?.role === 'ADMIN') void loadOrganizers() 
    }, [verificationFilter, user])

    const handleApprove = async (userId: string) => {
        try {
            await approveOrganizer(userId)
            success('Organizer approved successfully')
            void loadOrganizers()
        } catch (err: any) {
            toastError(err.message || 'Failed to approve organizer')
        }
    }

    const handleReject = async (userId: string) => {
        try {
            await rejectOrganizer(userId)
            success('Organizer rejected')
            void loadOrganizers()
        } catch (err: any) {
            toastError(err.message || 'Failed to reject organizer')
        }
    }

    if (user?.role !== 'ADMIN') return (
        <div className="py-20 text-center max-w-md mx-auto">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Access Denied</h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">You must be a system administrator to view this page.</p>
            <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">Log in with an <strong className="text-gray-600 dark:text-gray-300">ADMIN</strong> role account.</p>
        </div>
    )

    if (loading) return <div className="p-8 flex justify-center"><Loader2 size={32} className="animate-spin text-emerald-500" /></div>

    if (error) return (
        <div className="max-w-5xl mx-auto flex flex-col items-center justify-center py-12 px-4 text-center bg-white dark:bg-slate-800 border border-red-100 dark:border-red-900/30 rounded-xl shadow-sm">
            <Globe className="text-red-400 mb-3" size={32} />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Systems Offline</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">{error}</p>
            <button onClick={() => void loadData()} className="btn-primary shadow-red-500/20 !bg-red-500 hover:!bg-red-600">Retry Connection</button>
        </div>
    )

    const registrationOpen = events?.filter(event => event.status === 'REGISTRATION_OPEN').length ?? 0
    const inProgress = events?.filter(event => event.status === 'IN_PROGRESS').length ?? 0
    const completed = events?.filter(event => event.status === 'COMPLETED').length ?? 0
    const verifiedOrganizers = organizers.filter(o => o.verificationStatus === 'VERIFIED').length

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-up pb-8">
            {/* Header */}
            <div className="mb-2 flex flex-col gap-4 border border-white/70 dark:border-slate-700/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-2xl p-6 sm:flex-row sm:items-end shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/20 shrink-0">
                    <ShieldAlert size={24} />
                </div>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1">Administrative oversight</p>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System administration</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage organizers, events, and platform settings.</p>
                </div>
            </div>

            {/* Info Alert */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 text-amber-800 dark:text-amber-200 text-sm">
                <strong>Admin access:</strong> Logged in as <strong className="text-amber-900 dark:text-amber-100">{user?.email}</strong>. 
                Only <strong className="text-amber-900 dark:text-amber-100">VERIFIED</strong> organizers can post events.
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center shrink-0"><Users size={20} /></div>
                        <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400">Admin</p><p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.email}</p></div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center shrink-0"><Calendar size={20} /></div>
                        <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Events</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{events?.length ?? 0}</p></div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center shrink-0"><Activity size={20} /></div>
                        <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400">Registration Open</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{registrationOpen}</p></div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 flex items-center justify-center shrink-0"><Activity size={20} /></div>
                        <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400">Completed</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{completed}</p></div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center shrink-0"><Building2 size={20} /></div>
                        <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400">Verified Orgs</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{verifiedOrganizers}</p></div>
                    </div>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Organizer Verifications */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden shadow-sm">
                    <div className="border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Building2 size={20} className="text-emerald-500" />
                            Organizer Verifications
                        </h2>
                        <select 
                            value={verificationFilter}
                            onChange={(e) => setVerificationFilter(e.target.value as any)}
                            className="px-3 py-1.5 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                            <option value="UNDER_REVIEW">Under Review</option>
                            <option value="VERIFIED">Verified</option>
                            <option value="REJECTED">Rejected</option>
                        </select>
                    </div>
                    
                    {organizersLoading ? (
                        <div className="p-8 flex justify-center"><Loader2 size={24} className="animate-spin text-emerald-500" /></div>
                    ) : organizersError ? (
                        <div className="p-6 text-center">
                            <p className="text-sm text-gray-500 dark:text-gray-400">{organizersError}</p>
                            <button onClick={() => void loadOrganizers()} className="mt-3 text-emerald-600 hover:text-emerald-700 text-sm font-medium">Retry</button>
                        </div>
                    ) : organizers.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                            No organizers found with status: <strong className="text-gray-700 dark:text-gray-300">{verificationFilter.replace('_', ' ')}</strong>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-slate-700 max-h-[500px] overflow-y-auto">
                            {organizers.map((org) => (
                                <div key={org.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{org.email}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                {org.profile?.firstName} {org.profile?.lastName}
                                            </p>
                                            {org.organizationMemberships?.[0]?.organization && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                                                    <Building2 size={12} />
                                                    {org.organizationMemberships[0].organization.name}
                                                </p>
                                            )}
                                            {/* Verification Document Link */}
                                            {org.organizationMemberships?.[0]?.organization?.verificationDocUrl && (
                                                <a 
                                                    href={org.organizationMemberships[0].organization.verificationDocUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 hover:underline"
                                                >
                                                    <FileText size={12} />
                                                    View Verification Doc <ExternalLink size={10} />
                                                </a>
                                            )}
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
                                                <Clock size={12} />
                                                Joined {new Date(org.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-1 shrink-0">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                org.verificationStatus === 'VERIFIED' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                                                org.verificationStatus === 'REJECTED' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                                                'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                            }`}>
                                                {org.verificationStatus.replace('_', ' ')}
                                            </span>
                                            {org.verificationStatus === 'UNDER_REVIEW' && (
                                                <div className="flex gap-1 mt-1">
                                                    <button 
                                                        onClick={() => handleApprove(org.id)}
                                                        className="p-1 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                                                        title="Approve"
                                                    >
                                                        <CheckCircle size={14} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleReject(org.id)}
                                                        className="p-1 rounded bg-red-100 dark:bg-red-900/30 text-red-600 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                                        title="Reject"
                                                    >
                                                        <XCircle size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Events Overview */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden shadow-sm">
                    <div className="border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 p-4 flex items-center justify-between gap-4">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Calendar size={20} className="text-emerald-500" />
                            Platform Events
                        </h2>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">{inProgress} live</span>
                    </div>
                    <div className="max-h-[500px] overflow-y-auto">
                        {events?.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">No events found</div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-slate-800/80 sticky top-0 z-10">
                                    <tr>
                                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Title</th>
                                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Status</th>
                                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                    {events?.map(ev => (
                                        <tr key={ev.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="py-3 px-4">
                                                <Link to={`/events/${ev.id}`} className="font-medium text-gray-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                                                    {ev.title}
                                                </Link>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                    ev.status === 'REGISTRATION_OPEN' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                                                    ev.status === 'IN_PROGRESS' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                                                    ev.status === 'COMPLETED' ? 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-400' :
                                                    'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                                }`}>
                                                    {ev.status?.replace(/_/g, ' ') || '—'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs">
                                                {ev.eventStart ? new Date(ev.eventStart).toLocaleDateString() : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
