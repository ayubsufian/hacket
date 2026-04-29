import React from 'react';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  label?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ label = 'Loading...' }) => {
  return (
    <div className="flex items-center gap-3 bg-blue-600/5 border border-blue-500/20 px-6 py-3 rounded-full backdrop-blur-md shadow-[0_0_30px_rgba(37,99,235,0.1)]">
      <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
      <span className="text-[11px] font-black text-blue-400 uppercase tracking-widest">
        {label}
      </span>
    </div>
  );
};
