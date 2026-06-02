import { FormEvent, useEffect, useState } from 'react'
import { PlusCircle, Loader2, Globe, Settings, MapPin, Calendar, ChevronRight, Trash2, BarChart2, ShieldCheck, ImageIcon, X, UserPlus, Copy, Check, Mail, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { listEvents, createEvent, deleteEvent, generateStaffInvitationLink, getStaffAssignments } from '../api/events'
import { normalizeScores } from '../api/judging'
import { exportAnalyticsReport } from '../api/analytics'
import { useAuth } from '../contexts/AuthContext'
import type { Hackathon, StaffAssignment, StaffRole } from '../types/models'

const ALL_STAFF_ROLES: { value: StaffRole; label: string }[] = [
    { value: 'JUDGE',          label: 'Judge' },
    { value: 'MENTOR',         label: 'Mentor' },
    { value: 'TECHNICAL_LEAD', label: 'Technical Lead' },
    { value: 'LOGISTICS',      label: 'Logistics' },
    { value: 'COMMUNICATIONS', label: 'Communications' },
    { value: 'FINANCE',        label: 'Finance' },
]

const ROLE_BADGE: Record<StaffRole, string> = {
    JUDGE:          'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    MENTOR:         'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    TECHNICAL_LEAD: 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800',
    LOGISTICS:      'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    COMMUNICATIONS: 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    FINANCE:        'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
}

export default function OrganizerDashboard() {
    const { user, isAuthenticated } = useAuth()
    const [events, setEvents] = useState<Hackathon[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ title: '', description: '', region: '', start: '', end: '', min: 1, max: 4, coverImageUrl: '' })
    const [creating, setCreating] = useState(false)
    const [createError, setCreateError] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [normalizingId, setNormalizingId] = useState<string | null>(null)
    const [exportingId, setExportingId] = useState<string | null>(null)
    const [actionMsg, setActionMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
    const [staffByEvent, setStaffByEvent] = useState<Record<string, StaffAssignment[]>>({})
    const [staffEventId, setStaffEventId] = useState<string | null>(null)
    const [staffLoading, setStaffLoading] = useState(false)
    const [inviteEventId, setInviteEventId] = useState<string | null>(null)
    const [inviteForm, setInviteForm] = useState({ email: '', role: 'JUDGE' as StaffRole })
    const [generatedLink, setGeneratedLink] = useState('')
    const [generatingLink, setGeneratingLink] = useState(false)
    const [inviteError, setInviteError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    const load = async () => {
        try {
            setLoading(true)
            setError(null)
            const r = await listEvents({ limit: 50 })
            setEvents(r.data?.filter(event => user?.role === 'ADMIN' || event.organizerId === user?.id) ?? [])
        }
        catch (err: any) { setError(err.message || 'Unable to connect') }
        finally { setLoading(false) }
    }

    useEffect(() => { void load() }, [user?.id, user?.role])

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        try {
            setCreating(true)
            setCreateError(null)
            const startDate = new Date(form.start)
            const endDate = new Date(form.end)

            if (!form.title.trim() || form.title.trim().length < 3) {
                throw new Error('Event title must be at least 3 characters.')
            }

            if (!form.description.trim() || form.description.trim().length < 10) {
                throw new Error('Description must be at least 10 characters.')
            }

            if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
                throw new Error('Select valid start and end dates.')
            }

            if (endDate <= startDate) {
                throw new Error('The end date must be after the start date.')
            }

            if (form.min > form.max) {
                throw new Error('Minimum team size cannot be greater than maximum team size.')
            }

            const registrationStart = new Date(startDate.getTime() - 14 * 24 * 60 * 60 * 1000)
            const registrationEnd = new Date(startDate.getTime() - 24 * 60 * 60 * 1000)

            await createEvent({
                title: form.title.trim(),
                description: form.description.trim(),
                rules: null,
                eventStart: startDate.toISOString(),
                eventEnd: endDate.toISOString(),
                registrationStart: registrationStart.toISOString(),
                registrationEnd: registrationEnd.toISOString(),
                submissionDeadline: endDate.toISOString(),
                maxTeamSize: form.max,
                minTeamSize: form.min,
                isVirtual: !form.region.trim(),
                region: form.region.trim() || null,
                coverImageUrl: form.coverImageUrl.trim() || null,
                prizes: null,
                tags: []
            })
            setForm({ title: '', description: '', region: '', start: '', end: '', min: 1, max: 4, coverImageUrl: '' })
            setShowForm(false)
            await load()
        } catch (err: any) {
            setCreateError(err.message || 'Unable to create this event draft.')
        } finally { setCreating(false) }
    }

    const generateInviteLink = async (eventId: string) => {
        if (!inviteForm.email.trim()) return
        try {
            setGeneratingLink(true)
            setInviteError(null)
            // Call backend to generate secure invitation link
            const result = await generateStaffInvitationLink(eventId, {
                email: inviteForm.email.trim(),
                role: inviteForm.role
            })
            setGeneratedLink(result.invitationLink)
        } catch (err: any) {
            setInviteError(err.message || 'Failed to generate invitation link. Backend endpoint may not be implemented yet.')
        } finally {
            setGeneratingLink(false)
        }
    }

    const copyLink = async () => {
        if (!generatedLink) return
        await navigator.clipboard.writeText(generatedLink)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
    }

    const openInvitePanel = (eventId: string) => {
        setInviteEventId(inviteEventId === eventId ? null : eventId)
        setGeneratedLink('')
        setInviteError(null)
        setInviteForm({ email: '', role: 'JUDGE' })
    }

    const toggleStaffPanel = async (eventId: string) => {
        if (staffEventId === eventId) { setStaffEventId(null); return }
        setStaffEventId(eventId)
        if (staffByEvent[eventId]) return
        try {
            setStaffLoading(true)
            const list = await getStaffAssignments(eventId)
            setStaffByEvent(prev => ({ ...prev, [eventId]: Array.isArray(list) ? list : [] }))
        } catch {
            setStaffByEvent(prev => ({ ...prev, [eventId]: [] }))
        } finally { setStaffLoading(false) }
    }

    const handleDelete = async (ev: Hackathon) => {
        if (!confirm(`Delete "${ev.title}"? This cannot be undone.`)) return
        try {
            setDeletingId(ev.id)
            setActionMsg(null)
            await deleteEvent(ev.id)
            setActionMsg({ type: 'ok', text: `"${ev.title}" deleted.` })
            await load()
        } catch (err: any) {
            setActionMsg({ type: 'err', text: err.message || 'Delete failed.' })
        } finally { setDeletingId(null) }
    }

    const handleNormalize = async (ev: Hackathon) => {
        try {
            setNormalizingId(ev.id)
            setActionMsg(null)
            await normalizeScores(ev.id)
            setActionMsg({ type: 'ok', text: `Scores normalized for "${ev.title}".` })
        } catch (err: any) {
            setActionMsg({ type: 'err', text: err.message || 'Normalization failed.' })
        } finally { setNormalizingId(null) }
    }

    const handleExport = async (ev: Hackathon) => {
        try {
            setExportingId(ev.id)
            setActionMsg(null)
            const result = await exportAnalyticsReport(ev.id, 'csv')
            if (result.url) window.open(result.url, '_blank')
            else setActionMsg({ type: 'ok', text: 'Export ready.' })
        } catch (err: any) {
            setActionMsg({ type: 'err', text: err.message || 'Export failed.' })
        } finally { setExportingId(null) }
    }

    if (!isAuthenticated || (user?.role !== 'ORGANIZER' && user?.role !== 'ADMIN')) return (
        <div className="py-20 text-center"><h1 className="text-xl font-bold text-gray-900">Access Denied</h1><p className="mt-2 text-gray-500">Only organizers can access this page.</p></div>
    )

    if (error && !events.length) return (
        <div className="max-w-5xl mx-auto alert-error flex flex-col items-center justify-center py-12 px-4 text-center bg-white border border-red-100 rounded-xl shadow-sm mt-12">
            <Globe className="text-red-400 mb-3" size={32} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Systems Offline</h3>
            <p className="text-sm text-gray-500 max-w-sm mb-6">{error}</p>
            <button onClick={() => void load()} className="btn-primary shadow-red-500/20 from-red-500 to-red-600">Retry Connection</button>
        </div>
    )

    const isVerified = user?.verificationStatus === 'VERIFIED' || user?.role === 'ADMIN'

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
            <div className="card-elevated flex flex-col gap-4 border border-white/70 dark:border-slate-700 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,247,251,0.94))] dark:bg-slate-800 p-6 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-900/30 text-orange-600">
                        <Settings size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1">Organizer workspace</p>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Event operations</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Manage your existing hackathons and create new event drafts.</p>
                    </div>
                </div>
                {!showForm && isVerified && <button onClick={() => setShowForm(true)} className="btn-primary"><PlusCircle size={16} /> Create Event</button>}
            </div>

            {/* Verification Status Banner */}
            {!isVerified && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center shrink-0">
                        <ShieldCheck size={20} />
                    </div>
                    <div>
                        <p className="font-semibold text-amber-800 dark:text-amber-200">Verification Required</p>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                            Your organizer account is <strong>{user?.verificationStatus?.replace('_', ' ') || 'PENDING'}</strong>. 
                            You can view your events but cannot create new ones until an admin verifies your account.
                        </p>
                    </div>
                </div>
            )}

            {showForm && (
                <div className="card-elevated p-6 sm:p-8 border border-orange-100 bg-gradient-to-br from-white to-orange-50/30 animate-slide-in-left">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900">New Hackathon Draft</h2>
                        <button onClick={() => setShowForm(false)} className="text-sm font-medium text-gray-500 hover:text-gray-800">Cancel</button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {createError && <div className="alert-error">{createError}</div>}
                        <div className="grid gap-6 sm:grid-cols-2">
                            <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label><input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="National Future Builders Hackathon" /></div>
                            <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal text-xs">(min 10 characters)</span></label><textarea required minLength={10} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field h-24" placeholder="Describe the hackathon — themes, goals, eligibility..." /></div>

                            {/* Cover Image */}
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                                    <ImageIcon size={14} className="text-gray-400" /> Cover Image URL
                                    <span className="text-gray-400 font-normal text-xs ml-1">(optional)</span>
                                </label>
                                <div className="flex gap-3 items-start">
                                    <div className="flex-1 relative">
                                        <input
                                            type="url"
                                            value={form.coverImageUrl}
                                            onChange={e => setForm({ ...form, coverImageUrl: e.target.value })}
                                            className="input-field pr-9"
                                            placeholder="https://example.com/cover.jpg"
                                        />
                                        {form.coverImageUrl && (
                                            <button
                                                type="button"
                                                onClick={() => setForm({ ...form, coverImageUrl: '' })}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                <X size={15} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {form.coverImageUrl.trim() && (
                                    <div className="mt-3 relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50" style={{ height: '140px' }}>
                                        <img
                                            src={form.coverImageUrl.trim()}
                                            alt="Cover preview"
                                            className="w-full h-full object-cover"
                                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                                            onLoad={e => { (e.target as HTMLImageElement).style.display = 'block' }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <ImageIcon size={28} className="text-gray-300" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div><label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5"><Calendar size={14} className="text-gray-400" /> Start Date</label><input type="datetime-local" required value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} className="input-field" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5"><Calendar size={14} className="text-gray-400" /> End Date</label><input type="datetime-local" required value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} className="input-field" /></div>

                            <div><label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5"><MapPin size={14} className="text-gray-400" /> Location / Region</label><input value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} className="input-field" placeholder="Leave blank for Virtual" /></div>
                            <div className="flex gap-4">
                                <div className="flex-1"><label className="block text-sm font-medium text-gray-700 mb-1">Min Team</label><input type="number" required value={form.min} onChange={e => setForm({ ...form, min: +e.target.value })} className="input-field" min="1" max="10" /></div>
                                <div className="flex-1"><label className="block text-sm font-medium text-gray-700 mb-1">Max Team</label><input type="number" required value={form.max} onChange={e => setForm({ ...form, max: +e.target.value })} className="input-field" min="1" max="10" /></div>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-gray-100 flex justify-end">
                            <button type="submit" disabled={creating} className="btn-primary w-full sm:w-auto h-11 px-8">{creating ? <Loader2 size={16} className="animate-spin" /> : 'Create Draft'}</button>
                        </div>
                    </form>
                </div>
            )}

            {actionMsg && (
                <div className={`px-5 py-3 rounded-lg text-sm font-medium ${actionMsg.type === 'ok' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                    {actionMsg.text}
                </div>
            )}

            <div className="card-elevated border border-gray-100 overflow-hidden bg-white">
                <div className="border-b border-gray-100 p-5 bg-gray-50/50"><h2 className="text-lg font-bold text-gray-900">Your Hackathons</h2></div>
                <div className="divide-y divide-gray-100">
                    {loading ? <div className="p-12 text-center text-gray-400"><Loader2 className="animate-spin mx-auto text-accent-500" size={32} /></div> : events?.length === 0 ? <p className="p-12 text-center text-gray-500">You haven't created any events yet.</p> : events?.map(ev => (
                        <div key={ev.id} className="p-5 hover:bg-gray-50 transition-colors group">
                            <div className="flex items-start justify-between gap-4">
                                <Link to={`/events/${ev.id}`} className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1.5">
                                        <span className={`badge ${ev.status === 'REGISTRATION_OPEN' ? 'badge-green' : ev.status === 'DRAFT' ? 'badge-yellow' : 'badge-gray'}`}>{ev.status?.replace(/_/g, ' ') || '—'}</span>
                                    </div>
                                    <h3 className="font-bold text-gray-900 group-hover:text-accent-600 transition-colors text-lg truncate">{ev.title}</h3>
                                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 font-medium">
                                        <span className="flex items-center gap-1"><Calendar size={14} className="text-gray-400" /> {ev.eventStart ? new Date(ev.eventStart).toLocaleDateString() : '—'}</span>
                                        <span className="flex items-center gap-1"><MapPin size={14} className="text-gray-400" /> {ev.region || 'Virtual'}</span>
                                    </div>
                                </Link>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => void handleNormalize(ev)}
                                        disabled={normalizingId === ev.id}
                                        title="Normalize scores"
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 transition-colors"
                                    >
                                        {normalizingId === ev.id ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                                        Normalize
                                    </button>
                                    <button
                                        onClick={() => void handleExport(ev)}
                                        disabled={exportingId === ev.id}
                                        title="Export analytics as CSV"
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 transition-colors"
                                    >
                                        {exportingId === ev.id ? <Loader2 size={13} className="animate-spin" /> : <BarChart2 size={13} />}
                                        Export
                                    </button>
                                    <button
                                        onClick={() => void handleDelete(ev)}
                                        disabled={deletingId === ev.id}
                                        title="Delete event"
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
                                    >
                                        {deletingId === ev.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                        Delete
                                    </button>
                                    <button
                                        onClick={() => void toggleStaffPanel(ev.id)}
                                        title="View staff"
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${staffEventId === ev.id ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-blue-200 text-blue-600 hover:bg-blue-50'}`}
                                    >
                                        <Users size={13} /> Staff
                                    </button>
                                    <button
                                        onClick={() => openInvitePanel(ev.id)}
                                        title="Invite staff member"
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${inviteEventId === ev.id ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-violet-200 text-violet-600 hover:bg-violet-50'}`}
                                    >
                                        <UserPlus size={13} /> Invite
                                    </button>
                                    <Link to={`/events/${ev.id}`}><ChevronRight className="text-gray-300 group-hover:text-accent-500 transition-all" /></Link>
                                </div>
                            </div>

                            {/* Staff list panel */}
                            {staffEventId === ev.id && (
                                <div className="mt-4 p-4 rounded-xl border border-blue-100 bg-blue-50/40 space-y-3">
                                    <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                                        <Users size={13} /> Staff assignments — <span className="font-bold truncate">{ev.title}</span>
                                    </p>
                                    {staffLoading ? (
                                        <div className="flex items-center gap-2 text-xs text-blue-500"><Loader2 size={13} className="animate-spin" /> Loading staff…</div>
                                    ) : (staffByEvent[ev.id] ?? []).length === 0 ? (
                                        <p className="text-xs text-blue-500">No staff assigned yet. Use Invite to add members.</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {(staffByEvent[ev.id] ?? []).map(s => (
                                                <div key={s.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${ROLE_BADGE[s.staffRole] ?? 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                                                    <ShieldCheck size={12} />
                                                    <span>{s.user?.profile?.firstName ?? s.user?.email ?? s.userId}</span>
                                                    <span className="opacity-60">· {s.staffRole.replace(/_/g, ' ')}</span>
                                                    {s.isLead && <span className="ml-1 font-bold opacity-80">★</span>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {inviteEventId === ev.id && (
                                <div className="mt-4 p-4 rounded-xl border border-violet-100 bg-violet-50/60 space-y-3">
                                    <p className="text-xs font-semibold text-violet-700 flex items-center gap-1.5">
                                        <Mail size={13} /> Generate invitation link — <span className="font-bold truncate">{ev.title}</span>
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <input
                                            type="email"
                                            placeholder="invitee@email.com"
                                            value={inviteForm.email}
                                            onChange={e => { setInviteForm(f => ({ ...f, email: e.target.value })); setGeneratedLink('') }}
                                            className="input-field flex-1 text-sm h-9"
                                        />
                                        <select
                                            value={inviteForm.role}
                                            onChange={e => { setInviteForm(f => ({ ...f, role: e.target.value as StaffRole })); setGeneratedLink('') }}
                                            className="input-field !w-auto text-sm h-9"
                                        >
                                            {ALL_STAFF_ROLES.map(r => (
                                                <option key={r.value} value={r.value}>{r.label}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => void generateInviteLink(ev.id)}
                                            disabled={!inviteForm.email.trim() || generatingLink}
                                            className="h-9 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold disabled:opacity-40 transition-colors shrink-0 flex items-center gap-1.5"
                                        >
                                            {generatingLink ? <><Loader2 size={12} className="animate-spin" /> Generating...</> : 'Generate'}
                                        </button>
                                    </div>

                                    {inviteError && (
                                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                                            {inviteError}
                                        </div>
                                    )}

                                    {generatedLink && (
                                        <div className="rounded-lg border border-violet-200 bg-white overflow-hidden">
                                            <div className="flex items-center gap-2 px-3 py-2">
                                                <p className="text-xs text-gray-500 truncate flex-1 font-mono">{generatedLink}</p>
                                                <button
                                                    type="button"
                                                    onClick={() => void copyLink()}
                                                    className={`flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${copied ? 'bg-green-100 text-green-700' : 'bg-violet-100 text-violet-700 hover:bg-violet-200'}`}
                                                >
                                                    {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                                                </button>
                                            </div>
                                            <div className="px-3 py-2 border-t border-violet-100 bg-violet-50/40">
                                                <p className="text-xs text-violet-600">
                                                    Send this link to <strong>{inviteForm.email}</strong>. They open it, sign in (or register), and their account gets the <strong>{inviteForm.role}</strong> role for this event.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
