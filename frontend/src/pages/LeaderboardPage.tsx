import { useEffect, useState } from 'react'
import { getLeaderboard } from '../api/judging'
import { listEvents } from '../api/events'
import { Trophy, Medal, Award, Globe, Loader2 } from 'lucide-react'
import type { Hackathon, LeaderboardEntry } from '../types/models'

export default function LeaderboardPage() {
    const [events, setEvents] = useState<Hackathon[]>([])
    const [selectedEvent, setSelectedEvent] = useState('')
    const [entries, setEntries] = useState<LeaderboardEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingEntries, setLoadingEntries] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let active = true
        listEvents({ limit: 50 })
            .then(r => {
                if (!active) return
                setEvents(r.data)
                if (r.data.length > 0) setSelectedEvent(r.data[0].id)
                setError(null)
            })
            .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Failed to connect') })
            .finally(() => { if (active) setLoading(false) })
        return () => { active = false }
    }, [])

    useEffect(() => {
        if (!selectedEvent) return
        let active = true
        setLoadingEntries(true)
        getLeaderboard(selectedEvent, 1, 50)
            .then(r => { if (active) setEntries(r.data) })
            .catch(() => { if (active) setEntries([]) }) // Ignore error, show empty if fail
            .finally(() => { if (active) setLoadingEntries(false) })
        return () => { active = false }
    }, [selectedEvent])

    if (loading) return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="skeleton h-12 w-64 rounded-md" />
            <div className="skeleton h-96 w-full rounded-2xl" />
        </div>
    )

    if (error) return (
        <div className="max-w-5xl mx-auto">
            <div className="alert-error flex flex-col items-center justify-center py-12 px-4 text-center bg-white border border-red-100 rounded-xl shadow-sm">
                <Globe className="text-red-400 mb-3" size={32} />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Systems Offline</h3>
                <p className="text-sm text-gray-500 max-w-sm mb-6">{error}</p>
                <button onClick={() => window.location.reload()} className="btn-primary shadow-red-500/20 from-red-500 to-red-600">Retry Connection</button>
            </div>
        </div>
    )

    return (
        <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
            <div className="card-elevated flex flex-col gap-4 border border-white/70 bg-white/92 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="section-title text-accent-600">Event rankings</p>
                    <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2"><Trophy className="text-amber-500" size={24} /> Leaderboard</h1>
                    <p className="mt-1 text-sm text-slate-500">View score results for the currently selected hackathon.</p>
                </div>
                <select value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)} className="input-field !w-auto min-w-[240px] shadow-sm">
                    {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                </select>
            </div>

            <div className="card-elevated bg-white overflow-hidden border border-gray-100">
                {loadingEntries ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <Loader2 size={32} className="animate-spin mb-4 text-accent-500" />
                        <p>Compiling scores...</p>
                    </div>
                ) : entries.length === 0 ? (
                    <div className="py-20 text-center text-gray-500 flex flex-col items-center">
                        <Award size={48} className="text-gray-300 mb-4" />
                        <p className="text-lg font-medium text-gray-900">No rankings yet</p>
                        <p className="text-sm mt-1">Scores will appear here once judging is complete.</p>
                    </div>
                ) : (
                    <table className="tbl !border-t-0">
                        <thead className="bg-gray-50/80">
                            <tr>
                                <th className="pl-6 w-20 py-4">Rank</th>
                                <th className="py-4">Team</th>
                                <th className="py-4">Project</th>
                                <th className="text-right pr-6 py-4">Overall Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {entries.map((e, i) => {
                                const rank = e.rank ?? i + 1
                                return (
                                    <tr key={e.submissionId || i} className="hover:bg-amber-50/30 transition-colors group">
                                        <td className="pl-6 py-4">
                                            {rank === 1 ? <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700 shadow-sm"><Trophy size={16} /></div> :
                                                rank === 2 ? <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 shadow-sm"><Medal size={16} /></div> :
                                                    rank === 3 ? <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-700 shadow-sm"><Medal size={16} /></div> :
                                                        <div className="flex h-8 w-8 items-center justify-center font-bold text-gray-400 text-sm">{rank}</div>}
                                        </td>
                                        <td className="py-4 font-bold text-gray-900 group-hover:text-accent-700 transition-colors">{e.teamName || e.submission?.team?.name || `Team #${i + 1}`}</td>
                                        <td className="py-4 text-gray-600 font-medium">{e.submissionTitle || e.submission?.title || '—'}</td>
                                        <td className="text-right pr-6 py-4">
                                            <div className="inline-flex bg-gray-50 border border-gray-200 rounded-lg px-3 py-1 font-bold text-gray-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                                                {e.finalScore?.toFixed(2) ?? '—'}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
