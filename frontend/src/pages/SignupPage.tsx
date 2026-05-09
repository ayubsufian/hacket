import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, User, Mail, KeyRound, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import type { RegisterInput } from '../api/auth'
import { getDashboardRoute } from '../utils/appState'
import { useToast } from '../contexts/ToastContext'

type Role = 'PARTICIPANT' | 'ORGANIZER' | 'JUDGE' | 'MENTOR'

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
        <div className="flex min-h-screen bg-page">
            {/* ── Left Branding Panel ── */}
            <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-navy-950 p-12 lg:flex">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(89,116,246,0.28),transparent_26%),linear-gradient(160deg,#0b1020_0%,#131b2e_45%,#1d2351_100%)]" />
                <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-accent-500/16 blur-[120px]" />

                <div className="relative z-10">
                    <Link to="/" className="flex items-center gap-2 text-white">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
                            <span className="text-sm font-bold">H</span>
                        </div>
                        <span className="text-lg font-bold tracking-tight">HackET</span>
                    </Link>
                </div>

                <div className="relative z-10 space-y-6 max-w-md">
                    <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-accent-100">Role-based onboarding</span>
                    <h1 className="text-4xl font-bold leading-tight text-white">Start with the role that matches your responsibility.</h1>
                    <p className="text-lg text-slate-300">Create a participant, organizer, judge, or mentor account and enter the correct workflow immediately after registration.</p>
                </div>

                <div className="relative z-10 text-sm text-slate-400">
                    Frontend onboarding aligned to the current backend auth contract.
                </div>
            </div>

            {/* ── Right Form Panel ── */}
            <div className="relative flex w-full flex-col justify-center px-4 py-12 sm:px-6 lg:w-1/2 lg:px-20 xl:px-32">
                <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 lg:hidden">
                    <ArrowLeft size={16} /> Home
                </Link>

                <div className="card-elevated mx-auto w-full max-w-md border border-white/80 bg-white/92 p-8 animate-fade-in sm:p-10">
                    <div className="mb-8">
                        <p className="section-title text-accent-600">Account creation</p>
                        <h2 className="text-3xl font-bold tracking-tight text-navy-900">Create your account</h2>
                        <p className="mt-2 text-sm text-slate-500">
                            Already have an account? <Link to="/login" className="font-medium text-accent-600 hover:text-accent-500">Sign in instead</Link>
                        </p>
                    </div>

                    {formError && <div className="alert-error mb-6">{formError}</div>}

                    {step === 1 ? (
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <p className="text-sm font-medium text-gray-900">How do you want to use HackET?</p>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {[
                                        { id: 'PARTICIPANT', title: 'Participant', desc: 'Join hackathons and build' },
                                        { id: 'ORGANIZER', title: 'Organizer', desc: 'Host and manage events' },
                                        { id: 'JUDGE', title: 'Judge', desc: 'Evaluate and score projects' },
                                        { id: 'MENTOR', title: 'Mentor', desc: 'Guide and support teams' }
                                    ].map(r => (
                                        <button
                                            key={r.id} type="button" onClick={() => setRole(r.id as Role)}
                                            className={`relative flex flex-col items-start rounded-2xl border p-4 text-left transition-all ${role === r.id
                                                    ? 'border-accent-400 bg-accent-50/70 shadow-sm ring-1 ring-accent-300'
                                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                                }`}
                                        >
                                            <span className={`font-semibold ${role === r.id ? 'text-accent-900' : 'text-gray-900'}`}>{r.title}</span>
                                            <span className={`mt-1 text-xs ${role === r.id ? 'text-accent-700' : 'text-gray-500'}`}>{r.desc}</span>
                                            {role === r.id && <CheckCircle2 size={16} className="absolute top-4 right-4 text-accent-600" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button type="button" onClick={() => setStep(2)} className="btn-primary w-full h-11 text-base">Continue</button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6 animate-slide-in-left">
                            <div className="flex items-center justify-between mb-4">
                                <span className="badge badge-green">Signing up as {role.charAt(0) + role.slice(1).toLowerCase()}</span>
                                <button type="button" onClick={() => setStep(1)} className="text-sm font-medium text-accent-600 hover:text-accent-700">Change role</button>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><User size={16} /></div>
                                        <input required value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} className="input-field pl-10" placeholder="Abebe" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><User size={16} /></div>
                                        <input required value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} className="input-field pl-10" placeholder="Kebede" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><Mail size={16} /></div>
                                    <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field pl-10" placeholder="you@example.com" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><KeyRound size={16} /></div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })}
                                        className="input-field pl-10 pr-11"
                                        placeholder="••••••••"
                                        minLength={8}
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
                                <p className="mt-2 text-xs text-slate-400">Use at least 8 characters.</p>
                            </div>

                            <button type="submit" disabled={loading} className="btn-primary w-full h-11 text-base relative overflow-hidden">
                                {loading ? <span className="flex items-center gap-2"><Loader2 size={18} className="animate-spin" /> Creating account...</span> : 'Create account'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
