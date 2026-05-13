import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Trophy, ChevronRight, Activity, FileText } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { listEvents } from '../api/events'
import { getLeaderboard } from '../api/judging'
import { listSubmissionsByHackathon } from '../api/submissions'
import type { Hackathon, LeaderboardEntry, Submission } from '../types/models'

export default function Dashboard() {
  const { user } = useAuth()
  const [events, setEvents] = useState<Hackathon[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        setError(null)
        const evs = await listEvents({ limit: 5 })
        if (!active) return
        setEvents(evs.data)

        if (evs.data.length > 0) {
          const firstId = evs.data[0].id
          const [lb, subs] = await Promise.all([
            getLeaderboard(firstId, 1, 5).catch(() => ({ data: [] })),
            listSubmissionsByHackathon(firstId).catch(() => ({ data: [] }))
          ])
          if (!active) return
          setLeaderboard(lb.data)
          setSubmissions(subs.data)
        }
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Unable to load dashboard data.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [])

  const stats = [
    { label: 'Active Events', value: events.filter(e => e.status === 'IN_PROGRESS').length.toString(), icon: Activity, color: 'text-accent-500', bg: 'bg-accent-100' },
    { label: 'Upcoming', value: events.filter(e => e.status === 'REGISTRATION_OPEN').length.toString(), icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-100' },
    { label: 'My Submissions', value: submissions.length.toString(), icon: FileText, color: 'text-indigo-500', bg: 'bg-indigo-100' },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.profile?.firstName || 'User'}</h1>
          <p className="text-gray-500 mt-1">Here's what's happening in your hackathons.</p>
        </div>
        <Link to="/events" className="btn-primary">Browse events</Link>
      </div>

      {error ? (
        <div className="alert-error flex flex-col items-start gap-2">
          <strong>Connection Error</strong>
          <p className="text-sm">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-2 text-red-800 underline font-medium">Try again</button>
        </div>
      ) : loading ? (
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-3">
            {stats.map(s => (
              <div key={s.label} className="card p-5 group flex items-center gap-4 border-transparent hover:border-gray-200">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${s.bg} ${s.color} transition-transform group-hover:scale-110`}>
                  <s.icon size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card flex flex-col">
              <div className="flex items-center justify-between border-b border-border p-4">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Calendar size={18} className="text-gray-400" /> Recent Events</h2>
                <Link to="/events" className="text-sm font-medium text-accent-600 hover:text-accent-700">View all</Link>
              </div>
              <div className="flex-1 divide-y divide-border">
                {events.length === 0 ? <p className="p-8 text-center text-sm text-gray-500">No events found.</p> : events.slice(0, 4).map(ev => (
                  <Link key={ev.id} to={`/events/${ev.id}`} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group">
                    <div>
                      <p className="font-medium text-gray-900 group-hover:text-accent-600 transition-colors">{ev.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{new Date(ev.eventStart).toLocaleDateString()}</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-accent-500 group-hover:translate-x-1 transition-all" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="card flex flex-col">
              <div className="flex items-center justify-between border-b border-border p-4">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Trophy size={18} className="text-gray-400" /> Top Teams (Featured)</h2>
                <Link to="/leaderboard" className="text-sm font-medium text-accent-600 hover:text-accent-700">Full rankings</Link>
              </div>
              <div className="flex-1 overflow-x-auto">
                {leaderboard.length === 0 ? <p className="p-8 text-center text-sm text-gray-500">No rankings available yet.</p> : (
                  <table className="tbl !border-t-0">
                    <thead><tr><th className="pl-4 w-12">#</th><th>Team</th><th className="text-right pr-4">Score</th></tr></thead>
                    <tbody>
                      {leaderboard.map((e, i) => (
                        <tr key={i}>
                          <td className="pl-4 font-bold text-gray-400">{i + 1}</td>
                          <td className="font-medium text-gray-900">{e.teamName || `Team ${i + 1}`}</td>
                          <td className="text-right pr-4 font-bold text-accent-600">{e.finalScore?.toFixed(1) ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
