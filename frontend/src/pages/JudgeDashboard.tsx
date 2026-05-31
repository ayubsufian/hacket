import { FormEvent, useEffect, useState, Component, type ReactNode } from 'react'
import { getCriteria, getScoreBreakdown, submitScore, type ScoreBreakdown } from '../api/judging'
import { listSubmissionsByHackathon } from '../api/submissions'
import { listEvents } from '../api/events'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Loader2, Globe, FileText, CheckCircle, ChevronRight, ClipboardCheck, User, Star, AlertTriangle } from 'lucide-react'
import type { Hackathon, JudgingCriteria, Submission } from '../types/models'

// Error boundary to catch render errors
class JudgeErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
    constructor(props: { children: ReactNode }) {
        super(props)
        this.state = { hasError: false, error: null }
    }
    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error }
    }
    render() {
        if (this.state.hasError && this.state.error) {
            return (
                <div className="max-w-5xl mx-auto mt-20 p-8 bg-red-50 border border-red-200 rounded-xl">
                    <h2 className="text-xl font-bold text-red-700">Judge Dashboard Error</h2>
                    <p className="mt-2 text-red-600">{this.state.error.message}</p>
                    <pre className="mt-4 text-xs bg-white p-4 rounded overflow-auto max-h-96">{this.state.error.stack}</pre>
                    <button onClick={() => window.location.reload()} className="btn-primary mt-4">Reload</button>
                </div>
            )
        }
        return this.props.children
    }
}

function JudgeDashboardInner() {
    const { user, isAuthenticated } = useAuth()
    const [events, setEvents] = useState<Hackathon[]>([])
    const [selectedEvent, setSelectedEvent] = useState('')
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [selectedSub, setSelectedSub] = useState<Submission | null>(null)
    const [breakdown, setBreakdown] = useState<ScoreBreakdown[]>([])
    const [criteria, setCriteria] = useState<JudgingCriteria[]>([])

    const [loading, setLoading] = useState(true)
    const [loadingSubs, setLoadingSubs] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [scoreForm, setScoreForm] = useState({ criteriaId: '', value: '', comment: '' })
    const [scoring, setScoring] = useState(false)
    const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

    const isSoloDev = user?.role === 'ADMIN'

    useEffect(() => {
        let active = true
        listEvents({ limit: 50 })
            .then(r => {
                if (!active) return
                setEvents(r.data)
                if (r.data?.length > 0) setSelectedEvent(r.data[0].id)
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
        setBreakdown([])
        setCriteria([])
        setLoadingSubs(true)
        Promise.all([
            listSubmissionsByHackathon(selectedEvent).catch(() => ({ data: [] as Submission[] })),
            getCriteria(selectedEvent).catch(() => ({ data: [] as JudgingCriteria[] })),
        ]).then(([subs, critsRes]) => {
            if (!active) return
            setSubmissions(subs.data ?? [])
            // Normalize criteria - handle both array and {data: array} responses
            const critsArray = Array.isArray(critsRes) ? critsRes : (critsRes?.data ?? [])
            setCriteria(critsArray)
            if (critsArray.length > 0) setScoreForm(f => ({ ...f, criteriaId: critsArray[0].id }))
        }).finally(() => { if (active) setLoadingSubs(false) })
        return () => { active = false }
    }, [selectedEvent])

    const selectSub = async (sub: Submission) => {
        setSelectedSub(sub)
        setMsg(null)
        try { const d = await getScoreBreakdown(sub.id); setBreakdown(d) } catch { setBreakdown([]) }
    }

    const handleScore = async (e: FormEvent) => {
        e.preventDefault()
        if (!selectedSub || !scoreForm.criteriaId) return
        try {
            setScoring(true); setMsg(null)
            await submitScore({
                submissionId: selectedSub.id,
                criteriaId: scoreForm.criteriaId,
                value: Number(scoreForm.value),
                comment: scoreForm.comment || undefined,
            })
            setMsg({ type: 'ok', text: 'Score submitted successfully.' })
            const d = await getScoreBreakdown(selectedSub.id)
            setBreakdown(d)
            setScoreForm(f => ({ ...f, value: '', comment: '' }))
        } catch (err) {
            setMsg({ type: 'err', text: err instanceof Error ? err.message : 'Failed to submit score.' })
        } finally { setScoring(false) }
    }

    const selectedCriteria = criteria?.find(c => c.id === scoreForm.criteriaId)
    const scoredCriteriaIds = new Set(breakdown?.map(b => b.criteriaId) ?? [])
    const allScored = criteria?.length > 0 && criteria?.every(c => scoredCriteriaIds.has(c.id))

    if (!isAuthenticated || (user?.role !== 'JUDGE' && user?.role !== 'MENTOR' && user?.role !== 'ADMIN')) return (
        <div className="py-20 text-center">
            <h1 className="text-lg font-semibold text-gray-900">Judging</h1>
            <p className="mt-1 text-sm text-gray-500">Judges, mentors, and admins only.</p>
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
            {/* Header */}
            <div className="card-elevated flex flex-col gap-4 border border-white/70 bg-white/92 p-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="section-title text-accent-600">Judging workspace</p>
                    <h1 className="text-2xl font-bold text-navy-900 dark:text-white flex items-center gap-2">
                        <ClipboardCheck className="text-indigo-500" size={24} /> Evaluation panel
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Review submissions, inspect score breakdowns, and submit evaluations per criteria.</p>
                </div>
                <div className="flex flex-col gap-2 items-end">
                    {isSoloDev && (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                            <AlertTriangle size={12} /> Admin override — all submissions visible
                        </span>
                    )}
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                            <User size={13} /> {user?.role}
                        </span>
                        <select value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)} className="input-field !w-auto min-w-[240px] shadow-sm">
                            {events?.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Criteria pills */}
            {criteria?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {criteria?.map(c => (
                        <span key={c.id} className="flex items-center gap-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full px-3 py-1">
                            <Star size={11} /> {c.name}
                            <span className="text-indigo-400 font-normal">×{c.weight} / {c.maxScore}pts</span>
                        </span>
                    ))}
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Left: submission list */}
                <div className="card-elevated flex flex-col h-[calc(100vh-260px)] border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 p-4">
                        <span className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Submissions</span>
                        <span className="badge badge-gray">{submissions?.length ?? 0}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                        {loading || loadingSubs
                            ? <div className="p-8 text-center text-gray-400"><Loader2 className="animate-spin mx-auto mb-2" /></div>
                            : submissions?.length === 0
                                ? <div className="p-8 text-center text-sm text-gray-500">No submissions available for judging yet.</div>
                                : submissions?.map(sub => {
                                    const isSelected = selectedSub?.id === sub.id
                                    return (
                                        <button key={sub.id} type="button" onClick={() => void selectSub(sub)}
                                            className={`w-full group px-5 py-4 flex items-center justify-between text-left transition-all ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/30 border-l-4 border-l-indigo-500' : 'hover:bg-gray-50 dark:hover:bg-slate-800 border-l-4 border-l-transparent'}`}>
                                            <div className="min-w-0">
                                                <p className={`font-semibold line-clamp-1 ${isSelected ? 'text-indigo-900 dark:text-indigo-300' : 'text-gray-900 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`}>{sub.title}</p>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <span className={`badge ${sub.status === 'SUBMITTED' ? 'badge-blue' : sub.status === 'SCORED' ? 'badge-green' : 'badge-gray'}`}>{sub.status}</span>
                                                    {sub.team?.name && <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{sub.team.name}</span>}
                                                </div>
                                            </div>
                                            <ChevronRight size={18} className={`shrink-0 ml-2 ${isSelected ? 'text-indigo-500' : 'text-gray-300 dark:text-gray-600'}`} />
                                        </button>
                                    )
                                })
                        }
                    </div>
                </div>

                {/* Right: scoring panel */}
                <div className="lg:col-span-2 space-y-6 h-[calc(100vh-260px)] overflow-y-auto pr-2">
                    {selectedSub ? (
                        <>
                            {/* Submission detail */}
                            <div className="card-elevated p-6 border border-gray-100 dark:border-gray-700">
                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">{selectedSub.title}</h2>
                                        {selectedSub.team?.name && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                                                <User size={13} /> {selectedSub.team.name}
                                            </p>
                                        )}
                                        {selectedSub.description && (
                                            <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300 whitespace-pre-wrap line-clamp-4">{selectedSub.description}</p>
                                        )}
                                    </div>
                                    {allScored && (
                                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
                                            <CheckCircle size={13} /> All criteria scored
                                        </span>
                                    )}
                                </div>
                                <div className="mt-4 flex flex-wrap gap-3 pt-4 border-t border-gray-100">
                                    {selectedSub.githubUrl && (
                                        <a href={selectedSub.githubUrl} target="_blank" rel="noreferrer"
                                            className="btn-secondary h-9 bg-gray-50 text-xs shadow-none">
                                            <FileText size={14} /> Repository
                                        </a>
                                    )}
                                    {selectedSub.demoUrl && (
                                        <a href={selectedSub.demoUrl} target="_blank" rel="noreferrer"
                                            className="btn-secondary h-9 bg-gray-50 text-xs shadow-none">
                                            <Globe size={14} /> Live Demo
                                        </a>
                                    )}
                                    {selectedSub.videoUrl && (
                                        <a href={selectedSub.videoUrl} target="_blank" rel="noreferrer"
                                            className="btn-secondary h-9 bg-gray-50 text-xs shadow-none">
                                            <Globe size={14} /> Video
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Score breakdown */}
                            {breakdown?.length > 0 && (
                                <div className="card-elevated overflow-hidden border border-gray-100 dark:border-gray-700">
                                    <div className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 p-4">
                                        <span className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">My Scores</span>
                                    </div>
                                    <div className="divide-y divide-gray-100">
                                        {breakdown?.map((b, i) => (
                                            <div key={i} className="px-5 py-3">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-200">{b.criteriaName}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-indigo-600">{b.value}</span>
                                                        <span className="text-xs text-gray-400 dark:text-gray-500">/ {criteria?.find(c => c.id === b.criteriaId)?.maxScore ?? 10} pts</span>
                                                        <span className="text-xs text-gray-400 dark:text-gray-500">×{b.weight}</span>
                                                    </div>
                                                </div>
                                                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                                                    <div
                                                        className="bg-indigo-500 h-1.5 rounded-full transition-all"
                                                        style={{ width: `${(b.value / (criteria?.find(c => c.id === b.criteriaId)?.maxScore ?? 10)) * 100}%` }}
                                                    />
                                                </div>
                                                {b.comment && <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 italic">{b.comment}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Score form */}
                            <div className="card-elevated p-6 border border-gray-100 dark:border-gray-700 bg-gradient-to-r from-white to-gray-50/50 dark:from-slate-800 dark:to-slate-800/50">
                                <p className="section-title text-indigo-600 mb-4">Evaluate</p>
                                {msg && (
                                    <div className={`mb-4 flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium ${msg.type === 'ok' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                                        {msg.text}
                                        {msg.type === 'ok' && <CheckCircle size={16} />}
                                    </div>
                                )}
                                <form onSubmit={handleScore} className="space-y-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Criteria</label>
                                            {criteria?.length > 0 ? (
                                                <select
                                                    value={scoreForm.criteriaId}
                                                    onChange={e => setScoreForm(f => ({ ...f, criteriaId: e.target.value }))}
                                                    className="input-field"
                                                    required
                                                >
                                                    {criteria?.map(c => (
                                                        <option key={c.id} value={c.id}>
                                                            {c.name}{scoredCriteriaIds.has(c.id) ? ' ✓' : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input value={scoreForm.criteriaId} onChange={e => setScoreForm(f => ({ ...f, criteriaId: e.target.value }))} className="input-field" placeholder="Criteria ID" required />
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Score
                                                {selectedCriteria && <span className="text-gray-400 font-normal ml-1">(0 – {selectedCriteria.maxScore})</span>}
                                            </label>
                                            <input
                                                type="number"
                                                value={scoreForm.value}
                                                onChange={e => setScoreForm(f => ({ ...f, value: e.target.value }))}
                                                className="input-field"
                                                placeholder={`0 – ${selectedCriteria?.maxScore ?? 10}`}
                                                required
                                                min="0"
                                                max={selectedCriteria?.maxScore ?? 10}
                                                step="0.1"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Feedback / Notes</label>
                                        <textarea
                                            value={scoreForm.comment}
                                            onChange={e => setScoreForm(f => ({ ...f, comment: e.target.value }))}
                                            className="input-field min-h-[80px]"
                                            placeholder="Explain your reasoning..."
                                        />
                                    </div>
                                    <div className="flex justify-end pt-2 border-t border-gray-100">
                                        <button type="submit" disabled={scoring || !scoreForm.criteriaId}
                                            className="btn-primary h-11 px-8 from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 shadow-indigo-500/25 disabled:opacity-50">
                                            {scoring ? <Loader2 size={16} className="animate-spin" /> : 'Submit Score'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center text-gray-400 bg-white/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                            <ClipboardCheck size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
                            <p className="font-medium text-gray-600 dark:text-gray-300">Select a submission to evaluate</p>
                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Criteria will load automatically</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// Export with error boundary wrapper
export default function JudgeDashboard() {
    return (
        <JudgeErrorBoundary>
            <JudgeDashboardInner />
        </JudgeErrorBoundary>
    )
}
