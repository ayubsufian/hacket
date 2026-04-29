import React from 'react';
import { ParticipantLayout } from '@/layouts/ParticipantLayout';
import { Spinner } from '@/components/shared/Spinner';

export default function LoadingState() {
  return (
    <ParticipantLayout>
      <div className="flex flex-col h-full">
        {/* --- Header Section --- */}
        <div className="mb-12">
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">
            Loading State
          </h1>
          <p className="text-sm text-slate-500 font-medium max-w-xl leading-relaxed">
            Skeleton placeholders and connection-aware feedback, aligned to the
            Discovery Hub visual system.
          </p>
        </div>

        {/* --- Central Loading Area --- */}
        <div className="flex-1 flex flex-col items-center justify-start pt-20">
          <Spinner label="Fetching Event Data..." />

          {/* Optional: Placeholder Skeletons (As mentioned in the screenshot subtitle) */}
          <div className="w-full max-w-4xl mt-16 grid grid-cols-3 gap-6 opacity-20 pointer-events-none grayscale">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 bg-slate-800/50 border border-slate-700 rounded-3xl animate-pulse"
              ></div>
            ))}
          </div>
        </div>

        {/* --- Connection Feedback (Bottom Right Concept) --- */}
        <div className="fixed bottom-10 right-10">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
              Connection Stable
            </span>
          </div>
        </div>
      </div>
    </ParticipantLayout>
  );
}
