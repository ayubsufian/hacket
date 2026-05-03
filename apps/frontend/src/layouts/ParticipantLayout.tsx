import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  LayoutDashboard,
  Compass,
  Calendar,
  Search,
  Users,
  Globe,
  Moon,
  Bookmark,
} from 'lucide-react';
import { Button } from '@/components/shared/Button';

interface LayoutProps {
  children: React.ReactNode;
}

export const ParticipantLayout: React.FC<LayoutProps> = ({ children }) => {
  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/events', icon: Compass, label: 'Discovery Hub' },
    { href: '/events/search', icon: Search, label: 'Search' },
    { href: '/user/profile', icon: Users, label: 'My Profile' },
    { href: '/dashboard/localized', icon: Calendar, label: 'Localized' },
  ];

  const router = useRouter();
  const isActive = (href: string) =>
    router.pathname === href || router.asPath === href;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-200 font-sans lg:flex">
      {/* --- Sidebar --- */}
      <aside className="hidden lg:flex w-72 border-r border-slate-800/40 flex-col p-6 space-y-6 bg-white/3 backdrop-blur-sm sticky top-4 h-[calc(100vh-32px)] rounded-2xl ml-6">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center border border-emerald-300/30 shadow-md">
            <span className="text-white font-extrabold">H</span>
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white block leading-none">
              HackET
            </span>
            <span className="text-[11px] uppercase tracking-wide text-slate-300">
              Participant
            </span>
          </div>
        </div>

        <div className="mt-3">
          <input
            placeholder="Search events, teams..."
            className="w-full bg-white/4 placeholder:text-slate-400 text-sm rounded-xl py-2 px-3 border border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
          />
        </div>

        <nav className="flex-1 mt-4 space-y-2">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/20'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <span className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/3 text-slate-200">
                  <Icon size={16} />
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Profile Section */}
        <div className="mt-3 bg-white/3 border border-white/5 rounded-2xl p-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-400 overflow-hidden border border-emerald-600/20 flex-shrink-0">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Dawit"
              alt="User avatar"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">Dawit M.</p>
            <p className="text-[11px] font-medium text-emerald-300 uppercase tracking-wide">
              LVL 4 • Builder
            </p>
          </div>
          <div>
            <Button size="sm" className="bg-emerald-500 text-white px-3 py-1 rounded-md">Profile</Button>
          </div>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Header */}
        <header className="px-5 py-4 lg:px-10 lg:py-6 sticky top-4 z-30">
          <div className="flex items-center justify-between gap-6">
            <div>
              <h1 className="text-lg lg:text-2xl font-extrabold text-white tracking-tight">
                Participant Workspace
              </h1>
              <p className="text-xs text-slate-300 max-w-2xl mt-1">
                Discover events, manage deadlines, and update your profile.
              </p>
            </div>

            <div className="flex-1 max-w-xl">
              <div className="relative">
                <input
                  placeholder="Search events, teammates, projects..."
                  className="w-full bg-white/5 placeholder:text-slate-400 text-sm rounded-full py-2.5 pl-4 pr-10 border border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-400/25"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300">
                  <Search size={16} />
                </div>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-3">
              <button className="p-2 rounded-full bg-white/3 text-slate-200 hover:bg-white/5">
                <Moon size={16} />
              </button>
              <button className="p-2 rounded-full bg-white/3 text-slate-200 hover:bg-white/5">
                <Globe size={16} />
              </button>
              <div className="flex items-center gap-3">
                <Button size="sm" className="bg-emerald-500 text-white px-3 py-1 rounded-md">Create</Button>
              </div>
            </div>
          </div>

          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {navItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                    active
                      ? 'bg-emerald-500/12 text-emerald-200'
                      : 'bg-white/3 text-slate-300'
                  }`}
                >
                  <Icon size={14} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <section className="flex-1 overflow-y-auto px-5 py-6 lg:px-10 lg:py-8">
          {children}
        </section>
      </main>
    </div>
  );
};
