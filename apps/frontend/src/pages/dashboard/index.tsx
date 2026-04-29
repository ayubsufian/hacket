import React from 'react';
import { ParticipantLayout } from '@/layouts/ParticipantLayout';
import { MapPin, Users, Calendar, Bookmark, Plus } from 'lucide-react';
import { Button } from '@/components/shared/Button';

export default function ParticipantDashboard() {
  return (
    <ParticipantLayout>
      <div className="grid grid-cols-12 gap-6">
        {/* --- RECOMMENDED SECTION --- */}
        <div className="col-span-8 bg-slate-900/30 border border-slate-800/60 rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8">
            <span className="bg-slate-800 text-white text-[10px] font-black px-3 py-1.5 rounded-full border border-slate-700">
              98% Match
            </span>
          </div>

          <div className="flex items-center gap-2 mb-6">
            <div className="p-1 bg-blue-500/20 rounded text-blue-400">
              <Plus size={14} />
            </div>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
              Recommended for You
            </span>
          </div>

          <h2 className="text-4xl font-black text-white mb-4 tracking-tighter">
            ADDIS BLOCKHACK 2026
          </h2>
          <p className="text-sm text-slate-400 max-w-lg mb-8 leading-relaxed">
            A curated hybrid hackathon for builders interested in decentralized
            finance, payment rails, and practical fintech products.
          </p>

          <div className="flex items-center gap-1 mb-8">
            <div className="p-2 bg-slate-800/50 rounded-lg border border-slate-700 text-slate-400">
              <Bookmark size={18} />
            </div>
          </div>

          <div className="flex gap-12 text-xs font-bold">
            <div className="flex items-center gap-2 text-blue-400">
              <Calendar size={14} /> Nov 12 — Nov 14
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <MapPin size={14} /> Hybrid / Addis Ababa
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Users size={14} /> 500+ builders
            </div>
          </div>

          <p className="mt-8 text-[10px] text-slate-500 italic">
            Because you saved FinTech Innovation Sprint and follow Web3 tracks
          </p>

          <Button
            variant="primary"
            className="mt-6 px-8 py-2 text-xs font-bold rounded-xl shadow-lg shadow-blue-600/20"
          >
            View details
          </Button>
        </div>

        {/* --- DEADLINES SECTION --- */}
        <div className="col-span-4 bg-slate-900/30 border border-slate-800/60 rounded-3xl p-6">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-black text-white tracking-tighter uppercase">
              Upcoming Deadlines
            </h3>
            <div className="flex bg-slate-800 p-1 rounded-full text-[9px] font-bold">
              <button className="bg-blue-600 px-3 py-1 rounded-full text-white">
                Greg
              </button>
              <button className="px-3 py-1 text-slate-500">Ge'ez</button>
            </div>
          </div>

          <div className="space-y-6">
            {[
              {
                date: '15',
                month: 'OCT',
                title: 'Team formation closes',
                sub: 'Ethio FinTech Hack',
              },
              {
                date: '22',
                month: 'OCT',
                title: 'Project submission',
                sub: 'Green Agri-Tech Sprint',
              },
              {
                date: '03',
                month: 'NOV',
                title: 'Mentor matching opens',
                sub: 'Addis BlockHack 2026',
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 group cursor-pointer">
                <div className="flex flex-col items-center justify-center bg-slate-800/50 border border-slate-700 w-12 h-12 rounded-xl text-center group-hover:border-blue-500/50 transition-colors">
                  <span className="text-[8px] font-black text-orange-500 leading-none">
                    {item.month}
                  </span>
                  <span className="text-lg font-black text-white">
                    {item.date}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-white group-hover:text-blue-400 transition-colors">
                    {item.title}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {item.sub}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* --- BOTTOM GRID --- */}
        {[
          {
            title: 'AI FOR GOOD SAFARI',
            status: 'Registration Open',
            tag: 'NBI / Remote',
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
          },
          {
            title: 'FINTECH INNOVATION SPRINT',
            status: 'Upcoming',
            tag: 'Addis Ababa',
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
          },
          {
            title: 'CIVIC TECH BUILDERS LAB',
            status: 'Saved Track',
            tag: 'Hybrid',
            color: 'text-slate-400',
            bg: 'bg-slate-800/50',
          },
        ].map((card, i) => (
          <div
            key={i}
            className="col-span-4 bg-slate-900/30 border border-slate-800/60 rounded-3xl p-6 hover:border-slate-700 transition-all group"
          >
            <div className="flex justify-between items-start mb-6">
              <span
                className={`${card.bg} ${card.color} text-[9px] font-black px-2 py-1 rounded border border-current/10`}
              >
                {card.status.toUpperCase()}
              </span>
              <Bookmark
                size={14}
                className="text-slate-600 group-hover:text-slate-400"
              />
            </div>
            <h4 className="text-xl font-black text-white mb-3 tracking-tighter">
              {card.title}
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed mb-8">
              Machine learning challenges for healthcare access, rural
              diagnostics, and community health operations.
            </p>
            <div className="flex justify-between items-center">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((j) => (
                  <div
                    key={j}
                    className="w-6 h-6 rounded-full border-2 border-[#020617] bg-slate-800 overflow-hidden"
                  >
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}${j}`}
                      alt="avatar"
                    />
                  </div>
                ))}
                <span className="text-[9px] font-bold text-slate-500 self-center ml-4">
                  +42
                </span>
              </div>
              <span className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter">
                {card.tag}
              </span>
            </div>
          </div>
        ))}
      </div>
    </ParticipantLayout>
  );
}
