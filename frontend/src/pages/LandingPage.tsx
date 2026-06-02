import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  MapPin,
  Users,
  MonitorPlay,
  Tag,
} from 'lucide-react'
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

const STATUS_LABELS: Record<string, string> = {
  REGISTRATION_OPEN: 'Open',
  IN_PROGRESS: 'Live',
  COMPLETED: 'Ended',
  JUDGING: 'Judging',
  REGISTRATION_CLOSED: 'Closed',
  ARCHIVED: 'Archived',
}

const faqs = [
  { q: 'Who can participate?', a: 'Anyone! Students, professionals, and beginners are all welcome.' },
  { q: 'How do I register?', a: 'Find an event and click Register. You\'ll need a free HackET account.' },
  { q: 'Can I join as a team?', a: 'Yes! Create or join a team after registering for an event.' },
]

export default function LandingPage() {
  const [events, setEvents] = useState<Hackathon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  useEffect(() => {
    listEvents({ limit: 50 })
      .then(res => setEvents(res.data.filter(e => e.status !== 'DRAFT')))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const filteredEvents = useMemo(() => {
    return events
  }, [events])

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-black">
      {/* Events Grid */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="skeleton h-64 rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400">Could not load events. Please try again.</p>
            <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg">
              Retry
            </button>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400">No events available yet</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((ev) => (
              <Link
                key={ev.id}
                to={`/events/${ev.id}`}
                className="group bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
              >
                <div className="relative h-40 overflow-hidden">
                  {ev.coverImageUrl && !failedImages.has(ev.id) ? (
                    <img
                      src={ev.coverImageUrl}
                      alt={ev.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={() => setFailedImages(prev => new Set(prev).add(ev.id))}
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${cardGradient(ev.title)} flex items-center justify-center`}>
                      <span className="text-white/30 font-black text-6xl select-none">{ev.title?.charAt(0).toUpperCase() || '?'}</span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      ev.status === 'REGISTRATION_OPEN' ? 'bg-emerald-500 text-white' :
                      ev.status === 'IN_PROGRESS' ? 'bg-blue-500 text-white' :
                      ev.status === 'JUDGING' ? 'bg-purple-500 text-white' :
                      'bg-gray-500/80 text-white'
                    }`}>
                      {STATUS_LABELS[ev.status] || ev.status}
                    </span>
                  </div>
                  {ev.isVirtual && (
                    <div className="absolute top-3 right-3">
                      <span className="flex items-center gap-1 text-xs font-medium text-white bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full">
                        <MonitorPlay size={12} /> Virtual
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">{ev.title}</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{ev.description || 'No description available'}</p>
                  {ev.tags && ev.tags.length > 0 && (
                    <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                      <Tag size={12} className="text-gray-400" />
                      {ev.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="text-xs bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">{tag}</span>
                      ))}
                      {ev.tags.length > 2 && <span className="text-xs text-gray-400">+{ev.tags.length - 2}</span>}
                    </div>
                  )}
                  <div className="mt-4 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1"><Calendar size={14} /> {ev.eventStart ? new Date(ev.eventStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'TBA'}</span>
                    <span className="flex items-center gap-1"><MapPin size={14} /> {ev.region || 'Remote'}</span>
                    <span className="flex items-center gap-1"><Users size={14} /> {ev.minTeamSize}-{ev.maxTeamSize}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Simple FAQ */}
        {!loading && !error && events.length > 0 && (
          <section className="mt-16">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Common questions</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {faqs.map(item => (
                <div key={item.q} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-gray-100 dark:border-slate-800">
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{item.q}</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Simple Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">HackET</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ethiopia's hackathon platform</p>
            </div>
            <div className="flex gap-6 text-sm text-gray-500 dark:text-gray-400">
              <Link to="/events" className="hover:text-emerald-600">Events</Link>
              <Link to="/leaderboard" className="hover:text-emerald-600">Leaderboard</Link>
              <Link to="/login" className="hover:text-emerald-600">Login</Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
