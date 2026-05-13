import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Globe, MapPin, Calendar, Users } from 'lucide-react'
import { listEvents } from '../api/events'
import type { Hackathon } from '../types/models'

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
      .then(res => {
        if (active) setEvents(res.data)
      })
      .catch(err => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load events.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [])

  const filtered = events.filter(e => {
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.description?.toLowerCase() || '').includes(search.toLowerCase())
    const matchStatus = status === 'ALL' || e.status === status
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Discover Events</h1>
        <p className="mt-1 text-sm text-gray-500">Browse and register for upcoming hackathons.</p>
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
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
          {['ALL', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'IN_PROGRESS', 'COMPLETED'].map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-full px-4 py-2 text-xs font-medium whitespace-nowrap transition-all ${status === s
                ? 'bg-accent-500 text-white shadow-md shadow-accent-500/20'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm'
                }`}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="alert-error flex flex-col items-center justify-center py-16 px-4 text-center bg-white border border-red-100 rounded-xl shadow-sm">
          <Globe className="text-red-400 mb-3" size={32} />
          <h3 className="text-lg font-semibold text-gray-900">Connection Offline</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-6 btn-primary shadow-red-500/20 from-red-500 to-red-600 hover:from-red-600 hover:to-red-700">Try again</button>
        </div>
      ) : loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton h-64 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-xl border border-gray-100 shadow-sm">
          <p className="text-gray-500">No events found matching your criteria.</p>
          <button onClick={() => { setSearch(''); setStatus('ALL') }} className="mt-4 text-sm font-medium text-accent-600 hover:underline">Clear filters</button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(ev => (
            <Link key={ev.id} to={`/events/${ev.id}`} className="group card flex flex-col overflow-hidden hover:-translate-y-1 transition-all duration-300">
              <div className="h-2 bg-gradient-to-r from-accent-400 to-teal-500" />
              <div className="p-5 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-3">
                  <span className={`badge ${ev.status === 'REGISTRATION_OPEN' ? 'badge-green' :
                    ev.status === 'IN_PROGRESS' ? 'badge-blue' :
                      ev.status === 'COMPLETED' ? 'badge-gray' : 'badge-yellow'
                    }`}>
                    {ev.status.replace(/_/g, ' ')}
                  </span>
                  {ev.isVirtual && <span className="text-xs font-semibold uppercase tracking-wider text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md">Virtual</span>}
                </div>

                <h3 className="text-lg font-bold text-gray-900 group-hover:text-accent-600 transition-colors line-clamp-1">{ev.title}</h3>
                <p className="mt-2 text-sm text-gray-500 line-clamp-2 flex-1">{ev.description}</p>

                <div className="mt-6 space-y-2 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Calendar size={14} className="text-gray-400" /> {new Date(ev.eventStart).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <MapPin size={14} className="text-gray-400" /> {ev.region || 'Remote'}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Users size={14} className="text-gray-400" /> {ev.minTeamSize}-{ev.maxTeamSize} team size
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
