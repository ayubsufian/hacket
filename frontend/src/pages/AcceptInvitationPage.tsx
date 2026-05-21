import { useEffect, useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { Loader2, CheckCircle2, XCircle, Mail, ShieldCheck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { acceptStaffInvitation } from '../api/auth'
import { useToast } from '../contexts/ToastContext'

type Status = 'idle' | 'loading' | 'success' | 'error' | 'needs_login'

export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, isLoading: authLoading } = useAuth()
  const { success, error: toastError } = useToast()

  const token = searchParams.get('token') ?? ''
  const eventId = searchParams.get('eventId') ?? ''

  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [staffRole, setStaffRole] = useState('')

  useEffect(() => {
    if (authLoading) return

    if (!token || !eventId) {
      setStatus('error')
      setMessage('Invalid invitation link. The link may be missing required parameters.')
      return
    }

    if (!user) {
      setStatus('needs_login')
      return
    }

    if (status === 'idle') {
      void handleAccept()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user])

  const handleAccept = async () => {
    setStatus('loading')
    try {
      const res = await acceptStaffInvitation(eventId, token)
      const msg = res.data?.message ?? 'Invitation accepted successfully.'
      setMessage(msg)

      const roleMatch = msg.match(/as a (\w+)/i)
      if (roleMatch) setStaffRole(roleMatch[1])

      setStatus('success')
      success('Welcome aboard! Your invitation has been accepted.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to accept invitation.'
      setMessage(msg)
      setStatus('error')
      toastError(msg)
    }
  }

  const loginUrl = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <Link to="/" className="flex items-center gap-2 text-gray-900 hover:text-gray-700 w-fit">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white font-bold text-sm">
              H
            </div>
            <span className="font-semibold tracking-tight">HackET</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">

            {/* Loading */}
            {(status === 'idle' || status === 'loading' || authLoading) && (
              <>
                <div className="flex justify-center mb-4">
                  <Loader2 size={48} className="text-emerald-500 animate-spin" />
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Processing Invitation</h1>
                <p className="text-sm text-gray-500">Please wait while we verify your invitation…</p>
              </>
            )}

            {/* Needs Login */}
            {status === 'needs_login' && !authLoading && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="h-14 w-14 rounded-full bg-amber-50 flex items-center justify-center">
                    <Mail size={28} className="text-amber-500" />
                  </div>
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Sign in to Accept</h1>
                <p className="text-sm text-gray-500 mb-6">
                  You need to be signed in to accept this invitation. Please log in and you'll be redirected back automatically.
                </p>
                <Link
                  to={loginUrl}
                  className="block w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors text-sm"
                >
                  Sign In
                </Link>
                <p className="mt-3 text-xs text-gray-500">
                  Don't have an account?{' '}
                  <Link to={`/signup?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`} className="text-emerald-600 hover:text-emerald-700 font-medium">
                    Create one
                  </Link>
                </p>
              </>
            )}

            {/* Success */}
            {status === 'success' && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center">
                    <CheckCircle2 size={32} className="text-emerald-500" />
                  </div>
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Invitation Accepted!</h1>
                {staffRole && (
                  <div className="inline-flex items-center gap-1.5 mb-3 px-3 py-1 bg-emerald-50 rounded-full text-xs font-medium text-emerald-700 border border-emerald-200">
                    <ShieldCheck size={14} />
                    {staffRole}
                  </div>
                )}
                <p className="text-sm text-gray-500 mb-6">{message}</p>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="block w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors text-sm"
                >
                  Go to Dashboard
                </button>
              </>
            )}

            {/* Error */}
            {status === 'error' && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center">
                    <XCircle size={32} className="text-red-500" />
                  </div>
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Invitation Failed</h1>
                <p className="text-sm text-red-600 mb-6">{message}</p>
                <Link
                  to="/"
                  className="block w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors text-sm"
                >
                  Back to Home
                </Link>
              </>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}
