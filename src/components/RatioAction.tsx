import React from 'react';
import { Button } from './ui/Button';
import { Check, X } from 'lucide-react';

interface RatioActionData {
  success: number;
  fail: number;
}

interface RatioActionProps {
  value: RatioActionData;
  onChange: (value: RatioActionData) => void;
  label?: string;
}

export function RatioAction({ value, onChange, label = 'Action' }: RatioActionProps) {
  const data = value || { success: 0, fail: 0 };
  const total = data.success + data.fail;
  const ratio = total > 0 ? Math.round((data.success / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
         <div className="text-sm text-slate-500 font-bold uppercase tracking-wider">Réussite</div>
         <div className="text-xl font-bold font-mono text-slate-800">
           {total > 0 ? `${ratio}%` : '-'}
         </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => onChange({ ...data, success: data.success + 1 })}
          className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border border-emerald-200 p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors active:scale-95"
        >
          <Check className="w-8 h-8" />
          <span className="font-bold">Réussi ({data.success})</span>
        </button>
        <button
          onClick={() => onChange({ ...data, fail: data.fail + 1 })}
          className="bg-red-100 hover:bg-red-200 text-red-700 border border-red-200 p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors active:scale-95"
        >
          <X className="w-8 h-8" />
          <span className="font-bold">Raté ({data.fail})</span>
        </button>
      </div>
      <div className="flex justify-between mt-1 px-2">
         <button 
           onClick={() => data.success > 0 && onChange({ ...data, success: data.success - 1 })}
           className="text-xs text-slate-400 hover:text-emerald-600 underline"
         >
           -1 Réussi
         </button>
         <button 
           onClick={() => data.fail > 0 && onChange({ ...data, fail: data.fail - 1 })}
           className="text-xs text-slate-400 hover:text-red-600 underline"
         >
           -1 Raté
         </button>
      </div>
    </div>
  );
}
