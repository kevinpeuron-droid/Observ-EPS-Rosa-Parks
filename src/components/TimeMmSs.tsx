import React from 'react';

interface TimeMmSsData {
  minutes: number;
  seconds: number;
}

interface TimeMmSsProps {
  value: TimeMmSsData;
  onChange: (value: TimeMmSsData) => void;
}

export function TimeMmSs({ value, onChange }: TimeMmSsProps) {
  const data = value || { minutes: 0, seconds: 0 };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const num = val === '' ? 0 : parseInt(val, 10);
    if (!isNaN(num)) {
      onChange({ ...data, minutes: Math.max(0, num) });
    }
  };

  const handleSecondsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const num = val === '' ? 0 : parseInt(val, 10);
    if (!isNaN(num)) {
      onChange({ ...data, seconds: Math.max(0, Math.min(59, num)) });
    }
  };

  return (
    <div className="flex items-center justify-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
      <div className="flex flex-col items-center">
        <input
          type="number"
          min="0"
          value={data.minutes || ''}
          onChange={handleMinutesChange}
          placeholder="00"
          className="w-24 h-16 text-center text-4xl font-bold font-mono rounded-lg border-2 border-slate-200 focus:border-blue-500 focus:outline-none bg-white touch-manipulation"
        />
        <span className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-wider">Minutes</span>
      </div>
      
      <div className="text-4xl font-bold text-slate-300 pb-6">:</div>
      
      <div className="flex flex-col items-center">
        <input
          type="number"
          min="0"
          max="59"
          value={data.seconds || ''}
          onChange={handleSecondsChange}
          placeholder="00"
          className="w-24 h-16 text-center text-4xl font-bold font-mono rounded-lg border-2 border-slate-200 focus:border-blue-500 focus:outline-none bg-white touch-manipulation"
        />
        <span className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-wider">Secondes</span>
      </div>
    </div>
  );
}
