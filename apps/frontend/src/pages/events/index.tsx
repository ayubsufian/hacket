import React from 'react';
import Head from 'next/head';
import { Button } from '@/components/shared/Button';
import { MetricChart } from '@/components/widgets/MetricChart';
import {
  Search,
  Globe,
  Moon,
  Calendar,
  MapPin,
  TrendingUp,
  Trophy,
  Leaf,
} from 'lucide-react';

export default function DiscoveryHub() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
      <Head>
        <title>HackET | Discovery Hub</title>
      </Head>

      {/* --- Top Navigation --- */}
      <nav className="flex items-center justify-between px-8 py-4 bg-white border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white font-bold italic">H</span>
          </div>
          <span className="font-bold text-slate-800 tracking-tight">
            HackET
          </span>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-bold border border-emerald-100 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            T-MINUS: 14D 03H 45M 22S UNTIL NEXT HACKATHON
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200">
            <button className="p-1.5 text-slate-400 hover:text-slate-600">
              <Moon size={16} />
            </button>
            <button className="p-1.5 text-slate-400 hover:text-slate-600">
              <Globe size={16} />
            </button>
          </div>
          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
            ORGANIZER
          </span>
          <Button variant="ghost" size="sm">
            Login
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-blue-600 text-blue-600"
          >
            Register
          </Button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* --- Hero Section --- */}
        <section className="text-center mb-16">
          <h1 className="text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
            Discovery Hub <br />
            <span className="text-blue-600 font-black">
              For African Builders
            </span>
          </h1>
          <p className="text-slate-500 max-w-lg mx-auto mb-8 text-sm leading-relaxed">
            The decentralized network for tech events, hybrid hackathons, and
            builder communities.
            <span className="block font-medium text-slate-400 mt-1">
              የቴክኖሎጂ ረዳት እና ማህበረሰብ
            </span>
          </p>

          <div className="relative max-w-xl mx-auto">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="text-slate-400" size={18} />
            </div>
            <input
              type="text"
              placeholder="Search hubs, hackathons, or builders..."
              className="w-full bg-white border border-slate-200 rounded-xl py-4 pl-12 pr-4 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm transition-all"
            />
          </div>
        </section>

        {/* --- Featured Grid --- */}
        <div className="grid grid-cols-12 gap-6">
          {/* Main Event Card */}
          <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl border border-slate-100 shadow-sm p-8 flex flex-col justify-between overflow-hidden relative">
            <div>
              <div className="flex justify-between items-start mb-8">
                <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>{' '}
                  LIVE SPRINT
                </span>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100 flex items-center gap-1">
                  Addis Tech Hub{' '}
                  <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                  </div>
                </span>
              </div>

              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Ethio FinTech Hack 2026
              </h2>
              <p className="text-slate-500 text-sm max-w-md leading-relaxed mb-8">
                Build the future of decentralized finance for the unbanked. A
                48-hour intensive sprint featuring mentorship from top banking
                leaders across the continent.
              </p>

              <div className="flex gap-12">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Schedule
                  </p>
                  <div className="flex items-center gap-2 text-blue-600 font-bold text-xs">
                    <Calendar size={14} /> OCT 15 - 17, 2026{' '}
                    <span className="text-slate-300 font-normal ml-1">
                      (UTC+3 - 7)
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Location
                  </p>
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                    <MapPin size={14} className="text-slate-400" /> ADDIS ABABA
                    / HYBRID
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ecosystem Growth Card */}
          <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 text-sm">
                Ecosystem Growth
              </h3>
              <TrendingUp size={16} className="text-emerald-500" />
            </div>
            <MetricChart />
            <p className="mt-8 text-[11px] text-slate-400 leading-tight">
              Active builders registered in the network increased by{' '}
              <span className="text-emerald-500 font-bold">+142%</span> this
              year.
            </p>
          </div>

          {/* Judging Card */}
          <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="bg-slate-100 p-1 rounded">
                  <Trophy size={14} className="text-slate-500" />
                </div>
                <span className="text-xs font-bold text-slate-800">
                  Live Judging
                </span>
              </div>
              <span className="text-[9px] font-bold text-blue-600 uppercase tracking-tighter">
                Team Alpha
              </span>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <div className="flex justify-between text-[10px] font-bold mb-1">
                  <span className="text-slate-400">Innovation Score</span>
                  <span className="text-blue-600">8.5/10</span>
                </div>
                <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: '85%' }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-bold mb-1">
                  <span className="text-slate-400">Technical Execution</span>
                  <span className="text-emerald-500">6.0/10</span>
                </div>
                <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400"
                    style={{ width: '60%' }}
                  ></div>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full text-[10px] font-bold uppercase tracking-widest py-5"
            >
              Submit Scores
            </Button>
          </div>

          {/* Upcoming Event Snippet */}
          <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 relative">
            <div className="flex justify-between items-start mb-4">
              <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                Upcoming
              </span>
              <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-100">
                <Leaf size={14} />
              </div>
            </div>
            <h4 className="font-bold text-slate-800 mb-2">
              Green Agri-Tech Sprint
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Developing sustainable models using localized datasets for East
              African farmers.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
