import { FormEvent, useEffect, useState } from 'react'
import { getScoreBreakdown, submitScore, type ScoreBreakdown } from '../api/judging'
import { listSubmissionsByHackathon } from '../api/submissions'
import { listEvents } from '../api/events'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Loader2, Globe, FileText, CheckCircle, ChevronRight, ClipboardCheck } from 'lucide-react'
import type { Hackathon, Submission } from '../types/models'

export default function JudgeDashboard() {
    const { user, isAuthenticated } = useAuth()
    const [events, setEvents] = useState<Hackathon[]>([])
    const [selectedEvent, setSelectedEvent] = useState('')
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [selectedSub, setSelectedSub] = useState<Submission | null>(null)
    const [breakdown, setBreakdown] = useState<ScoreBreakdown[]>([])

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [scoreForm, setScoreForm] = useState({ criteriaId: '', value: '', comment: '' })
    const [scoring, setScoring] = useState(false)
    const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

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
        setSubmissions([])
        setSelectedSub(null)
        listSubmissionsByHackathon(selectedEvent)
            .then(r => { if (active) setSubmissions(r.data) })
            .catch(() => { })
        return () => { active = false }
    }, [selectedEvent])

    const selectSub = async (sub: Submission) => {
        setSelectedSub(sub)
        try { const d = await getScoreBreakdown(sub.id); setBreakdown(d) } catch { setBreakdown([]) }
    }

    const handleScore = async (e: FormEvent) => {
        e.preventDefault()
        if (!selectedSub) return
        try {
            setScoring(true); setMsg(null)
            await submitScore({ submissionId: selectedSub.id, criteriaId: scoreForm.criteriaId, value: Number(scoreForm.value), comment: scoreForm.comment || undefined })
            setMsg({ type: 'ok', text: 'Score submitted successfully.' })
            const d = await getScoreBreakdown(selectedSub.id); setBreakdown(d)
            setScoreForm({ criteriaId: '', value: '', comment: '' })
        } catch (err) { setMsg({ type: 'err', text: err instanceof Error ? err.message : 'Failed to submit score.' }) }
        finally { setScoring(false) }
    }

    if (!isAuthenticated || (user?.role !== 'JUDGE' && user?.role !== 'ADMIN')) return (
        <div className="py-20 text-center">
            <h1 className="text-lg font-semibold text-gray-900">Judging</h1>
            <p className="mt-1 text-sm text-gray-500">Judges and admins only.</p>
            <Link to="/login" className="btn-primary mt-4 inline-block">Log in</Link>
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
        <div className="space-y-6 max-w-6xl mx-auto animate-fade-up">
            <div className="card-elevated flex flex-col gap-4 border border-white/70 bg-white/92 p-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="section-title text-accent-600">Judging workspace</p>
                    <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2"><ClipboardCheck className="text-indigo-500" size={24} /> Evaluation panel</h1>
                    <p className="mt-1 text-sm text-slate-500">Review event submissions, inspect current score breakdowns, and submit new scoring entries.</p>
                </div>
                <select value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)} className="input-field !w-auto min-w-[240px] shadow-sm">
                    {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                </select>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Left: submission list */}
                <div className="card-elevated flex flex-col h-[calc(100vh-220px)] border border-gray-100">
                    <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 p-4">
                        <span className="text-sm font-bold text-gray-900 uppercase tracking-wider">Submissions</span>
                        <span className="badge badge-gray">{submissions.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                        {loading ? <div className="p-8 text-center text-gray-400"><Loader2 className="animate-spin mx-auto mb-2" /></div> : submissions.length === 0 ? <div className="p-8 text-center text-sm text-gray-500">No submissions available for judging yet.</div> : (
                            submissions.map(sub => (
                                <button key={sub.id} type="button" onClick={() => void selectSub(sub)}
                                    className={`w-full group px-5 py-4 flex items-center justify-between text-left transition-all ${selectedSub?.id === sub.id ? 'bg-indigo-50/50 border-l-4 border-l-indigo-500' : 'hover:bg-gray-50 border-l-4 border-l-transparent'}`}>
                                    <div>
                                        <p className={`font-semibold line-clamp-1 ${selectedSub?.id === sub.id ? 'text-indigo-900' : 'text-gray-900 group-hover:text-indigo-600'}`}>{sub.title}</p>
                                        <span className={`badge mt-1.5 ${sub.status === 'SUBMITTED' ? 'badge-blue' : sub.status === 'SCORED' ? 'badge-green' : 'badge-gray'}`}>{sub.status}</span>
                                    </div>
                                    <ChevronRight size={18} className={selectedSub?.id === sub.id ? 'text-indigo-500' : 'text-gray-300'} />
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Right: scoring */}
                <div className="lg:col-span-2 space-y-6 h-[calc(100vh-220px)] overflow-y-auto pr-2 custom-scrollbar">
                    {selectedSub ? (
                        <>
                            <div className="card-elevated p-6 border border-gray-100">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">{selectedSub.title}</h2>
                                        {selectedSub.description && <p className="mt-3 leading-relaxed text-gray-600 whitespace-pre-wrap">{selectedSub.description}</p>}
                                    </div>
                                </div>

                                <div className="mt-6 flex flex-wrap gap-4 border-t border-gray-100 pt-6">
                                    {selectedSub.githubUrl && (
                                        <a href={selectedSub.githubUrl} target="_blank" rel="noreferrer" className="btn-secondary h-9 bg-gray-50 text-xs shadow-none"><FileText size={14} /> Repository</a>
                                    )}
                                    {selectedSub.demoUrl && (
                                        <a href={selectedSub.demoUrl} target="_blank" rel="noreferrer" className="btn-secondary h-9 bg-gray-50 text-xs shadow-none"><Globe size={14} /> Live Demo</a>
                                    )}
                                </div>
                            </div>

                            {breakdown.length > 0 && (
                                <div className="card-elevated overflow-hidden border border-gray-100">
                                    <div className="border-b border-gray-100 bg-gray-50/50 p-4"><span className="text-sm font-bold text-gray-900 uppercase tracking-wider">Submitted Scores</span></div>
                                    <table className="tbl !border-t-0">
                                        <thead><tr><th className="pl-6">Criteria</th><th>Score</th><th>Weight</th><th>Comment</th></tr></thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {breakdown.map((b, i) => (
                                                <tr key={i} className="hover:bg-gray-50 transition-colors">
                                                    <td className="pl-6 font-semibold text-gray-900">{b.criteriaName}</td>
                                                    <td className="font-bold text-indigo-600">{b.value}</td>
                                                    <td className="text-gray-500 font-medium">×{b.weight}</td>
                                                    <td className="text-gray-600 italic text-sm">{b.comment || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <div className="card-elevated p-6 border border-gray-100 bg-gradient-to-r from-white to-gray-50/50">
                                <p className="section-title text-indigo-600 mb-4">Evaluate</p>
                                {msg && <div className={`mb-6 flex items-center justify-between ${msg.type === 'ok' ? 'alert-success' : 'alert-error'}`}>{msg.text} {msg.type === 'ok' && <CheckCircle size={18} />}</div>}

                                <form onSubmit={handleScore} className="grid gap-4 sm:grid-cols-3 items-end">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Criteria ID</label>
                                        <input value={scoreForm.criteriaId} onChange={e => setScoreForm({ ...scoreForm, criteriaId: e.target.value })} className="input-field" placeholder="e.g. innovation" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Score</label>
                                        <input type="number" value={scoreForm.value} onChange={e => setScoreForm({ ...scoreForm, value: e.target.value })} className="input-field" placeholder="0 - 10" required min="0" max="100" step="0.1" />
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Feedback / Notes</label>
                                        <textarea value={scoreForm.comment} onChange={e => setScoreForm({ ...scoreForm, comment: e.target.value })} className="input-field min-h-[80px]" placeholder="Explain your score..." />
                                    </div>
                                    <div className="sm:col-span-3 flex justify-end pt-2 border-t border-gray-100 mt-2">
                                        <button type="submit" disabled={scoring} className="btn-primary h-11 px-8 from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 shadow-indigo-500/25">
                                            {scoring ? <Loader2 size={16} className="animate-spin" /> : 'Submit Score'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center text-gray-400 bg-white/50 rounded-2xl border border-dashed border-gray-200">
                            <ClipboardCheck size={48} className="text-gray-300 mb-4" />
                            <p className="font-medium text-gray-600">Select a submission to evaluate</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
