import { useEffect, useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { XCircle, Mail, ShieldCheck, UserPlus, CheckCircle, Loader2, LogIn, Moon, Sun } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import type { StaffRole } from '../types/models'

interface InvitationData {
  e: string  // eventId
  em: string // email
  r: StaffRole // role
  exp: number // expiration timestamp
}

const ROLE_LABELS: Record<string, string> = {
  JUDGE: 'Judge',
  MENTOR: 'Mentor',
  TECHNICAL_LEAD: 'Technical Lead',
  LOGISTICS: 'Logistics',
  COMMUNICATIONS: 'Communications',
  FINANCE: 'Finance',
  CO_ORGANIZER: 'Co-Organizer',
}

export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { resolvedTheme, toggleTheme } = useTheme()

  // Get encoded data from URL (new format) or token (old format)
  const encodedData = searchParams.get('d') ?? ''
  const token = searchParams.get('token') ?? ''

  const [status, setStatus] = useState<'idle' | 'accepting' | 'accepted' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null)

  // Parse invitation data from URL
  useEffect(() => {
    if (encodedData) {
      try {
        const decoded = atob(encodedData)
        const parsed = JSON.parse(decoded) as InvitationData
        setInvitationData(parsed)
      } catch (e) {
        setErrorMsg('Invalid invitation link. The data is corrupted.')
        setStatus('error')
      }
    } else if (token) {
      // Legacy format - show error since backend rate limit blocks this
      setErrorMsg('This invitation link format is no longer supported due to rate limiting. Please ask the organizer to generate a new invitation link.')
      setStatus('error')
    }
  }, [encodedData, token])

  // Validate expiration
  const isExpired = invitationData ? Date.now() > invitationData.exp : false
  const emailMatches = invitationData && user ? user.email.toLowerCase() === invitationData.em.toLowerCase() : false

  const handleAccept = async () => {
    if (!invitationData) return
    if (!isAuthenticated) {
      setErrorMsg('Please log in first to accept the invitation.')
      return
    }
    if (!emailMatches) {
      setErrorMsg(`This invitation was sent to ${invitationData.em}. Please log in with that email address.`)
      return
    }

    try {
      setStatus('accepting')
      setErrorMsg('')
      
      // FRONTEND-ONLY: Store accepted invitation in localStorage
      // This allows the user to be treated as staff in this browser
      // Note: Backend is not notified due to rate limiting on invitation APIs
      const acceptedKey = `staff_accepted_${user?.id}_${invitationData.e}`
      localStorage.setItem(acceptedKey, JSON.stringify({
        eventId: invitationData.e,
        email: invitationData.em,
        role: invitationData.r,
        acceptedAt: new Date().toISOString(),
      }))
      
      setStatus('accepted')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to accept invitation.')
      setStatus('error')
    }
  }

  const hasData = Boolean(invitationData)
  const roleLabel = invitationData ? (ROLE_LABELS[invitationData.r] || invitationData.r) : ''

  // Build signup/login URLs with the invitation data
  const signupUrl = invitationData 
    ? `/signup?email=${encodeURIComponent(invitationData.em)}&role=${encodeURIComponent(invitationData.r)}&eventId=${encodeURIComponent(invitationData.e)}`
    : '/signup'
  const loginUrl = invitationData
    ? `/login?redirect=${encodeURIComponent(`/staff/accept-invitation?d=${encodedData}`)}`
    : '/login'


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
      <header className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300 w-fit">
            <span className="text-lg font-bold tracking-tight">Hack<span className="text-emerald-500">ET</span></span>
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-2 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-slate-500 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-200 shadow-sm"
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-8 text-center">

            {/* No data */}
            {!hasData && !token && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center">
                    <XCircle size={32} className="text-red-500" />
                  </div>
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
                <p className="text-sm text-gray-500 mb-6">This invitation link is missing the required data. Please ask the organizer to resend a valid invitation.</p>
                <Link to="/" className="block w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors text-sm">Back to Home</Link>
              </>
            )}

            {/* Accepting (authenticated) */}
            {hasData && status === 'accepting' && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="h-14 w-14 rounded-full bg-indigo-50 flex items-center justify-center">
                    <Loader2 size={28} className="text-indigo-500 animate-spin" />
                  </div>
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Accepting invitation…</h1>
                <p className="text-sm text-gray-500">Adding you as {roleLabel} to the hackathon team.</p>
              </>
            )}

            {/* Successfully accepted */}
            {status === 'accepted' && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center">
                    <CheckCircle size={32} className="text-emerald-500" />
                  </div>
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Invitation Accepted!</h1>
                <p className="text-sm text-gray-500 mb-2">You have been added as:</p>
                <p className="text-lg font-semibold text-indigo-600 mb-6">{roleLabel}</p>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors text-sm"
                >
                  Go to Dashboard
                </button>
              </>
            )}

            {/* Error after attempt */}
            {status === 'error' && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center">
                    <XCircle size={32} className="text-red-500" />
                  </div>
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Invitation Failed</h1>
                <p className="text-sm text-red-600 mb-6">{errorMsg || 'This invitation may have expired or already been used.'}</p>
                <div className="space-y-3">
                  <button onClick={handleAccept} className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors text-sm">
                    <Loader2 size={14} /> Try again
                  </button>
                  <Link to="/" className="block w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors text-sm">Back to Home</Link>
                </div>
              </>
            )}

            {/* Not logged in yet — show sign-in / sign-up options */}
            {hasData && status === 'idle' && !isAuthenticated && !isExpired && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="h-14 w-14 rounded-full bg-violet-50 flex items-center justify-center">
                    <Mail size={28} className="text-violet-500" />
                  </div>
                </div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">You're Invited!</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">You've been invited to join as:</p>
                <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg py-2 px-4 mb-4">
                  <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">{roleLabel}</p>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">For: {invitationData?.em}</p>
                <div className="space-y-3">
                  <Link
                    to={loginUrl}
                    className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors text-sm"
                  >
                    <LogIn size={15} /> Sign in to accept
                  </Link>
                  <Link
                    to={signupUrl}
                    className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors text-sm"
                  >
                    <UserPlus size={15} /> Create account & accept
                  </Link>
                </div>
              </>
            )}

            {/* Authenticated but idle */}
            {hasData && status === 'idle' && isAuthenticated && !isExpired && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="h-14 w-14 rounded-full bg-indigo-50 flex items-center justify-center">
                    <ShieldCheck size={28} className="text-indigo-500" />
                  </div>
                </div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Accept Invitation</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Role: <strong className="text-indigo-600">{roleLabel}</strong></p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Signed in as <strong className="text-gray-700 dark:text-gray-300">{user?.email}</strong></p>
                {emailMatches ? (
                  <button onClick={handleAccept} className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors text-sm">
                    <ShieldCheck size={15} /> Accept invitation
                  </button>
                ) : (
                  <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-4">
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      This invitation was sent to <strong>{invitationData?.em}</strong>. 
                      Please log out and sign in with that email address.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Expired invitation */}
            {hasData && isExpired && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center">
                    <XCircle size={32} className="text-red-500" />
                  </div>
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Invitation Expired</h1>
                <p className="text-sm text-gray-500 mb-6">This invitation link has expired. Please ask the organizer to generate a new invitation.</p>
                <Link to="/" className="block w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors text-sm">Back to Home</Link>
              </>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}
