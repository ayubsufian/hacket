import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { XCircle, Mail, ShieldCheck, UserPlus } from 'lucide-react'

interface InvitePayload {
  email: string
  role: 'JUDGE' | 'MENTOR'
  eventId: string
  iat: number
}

function decodeToken(token: string): InvitePayload | null {
  try {
    return JSON.parse(atob(decodeURIComponent(token))) as InvitePayload
  } catch {
    return null
  }
}

export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [payload, setPayload] = useState<InvitePayload | null>(null)
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    if (!token) { setInvalid(true); return }
    const decoded = decodeToken(token)
    if (!decoded?.email || !decoded?.role || !decoded?.eventId) {
      setInvalid(true)
    } else {
      setPayload(decoded)
    }
  }, [token])

  const signupUrl = payload
    ? `/signup?email=${encodeURIComponent(payload.email)}&role=${payload.role}`
    : '/signup'

  const loginUrl = `/login`

  const ROLE_COLOR = {
    JUDGE: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700' },
    MENTOR: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  }
  const roleStyle = payload ? ROLE_COLOR[payload.role] : ROLE_COLOR.JUDGE

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <Link to="/" className="flex items-center gap-2 text-gray-900 hover:text-gray-700 w-fit">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white font-bold text-sm">H</div>
            <span className="font-semibold tracking-tight">HackET</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">

            {invalid && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center">
                    <XCircle size={32} className="text-red-500" />
                  </div>
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
                <p className="text-sm text-gray-500 mb-6">This invitation link is missing required information or has been corrupted. Please ask the organizer to resend.</p>
                <Link to="/" className="block w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors text-sm">Back to Home</Link>
              </>
            )}

            {payload && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="h-14 w-14 rounded-full bg-violet-50 flex items-center justify-center">
                    <Mail size={28} className="text-violet-500" />
                  </div>
                </div>

                <h1 className="text-xl font-bold text-gray-900 mb-1">You're Invited!</h1>
                <p className="text-sm text-gray-500 mb-4">An organizer has invited you to join as:</p>

                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold mb-4 ${roleStyle.bg} ${roleStyle.border} ${roleStyle.text}`}>
                  <ShieldCheck size={15} />
                  {payload.role}
                </div>

                <p className="text-xs text-gray-400 mb-6">
                  Invited email: <span className="font-medium text-gray-600">{payload.email}</span>
                </p>

                <div className="space-y-3">
                  <Link
                    to={signupUrl}
                    className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors text-sm"
                  >
                    <UserPlus size={15} /> Create account & join
                  </Link>
                  <Link
                    to={loginUrl}
                    className="block w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors text-sm"
                  >
                    I already have an account — Sign in
                  </Link>
                </div>

                <p className="mt-5 text-xs text-gray-400 leading-relaxed">
                  After signing in or registering, ask your organizer to confirm your <strong>{payload.role}</strong> role assignment in the platform.
                </p>
              </>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}
