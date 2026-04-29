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
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans lg:flex">
      {/* --- Sidebar --- */}
      <aside className="hidden lg:flex w-72 border-r border-slate-800/50 flex-col p-6 space-y-8 bg-[#020617]/80 backdrop-blur-xl sticky top-0 h-screen">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center border border-emerald-300/40 shadow-[0_0_30px_rgba(16,185,129,0.18)]">
            <span className="text-white font-black italic">H</span>
          </div>
          <div>
            <span className="text-xl font-black tracking-tighter text-white block leading-none">
              HackET
            </span>
            <span className="text-[10px] uppercase tracking-[0.35em] text-slate-500">
              Participant space
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                  active
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.08)]'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50 hover:border-slate-700/70'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Profile Section */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-3 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-700 overflow-hidden border border-slate-600">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Dawit"
              alt="User avatar"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">Dawit M.</p>
            <p className="text-[10px] font-bold text-emerald-500 tracking-widest uppercase">
              LVL 4 BUILDER
            </p>
          </div>
          <div className="p-1.5 bg-emerald-500/10 rounded-md border border-emerald-500/20">
            <Bookmark size={14} className="text-emerald-500" />
          </div>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Header */}
        <header className="border-b border-slate-800/60 bg-[#020617]/80 backdrop-blur-xl px-5 py-4 lg:px-10 lg:py-6 sticky top-0 z-20">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl lg:text-2xl font-black text-white tracking-tighter uppercase">
                Participant Workspace
              </h1>
              <p className="text-xs text-slate-500 font-medium max-w-2xl">
                Personalized discovery, deadlines, saved events, and profile tools in one place.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
                <button className="p-1.5 text-slate-500 hover:text-white transition-colors" aria-label="Theme">
                  <Moon size={16} />
                </button>
                <button className="p-1.5 text-slate-500 hover:text-white border-l border-slate-800 ml-1 pl-2 transition-colors" aria-label="Language">
                  <Globe size={16} />
                </button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-bold text-[10px] uppercase tracking-[0.2em]"
              >
                Participant
              </Button>
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
                  className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${
                    active
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800'
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
