import { FormEvent, useMemo, useState } from 'react'
import { ArrowLeft, Loader2, Mail, CheckCircle2 } from 'lucide-react'
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto lg:max-w-7xl flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-gray-900 hover:text-gray-700">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white font-bold text-sm">
              H
            </div>
            <span className="font-semibold tracking-tight">HackET</span>
          </Link>
          <Link to="/login" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft size={16} />
            Back to login
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-sm">
          {/* Title */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset password</h1>
            <p className="text-sm text-gray-500">
              Enter your email and we&apos;ll send you instructions.
            </p>
          </div>

          {submitted ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 size={24} />
              </div>
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm text-emerald-800">
                  Check your inbox for reset instructions.
                </p>
              </div>
              <Link
                to="/login"
                className="inline-block w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors min-h-[44px] touch-manipulation"
              >
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px] touch-manipulation"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send instructions'
                )}
              </button>
            </form>
          )}

          {!submitted && (
            <p className="mt-6 text-center text-sm text-gray-500">
              Remember your password?{' '}
              <Link to="/login" className="font-medium text-emerald-600 hover:text-emerald-700">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
