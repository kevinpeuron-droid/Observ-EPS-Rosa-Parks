import React from 'react';
import { Button } from './ui/Button';
import { Activity } from 'lucide-react';

export interface PerformanceRep {
  distance?: number;
  weight?: number;
  effortTime?: number;
  recoveryTime?: number;
  rpe?: number;
}

export interface PerformanceLogData {
  profile: string;
  reps: PerformanceRep[];
}

interface PerformanceLogProps {
  value: PerformanceLogData;
  onChange: (value: PerformanceLogData) => void;
}

export function PerformanceLog({ value, onChange }: PerformanceLogProps) {
  const data = value || { profile: '', reps: [] };

  const addRep = () => {
    onChange({
      ...data,
      reps: [...data.reps, { rpe: 5 }]
    });
  };

  const updateRep = (index: number, updates: Partial<PerformanceRep>) => {
    const newReps = [...data.reps];
    newReps[index] = { ...newReps[index], ...updates };
    onChange({ ...data, reps: newReps });
  };

  const removeRep = (index: number) => {
    const newReps = [...data.reps];
    newReps.splice(index, 1);
    onChange({ ...data, reps: newReps });
  };

  return (
    <div className="space-y-4 w-full">
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Profil / Projet d'allure</label>
        <input 
          type="text" 
          className="w-full h-10 px-3 rounded-lg border-2 border-slate-200 focus:border-indigo-600 focus:outline-none"
          placeholder="Ex: VMA 14km/h, Allure régulière..."
          value={data.profile || ''}
          onChange={e => onChange({ ...data, profile: e.target.value })}
        />
      </div>

      <div className="space-y-3">
        {data.reps.map((rep, i) => (
          <div key={i} className="flex flex-col gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center text-sm font-bold text-slate-500 mb-1">
              <span>Fraction / Répétition {i + 1}</span>
              <button onClick={() => removeRep(i)} className="text-red-400 hover:text-red-600 text-xs">Supprimer</button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Distance (m)</label>
                <input type="number" className="w-full h-10 text-center font-mono font-bold rounded-lg border-slate-300 border focus:border-indigo-500 outline-none" value={rep.distance || ''} onChange={e => updateRep(i, { distance: parseFloat(e.target.value) || undefined })} placeholder="Ex: 400" />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Temps effort (s)</label>
                <input type="number" className="w-full h-10 text-center font-mono font-bold rounded-lg border-slate-300 border focus:border-indigo-500 outline-none" value={rep.effortTime || ''} onChange={e => updateRep(i, { effortTime: parseFloat(e.target.value) || undefined })} placeholder="Ex: 90" />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Récupération (s)</label>
                <input type="number" className="w-full h-10 text-center font-mono font-bold rounded-lg border-slate-300 border focus:border-indigo-500 outline-none" value={rep.recoveryTime || ''} onChange={e => updateRep(i, { recoveryTime: parseFloat(e.target.value) || undefined })} placeholder="Ex: 45" />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Charge (kg)</label>
                <input type="number" className="w-full h-10 text-center font-mono font-bold rounded-lg border-slate-300 border focus:border-indigo-500 outline-none" value={rep.weight || ''} onChange={e => updateRep(i, { weight: parseFloat(e.target.value) || undefined })} placeholder="Optionnel" />
              </div>
            </div>

            <div className="mt-2">
               <label className="text-xs text-slate-500 block mb-1">Ressenti / RPE (1=Facile, 10=Max)</label>
               <input 
                 type="range" min="1" max="10" 
                 value={rep.rpe || 5} 
                 onChange={(e) => updateRep(i, { rpe: parseInt(e.target.value) })}
                 className="w-full accent-indigo-600"
               />
               <div className="text-center text-xs font-bold text-indigo-600 mt-1">RPE: {rep.rpe || 5}/10</div>
            </div>
          </div>
        ))}
      </div>
      
      <Button variant="outline" className="w-full border-dashed border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50" onClick={addRep}>
        <Activity className="w-4 h-4 mr-2" />
        Ajouter une fraction / répétition
      </Button>
    </div>
  );
}
