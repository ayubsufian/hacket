import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, Mail, Sparkles } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getDashboardRoute } from '../utils/appState'
import { useToast } from '../contexts/ToastContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { success, error: toastError } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const emailValid = useMemo(() => /\S+@\S+\.\S+/.test(email.trim()), [email])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!emailValid) {
      setFormError('Please enter a valid email address.')
      return
    }
    if (!password.trim()) {
      setFormError('Password is required.')
      return
    }

    setLoading(true)
    setFormError(null)

    try {
      const user = await login(email.trim().toLowerCase(), password)
      success('Welcome back. You are now signed in.')
      navigate(getDashboardRoute(user.role), { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign in right now.'
      setFormError(message)
      toastError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_15%_8%,rgba(99,102,241,0.26),transparent_33%),radial-gradient(circle_at_85%_12%,rgba(34,211,238,0.2),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#f4f7ff_48%,#f4f8ff_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(148,163,184,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.55)_1px,transparent_1px)] [background-size:28px_28px]" />

      <div className="relative mx-auto grid min-h-screen max-w-7xl px-4 py-10 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-10">
        <div className="hidden pr-10 lg:block">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-900">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-md shadow-indigo-600/30">
              H
            </div>
            <span className="text-lg font-bold tracking-tight">HackET</span>
          </Link>

          <div className="mt-12 max-w-lg space-y-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/65 bg-white/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700 backdrop-blur-md">
              <Sparkles size={13} /> Secure workspace access
            </span>
            <h1 className="text-balance text-5xl font-bold leading-[1.02] text-slate-900">
              Sign in and continue building your next breakthrough.
            </h1>
            <p className="text-lg leading-relaxed text-slate-600">
              Access live events, team workflows, judging feedback, and leaderboard results with one secure account.
            </p>
          </div>
        </div>

        <div className="relative flex items-center justify-center py-8">
          <Link to="/" className="absolute left-0 top-0 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 lg:hidden">
            <ArrowLeft size={16} /> Home
          </Link>

          <div className="card-elevated w-full max-w-md border border-white/75 bg-white/90 p-8 backdrop-blur-xl sm:p-10">
            <p className="section-title text-indigo-600">Account login</p>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Sign in</h2>
            <p className="mt-2 text-sm text-slate-500">
              Don&apos;t have an account?{' '}
              <Link to="/signup" className="font-semibold text-indigo-600 hover:text-indigo-500">
                Create one now
              </Link>
            </p>

            {formError && <div className="alert-error mt-6">{formError}</div>}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Email address</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><Mail size={16} /></div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input-field pl-10"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700">Password</label>
                  <Link to="/forgot-password" className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><KeyRound size={16} /></div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input-field pl-10 pr-11"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-slate-400 transition-colors hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary h-11 w-full text-base">
                {loading ? (
                  <span className="inline-flex items-center gap-2"><Loader2 size={18} className="animate-spin" /> Signing in...</span>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
