import { useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'

export default function ForgotPasswordPage() {
  const { info } = useToast()

  useEffect(() => {
    info('Password reset is not configured on the backend yet. Please contact support for assistance with resetting your password.')
  }, [])

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
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-14 w-14 rounded-full bg-amber-50 flex items-center justify-center">
                <ArrowLeft size={28} className="text-amber-500" />
              </div>
            </div>
            
            <h1 className="text-xl font-bold text-gray-900 mb-2">Password Reset Unavailable</h1>
            <p className="text-sm text-gray-500 mb-6">
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
