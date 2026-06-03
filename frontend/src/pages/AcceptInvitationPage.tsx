import { useEffect, useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { XCircle, Mail, ShieldCheck, UserPlus, CheckCircle, Loader2, LogIn, Moon, Sun } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { acceptStaffInvitation } from '../api/events'
import { useTheme } from '../contexts/ThemeContext'
import type { StaffRole } from '../types/models'

const ROLE_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  JUDGE:         { bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-700' },
  MENTOR:        { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  TECHNICAL_LEAD:{ bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-700' },
  LOGISTICS:     { bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-700' },
  COMMUNICATIONS:{ bg: 'bg-sky-50',     border: 'border-sky-200',     text: 'text-sky-700' },
  FINANCE:       { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700' },
}

const ROLE_LABELS: Record<string, string> = {
  JUDGE: 'Judge', MENTOR: 'Mentor', TECHNICAL_LEAD: 'Technical Lead',
  LOGISTICS: 'Logistics', COMMUNICATIONS: 'Communications', FINANCE: 'Finance',
}

export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { resolvedTheme, toggleTheme } = useTheme()

  const [status, setStatus] = useState<'idle' | 'accepting' | 'accepted' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [acceptedRole, setAcceptedRole] = useState<StaffRole | null>(null)

  const hasToken = Boolean(token)

  const handleAccept = async () => {
    if (!token) return
    try {
      setStatus('accepting')
      setErrorMsg('')
      const assignment = await acceptStaffInvitation(token)
      setAcceptedRole(assignment.staffRole)
      setStatus('accepted')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to accept invitation.')
      setStatus('error')
    }
  }

  useEffect(() => {
    if (isAuthenticated && hasToken && status === 'idle') {
      void handleAccept()
    }
  }, [isAuthenticated, hasToken])

  const signupUrl = `/signup?token=${encodeURIComponent(token)}`
  const loginUrl  = `/login?redirect=${encodeURIComponent(`/staff/accept-invitation?token=${token}`)}`

  const roleStyle = acceptedRole ? (ROLE_STYLES[acceptedRole] ?? ROLE_STYLES.JUDGE) : ROLE_STYLES.JUDGE

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

            {/* No token */}
            {!hasToken && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center">
                    <XCircle size={32} className="text-red-500" />
                  </div>
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
                <p className="text-sm text-gray-500 mb-6">This invitation link is missing the required token. Please ask the organizer to resend a valid invitation.</p>
                <Link to="/" className="block w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors text-sm">Back to Home</Link>
              </>
            )}

            {/* Accepting (authenticated) */}
            {hasToken && status === 'accepting' && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="h-14 w-14 rounded-full bg-indigo-50 flex items-center justify-center">
                    <Loader2 size={28} className="text-indigo-500 animate-spin" />
                  </div>
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Accepting invitation…</h1>
                <p className="text-sm text-gray-500">Linking your account to the hackathon staff team.</p>
              </>
            )}

            {/* Successfully accepted */}
            {status === 'accepted' && acceptedRole && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center">
                    <CheckCircle size={32} className="text-emerald-500" />
                  </div>
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Invitation Accepted!</h1>
                <p className="text-sm text-gray-500 mb-4">You've been added to the hackathon as:</p>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold mb-6 ${roleStyle.bg} ${roleStyle.border} ${roleStyle.text}`}>
                  <ShieldCheck size={15} /> {ROLE_LABELS[acceptedRole] ?? acceptedRole}
                </div>
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
            {hasToken && status === 'idle' && !isAuthenticated && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="h-14 w-14 rounded-full bg-violet-50 flex items-center justify-center">
                    <Mail size={28} className="text-violet-500" />
                  </div>
                </div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">You're Invited!</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Sign in or create an account to accept this staff invitation and join the hackathon team.</p>
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
                <p className="mt-5 text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                  After signing in your role will be assigned automatically.
                </p>
              </>
            )}

            {/* Authenticated but idle (shouldn't normally stay here) */}
            {hasToken && status === 'idle' && isAuthenticated && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="h-14 w-14 rounded-full bg-indigo-50 flex items-center justify-center">
                    <ShieldCheck size={28} className="text-indigo-500" />
                  </div>
                </div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Accept Invitation</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Signed in as <strong className="text-gray-700 dark:text-gray-300">{user?.email}</strong>. Click below to accept.</p>
                <button onClick={handleAccept} className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors text-sm">
                  <ShieldCheck size={15} /> Accept invitation
                </button>
              </>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}
