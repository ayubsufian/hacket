import React from 'react';
import {
  LayoutDashboard,
  Compass,
  Calendar,
  Trophy,
  Search,
  Sun,
  Globe,
  SearchX,
  RotateCcw,
  Loader2,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/shared/Button';

export default function NoResultsState() {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      {/* --- Sidebar (HackET Branding) --- */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col p-8 space-y-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white font-bold italic">H</span>
          </div>
          <span className="text-xl font-bold tracking-tighter">hackET</span>
        </div>

        <nav className="flex-1 space-y-4">
          <div className="flex items-center gap-3 text-slate-400">
            <LayoutDashboard size={18} />{' '}
            <span className="text-sm font-medium">Dashboard</span>
          </div>
          <div className="flex items-center gap-3 text-blue-600 font-bold bg-blue-50/50 p-2 rounded-lg border border-blue-100/50">
            <Compass size={18} /> <span className="text-sm">Discovery Hub</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <Calendar size={18} />{' '}
            <span className="text-sm font-medium">My Events</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <Trophy size={18} />{' '}
            <span className="text-sm font-medium">Leaderboard</span>
          </div>
        </nav>

        {/* User Profile */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl">
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Dawit"
            className="w-10 h-10 rounded-lg border border-white shadow-sm"
            alt="Dawit M."
          />
          <div>
            <p className="text-sm font-bold">Dawit M.</p>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
              LVL 4 BUILDER
            </p>
          </div>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Header & Toggles */}
        <header className="flex justify-end items-center gap-3 p-10 pb-0">
          <div className="flex bg-white border border-slate-200 p-1 rounded-lg shadow-sm">
            <button className="p-1.5 text-blue-600">
              <Sun size={16} />
            </button>
            <button className="p-1.5 text-slate-400 border-l border-slate-100 ml-1 pl-2">
              <Globe size={16} />
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="bg-white text-[11px] font-bold px-6 border-slate-200 text-blue-600"
          >
            Participant
          </Button>
        </header>

        {/* Recovery Banner */}
        <div className="flex justify-center mt-8">
          <div className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-4 py-1.5 rounded-full flex items-center gap-2 shadow-sm animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-bold tracking-widest uppercase flex items-center gap-2">
              Archive Recovery Window <span className="text-slate-300">•</span>{' '}
              <Clock size={12} /> 00:01:42
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-10">
          {/* Faded Content Background (The "Search result" that failed) */}
          <div className="w-full max-w-2xl mb-12 opacity-[0.03] select-none pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <h2 className="text-5xl font-black mb-4">
              SEARCH ACROSS ACTIVE, UPCOMING, AND ARCHIVED HACKATHONS FROM ONE
              PLACE.
            </h2>
            <p className="text-lg">
              Filter results by tech stack, location, or prize pool...
            </p>
          </div>

          {/* --- ZERO STATE ALERT CARD --- */}
          <div className="w-full max-w-md bg-white border-2 border-orange-200 rounded-[2.5rem] p-10 text-center shadow-xl shadow-orange-500/5 relative z-10 animate-in zoom-in-95 duration-500">
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-orange-100">
              <SearchX
                size={32}
                className="text-orange-500"
                strokeWidth={1.5}
              />
            </div>

            <p className="text-[10px] font-bold text-orange-400 tracking-[0.2em] uppercase mb-4">
              Zero-State Alert
            </p>
            <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tighter uppercase">
              No matching results found.
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-10 px-4">
              Try clearing the active filters or let HackET retrieve archived
              entries that closely match your last search.
            </p>

            <Button
              variant="primary"
              className="bg-blue-600 hover:bg-blue-700 w-full py-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 group"
            >
              <RotateCcw
                size={18}
                className="group-hover:rotate-[-45deg] transition-transform duration-300"
              />
              <span className="font-bold tracking-tight">
                Clear All Filters
              </span>
            </Button>
          </div>

          {/* --- FOOTER RETRIEVAL INDICATOR --- */}
          <div className="mt-12 bg-white border border-slate-200 rounded-2xl p-4 pr-12 pl-6 shadow-sm flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-700">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Loader2 size={18} className="text-emerald-500 animate-spin" />
            </div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              Retrieving archived results...
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
