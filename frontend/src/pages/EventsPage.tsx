import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Globe, MapPin, Calendar, Users, MonitorPlay, Tag } from 'lucide-react'
import { listEvents } from '../api/events'
import type { Hackathon } from '../types/models'

const CARD_GRADIENTS = [
  'from-emerald-500 to-teal-600',
  'from-violet-500 to-indigo-600',
  'from-orange-500 to-rose-600',
  'from-sky-500 to-blue-600',
  'from-pink-500 to-fuchsia-600',
  'from-amber-500 to-orange-600',
]

function cardGradient(title: string) {
  let hash = 0
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash)
  return CARD_GRADIENTS[Math.abs(hash) % CARD_GRADIENTS.length]
}

const STATUS_STYLES: Record<string, string> = {
  REGISTRATION_OPEN: 'badge-green',
  IN_PROGRESS: 'badge-blue',
  COMPLETED: 'badge-gray',
  JUDGING: 'badge-blue',
  DRAFT: 'badge-yellow',
  REGISTRATION_CLOSED: 'badge-yellow',
  ARCHIVED: 'badge-gray',
}

export default function EventsPage() {
  const [events, setEvents] = useState<Hackathon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('ALL')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    listEvents({ limit: 100 })
      .then(res => { if (active) setEvents(res.data) })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Unable to load events.') })
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [])

  const filtered = events?.filter(e => {
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.description?.toLowerCase() || '').includes(search.toLowerCase())
    const matchStatus = status === 'ALL' || e.status === status
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Discover Events</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Browse and register for upcoming hackathons.</p>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="input-field pl-10 bg-gray-50/50"
            placeholder="Search events..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar" role="group" aria-label="Filter by status">
          {['ALL', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'IN_PROGRESS', 'COMPLETED'].map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              aria-pressed={status === s}
              className={`rounded-full px-4 py-2 text-xs font-medium whitespace-nowrap transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${status === s
                ? 'bg-accent-500 text-white shadow-md shadow-accent-500/20'
                : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm'
              }`}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="alert-error flex flex-col items-center justify-center py-16 px-4 text-center bg-white dark:bg-slate-800 border border-red-100 dark:border-red-900/30 rounded-xl shadow-sm">
          <Globe className="text-red-400 mb-3" size={32} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Connection Offline</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-sm">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-6 btn-primary shadow-red-500/20 from-red-500 to-red-600 hover:from-red-600 hover:to-red-700">Try again</button>
        </div>
      ) : loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton h-72 rounded-2xl" />)}
        </div>
      ) : filtered?.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <p className="text-gray-500 dark:text-gray-400">No events found matching your criteria.</p>
          <button onClick={() => { setSearch(''); setStatus('ALL') }} className="mt-4 text-sm font-medium text-accent-600 hover:underline">Clear filters</button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered?.map(ev => (
            <Link
              key={ev.id}
              to={`/events/${ev.id}`}
              className="group card flex flex-col overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
            >
              {/* Hero — image or gradient */}
              <div className="relative h-44 overflow-hidden flex-shrink-0">
                {ev.coverImageUrl ? (
                  <img
                    src={ev.coverImageUrl}
                    alt={ev.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${cardGradient(ev.title)} flex items-center justify-center`}>
                    <span className="text-white/20 font-black text-7xl select-none leading-none">
                      {ev.title?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                {/* Status badge overlay */}
                <div className="absolute top-3 left-3">
                  <span className={`badge ${STATUS_STYLES[ev.status] ?? 'badge-gray'} shadow-sm`}>
                    {ev.status.replace(/_/g, ' ')}
                  </span>
                </div>
                {/* Virtual badge */}
                {ev.isVirtual && (
                  <div className="absolute top-3 right-3">
                    <span className="flex items-center gap-1 text-xs font-semibold text-white bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full">
                      <MonitorPlay size={11} /> Virtual
                    </span>
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="p-5 flex flex-col flex-1">
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 group-hover:text-accent-600 transition-colors line-clamp-1">
                  {ev.title}
                </h3>
                <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 line-clamp-2 flex-1 leading-relaxed">
                  {ev.description}
                </p>

                {/* Tags */}
                {ev.tags && ev.tags.length > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                    <Tag size={11} className="text-gray-400 dark:text-gray-500 shrink-0" />
                    {ev.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                    {ev.tags.length > 3 && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">+{ev.tags.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Meta row */}
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-gray-400 dark:text-gray-500" />
                    {ev.eventStart ? new Date(ev.eventStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin size={13} className="text-gray-400 dark:text-gray-500" />
                    {ev.region || 'Remote'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users size={13} className="text-gray-400 dark:text-gray-500" />
                    {ev.minTeamSize}–{ev.maxTeamSize}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
