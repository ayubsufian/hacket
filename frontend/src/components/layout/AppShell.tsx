import { useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  Bell, ChevronDown, ClipboardCheck, FileText, Globe,
  LayoutDashboard, LogOut, Menu, Settings, Trophy, Users, X, Calendar,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslation } from '../../contexts/LanguageContext'

const publicNav = [
  { to: '/', label: 'Home' },
  { to: '/events', label: 'Events' },
  { to: '/leaderboard', label: 'Leaderboard' },
]

const sidebarNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/events', label: 'Events', icon: Calendar },
  { to: '/teams', label: 'Teams', icon: Users },
  { to: '/submissions', label: 'Submissions', icon: FileText },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/notifications', label: 'Notifications', icon: Bell },
]

const roleNav: Record<string, { to: string; label: string; icon: typeof Settings }[]> = {
  JUDGE: [{ to: '/judge', label: 'Judging', icon: ClipboardCheck }],
  ORGANIZER: [{ to: '/organizer', label: 'Manage Events', icon: Settings }],
  ADMIN: [
    { to: '/organizer', label: 'Manage Events', icon: Settings },
    { to: '/judge', label: 'Judging', icon: ClipboardCheck },
    { to: '/admin', label: 'Admin', icon: Settings },
  ],
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth()
  const { locale, setLocale } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)

  const isPublicPage = ['/', '/login', '/signup'].includes(location.pathname)
  const showSidebar = isAuthenticated && !isPublicPage

  const handleLogout = async () => {
    setUserOpen(false)
    await logout()
    navigate('/')
  }

  const extraLinks = roleNav[user?.role ?? ''] ?? []

  /* ── Public topbar (landing/login/signup) ── */
  const topbar = (
    <header className="sticky top-0 z-40 h-12 border-b border-border bg-surface">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
        <Link to="/" className="text-sm font-semibold text-gray-900">
          HackET
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {publicNav.map(n => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'}
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 text-sm ${isActive ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'}`
              }>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setLocale(locale === 'en' ? 'am' : 'en')}
            className="rounded-md px-2 py-1 text-2xs text-gray-400 hover:text-gray-600">
            <Globe size={13} className="inline mr-0.5" />{locale === 'en' ? 'አማ' : 'EN'}
          </button>

          {isAuthenticated ? (
            <div className="relative">
              <button type="button" onClick={() => setUserOpen(!userOpen)}
                className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-sm text-gray-700 hover:bg-gray-50">
                {user?.profile?.firstName?.[0] || user?.email[0].toUpperCase()}
                <ChevronDown size={12} />
              </button>
              {userOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setUserOpen(false)} />
                  <div className="absolute right-0 z-40 mt-1 w-48 rounded-md border border-border bg-surface py-1">
                    <div className="px-3 py-1.5 border-b border-border mb-1">
                      <p className="text-sm font-medium text-gray-900">{user?.profile?.firstName} {user?.profile?.lastName}</p>
                      <p className="text-2xs text-gray-400">{user?.role}</p>
                    </div>
                    <Link to="/dashboard" onClick={() => setUserOpen(false)} className="block px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">Dashboard</Link>
                    <button type="button" onClick={() => void handleLogout()}
                      className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-1.5">
                      <LogOut size={13} /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Link to="/login" className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">Log in</Link>
              <Link to="/signup" className="btn-primary !py-1.5 !text-[13px]">Sign up</Link>
            </div>
          )}

          <button type="button" onClick={() => setMobileOpen(!mobileOpen)} className="sm:hidden rounded-md p-1.5 text-gray-500 hover:bg-gray-100">
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-surface px-4 py-2 sm:hidden">
          {publicNav.map(n => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} onClick={() => setMobileOpen(false)}
              className="block rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">{n.label}</NavLink>
          ))}
        </div>
      )}
    </header>
  )

  /* ── App layout with sidebar (authenticated non-public pages) ── */
  if (showSidebar) {
    return (
      <div className="flex h-screen bg-page">
        {/* Sidebar */}
        <aside className="hidden w-52 shrink-0 border-r border-border bg-surface lg:flex lg:flex-col">
          <div className="flex h-12 items-center border-b border-border px-4">
            <Link to="/" className="text-sm font-semibold text-gray-900">HackET</Link>
          </div>
          <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
            {sidebarNav.map(n => {
              const Icon = n.icon
              return (
                <NavLink key={n.to} to={n.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm ${isActive ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`
                  }>
                  <Icon size={15} /> {n.label}
                </NavLink>
              )
            })}
            {extraLinks.length > 0 && (
              <>
                <div className="my-2 border-t border-border" />
                {extraLinks.map(n => {
                  const Icon = n.icon
                  return (
                    <NavLink key={n.to} to={n.to}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm ${isActive ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`
                      }>
                      <Icon size={15} /> {n.label}
                    </NavLink>
                  )
                })}
              </>
            )}
          </nav>
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-100 text-2xs font-semibold text-gray-600">
                {user?.profile?.firstName?.[0] || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800">{user?.profile?.firstName}</p>
                <p className="truncate text-2xs text-gray-400">{user?.role}</p>
              </div>
              <button type="button" onClick={() => void handleLogout()} className="rounded-md p-1 text-gray-400 hover:text-red-500 hover:bg-gray-100">
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top bar */}
          <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-4 lg:px-6">
            <button type="button" onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden rounded-md p-1 text-gray-500 hover:bg-gray-100">
              <Menu size={16} />
            </button>
            <div className="hidden lg:block" />
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setLocale(locale === 'en' ? 'am' : 'en')}
                className="rounded-md px-2 py-1 text-2xs text-gray-400 hover:text-gray-600">
                {locale === 'en' ? 'አማ' : 'EN'}
              </button>
              <Link to="/notifications" className="relative rounded-md p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <Bell size={15} />
              </Link>
            </div>
          </header>

          {/* Mobile sidebar */}
          {mobileOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black/20" onClick={() => setMobileOpen(false)} />
              <aside className="absolute left-0 top-0 h-full w-52 border-r border-border bg-surface">
                <div className="flex h-12 items-center justify-between border-b border-border px-4">
                  <span className="text-sm font-semibold text-gray-900">HackET</span>
                  <button type="button" onClick={() => setMobileOpen(false)} className="p-1 text-gray-400"><X size={16} /></button>
                </div>
                <nav className="px-2 py-3 space-y-0.5">
                  {[...sidebarNav, ...extraLinks].map(n => {
                    const Icon = n.icon
                    return (
                      <NavLink key={n.to} to={n.to} onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm ${isActive ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`
                        }>
                        <Icon size={15} /> {n.label}
                      </NavLink>
                    )
                  })}
                </nav>
              </aside>
            </div>
          )}

          <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
        </div>
      </div>
    )
  }

  /* ── Public layout (no sidebar) ── */
  return (
    <div className="min-h-screen bg-page">
      {topbar}
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      <footer className="border-t border-border py-6 text-center text-2xs text-gray-400">
        © 2026 HackET — Ethiopia's hackathon platform
      </footer>
    </div>
  )
}
