import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import type { UserRole } from '../../types/models'

interface ProtectedRouteProps {
    children: React.ReactNode
    roles?: UserRole[]
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
    const { user, isLoading, isAuthenticated } = useAuth()

    if (isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-200 border-t-accent-600" />
            </div>
        )
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    if (roles && user && !roles.includes(user.role)) {
        return (
            <div className="card mx-auto mt-20 max-w-md p-8 text-center">
                <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
                <p className="mt-2 text-sm text-gray-500">
                    You don't have permission to access this page.
                </p>
            </div>
        )
    }

    return <>{children}</>
}
