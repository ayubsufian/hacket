import { useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  Bell, ChevronDown, ClipboardCheck, FileText, Globe,
  LayoutDashboard, LogOut, Menu, Settings, Trophy, Users, X, Calendar,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslation } from '../../contexts/LanguageContext'
import { getDashboardRoute } from '../../utils/appState'

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

  const isPublicPage = ['/', '/login', '/signup', '/forgot-password'].includes(location.pathname)
  const isLanding = location.pathname === '/'
  const showSidebar = isAuthenticated && !isPublicPage

  const handleLogout = async () => {
    setUserOpen(false)
    await logout()
    navigate('/')
  }

  const extraLinks = roleNav[user?.role ?? ''] ?? []
  const dashboardRoute = getDashboardRoute(user?.role)
  const primaryNav = [
    { to: dashboardRoute, label: 'Dashboard', icon: LayoutDashboard },
    ...sidebarNav.slice(1),
  ]

  /* ── Public topbar ── */
  const topbar = (
    <header className={`sticky top-0 z-40 transition-all duration-300 ${isLanding
      ? 'bg-[linear-gradient(180deg,rgba(243,251,248,0.92)_0%,rgba(242,251,249,0.80)_100%)] backdrop-blur-xl border-b border-emerald-100/60 shadow-sm'
      : 'bg-white/92 backdrop-blur-xl border-b border-white/70 shadow-sm'
      }`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-emerald-600 shadow-md shadow-accent-500/20 transition-transform duration-300 group-hover:scale-105">
            <span className="text-sm font-bold text-white">H</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-navy-900">
            Hack<span className="text-accent-600">ET</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 sm:flex">
          {publicNav.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${isActive
                  ? 'bg-accent-50 text-accent-700'
                  : 'text-gray-500 hover:text-navy-900 hover:bg-gray-50'
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setLocale(locale === 'en' ? 'am' : 'en')}
            className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-500 hover:border-slate-300 hover:text-slate-800 transition-all duration-200 shadow-sm"
          >
            <Globe size={13} />
            {locale === 'en' ? 'አማ' : 'EN'}
          </button>

          {isAuthenticated ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserOpen(!userOpen)}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-1 pr-3 text-sm shadow-sm transition-all duration-200 hover:shadow-card hover:border-slate-300"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500 to-emerald-500 text-xs font-bold text-white">
                  {user?.profile?.firstName?.[0] || user?.email[0].toUpperCase()}
                </div>
                <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${userOpen ? 'rotate-180' : ''}`} />
              </button>
              {userOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setUserOpen(false)} />
                  <div className="absolute right-0 z-40 mt-2 w-60 rounded-[1.4rem] border border-white/80 bg-white/95 py-1.5 shadow-elevated animate-scale-in origin-top-right backdrop-blur-xl">
                    <div className="mb-1 border-b border-slate-100 px-4 py-3">
                      <p className="text-sm font-semibold text-navy-900 truncate">
                        {user?.profile?.firstName} {user?.profile?.lastName}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                      <span className="badge badge-gray mt-2">{user?.role}</span>
                    </div>
                    <Link
                      to={dashboardRoute}
                      onClick={() => setUserOpen(false)}
                      className="mx-1.5 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-accent-600 transition-colors"
                    >
                      <LayoutDashboard size={14} /> Dashboard
                    </Link>
                    {user?.role === 'ADMIN' && (
                      <Link
                        to="/admin"
                        onClick={() => setUserOpen(false)}
                        className="mx-1.5 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors font-medium"
                      >
                        <Settings size={14} /> Admin Panel
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleLogout()}
                      className="mx-1.5 w-[calc(100%-12px)] rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                    >
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="hidden sm:inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:text-navy-900 hover:bg-gray-50 transition-all duration-200">
                Log in
              </Link>
              <Link to="/signup" className="btn-primary !rounded-xl">
                Sign up
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="sm:hidden rounded-xl p-2 text-gray-500 hover:bg-gray-100 transition-colors"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="absolute left-0 right-0 top-16 border-b border-gray-100 bg-white/95 backdrop-blur-xl px-4 py-3 shadow-elevated animate-fade-in sm:hidden">
          {publicNav.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              onClick={() => setMobileOpen(false)}
              className="block rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-accent-600 transition-colors"
            >
              {n.label}
            </NavLink>
          ))}
          {!isAuthenticated && (
            <div className="mt-2 flex flex-col gap-1 border-t border-gray-100 pt-2">
              <Link to="/login" onClick={() => setMobileOpen(false)} className="block rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-accent-600 transition-colors">Log in</Link>
              <Link to="/signup" onClick={() => setMobileOpen(false)} className="block rounded-xl px-4 py-2.5 text-sm font-semibold text-accent-600 hover:bg-accent-50 transition-colors">Sign up</Link>
            </div>
          )}
        </div>
      )}
    </header>
  )

  /* ── App layout with sidebar ── */
  if (showSidebar) {
    return (
      <div className="flex h-screen bg-page">
        {/* Sidebar */}
        <aside className="hidden w-[268px] shrink-0 border-r border-white/80 bg-white/92 backdrop-blur-xl lg:flex lg:flex-col">
          <div className="flex h-16 items-center border-b border-slate-100 px-6">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-emerald-600 shadow-sm">
                <span className="text-sm font-bold text-white">H</span>
              </div>
              <span className="text-lg font-bold tracking-tight text-navy-900">
                Hack<span className="text-accent-600">ET</span>
              </span>
            </Link>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
            {primaryNav.map(n => {
              const Icon = n.icon
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm transition-all duration-200 ${isActive
                      ? 'bg-accent-50 text-accent-700 font-semibold shadow-sm'
                      : 'text-slate-500 hover:text-navy-800 hover:bg-slate-50'
                    }`
                  }
                >
                  <Icon size={16} /> {n.label}
                </NavLink>
              )
            })}
            {extraLinks.length > 0 && (
              <>
                <div className="my-3 border-t border-slate-100" />
                <p className="mb-1 px-3 text-2xs font-semibold uppercase tracking-[0.18em] text-slate-300">Operations</p>
                {extraLinks.map(n => {
                  const Icon = n.icon
                  return (
                    <NavLink
                      key={n.to}
                      to={n.to}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm transition-all duration-200 ${isActive
                          ? 'bg-accent-50 text-accent-700 font-semibold shadow-sm'
                          : 'text-slate-500 hover:text-navy-800 hover:bg-slate-50'
                        }`
                      }
                    >
                      <Icon size={16} /> {n.label}
                    </NavLink>
                  )
                })}
              </>
            )}
          </nav>
          <div className="border-t border-slate-100 p-3">
            <div className="flex items-center gap-2.5 rounded-2xl p-2 transition-colors hover:bg-slate-50">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500 to-emerald-500 text-xs font-bold text-white">
                {user?.profile?.firstName?.[0] || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-navy-900">{user?.profile?.firstName}</p>
                <p className="truncate text-2xs text-gray-400">{user?.role}</p>
              </div>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top bar */}
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/70 bg-white/88 px-4 backdrop-blur-xl lg:px-6">
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden rounded-xl p-1.5 text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <Menu size={18} />
            </button>
            <div className="hidden lg:block" />
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setLocale(locale === 'en' ? 'am' : 'en')}
                className="rounded-2xl px-2.5 py-1 text-xs font-medium text-slate-400 transition-all duration-200 hover:bg-slate-50 hover:text-slate-600"
              >
                {locale === 'en' ? 'አማ' : 'EN'}
              </button>
              <Link
                to="/notifications"
                className="relative rounded-xl p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all duration-200"
              >
                <Bell size={16} />
              </Link>
            </div>
          </header>

          {/* Mobile sidebar */}
          {mobileOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
              <aside className="absolute left-0 top-0 h-full w-[268px] border-r border-white/80 bg-white/96 shadow-elevated animate-slide-in-left backdrop-blur-xl">
                <div className="flex h-14 items-center justify-between border-b border-slate-100 px-4">
                  <span className="text-sm font-bold text-navy-900">
                    Hack<span className="text-accent-600">ET</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
                <nav className="px-3 py-4 space-y-1">
                  {[...primaryNav, ...extraLinks].map(n => {
                    const Icon = n.icon
                    return (
                      <NavLink
                        key={n.to}
                        to={n.to}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm transition-all duration-200 ${isActive
                            ? 'bg-accent-50 text-accent-700 font-semibold shadow-sm'
                            : 'text-slate-500 hover:text-navy-800 hover:bg-slate-50'
                          }`
                        }
                      >
                        <Icon size={16} /> {n.label}
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

  /* ── Public layout ── */
  return (
    <div className="min-h-screen bg-page">
      {topbar}
      <main>{children}</main>
      <footer className="border-t border-white/70 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="mb-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-emerald-600">
                  <span className="text-sm font-bold text-white">H</span>
                </div>
                <span className="text-lg font-bold tracking-tight text-navy-900">
                  Hack<span className="text-accent-600">ET</span>
                </span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                Professional hackathon operations for event discovery, team coordination, submissions, judging, and notifications.
              </p>
            </div>
            {/* Links */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Platform</p>
              <ul className="space-y-2">
                {['Events', 'Leaderboard', 'Teams', 'Submissions'].map(l => (
                  <li key={l}>
                    <Link to={`/${l.toLowerCase()}`} className="text-sm text-slate-500 transition-colors hover:text-accent-600">
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Roles & Access</p>
              <ul className="space-y-2">
                {[
                  { label: 'Participant', to: '/signup' },
                  { label: 'Organizer', to: '/signup' },
                  { label: 'Judge', to: '/signup' },
                  { label: 'Workspace', to: isAuthenticated ? dashboardRoute : '/login' },
                ].map(l => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-sm text-slate-500 transition-colors hover:text-accent-600">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-6 sm:flex-row">
            <p className="text-center text-xs text-slate-400 sm:text-left">
              © {new Date().getFullYear()} HackET — Ethiopia's unified hackathon platform
            </p>
            <p className="text-xs text-slate-400">Built around the currently supported backend workflows.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
