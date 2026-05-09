import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Calendar, Globe, MapPin, Users, Loader2, Target, MonitorPlay, ChevronLeft } from 'lucide-react'
import { getEvent, registerForEvent } from '../api/events'
import { useAuth } from '../contexts/AuthContext'
import type { Hackathon } from '../types/models'
import { setActiveWorkspace } from '../utils/appState'

export default function EventDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { isAuthenticated, user } = useAuth()
  const [event, setEvent] = useState<Hackathon | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [registering, setRegistering] = useState(false)
  const [regMsg, setRegMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    if (!id) return
    let active = true
    setLoading(true)
    setError(null)

    getEvent(id)
      .then(r => { if (active) setEvent(r) })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Failed to load event') })
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [id])

  const handleRegister = async () => {
    if (!id) return
    try {
      setRegistering(true)
      setRegMsg(null)
      const team = await registerForEvent(id)
      setActiveWorkspace({ teamId: team.id, hackathonId: team.hackathonId })
      setRegMsg({ type: 'ok', text: 'You have successfully registered for this event and your workspace is now ready.' })
      // Auto-refresh to get updated state if needed, though we don't have a distinct "isRegistered" boolean on the payload yet.
    } catch (err) {
      setRegMsg({ type: 'err', text: err instanceof Error ? err.message : 'Registration failed' })
    } finally {
      setRegistering(false)
    }
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="skeleton h-8 w-24 rounded-md" />
      <div className="skeleton h-64 w-full rounded-2xl" />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 skeleton h-96 rounded-2xl" />
        <div className="skeleton h-72 rounded-2xl" />
      </div>
    </div>
  )

  if (error || !event) return (
    <div className="alert-error mx-auto max-w-2xl text-center py-12 mt-12 bg-white shadow-sm flex flex-col items-center">
      <Globe className="text-red-400 mb-3" size={32} />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Event Not Found</h3>
      <p>{error || 'The event you are looking for does not exist.'}</p>
      <Link to="/events" className="mt-6 btn-primary from-gray-700 to-gray-800 shadow-gray-900/20 hover:from-gray-800 hover:to-gray-900">Back to Events</Link>
    </div>
  )

  const isRegOpen = event.status === 'REGISTRATION_OPEN'

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-up">
      <Link to="/events" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
        <ChevronLeft size={16} /> Back to discover
      </Link>

      <div className="card-elevated overflow-hidden border border-white/70">
        <div className="relative h-36 bg-[radial-gradient(circle_at_top_left,rgba(123,152,255,0.35),transparent_22%),linear-gradient(135deg,#1d2351_0%,#131b2e_45%,#0b1020_100%)]">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        </div>
        <div className="px-6 py-8 sm:px-10 relative">
          <div className="absolute -top-12 left-6 sm:left-10 flex h-24 w-24 items-center justify-center rounded-[1.7rem] border-4 border-surface bg-white p-2 shadow-xl">
            <Target size={40} className="text-accent-500" />
          </div>

          <div className="mt-10 sm:mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="section-title text-accent-600">Event workspace</p>
              <div className="flex items-center gap-3 mb-2">
                <span className={`badge ${isRegOpen ? 'badge-green' : event.status === 'IN_PROGRESS' ? 'badge-blue' : 'badge-gray'}`}>
                  {event.status.replace(/_/g, ' ')}
                </span>
                {event.isVirtual ? (
                  <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-teal-600"><MonitorPlay size={14} /> Virtual</span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-indigo-600"><MapPin size={14} /> In-person</span>
                )}
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900">{event.title}</h1>
            </div>

            {!isAuthenticated ? (
              <Link to="/signup" className="btn-primary flex-shrink-0">Sign up to register</Link>
            ) : user?.role === 'PARTICIPANT' ? (
              <button
                onClick={() => void handleRegister()}
                disabled={!isRegOpen || registering}
                className="btn-primary flex-shrink-0"
              >
                {registering ? <><Loader2 size={16} className="animate-spin" /> Processing...</> :
                  !isRegOpen ? 'Registration closed' : 'Register now'}
              </button>
            ) : null}
          </div>

          {regMsg && (
            <div className={`mt-6 ${regMsg.type === 'ok' ? 'alert-success' : 'alert-error'}`}>
              {regMsg.text}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2 text-xs">
            <span className="badge badge-gray">Organizer: {event.organizerId || 'Assigned in backend'}</span>
            <span className="badge badge-blue">Registration creates your active team workspace</span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6 sm:p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 pb-4 border-b border-gray-100">About this hackathon</h2>
            <div className="prose prose-sm sm:prose-base text-gray-600 max-w-none">
              <p className="whitespace-pre-wrap leading-relaxed">{event.description}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6 bg-gray-50/50">
            <h3 className="section-title text-gray-500">Key Details</h3>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <div className="mt-0.5"><Calendar size={18} className="text-gray-400" /></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Event Start</p>
                  <p className="text-sm text-gray-500">{new Date(event.eventStart).toLocaleString()}</p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="mt-0.5"><MapPin size={18} className="text-gray-400" /></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Location</p>
                  <p className="text-sm text-gray-500">{event.region || 'Online Anywhere'}</p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="mt-0.5"><Users size={18} className="text-gray-400" /></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Team Size</p>
                  <p className="text-sm text-gray-500">{event.minTeamSize} to {event.maxTeamSize} members</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="card p-6 bg-gray-50/50">
            <h3 className="section-title text-gray-500">Deadlines</h3>
            <ul className="space-y-4">
              <li className="flex justify-between items-center text-sm border-b border-gray-200 pb-2">
                <span className="text-gray-600">Registration Ends</span>
                <span className="font-medium text-gray-900">{new Date(event.registrationEnd).toLocaleDateString()}</span>
              </li>
              <li className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Submissions Due</span>
                <span className="font-medium text-gray-900">{new Date(event.submissionDeadline).toLocaleDateString()}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
