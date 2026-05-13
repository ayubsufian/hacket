import { FormEvent, useEffect, useState } from 'react'
import { CheckCircle2, FileText, Globe, Loader2, Rocket, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getSubmission, submitSubmission, upsertSubmission } from '../api/submissions'
import { getTeam } from '../api/teams'
import type { Submission, Team } from '../types/models'
import { clearActiveWorkspace, getActiveTeamId } from '../utils/appState'

export default function SubmissionsPage() {
    const [team, setTeam] = useState<Team | null>(null)
    const [sub, setSub] = useState<Submission | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [form, setForm] = useState({ title: '', description: '', githubUrl: '', demoUrl: '' })
    const [actionLoading, setActionLoading] = useState(false)
    const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

    const loadSub = async () => {
        try {
            setLoading(true)
            setError(null)

            const teamId = getActiveTeamId()
            if (!teamId) {
                setTeam(null)
                setSub(null)
                return
            }

            const activeTeam = await getTeam(teamId)
            setTeam(activeTeam)

            if (!activeTeam.submission?.id) {
                setSub(null)
                setForm({ title: '', description: '', githubUrl: '', demoUrl: '' })
                return
            }

            const submission = await getSubmission(activeTeam.submission.id)
            setSub(submission)
            setForm({
                title: submission.title,
                description: submission.description || '',
                githubUrl: submission.githubUrl || '',
                demoUrl: submission.demoUrl || '',
            })
        } catch (err: any) {
            if (err.status === 404) {
                clearActiveWorkspace()
                setTeam(null)
                setSub(null)
            } else {
                setError(err.message || 'Failed to load submission')
            }
        } finally { setLoading(false) }
    }

    useEffect(() => { void loadSub() }, [])

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!team) {
            setMsg({ type: 'err', text: 'Connect to a team workspace before creating a submission.' })
            return
        }

        try {
            setActionLoading(true)
            setMsg(null)
            await upsertSubmission({ teamId: team.id, ...form, fileUrls: [] })
            setMsg({ type: 'ok', text: 'Saved successfully.' })
            await loadSub()
        } catch (err) {
            setMsg({ type: 'err', text: err instanceof Error ? err.message : 'Failed to save' })
        } finally { setActionLoading(false) }
    }

    const handleFinalize = async () => {
        if (!sub || !confirm('Ready to submit for judging? You cannot edit after finalizing.')) return
        try {
            setActionLoading(true)
            setMsg(null)
            await submitSubmission(sub.id)
            setMsg({ type: 'ok', text: 'Project submitted for judging!' })
            await loadSub()
        } catch (err) {
            setMsg({ type: 'err', text: err instanceof Error ? err.message : 'Failed to finalize' })
        } finally { setActionLoading(false) }
    }

    if (loading) return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="skeleton h-8 w-48 rounded-md" />
            <div className="skeleton h-[400px] w-full rounded-2xl" />
        </div>
    )

    if (error) return (
        <div className="max-w-3xl mx-auto">
            <div className="alert-error flex flex-col items-center justify-center py-12 px-4 text-center bg-white border border-red-100 rounded-xl shadow-sm">
                <Globe className="text-red-400 mb-3" size={32} />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Systems Offline</h3>
                <p className="text-sm text-gray-500 max-w-sm mb-6">{error}</p>
                <button onClick={() => void loadSub()} className="btn-primary shadow-red-500/20 from-red-500 to-red-600 hover:from-red-600 hover:to-red-700">Retry Connection</button>
            </div>
        </div>
    )

    if (!team) return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            <div className="card-elevated border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,247,251,0.94))] p-6 sm:p-8">
                <p className="section-title text-accent-600">Submission workspace</p>
                <h1 className="text-3xl font-bold tracking-tight text-navy-900 flex items-center gap-2"><Rocket className="text-accent-500" size={24} /> Submissions</h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">Draft, update, and finalize your hackathon project submission from the currently active team workspace.</p>
            </div>

            <div className="card-elevated border border-gray-100 bg-white p-8 text-center">
                <Users size={36} className="mx-auto mb-4 text-accent-500" />
                <h2 className="text-lg font-semibold text-gray-900">No active team workspace</h2>
                <p className="mt-2 text-sm text-gray-500">
                    Create or connect to a team first. Your submission is tied to your active team workspace.
                </p>
                <Link to="/teams" className="btn-primary mt-6 inline-flex">Open Teams</Link>
            </div>
        </div>
    )

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            <div className="card-elevated border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,247,251,0.94))] p-6 sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="section-title text-accent-600">Submission workspace</p>
                        <h1 className="text-3xl font-bold tracking-tight text-navy-900 flex items-center gap-2"><Rocket className="text-accent-500" size={24} /> Project delivery</h1>
                        <p className="mt-2 text-sm leading-relaxed text-slate-500">Prepare and finalize the current submission for <span className="font-medium text-slate-700">{team.name}</span>.</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                        <span className="badge badge-gray">Team ID: {team.id}</span>
                        <span className={`badge ${sub?.status === 'SUBMITTED' ? 'badge-blue' : sub?.status === 'DRAFT' ? 'badge-yellow' : 'badge-gray'}`}>{sub?.status || 'NOT STARTED'}</span>
                    </div>
                </div>
            </div>

            <div className="card-elevated border border-gray-100 overflow-hidden bg-white">
                <div className="bg-gray-50/50 border-b border-gray-100 p-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-1">Project Status</h2>
                        <span className={`badge ${sub?.status === 'SUBMITTED' ? 'badge-blue' : sub?.status === 'DRAFT' ? 'badge-yellow' : 'badge-gray'}`}>
                            {sub?.status || 'NOT STARTED'}
                        </span>
                    </div>
                    {sub && sub.status === 'DRAFT' && (
                        <button onClick={() => void handleFinalize()} disabled={actionLoading} className="btn-primary from-blue-500 to-blue-600 shadow-blue-500/20 hover:from-blue-600 hover:to-blue-700">
                            <CheckCircle2 size={16} /> Finalize Submission
                        </button>
                    )}
                </div>

                <div className="p-6 sm:p-8">
                    {msg && <div className={`mb-6 ${msg.type === 'ok' ? 'alert-success' : 'alert-error'}`}>{msg.text}</div>}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Project Title</label>
                            <input required disabled={sub?.status === 'SUBMITTED'} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input-field bg-gray-50/50 focus:bg-white" placeholder="Awesome Hack" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea required disabled={sub?.status === 'SUBMITTED'} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field min-h-[120px] bg-gray-50/50 focus:bg-white" placeholder="What does it do? How did you build it?" />
                        </div>
                        <div className="grid gap-6 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5"><FileText size={14} className="text-gray-400" /> Repo URL</label>
                                <input type="url" disabled={sub?.status === 'SUBMITTED'} value={form.githubUrl} onChange={e => setForm({ ...form, githubUrl: e.target.value })} className="input-field bg-gray-50/50 focus:bg-white" placeholder="https://github.com/..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5"><Globe size={14} className="text-gray-400" /> Demo URL</label>
                                <input type="url" disabled={sub?.status === 'SUBMITTED'} value={form.demoUrl} onChange={e => setForm({ ...form, demoUrl: e.target.value })} className="input-field bg-gray-50/50 focus:bg-white" placeholder="https://..." />
                            </div>
                        </div>

                        {(!sub || sub.status === 'DRAFT') && (
                            <div className="pt-4 border-t border-gray-100 flex justify-end">
                                <button type="submit" disabled={actionLoading} className="btn-secondary h-11 w-full sm:w-auto">
                                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Save Draft'}
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    )
}
