import { useState, type FormEvent } from 'react'
import { ArrowLeft, Loader2, Mail, KeyRound, Lock, Eye, EyeOff, CheckCircle2, Moon, Sun } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import { useTheme } from '../contexts/ThemeContext'
import { forgotPassword, resetPassword } from '../api/auth'

type Step = 'email' | 'reset'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { success, error: toastError, info } = useToast()
  const { resolvedTheme, toggleTheme } = useTheme()

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleRequestReset = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!email.trim()) {
      setFormError('Please enter your email address.')
      return
    }

    setLoading(true)
    setFormError(null)

    try {
      const result = await forgotPassword(email.trim().toLowerCase())
      
      // In development, show the OTP
      if (result.resetOtp) {
        info(`Development mode: Your reset OTP is ${result.resetOtp}`)
      }
      
      success('If an account exists with that email, a reset code has been sent.')
      setStep('reset')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send reset code'
      setFormError(message)
      toastError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!otp.trim() || otp.length !== 6) {
      setFormError('Please enter the 6-digit reset code.')
      return
    }
    if (!newPassword.trim() || newPassword.length < 8) {
      setFormError('Password must be at least 8 characters long.')
      return
    }

    setLoading(true)
    setFormError(null)

    try {
      await resetPassword(email.trim().toLowerCase(), otp.trim(), newPassword)
      success('Password reset successfully! You can now log in with your new password.')
      navigate('/login', { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reset password'
      setFormError(message)
      toastError(message)
    } finally {
      setLoading(false)
    }
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
                {step === 'email' ? (
                  <Mail size={28} className="text-emerald-500 dark:text-emerald-400" />
                ) : (
                  <KeyRound size={28} className="text-emerald-500 dark:text-emerald-400" />
                )}
              </div>
            </div>

            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
              {step === 'email' ? 'Forgot Password?' : 'Reset Password'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
              {step === 'email' 
                ? 'Enter your email address and we\'ll send you a reset code.'
                : `Enter the 6-digit code sent to ${email} and your new password.`}
            </p>

            {/* Error Message */}
            {formError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                {formError}
              </div>
            )}

            {step === 'email' ? (
              <form onSubmit={handleRequestReset} className="space-y-4">
                {/* Email */}
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
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px] touch-manipulation"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Code'
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* OTP */}
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Reset Code
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
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
                </div>

                {/* New Password */}
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                    <input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Minimum 8 characters</p>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6 || newPassword.length < 8}
                  className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px] touch-manipulation"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      Reset Password
                    </>
                  )}
                </button>

                {/* Back to email step */}
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="w-full py-2 px-4 text-gray-600 dark:text-gray-400 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-sm"
                >
                  Use different email
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
