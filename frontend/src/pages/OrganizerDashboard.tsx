import { FormEvent, useEffect, useState } from 'react'
import { PlusCircle, Loader2, Globe, Settings, MapPin, Calendar, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { listEvents, createEvent } from '../api/events'
import { useAuth } from '../contexts/AuthContext'
import type { Hackathon } from '../types/models'

export default function OrganizerDashboard() {
    const { user, isAuthenticated } = useAuth()
    const [events, setEvents] = useState<Hackathon[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ title: '', description: '', region: '', start: '', end: '', min: 1, max: 4 })
    const [creating, setCreating] = useState(false)
    const [createError, setCreateError] = useState<string | null>(null)

    const load = async () => {
        try {
            setLoading(true)
            setError(null)
            const r = await listEvents({ limit: 50 })
            setEvents(r.data.filter(event => user?.role === 'ADMIN' || event.organizerId === user?.id))
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
                prizes: null,
                tags: []
            })
            setForm({ title: '', description: '', region: '', start: '', end: '', min: 1, max: 4 })
            setShowForm(false)
            await load()
        } catch (err: any) {
            setCreateError(err.message || 'Unable to create this event draft.')
        } finally { setCreating(false) }
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

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
            <div className="card-elevated flex flex-col gap-4 border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,247,251,0.94))] p-6 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                        <Settings size={24} />
                    </div>
                    <div>
                        <p className="section-title text-accent-600 mb-1">Organizer workspace</p>
                        <h1 className="text-2xl font-bold text-navy-900">Event operations</h1>
                        <p className="text-sm text-slate-500">Manage your existing hackathons and create new event drafts with backend-valid settings.</p>
                    </div>
                </div>
                {!showForm && <button onClick={() => setShowForm(true)} className="btn-primary"><PlusCircle size={16} /> Create Event</button>}
            </div>

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

            <div className="card-elevated border border-gray-100 overflow-hidden bg-white">
                <div className="border-b border-gray-100 p-5 bg-gray-50/50"><h2 className="text-lg font-bold text-gray-900">Your Hackathons</h2></div>
                <div className="divide-y divide-gray-100">
                    {loading ? <div className="p-12 text-center text-gray-400"><Loader2 className="animate-spin mx-auto text-accent-500" size={32} /></div> : events.length === 0 ? <p className="p-12 text-center text-gray-500">You haven't created any events yet.</p> : events.map(ev => (
                        <Link key={ev.id} to={`/events/${ev.id}`} className="block p-5 hover:bg-gray-50 transition-colors group">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-3 mb-1.5">
                                        <span className={`badge ${ev.status === 'REGISTRATION_OPEN' ? 'badge-green' : ev.status === 'DRAFT' ? 'badge-yellow' : 'badge-gray'}`}>{ev.status.replace(/_/g, ' ')}</span>
                                    </div>
                                    <h3 className="font-bold text-gray-900 group-hover:text-accent-600 transition-colors text-lg">{ev.title}</h3>
                                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 font-medium">
                                        <span className="flex items-center gap-1"><Calendar size={14} className="text-gray-400" /> {new Date(ev.eventStart).toLocaleDateString()}</span>
                                        <span className="flex items-center gap-1"><MapPin size={14} className="text-gray-400" /> {ev.region || 'Virtual'}</span>
                                    </div>
                                </div>
                                <ChevronRight className="text-gray-300 group-hover:text-accent-500 group-hover:translate-x-1 transition-all" />
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}
