import React from 'react';
import { ParticipantLayout } from '@/layouts/ParticipantLayout';
import {
  Search,
  X,
  Bookmark,
  CheckCircle2,
  Star,
  ShieldCheck,
  TrendingUp,
  History,
  Users,
} from 'lucide-react';
import { Button } from '@/components/shared/Button';

export default function SearchState() {
  const categories = [
    'All results',
    'Hackathons',
    'Hubs',
    'Projects',
    'People',
    'Addis Ababa',
  ];

  return (
    <ParticipantLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tighter uppercase mb-1">
          Search State
        </h1>
        <p className="text-sm text-slate-500 font-medium">
          Active search, suggested correction, and focused filtering in the same
          glass language as the Discovery Hub.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* --- Main Search & Results Column --- */}
        <div className="col-span-8 space-y-6">
          {/* Search Input Area */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-bold text-blue-500 uppercase tracking-widest">
              <div className="p-1 bg-blue-500/10 rounded">
                <Search size={12} />
              </div>
              Discovery search
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center text-slate-500">
                <Search size={20} />
              </div>
              <input
                type="text"
                defaultValue="Fintech"
                className="w-full bg-slate-900/50 border-2 border-slate-800 rounded-2xl py-5 pl-12 pr-12 text-white font-bold focus:border-blue-500/50 focus:outline-none transition-all shadow-xl shadow-blue-500/5"
              />
              <div className="absolute inset-y-0 right-4 flex items-center text-slate-500 cursor-pointer hover:text-white">
                <X size={18} />
              </div>
            </div>

            <p className="text-xs text-slate-500 flex items-center gap-2">
              <span className="opacity-50">↳</span>
              Showing results for{' '}
              <span className="text-white font-bold">Fintech</span>.
              <span className="text-blue-500 cursor-pointer hover:underline ml-1">
                Search for fin-tech instead?
              </span>
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              {categories.map((cat, i) => (
                <button
                  key={cat}
                  className={`px-4 py-1.5 rounded-full text-[11px] font-black border transition-all ${
                    i === 0
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* 1. Hackathon Result */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 relative group hover:border-blue-500/30 transition-all">
              <div className="flex justify-between items-start mb-4">
                <span className="bg-emerald-500/10 text-emerald-500 text-[9px] font-black px-2 py-1 rounded border border-emerald-500/20">
                  LIVE EVENT
                </span>
                <Bookmark
                  size={16}
                  className="text-slate-700 group-hover:text-slate-500"
                />
              </div>
              <h3 className="text-xl font-black text-white mb-2 tracking-tighter uppercase">
                Ethio Fintech Hack 2026
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Micro-lending, payment rails, and compliance tooling for East
                African builders and teams.
              </p>
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter">
                  Dec 10 — 12 / Hybrid
                </span>
                <div className="flex -space-x-1.5">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-full border border-slate-900 bg-slate-800"
                    ></div>
                  ))}
                  <span className="text-[8px] font-bold text-slate-500 self-center ml-2">
                    +84
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Hub Result */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 group hover:border-blue-500/30 transition-all">
              <div className="flex justify-between items-start mb-4">
                <span className="bg-blue-500/10 text-blue-500 text-[9px] font-black px-2 py-1 rounded border border-blue-500/20 flex items-center gap-1">
                  Verified hub <CheckCircle2 size={10} />
                </span>
              </div>
              <h3 className="text-xl font-black text-white mb-2 tracking-tighter uppercase leading-tight">
                Fintech Innovators Hub
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                A curated community for founders, product teams, and engineers
                building financial infrastructure.
              </p>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  1,204 members
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-[10px] font-bold bg-slate-800 border-slate-700 text-white"
                >
                  Explore
                </Button>
              </div>
            </div>

            {/* 3. Project Result */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 group hover:border-blue-500/30 transition-all">
              <div className="flex justify-between items-start mb-4">
                <span className="bg-slate-800 text-slate-400 text-[9px] font-black px-2 py-1 rounded border border-slate-700">
                  PROJECT
                </span>
                <Star
                  size={16}
                  className="text-slate-700 group-hover:text-yellow-500/50 transition-colors"
                />
              </div>
              <h3 className="text-xl font-black text-white mb-2 tracking-tighter uppercase">
                Microlend DeFi
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Peer-to-peer credit rails for unbanked users with transparent
                smart-contract scoring.
              </p>
              <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-tighter">
                <span className="text-slate-600">Updated 2d ago</span>
                <span className="text-blue-500">24 Stars</span>
              </div>
            </div>

            {/* 4. Builder Result */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 group hover:border-blue-500/30 transition-all">
              <div className="flex justify-between items-start mb-6">
                <span className="bg-slate-800 text-slate-400 text-[9px] font-black px-2 py-1 rounded border border-slate-700">
                  BUILDER
                </span>
                <ShieldCheck size={18} className="text-emerald-500/40" />
              </div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
                  <img
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Dawit"
                    alt="User"
                  />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tighter uppercase">
                    Dawit M.
                  </h3>
                  <span className="text-[9px] font-bold text-blue-500 tracking-widest uppercase">
                    LVL 4 BUILDER
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="bg-blue-500/10 text-blue-400 text-[9px] font-black px-2 py-1 rounded uppercase">
                  FinTech
                </span>
                <span className="bg-slate-800 text-slate-400 text-[9px] font-black px-2 py-1 rounded uppercase">
                  Solidity
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* --- Sidebar Analysis Columns --- */}
        <div className="col-span-4 space-y-6">
          {/* Search Summary */}
          <div className="bg-slate-900/30 border border-slate-800/60 rounded-3xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-sm font-black text-white uppercase tracking-tighter">
                Search Summary
              </h4>
              <div className="w-6 h-6 bg-blue-600/20 rounded-md flex items-center justify-center text-[8px] font-bold text-blue-500">
                AF2
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800/50 pb-3">
                <span className="text-[11px] font-medium text-slate-500">
                  Results surfaced
                </span>
                <span className="text-sm font-black text-white">248</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-800/50 pb-3">
                <span className="text-[11px] font-medium text-slate-500">
                  Top cluster
                </span>
                <span className="text-[11px] font-black text-blue-500 uppercase">
                  Fintech
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-medium text-slate-500">
                  Matched intent
                </span>
                <span className="text-[11px] font-black text-emerald-500 uppercase">
                  High
                </span>
              </div>
            </div>
          </div>

          {/* Active Filters */}
          <div className="bg-slate-900/30 border border-slate-800/60 rounded-3xl p-6">
            <h4 className="text-sm font-black text-white uppercase tracking-tighter mb-4">
              Active Filters
            </h4>
            <div className="flex flex-wrap gap-2">
              {['All results', 'Fintech', 'Hybrid'].map((f) => (
                <div
                  key={f}
                  className="flex items-center gap-1.5 bg-blue-600 px-3 py-1.5 rounded-full text-[10px] font-black text-white"
                >
                  {f} <X size={10} className="cursor-pointer" />
                </div>
              ))}
            </div>
          </div>

          {/* Saved Searches */}
          <div className="bg-slate-900/30 border border-slate-800/60 rounded-3xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-sm font-black text-white uppercase tracking-tighter">
                Saved Searches
              </h4>
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                2 saved
              </span>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-slate-700 group transition-all">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[11px] font-black text-blue-500 group-hover:text-blue-400">
                    # fintech
                  </span>
                  <span className="text-[8px] font-bold text-slate-600 uppercase">
                    Updated now
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  Watch hybrid hackathons, verified hubs, and active projects.
                </p>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-slate-700 transition-all opacity-60 hover:opacity-100">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[11px] font-black text-slate-400">
                    # ai-health
                  </span>
                  <span className="text-[8px] font-bold text-slate-600 uppercase">
                    Yesterday
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  Keep tabs on health-tech teams and remote-friendly
                  collaboration.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ParticipantLayout>
  );
}
