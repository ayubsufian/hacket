import { useState, type FormEvent, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Loader2, Mail, CheckCircle2, Moon, Sun, ShieldCheck, RefreshCw, ArrowRight } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useToast } from '../contexts/ToastContext'
import { verifyEmail, resendVerificationEmail } from '../api/auth'

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { resolvedTheme, toggleTheme } = useTheme()
  const { success, error: toastError, info } = useToast()

  const [otp, setOtp] = useState('')
  const [email, setEmail] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [hasEmail, setHasEmail] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Get email from location state (passed from signup) or query params
  useEffect(() => {
    const stateEmail = location.state?.email as string | undefined
    const queryEmail = new URLSearchParams(location.search).get('email')
    const finalEmail = stateEmail || queryEmail
    
    if (finalEmail) {
      setEmail(finalEmail)
      setHasEmail(true)
    }
  }, [location])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!email) return

    if (!otp.trim() || otp.length !== 6) {
      setFormError('Please enter the 6-digit verification code.')
      return
    }

    setLoading(true)
    setFormError(null)

    try {
      await verifyEmail(email, otp.trim())
      success('Email verified successfully! You can now log in.')
      navigate('/login', { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed'
      setFormError(message)
      toastError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) return

    setResending(true)
    try {
      const result = await resendVerificationEmail(email)
      info('A new verification code has been sent to your email.')
      // In development, show the OTP
      if (result.verificationOtp) {
        info(`Development mode: Your OTP is ${result.verificationOtp}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resend code'
      toastError(message)
    } finally {
      setResending(false)
    }
  }

  const handleEmailSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!emailInput.trim() || !emailInput.includes('@')) {
      setFormError('Please enter a valid email address.')
      return
    }
    setEmail(emailInput.trim().toLowerCase())
    setHasEmail(true)
    setFormError(null)
  }

  // Show email input form if no email provided
  if (!hasEmail) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
        {/* Header */}
        <header className="px-4 py-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto lg:max-w-7xl flex items-center justify-between">
            <Link to="/" className="flex items-center text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300">
              <span className="text-lg font-bold tracking-tight">Hack<span className="text-emerald-500">ET</span></span>
            </Link>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-2 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-slate-500 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-200 shadow-sm"
                aria-label="Toggle theme"
              >
                {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <Link to="/login" className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                <ArrowLeft size={16} />
                Back to login
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
          <div className="w-full max-w-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-8">
              <div className="flex justify-center mb-4">
                <div className="h-14 w-14 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                  <ShieldCheck size={28} className="text-emerald-500 dark:text-emerald-400" />
                </div>
              </div>

              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">Verify Your Email</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
                Enter your email address to receive a verification code.
              </p>

              {/* Error Message */}
              {formError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                  {formError}
                </div>
              )}

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                {/* Email Input */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                    <input
                      id="email"
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={!emailInput.trim() || !emailInput.includes('@')}
                  className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px] touch-manipulation"
                >
                  Continue
                  <ArrowRight size={18} />
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto lg:max-w-7xl flex items-center justify-between">
          <Link to="/" className="flex items-center text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300">
            <span className="text-lg font-bold tracking-tight">Hack<span className="text-emerald-500">ET</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-2 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-slate-500 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-200 shadow-sm"
              aria-label="Toggle theme"
            >
              {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Link to="/login" className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
              <ArrowLeft size={16} />
              Back to login
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-8">
            <div className="flex justify-center mb-4">
              <div className="h-14 w-14 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                <ShieldCheck size={28} className="text-emerald-500 dark:text-emerald-400" />
              </div>
            </div>

            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">Verify Your Email</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
              We've sent a 6-digit verification code to <strong className="text-gray-700 dark:text-gray-300">{email}</strong>
            </p>

            {/* Error Message */}
            {formError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* OTP Input */}
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Verification Code
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 text-center tracking-widest font-medium"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Enter the 6-digit code from your email</p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px] touch-manipulation"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    Verify Email
                  </>
                )}
              </button>
            </form>

            {/* Resend */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-3">
                Didn't receive the code?
              </p>
              <button
                onClick={handleResend}
                disabled={resending}
                className="w-full py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                {resending ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    Resend Code
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
