import React from 'react';
import { Input } from './ui/Input';

interface ProjectTargetData {
  target: number;
  actual: number;
}

interface ProjectTargetProps {
  value: ProjectTargetData;
  onChange: (value: ProjectTargetData) => void;
  unit?: string;
}

export function ProjectTarget({ value, onChange, unit = 'm' }: ProjectTargetProps) {
  const data = value || { target: 0, actual: 0 };
  
  const diff = data.actual - data.target;
  const diffPercent = data.target > 0 ? (diff / data.target) * 100 : 0;
  
  let color = 'text-slate-800';
  let bgColor = 'bg-slate-50';
  let borderColor = 'border-slate-200';
  
  if (data.target > 0 && data.actual > 0) {
    if (Math.abs(diffPercent) <= 5) {
      color = 'text-emerald-700';
      bgColor = 'bg-emerald-50';
      borderColor = 'border-emerald-200';
    } else if (Math.abs(diffPercent) <= 15) {
      color = 'text-amber-700';
      bgColor = 'bg-amber-50';
      borderColor = 'border-amber-200';
    } else {
      color = 'text-red-700';
      bgColor = 'bg-red-50';
      borderColor = 'border-red-200';
    }
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Projet (Cible)</label>
          <div className="relative">
            <Input 
              type="number"
              className="font-mono text-xl h-14 bg-white"
              value={data.target || ''}
              onChange={e => onChange({ ...data, target: parseFloat(e.target.value) || 0 })}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{unit}</span>
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Réalisé</label>
          <div className="relative">
            <Input 
              type="number"
              className="font-mono text-xl h-14 bg-white"
              value={data.actual || ''}
              onChange={e => onChange({ ...data, actual: parseFloat(e.target.value) || 0 })}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{unit}</span>
          </div>
        </div>
      </div>
      
      {data.target > 0 && data.actual > 0 && (
        <div className={`p-3 rounded-lg border flex items-center justify-between ${bgColor} ${borderColor} ${color}`}>
           <span className="font-bold text-sm">Écart :</span>
           <span className="font-mono font-bold text-lg">
             {diff > 0 ? '+' : ''}{diff} {unit} ({diffPercent > 0 ? '+' : ''}{diffPercent.toFixed(1)}%)
           </span>
        </div>
      )}
    </div>
  );
}
