import React from 'react';
import {
  LayoutDashboard,
  Compass,
  Calendar,
  Trophy,
  Search,
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
    { icon: <LayoutDashboard size={18} />, label: 'Dashboard', active: true },
    { icon: <Compass size={18} />, label: 'Discovery Hub', active: false },
    { icon: <Calendar size={18} />, label: 'My Events', active: false },
    { icon: <Trophy size={18} />, label: 'Leaderboard', active: false },
  ];

  return (
    <div className="flex min-h-screen bg-[#020617] text-slate-300 font-sans">
      {/* --- Sidebar --- */}
      <aside className="w-64 border-r border-slate-800/50 flex flex-col p-6 space-y-8">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center border border-blue-400/30">
            <span className="text-white font-bold italic">H</span>
          </div>
          <span className="text-xl font-bold tracking-tighter text-white">
            HacKET
          </span>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                item.active
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(37,99,235,0.1)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Profile Section */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-700 overflow-hidden border border-slate-600">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Dawit"
              alt="User"
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
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="flex justify-between items-center px-10 py-6">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase">
              Participant Dashboard
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Personalized discovery, deadlines, and saved events in one glass
              workspace.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-lg">
              <button className="p-1.5 text-slate-500 hover:text-white">
                <Moon size={16} />
              </button>
              <button className="p-1.5 text-slate-500 hover:text-white border-l border-slate-800 ml-1 pl-2">
                <Globe size={16} />
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="bg-blue-600/10 border-blue-500/30 text-blue-400 font-bold text-[10px]"
            >
              PARTICIPANT
            </Button>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto px-10 pb-10">
          {children}
        </section>
      </main>
    </div>
  );
};
