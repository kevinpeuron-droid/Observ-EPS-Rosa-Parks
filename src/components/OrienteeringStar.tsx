import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Play, Square, Check, X, Clock } from 'lucide-react';

type BaliseStatus = 'idle' | 'running' | 'ok' | 'wrong';

type BaliseState = {
  status: BaliseStatus;
  startTime?: number;
  elapsedMs?: number;
};

interface OrienteeringProps {
  baliseCount: number;
  value: Record<string, BaliseState>;
  onChange: (value: Record<string, BaliseState>) => void;
}

export function OrienteeringStar({ baliseCount, value, onChange }: OrienteeringProps) {
  const [activeBalise, setActiveBalise] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    let interval: any;
    if (activeBalise) {
      interval = setInterval(() => setNow(Date.now()), 100);
    }
    return () => clearInterval(interval);
  }, [activeBalise]);

  const handleBaliseClick = (index: number) => {
    const baliseId = String(index);
    const state = value[baliseId] || { status: 'idle' };

    if (state.status === 'idle') {
      // Start
      onChange({
        ...value,
        [baliseId]: { status: 'running', startTime: Date.now() }
      });
      setActiveBalise(baliseId);
    } else if (state.status === 'running') {
      // It's running, opening validation modal could be done, but since it's inline, we just stop it and wait for validation
      // Let's just keep it simple: if they click again, they have to choose OK or Wrong
      // We will render action buttons when a balise is running
    }
  };

  const handleValidate = (index: number, status: 'ok' | 'wrong') => {
    const baliseId = String(index);
    const state = value[baliseId];
    if (!state || !state.startTime) return;

    const elapsedMs = Date.now() - state.startTime;
    onChange({
      ...value,
      [baliseId]: { status, startTime: state.startTime, elapsedMs }
    });
    if (activeBalise === baliseId) {
      setActiveBalise(null);
    }
  };

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const balises = Array.from({ length: baliseCount }, (_, i) => i + 1);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {balises.map(index => {
        const baliseId = String(index);
        const state = value[baliseId] || { status: 'idle' };
        
        if (state.status === 'running') {
          const currentElapsed = Date.now() - (state.startTime || Date.now());
          return (
            <div key={index} className="col-span-2 sm:col-span-3 bg-blue-50 border-2 border-blue-400 p-4 rounded-xl flex flex-col gap-3 shadow-md animate-in zoom-in-95">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-900 text-lg">Balise {index} en cours...</span>
                <span className="font-mono text-2xl font-bold text-blue-700 flex items-center gap-2">
                  <Clock className="w-5 h-5 animate-pulse" />
                  {formatTime(currentElapsed)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button variant="outline" className="bg-white hover:bg-emerald-50 border-emerald-200 text-emerald-700 hover:text-emerald-800" onClick={() => handleValidate(index, 'ok')}>
                  <Check className="w-5 h-5 mr-2" />
                  Validée
                </Button>
                <Button variant="outline" className="bg-white hover:bg-red-50 border-red-200 text-red-700 hover:text-red-800" onClick={() => handleValidate(index, 'wrong')}>
                  <X className="w-5 h-5 mr-2" />
                  Fausse
                </Button>
              </div>
            </div>
          );
        }

        let bgClass = "bg-slate-100 hover:bg-slate-200 text-slate-700";
        let timeLabel = "";

        if (state.status === 'ok') {
          bgClass = "bg-emerald-100 text-emerald-800 border-2 border-emerald-200";
          timeLabel = formatTime(state.elapsedMs || 0);
        } else if (state.status === 'wrong') {
          bgClass = "bg-red-100 text-red-800 border-2 border-red-200 opacity-75";
          timeLabel = formatTime(state.elapsedMs || 0);
        }

        return (
          <button
            key={index}
            onClick={() => handleBaliseClick(index)}
            disabled={state.status !== 'idle' || (activeBalise !== null && activeBalise !== baliseId)}
            className={`p-4 rounded-xl font-bold text-lg flex flex-col items-center justify-center gap-1 transition-all ${bgClass} ${(state.status !== 'idle' || activeBalise !== null) ? 'cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
          >
            <span>Balise {index}</span>
            {timeLabel && <span className="text-sm font-mono opacity-80">{timeLabel}</span>}
            {state.status === 'wrong' && <X className="w-5 h-5 mt-1 opacity-70" />}
            {state.status === 'ok' && <Check className="w-5 h-5 mt-1 opacity-70" />}
          </button>
        );
      })}
    </div>
  );
}
