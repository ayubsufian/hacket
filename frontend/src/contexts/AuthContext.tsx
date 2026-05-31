import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getMe, login as apiLogin, logout as apiLogout, register as apiRegister } from '../api/auth'
import type { RegisterInput } from '../api/auth'
import type { User } from '../types/models'
import { authTokenStore } from '../api/client'
import { clearActiveWorkspace } from '../utils/appState'

interface AuthContextValue {
    user: User | null
    isLoading: boolean
    isAuthenticated: boolean
    login: (email: string, password: string) => Promise<User>
    register: (input: RegisterInput) => Promise<User>
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const loadUser = async () => {
            const token = authTokenStore.get()
            if (!token) {
                setIsLoading(false)
                return
            }
            try {
                const me = await getMe()
                setUser(me)
            } catch {
                authTokenStore.clear()
                clearActiveWorkspace()
                setUser(null)
            } finally {
                setIsLoading(false)
            }
        }
        void loadUser()
    }, [])

    const login = async (email: string, password: string) => {
        const result = await apiLogin({ email, password })
        setUser(result.user)
        return result.user
    }

    const register = async (input: RegisterInput) => {
        const result = await apiRegister(input)
        setUser(result.user)
        return result.user
    }

    const logout = async () => {
        try {
            await apiLogout()
        } finally {
            authTokenStore.clear()
            clearActiveWorkspace()
            setUser(null)
        }
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                register,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
