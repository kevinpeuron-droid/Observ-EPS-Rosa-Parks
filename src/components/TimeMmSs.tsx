import React from 'react';
import { UserX, ShieldAlert, RotateCcw } from 'lucide-react';
import { Button } from './ui/Button';

interface TimeMmSsData {
  minutes: number;
  seconds: number;
}

interface TimeMmSsProps {
  value: any;
  onChange: (value: any) => void;
}

export function TimeMmSs({ value, onChange }: TimeMmSsProps) {
  if (value === 'A' || value === 'a') {
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-red-50 border border-red-200 rounded-xl gap-2 text-center">
        <div className="flex items-center gap-2 text-red-700 font-bold text-lg">
          <UserX className="w-5 h-5 text-red-600" />
          ABSENT (A)
        </div>
        <p className="text-xs text-red-500">Chrono non réalisé pour cause d'absence</p>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => onChange({ minutes: 0, seconds: 0 })}
          className="mt-1 bg-white text-xs text-slate-700"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          Saisir un chrono
        </Button>
      </div>
    );
  }

  if (value === 'D' || value === 'd') {
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-amber-50 border border-amber-200 rounded-xl gap-2 text-center">
        <div className="flex items-center gap-2 text-amber-700 font-bold text-lg">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
          DISPENSÉ (D)
        </div>
        <p className="text-xs text-amber-600">Élève dispensé médicalement</p>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => onChange({ minutes: 0, seconds: 0 })}
          className="mt-1 bg-white text-xs text-slate-700"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          Saisir un chrono
        </Button>
      </div>
    );
  }

  const data: TimeMmSsData = (typeof value === 'object' && value) ? value : { minutes: 0, seconds: 0 };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim().toUpperCase();
    if (val === 'A') { onChange('A'); return; }
    if (val === 'D') { onChange('D'); return; }
    const num = val === '' ? 0 : parseInt(val, 10);
    if (!isNaN(num)) {
      onChange({ ...data, minutes: Math.max(0, num) });
    }
  };

  const handleSecondsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim().toUpperCase();
    if (val === 'A') { onChange('A'); return; }
    if (val === 'D') { onChange('D'); return; }
    const num = val === '' ? 0 : parseInt(val, 10);
    if (!isNaN(num)) {
      onChange({ ...data, seconds: Math.max(0, Math.min(59, num)) });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex flex-col items-center">
          <input
            type="text"
            inputMode="numeric"
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
            type="text"
            inputMode="numeric"
            value={data.seconds || ''}
            onChange={handleSecondsChange}
            placeholder="00"
            className="w-24 h-16 text-center text-4xl font-bold font-mono rounded-lg border-2 border-slate-200 focus:border-blue-500 focus:outline-none bg-white touch-manipulation"
          />
          <span className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-wider">Secondes</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => onChange('A')}
          className="text-xs font-bold px-3 py-1 rounded-full border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
        >
          Absent (A)
        </button>
        <button
          type="button"
          onClick={() => onChange('D')}
          className="text-xs font-bold px-3 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
        >
          Dispensé (D)
        </button>
      </div>
    </div>
  );
}
