import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, User, Mail, Lock, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import type { RegisterInput } from '../api/auth'
import { getDashboardRoute } from '../utils/appState'
import { useToast } from '../contexts/ToastContext'

type Role = 'PARTICIPANT' | 'ORGANIZER' | 'JUDGE' | 'MENTOR'

const roles = [
  { id: 'PARTICIPANT' as Role, title: 'Participant', desc: 'Join hackathons' },
  { id: 'ORGANIZER' as Role, title: 'Organizer', desc: 'Host events' },
  { id: 'JUDGE' as Role, title: 'Judge', desc: 'Score projects' },
  { id: 'MENTOR' as Role, title: 'Mentor', desc: 'Guide teams' },
]

export default function SignupPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const { success, error: toastError } = useToast()

  const [step, setStep] = useState<1 | 2>(1)
  const [role, setRole] = useState<Role>('PARTICIPANT')
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const emailValid = useMemo(() => /\S+@\S+\.\S+/.test(form.email.trim()), [form.email])
  const passwordStrongEnough = useMemo(() => form.password.trim().length >= 8, [form.password])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setFormError('First and last name are required.')
      return
    }
    if (!emailValid) {
      setFormError('Please enter a valid email address.')
      return
    }
    if (!passwordStrongEnough) {
      setFormError('Password must be at least 8 characters long.')
      return
    }

    setLoading(true)
    setFormError(null)

    try {
      const payload: RegisterInput = {
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        role,
      }
      const user = await register(payload)
      success('Account created successfully. Welcome to HackET.')
      navigate(getDashboardRoute(user.role), { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      setFormError(message)
      toastError(message)
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
          <Link to="/" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 lg:hidden">
            <ArrowLeft size={16} />
            Back
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-sm">
          {/* Title */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Create account</h1>
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-emerald-600 hover:text-emerald-700">
                Sign in
              </Link>
            </p>
          </div>

          {/* Error Message */}
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {formError}
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-4">
              <p className="text-sm font-medium text-gray-700">Select your role</p>
              <div className="grid grid-cols-2 gap-3">
                {roles.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    className={`p-3 rounded-lg border text-left transition-all min-h-[64px] touch-manipulation ${
                      role === r.id
                        ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${role === r.id ? 'text-emerald-900' : 'text-gray-900'}`}>
                        {r.title}
                      </span>
                      {role === r.id && <CheckCircle2 size={16} className="text-emerald-600" />}
                    </div>
                    <p className={`text-xs mt-0.5 ${role === r.id ? 'text-emerald-700' : 'text-gray-500'}`}>
                      {r.desc}
                    </p>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors min-h-[44px] touch-manipulation"
              >
                Continue
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role indicator */}
              <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg">
                <span className="text-sm text-emerald-700">
                  Signing up as <span className="font-medium capitalize">{role.toLowerCase()}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-sm text-emerald-600 hover:text-emerald-800 font-medium"
                >
                  Change
                </button>
              </div>

              {/* Name fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1.5">
                    First name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      id="firstName"
                      type="text"
                      required
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      placeholder="John"
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Last name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      id="lastName"
                      type="text"
                      required
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      placeholder="Doe"
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
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
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px] touch-manipulation"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create account'
                )}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
