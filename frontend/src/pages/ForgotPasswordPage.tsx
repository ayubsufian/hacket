import { FormEvent, useMemo, useState } from 'react'
import { ArrowLeft, Loader2, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../api/auth'
import { useToast } from '../contexts/ToastContext'
import { ApiError } from '../api/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const { success, error, info } = useToast()

  const emailValid = useMemo(() => /\S+@\S+\.\S+/.test(email), [email])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!emailValid) {
      error('Please enter a valid email address.')
      return
    }

    setLoading(true)

    try {
      await requestPasswordReset({ email: email.trim().toLowerCase() })
      setSubmitted(true)
      success('If an account exists, reset instructions were sent to your email.')
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        info('Password reset is not configured on the backend yet. Please contact support.')
      } else {
        error(err instanceof Error ? err.message : 'Unable to request password reset right now.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_12%_16%,rgba(99,102,241,0.2),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(34,211,238,0.2),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#f4f8ff_45%,#f5f9ff_100%)] px-4 py-20 sm:px-6">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.16)_1px,transparent_1px)] [background-size:34px_34px]" />
      <div className="relative mx-auto w-full max-w-lg">
        <Link to="/login" className="mb-7 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">
          <ArrowLeft size={16} /> Back to login
        </Link>

        <div className="card-elevated border border-white/75 bg-white/86 p-8 backdrop-blur-xl sm:p-10">
          <p className="section-title text-indigo-600">Account recovery</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Forgot your password?</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Enter the email you used with HackET. If password reset is enabled, we will send a secure recovery link.
          </p>

          {submitted && (
            <div className="alert-success mt-6">
              Request received. Check your inbox and spam folder for next steps.
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email address</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-field pl-10"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary h-11 w-full text-base">
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={18} className="animate-spin" /> Sending request...
                </span>
              ) : (
                'Send reset request'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Remembered your password?{' '}
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
