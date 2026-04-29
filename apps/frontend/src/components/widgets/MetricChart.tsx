import React from 'react';

export const MetricChart = () => {
  const data = [
    { year: '2024', val: 40, color: 'bg-blue-200' },
    { year: '2025', val: 60, color: 'bg-blue-400' },
    { year: '2026', val: 90, color: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-3 mt-4">
      {data.map((item) => (
        <div key={item.year} className="flex items-center gap-4">
          <span className="text-[10px] font-bold text-slate-400 w-8">
            {item.year}
          </span>
          <div className="flex-1 h-3 bg-slate-50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${item.color}`}
              style={{ width: `${item.val}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
