import { FormEvent, useEffect, useState } from 'react'
import { Plus, Search, Shield, User, Loader2, Globe } from 'lucide-react'
import { getTeam, createTeam, updateTeam, respondToInvitation } from '../api/teams'
import type { Team, TeamMember } from '../types/models'

export default function TeamsPage() {
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchCode, setSearchCode] = useState('')
  const [searchedTeam, setSearchedTeam] = useState<Team | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', repoUrl: '', inviteEmail: '' })
  const [actionLoading, setActionLoading] = useState(false)

  const loadTeam = async () => {
    try {
      setLoading(true); setError(null)
      const res = await getTeam('mock-team-id') // user's mocked team
      setTeam(res ?? null)
    } catch (err: any) {
      if (err.status === 404) setTeam(null)
      else setError(err.message || 'Failed to load team data.')
    } finally { setLoading(false) }
  }

  useEffect(() => { void loadTeam() }, [])

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault()
    if (!searchCode) return
    try {
      setSearchLoading(true)
      const res = await getTeam(searchCode)
      setSearchedTeam(res)
    } catch { setSearchedTeam(null) }
    finally { setSearchLoading(false) }
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    try {
      setActionLoading(true)
      await createTeam({ name: form.name, hackathonId: 'mock' })
      setShowCreate(false)
      await loadTeam()
    } finally { setActionLoading(false) }
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="skeleton h-8 w-48 rounded-md" />
      <div className="skeleton h-32 w-full rounded-2xl" />
      <div className="skeleton h-64 w-full rounded-2xl" />
    </div>
  )

  if (error) return (
    <div className="max-w-4xl mx-auto">
      <div className="alert-error flex flex-col items-center justify-center py-12 px-4 text-center bg-white border border-red-100 rounded-xl shadow-sm">
        <Globe className="text-red-400 mb-3" size={32} />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Systems Offline</h3>
        <p className="text-sm text-gray-500 max-w-sm mb-6">{error}</p>
        <button onClick={() => void loadTeam()} className="btn-primary shadow-red-500/20 from-red-500 to-red-600 hover:from-red-600 hover:to-red-700">Retry Connection</button>
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
          <p className="text-sm text-gray-500">Manage your squad or join a new one.</p>
        </div>
        {!team && !showCreate && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} /> Create Team
          </button>
        )}
      </div>

      {!team ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          {showCreate && (
            <div className="card-elevated p-8 border border-accent-100 bg-gradient-to-b from-white to-gray-50/50 animate-slide-in-left">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-900">Create a new team</h2>
                <button onClick={() => setShowCreate(false)} className="text-sm font-medium text-gray-500 hover:text-gray-900">Cancel</button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Team Name</label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="e.g. Code Ninjas" /></div>
                <button type="submit" disabled={actionLoading} className="btn-primary w-full h-10 mt-2">{actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Create'}</button>
              </form>
            </div>
          )}

          <div className="card p-6 border-transparent hover:border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Search className="text-accent-500" size={18} /> Join a team</h2>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input value={searchCode} onChange={e => setSearchCode(e.target.value)} className="input-field max-w-[200px]" placeholder="Invite code (e.g. ABC12)" />
              <button type="submit" disabled={searchLoading} className="btn-secondary">{searchLoading ? <Loader2 size={16} className="animate-spin" /> : 'Lookup'}</button>
            </form>

            {searchedTeam && (
              <div className="mt-6 rounded-xl border border-accent-200 bg-accent-50 p-4">
                <p className="font-semibold text-gray-900">{searchedTeam.name}</p>
                <p className="text-sm text-gray-600 mb-3">{searchedTeam.members?.length || 1} members</p>
                <button onClick={async () => { await respondToInvitation(searchedTeam.id, true); await loadTeam() }} className="btn-primary w-full">Join this team</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="card-elevated p-6 border border-gray-100 bg-gradient-to-r from-white via-white to-gray-50">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="section-title text-accent-600">Your Team</p>
                <h2 className="text-2xl font-bold text-gray-900">{team.name}</h2>
              </div>
              <form onSubmit={async e => { e.preventDefault(); setActionLoading(true); await updateTeam(team.id, { name: team.name }); await loadTeam(); setActionLoading(false) }} className="flex gap-2">
                <input value={form.repoUrl} onChange={e => setForm({ ...form, repoUrl: e.target.value })} className="input-field min-w-[220px]" placeholder="https://github.com/..." />
                <button type="submit" disabled={actionLoading} className="btn-secondary">{actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Save repo'}</button>
              </form>
            </div>
          </div>

          <div className="card-elevated p-6 bg-white overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900">Members ({team.members?.length || 0})</h3>
            </div>
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <table className="tbl !border-t-0">
                <thead className="bg-gray-50/50"><tr><th className="pl-6 py-3">Name</th><th className="py-3">Role</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {team.members?.map((m: TeamMember) => (
                    <tr key={m.id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="pl-6 font-medium text-gray-900 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-accent-100 text-accent-700 font-bold flex items-center justify-center text-xs">
                          {m.user?.profile?.firstName?.[0] || 'U'}
                        </div>
                        {m.user?.profile?.firstName} {m.user?.profile?.lastName}
                      </td>
                      <td>
                        {m.role === 'LEADER' ? (
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md w-fit"><Shield size={12} /> LEADER</span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md w-fit"><User size={12} /> MEMBER</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
