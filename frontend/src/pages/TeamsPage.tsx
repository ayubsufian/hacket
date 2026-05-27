import { FormEvent, useEffect, useState } from 'react'
import { Plus, Search, Shield, User, Loader2, Globe, Mail, X } from 'lucide-react'
import { getTeam, createTeam, respondToInvitation, leaveTeam, getMyInvitations } from '../api/teams'
import { listEvents } from '../api/events'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import type { Team, TeamMember, TeamInvitation, Hackathon } from '../types/models'

export default function TeamsPage() {
  const { user } = useAuth()
  const { success, error: showError, info } = useToast()
  
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [events, setEvents] = useState<Hackathon[]>([])
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  
  const [searchCode, setSearchCode] = useState('')
  const [searchedTeam, setSearchedTeam] = useState<Team | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  
  const [showCreate, setShowCreate] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [form, setForm] = useState({ 
    name: '', 
    description: '', 
    neededSkills: '',
    inviteEmail: '',
    inviteMessage: ''
  })
  const [actionLoading, setActionLoading] = useState(false)
  
  const [invitations, setInvitations] = useState<TeamInvitation[]>([])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Load events for team creation
      const eventsRes = await listEvents({ limit: 10 })
      setEvents(eventsRes.data)
      if (eventsRes.data.length > 0 && !selectedEvent) {
        setSelectedEvent(eventsRes.data[0].id)
      }
      
      // Load user's invitations
      const invitationsRes = await getMyInvitations()
      setInvitations(invitationsRes)
      
    } catch (err: any) {
      setError(err.message || 'Failed to load team data.')
    } finally { 
      setLoading(false) 
    }
  }

  useEffect(() => { void loadData() }, [])

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault()
    if (!searchCode) return
    try {
      setSearchLoading(true)
      const res = await getTeam(searchCode)
      setSearchedTeam(res)
    } catch { 
      setSearchedTeam(null) 
    }
    finally { 
      setSearchLoading(false) 
    }
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedEvent) {
      showError('Please select a hackathon event')
      return
    }
    
    try {
      setActionLoading(true)
      await createTeam({ 
        name: form.name, 
        hackathonId: selectedEvent,
        description: form.description,
        neededSkills: form.neededSkills ? form.neededSkills.split(',').map(s => s.trim()) : []
      })
      setShowCreate(false)
      setForm({ name: '', description: '', neededSkills: '', inviteEmail: '', inviteMessage: '' })
      success('Team created successfully!')
      await loadData()
    } catch (err: any) {
      showError(err.message || 'Failed to create team')
    } finally {
      setActionLoading(false)
    }
  }

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault()
    if (!team || !form.inviteEmail) return

    try {
      setActionLoading(true)
      // TODO: Backend needs a user lookup endpoint (e.g., GET /users/lookup?email=xxx)
      // to convert email to receiverId (UUID) before calling sendTeamInvitation.
      // Current backend expects: POST /teams/:id/invite { receiverId: string(UUID), message?: string }
      info('Team invitation requires user lookup by email. Feature pending backend endpoint.')
      setShowInvite(false)
      setForm({ ...form, inviteEmail: '', inviteMessage: '' })
    } catch (err: any) {
      showError(err.message || 'Failed to send invitation')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRespondToInvitation = async (invitationId: string, accept: boolean) => {
    try {
      await respondToInvitation(invitationId, accept)
      success(accept ? 'Invitation accepted!' : 'Invitation declined')
      setInvitations(invitations.filter(inv => inv.id !== invitationId))
      if (accept) {
        await loadData() // Reload to get team data
      }
    } catch (err: any) {
      showError(err.message || 'Failed to respond to invitation')
    }
  }

  const handleLeaveTeam = async () => {
    if (!team || !confirm('Are you sure you want to leave this team?')) return
    
    try {
      await leaveTeam(team.id)
      success('Left team successfully')
      setTeam(null)
      await loadData()
    } catch (err: any) {
      showError(err.message || 'Failed to leave team')
    }
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
        <button onClick={() => void loadData()} className="btn-primary shadow-red-500/20 from-red-500 to-red-600 hover:from-red-600 hover:to-red-700">Retry Connection</button>
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

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="card-elevated p-6 border border-blue-100 bg-blue-50">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Mail className="text-blue-500" size={18} />
            Pending Invitations ({invitations.length})
          </h3>
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
                <div>
                  <p className="font-medium text-gray-900">Team Invitation</p>
                  <p className="text-sm text-gray-600">Expires: {new Date(invitation.expiresAt).toLocaleDateString()}</p>
                  {invitation.message && <p className="text-sm text-gray-500 mt-1">"{invitation.message}"</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespondToInvitation(invitation.id, false)}
                    className="btn-secondary text-sm px-3 py-1"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleRespondToInvitation(invitation.id, true)}
                    className="btn-primary text-sm px-3 py-1"
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!team ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          {showCreate && (
            <div className="card-elevated p-8 border border-accent-100 bg-gradient-to-b from-white to-gray-50/50 animate-slide-in-left">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-900">Create a new team</h2>
                <button onClick={() => setShowCreate(false)} className="text-sm font-medium text-gray-500 hover:text-gray-900">Cancel</button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hackathon Event</label>
                  <select 
                    value={selectedEvent} 
                    onChange={e => setSelectedEvent(e.target.value)}
                    className="input-field"
                    required
                  >
                    <option value="">Select an event</option>
                    {events.map(event => (
                      <option key={event.id} value={event.id}>{event.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
                  <input 
                    required 
                    value={form.name} 
                    onChange={e => setForm({ ...form, name: e.target.value })} 
                    className="input-field" 
                    placeholder="e.g. Code Ninjas" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea 
                    value={form.description} 
                    onChange={e => setForm({ ...form, description: e.target.value })} 
                    className="input-field" 
                    placeholder="Describe your team..." 
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Needed Skills (comma-separated)</label>
                  <input 
                    value={form.neededSkills} 
                    onChange={e => setForm({ ...form, neededSkills: e.target.value })} 
                    className="input-field" 
                    placeholder="e.g. React, Node.js, UI/UX" 
                  />
                </div>
                <button type="submit" disabled={actionLoading} className="btn-primary w-full h-10 mt-2">
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Create Team'}
                </button>
              </form>
            </div>
          )}

          <div className="card p-6 border-transparent hover:border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Search className="text-accent-500" size={18} /> Join a team
            </h2>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input 
                value={searchCode} 
                onChange={e => setSearchCode(e.target.value)} 
                className="input-field max-w-[200px]" 
                placeholder="Team ID or code" 
              />
              <button type="submit" disabled={searchLoading} className="btn-secondary">
                {searchLoading ? <Loader2 size={16} className="animate-spin" /> : 'Lookup'}
              </button>
            </form>

            {searchedTeam && (
              <div className="mt-6 rounded-xl border border-accent-200 bg-accent-50 p-4">
                <p className="font-semibold text-gray-900">{searchedTeam.name}</p>
                <p className="text-sm text-gray-600 mb-3">{searchedTeam.members?.length || 1} members</p>
                <button 
                  onClick={async () => { 
                    await respondToInvitation(searchedTeam.id, true); 
                    await loadData() 
                  }} 
                  className="btn-primary w-full"
                >
                  Join this team
                </button>
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
                {team.description && <p className="text-sm text-gray-600 mt-1">{team.description}</p>}
              </div>
              <div className="flex gap-2">
                {team.members?.find(m => m.userId === user?.id)?.role === 'leader' && (
                  <button 
                    onClick={() => setShowInvite(true)}
                    className="btn-secondary"
                  >
                    <Mail size={16} /> Invite
                  </button>
                )}
                <button 
                  onClick={handleLeaveTeam}
                  className="btn-secondary text-red-600 hover:text-red-700"
                >
                  Leave Team
                </button>
              </div>
            </div>
          </div>

          {/* Invite Modal */}
          {showInvite && (
            <div className="card-elevated p-6 border border-blue-100 bg-blue-50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">Invite Team Member</h3>
                <button onClick={() => setShowInvite(false)} className="text-gray-500 hover:text-gray-900">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input 
                    type="email"
                    value={form.inviteEmail} 
                    onChange={e => setForm({ ...form, inviteEmail: e.target.value })} 
                    className="input-field" 
                    placeholder="member@example.com" 
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message (optional)</label>
                  <textarea 
                    value={form.inviteMessage} 
                    onChange={e => setForm({ ...form, inviteMessage: e.target.value })} 
                    className="input-field" 
                    placeholder="Join our team for the hackathon!" 
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowInvite(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={actionLoading} className="btn-primary">
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Send Invitation'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="card-elevated p-6 bg-white overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900">Members ({team.members?.length || 0})</h3>
              {team.neededSkills && team.neededSkills.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {team.neededSkills.map((skill, index) => (
                    <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <table className="tbl !border-t-0">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="pl-6 py-3">Name</th>
                    <th className="py-3">Role</th>
                    <th className="py-3">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {team.members?.map((member: TeamMember) => (
                    <tr key={member.id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="pl-6 font-medium text-gray-900 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-accent-100 text-accent-700 font-bold flex items-center justify-center text-xs">
                          {member.user?.profile?.firstName?.[0] || 'U'}
                        </div>
                        {member.user?.profile?.firstName} {member.user?.profile?.lastName}
                      </td>
                      <td>
                        {member.role === 'leader' ? (
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md w-fit">
                            <Shield size={12} /> LEADER
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md w-fit">
                            <User size={12} /> MEMBER
                          </span>
                        )}
                      </td>
                      <td className="text-sm text-gray-500">
                        {new Date(member.joinedAt).toLocaleDateString()}
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
