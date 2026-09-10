import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Play, Pause, RotateCcw, Plus, Minus, Map, Compass } from 'lucide-react';

export interface OrienteeringLogData {
  raceType: string;
  tactic: string;
  balisesOk: number;
  errors: number;
  globalTimeMs: number;
  startTime?: number;
  isRunning: boolean;
}

interface OrienteeringLogProps {
  value: OrienteeringLogData;
  onChange: (value: OrienteeringLogData) => void;
}

export function OrienteeringLog({ value, onChange }: OrienteeringLogProps) {
  const data = value || {
    raceType: '',
    tactic: '',
    balisesOk: 0,
    errors: 0,
    globalTimeMs: 0,
    isRunning: false
  };

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let interval: any;
    if (data.isRunning) {
      interval = setInterval(() => setNow(Date.now()), 1000);
    }
    return () => clearInterval(interval);
  }, [data.isRunning]);

  const toggleTimer = () => {
    if (data.isRunning) {
      // Pause
      const elapsed = Date.now() - (data.startTime || Date.now());
      onChange({ 
        ...data, 
        isRunning: false, 
        globalTimeMs: (data.globalTimeMs || 0) + elapsed, 
        startTime: undefined 
      });
    } else {
      // Start
      onChange({ 
        ...data, 
        isRunning: true, 
        startTime: Date.now() 
      });
    }
  };

  const resetTimer = () => {
    onChange({ 
      ...data, 
      isRunning: false, 
      globalTimeMs: 0, 
      startTime: undefined 
    });
  };

  const updateCounter = (field: 'balisesOk' | 'errors', delta: number) => {
    onChange({
      ...data,
      [field]: Math.max(0, (data[field] || 0) + delta)
    });
  };

  const currentElapsed = data.isRunning 
    ? (data.globalTimeMs || 0) + (now - (data.startTime || now))
    : (data.globalTimeMs || 0);

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 w-full bg-slate-50 p-4 rounded-xl border border-slate-200">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Type de course</label>
          <select 
            className="w-full h-10 px-3 rounded-lg border-2 border-slate-200 bg-white focus:border-emerald-600 focus:outline-none text-sm"
            value={data.raceType || ''}
            onChange={e => onChange({ ...data, raceType: e.target.value })}
          >
            <option value="" disabled>-- Sélectionner --</option>
            <option value="Course en Étoile">Course en Étoile</option>
            <option value="Course en Papillon">Course en Papillon</option>
            <option value="Recherche au score (45')">Recherche au score (45')</option>
            <option value="Parcours en ligne">Parcours en ligne</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Choix tactique</label>
          <select 
            className="w-full h-10 px-3 rounded-lg border-2 border-slate-200 bg-white focus:border-emerald-600 focus:outline-none text-sm"
            value={data.tactic || ''}
            onChange={e => onChange({ ...data, tactic: e.target.value })}
          >
            <option value="" disabled>-- Sélectionner --</option>
            <option value="Sécurité (Lignes directrices)">Sécurité (Lignes directrices)</option>
            <option value="Risque / Coupe à l'azimut">Risque / Coupe à l'azimut</option>
            <option value="Mixte">Mixte</option>
            <option value="Suivi des autres (Non autonome)">Suivi des autres (Non autonome)</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border-2 border-emerald-100 shadow-sm">
        <div className="text-xs font-bold text-emerald-600 uppercase mb-2">Chronomètre Global</div>
        <div className="text-5xl font-mono font-bold text-slate-800 tracking-wider mb-4">
          {formatTime(currentElapsed)}
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={toggleTimer} 
            className={`w-32 flex items-center justify-center gap-2 ${data.isRunning ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
          >
            {data.isRunning ? <><Pause className="w-5 h-5" /> Pause</> : <><Play className="w-5 h-5" /> {data.globalTimeMs > 0 ? 'Reprendre' : 'Démarrer'}</>}
          </Button>
          <Button variant="outline" onClick={resetTimer} className="px-3 border-slate-300 text-slate-500 hover:bg-slate-100">
            <RotateCcw className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col items-center bg-emerald-50 p-3 rounded-xl border border-emerald-200">
          <Map className="w-6 h-6 text-emerald-600 mb-1" />
          <span className="text-xs font-bold text-emerald-700 uppercase mb-2 text-center">Balises validées</span>
          <div className="flex items-center gap-3">
            <button onClick={() => updateCounter('balisesOk', -1)} className="w-8 h-8 rounded-full bg-white border border-emerald-300 text-emerald-600 flex items-center justify-center active:bg-emerald-100">
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-3xl font-bold font-mono text-emerald-800 w-8 text-center">{data.balisesOk || 0}</span>
            <button onClick={() => updateCounter('balisesOk', 1)} className="w-8 h-8 rounded-full bg-white border border-emerald-300 text-emerald-600 flex items-center justify-center active:bg-emerald-100">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center bg-red-50 p-3 rounded-xl border border-red-200">
          <Compass className="w-6 h-6 text-red-600 mb-1" />
          <span className="text-xs font-bold text-red-700 uppercase mb-2 text-center">Erreurs d'itinéraire</span>
          <div className="flex items-center gap-3">
            <button onClick={() => updateCounter('errors', -1)} className="w-8 h-8 rounded-full bg-white border border-red-300 text-red-600 flex items-center justify-center active:bg-red-100">
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-3xl font-bold font-mono text-red-800 w-8 text-center">{data.errors || 0}</span>
            <button onClick={() => updateCounter('errors', 1)} className="w-8 h-8 rounded-full bg-white border border-red-300 text-red-600 flex items-center justify-center active:bg-red-100">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
