import { useEffect } from 'react'
import { ArrowLeft, Moon, Sun } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import { useTheme } from '../contexts/ThemeContext'

export default function ForgotPasswordPage() {
  const { info } = useToast()
  const { resolvedTheme, toggleTheme } = useTheme()

  useEffect(() => {
    info('Password reset is not configured on the backend yet. Please contact support for assistance with resetting your password.')
  }, [])

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
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-14 w-14 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                <ArrowLeft size={28} className="text-amber-500 dark:text-amber-400" />
              </div>
            </div>

            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Password Reset Unavailable</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Password reset functionality is not configured yet. Please contact support for assistance with resetting your password.
            </p>
            
            <Link
              to="/login"
              className="block w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors text-sm"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
