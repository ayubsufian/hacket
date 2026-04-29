import React from 'react';
import {
  LayoutDashboard,
  Compass,
  Calendar,
  Trophy,
  Search,
  Globe,
  Moon,
  ShieldCheck,
  Settings2,
  CalendarCheck,
} from 'lucide-react';
import { Button } from '@/components/shared/Button';

export default function AmharicInterface() {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      {/* --- Light Sidebar --- */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col p-6 space-y-8">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white font-bold italic">H</span>
          </div>
          <span className="text-xl font-bold tracking-tighter">hackET</span>
        </div>

        <nav className="flex-1 space-y-2">
          <div className="flex items-center gap-3 px-3 py-2 text-slate-400">
            <LayoutDashboard size={18} />{' '}
            <span className="text-[13px] font-medium">ዳሽቦርድ</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
            <div className="flex items-center gap-3">
              <Compass size={18} />{' '}
              <span className="text-[13px] font-bold">ማግኘት ማእከል</span>
            </div>
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
          </div>
          <div className="flex items-center gap-3 px-3 py-2 text-slate-400">
            <Calendar size={18} />{' '}
            <span className="text-[13px] font-medium">የእኔ ኩነቶች</span>
          </div>
          <div className="flex items-center gap-3 px-3 py-2 text-slate-400">
            <Trophy size={18} />{' '}
            <span className="text-[13px] font-medium">የመሪዎች ሰሌዳ</span>
          </div>
        </nav>

        {/* Localized Search in Sidebar */}
        <div className="relative mt-auto mb-6">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500"
          />
          <input
            type="text"
            placeholder="ጥናት ማእከል"
            className="w-full bg-white border border-blue-200 rounded-lg py-2 pl-9 pr-4 text-xs font-bold text-blue-700 outline-none"
          />
        </div>

        <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Dawit"
            className="w-10 h-10 rounded-lg border border-white"
            alt=""
          />
          <div>
            <p className="text-sm font-bold">ዳዊት መ.</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              LVL 4 BUILDER
            </p>
          </div>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <main className="flex-1 p-10 overflow-y-auto">
        <header className="flex justify-end items-center gap-3 mb-10">
          <div className="flex bg-white border border-slate-200 p-1 rounded-lg">
            <button className="p-1.5 text-slate-400 hover:text-slate-900">
              <Moon size={16} />
            </button>
            <button className="p-1.5 text-blue-600 border-l border-slate-100 ml-1 pl-2">
              <Globe size={16} />
            </button>
          </div>
          <Button
            variant="primary"
            size="sm"
            className="bg-blue-600 text-[11px] px-6 font-bold"
          >
            ተሳታፊ
          </Button>
        </header>

        <div className="grid grid-cols-12 gap-6">
          {/* Hero Mode Banner */}
          <div className="col-span-12 bg-white border border-slate-200 rounded-2xl p-10 relative overflow-hidden border-t-4 border-t-blue-600 shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <span className="text-[10px] font-bold text-blue-500 tracking-widest uppercase">
                AMHARIC MODE ENABLED
              </span>
              <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-2 py-1 rounded">
                አማርኛ ስሪት
              </span>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 leading-tight mb-4 max-w-2xl">
              በሀገር ውስጥ እና በዓለም አቀፍ አቀፍ የፈጠራ ውድድሮችን በቀላሉ ያግኙ።
            </h2>
            <p className="text-slate-400 text-sm max-w-xl leading-[1.8]">
              የhackET ማግኘት ማእከል አማርኛ ቋንቋ እንዲደግፍ በመደረጉ በአካባቢዎ እና በግል ፍላጎትዎ ላይ
              ተመስርተው ቴክኖሎጂ ተኮር ኩነቶችን እንዲመርጡ ያደርጋል።
            </p>
            <div className="absolute right-10 bottom-10 text-right">
              <p className="text-5xl font-black text-slate-900 leading-none">
                24
              </p>
              <p className="text-[10px] font-bold text-slate-300 uppercase mt-2 tracking-tighter">
                LOCALIZED MODULES
              </p>
            </div>
          </div>

          {/* Discovery Card */}
          <div className="col-span-5 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-6">
              Discovery Hub
            </p>
            <h3 className="text-lg font-bold mb-4">
              ለእርስዎ የተመረጡ ውድድሮች እና ተዛማጅ ፕሮግራሞች መፈለጊያ
            </h3>
            <p className="text-xs text-slate-400 leading-[1.8] mb-12">
              የፍለጋ መስፈርቶቹን ተገቢ ባልሆነ መንገድ ካስገቡ ሲስተሙ በራስ-ሰር በመታገዝ ትክክለኛውን ኩነት
              በጥንቃቄ እንዲያገኙ ይረዳዎታል።
            </p>
            <div className="flex gap-2">
              {['ቢዝነስ', 'ጤና ጥበቃ', 'ብሎክ ቼይን'].map((t) => (
                <span
                  key={t}
                  className="px-3 py-1 bg-slate-50 border border-slate-100 rounded text-[10px] font-bold text-slate-500"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Calendar Sync Card */}
          <div className="col-span-4 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col">
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-6">
              Calendar Sync
            </p>
            <h3 className="text-lg font-bold mb-4">
              የመስፈርቱን እና የኢትዮጵያ ቀን ቅርጾች በአንድ ቦታ
            </h3>
            <p className="text-xs text-slate-400 leading-[1.8] mb-8">
              ቀን መቁጠሪያው በሁለቱም አቆጣጠሮች እንዲታይ በማድረግ ለመጠቀም ቀላል ያደርገዋል።
            </p>

            <div className="mt-auto space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Next Deadline
                </span>
                <span className="text-sm font-bold text-slate-800">
                  ሚያዝያ 18
                </span>
              </div>
              <div className="p-3 border border-slate-100 rounded-xl flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Format
                </span>
                <span className="text-sm font-bold text-slate-800">
                  ግእዝ + ዓ.ም
                </span>
              </div>
            </div>
          </div>

          {/* Trust Signals Card */}
          <div className="col-span-3 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-6">
              Trust Signals
            </p>
            <h3 className="text-lg font-bold mb-6 leading-tight">
              የተረጋገጡ አዘጋጆች እና የስኬት ምልክቶች
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-blue-50 rounded-lg text-blue-500">
                    <ShieldCheck size={16} />
                  </div>
                  <span className="text-xs font-bold text-slate-700">
                    የተረጋገጠ ማእከል ምልክት
                  </span>
                </div>
                <span className="text-[9px] font-bold text-slate-300">
                  UC0002
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400">
                    <Settings2 size={16} />
                  </div>
                  <span className="text-xs font-bold text-slate-700">
                    የስኬት ባጅ ክፍሎች
                  </span>
                </div>
                <span className="text-[9px] font-bold text-slate-300 uppercase">
                  FR-SYS-08
                </span>
              </div>
            </div>
          </div>

          {/* Personalization Stats Card */}
          <div className="col-span-12 lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-4">
                  Personalization
                </p>
                <h3 className="text-lg font-bold mb-2">
                  ቋንቋ ምርጫዎች፣ ማመቻቸቶች እና የተጠቃሚ አቀማመጥ
                </h3>
                <p className="text-xs text-slate-400 leading-[1.8] max-w-md">
                  የአማርኛ ፊደላት ቆንጆ እንዲሆኑና ለማንበብ እንዲመቹ ተደርገዋል።
                </p>
              </div>
              <CalendarCheck
                className="text-blue-200"
                size={48}
                strokeWidth={1}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 mt-8">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">
                  Visible Labels
                </p>
                <p className="text-lg font-black text-slate-900">14 ክፍሎች</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">
                  Line Height
                </p>
                <p className="text-lg font-black text-slate-900">1.6 ተነባቢነት</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">
                  Bento Scale
                </p>
                <p className="text-lg font-black text-slate-900">በሂሳባዊ ስሌት</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
