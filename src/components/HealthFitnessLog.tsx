import React from 'react';
import { Button } from './ui/Button';
import { Activity, Heart, Plus, Minus, ActivitySquare } from 'lucide-react';

export interface FitnessAtelier {
  name?: string;
  charge?: number;
  reps?: number;
  recovery?: number;
  rpe?: number;
}

export interface HealthFitnessLogData {
  preBpm?: number;
  postBpm?: number;
  globalFatigue?: number;
  ateliers: FitnessAtelier[];
}

interface HealthFitnessLogProps {
  value: HealthFitnessLogData;
  onChange: (value: HealthFitnessLogData) => void;
}

export function HealthFitnessLog({ value, onChange }: HealthFitnessLogProps) {
  const data = value || { ateliers: [], globalFatigue: 5 };

  const addAtelier = () => {
    onChange({
      ...data,
      ateliers: [...(data.ateliers || []), { rpe: 5 }]
    });
  };

  const updateAtelier = (index: number, updates: Partial<FitnessAtelier>) => {
    const newAteliers = [...(data.ateliers || [])];
    newAteliers[index] = { ...newAteliers[index], ...updates };
    onChange({ ...data, ateliers: newAteliers });
  };

  const removeAtelier = (index: number) => {
    const newAteliers = [...(data.ateliers || [])];
    newAteliers.splice(index, 1);
    onChange({ ...data, ateliers: newAteliers });
  };

  return (
    <div className="space-y-4 w-full">
      {/* Santé / Cardio */}
      <div className="bg-teal-50 p-4 rounded-xl border border-teal-200 space-y-4">
        <div className="flex items-center gap-2 text-teal-800 font-bold uppercase tracking-wider text-sm mb-2">
          <Heart className="w-5 h-5 text-teal-600" />
          Indicateurs de Santé & Forme
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-teal-700 block mb-1">BPM Pré-effort</label>
            <input 
              type="number" 
              className="w-full h-10 text-center font-mono font-bold text-lg rounded-lg border-teal-300 border focus:border-teal-600 outline-none"
              placeholder="Ex: 70"
              value={data.preBpm || ''}
              onChange={e => onChange({ ...data, preBpm: parseInt(e.target.value) || undefined })}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-teal-700 block mb-1">BPM Post-effort</label>
            <input 
              type="number" 
              className="w-full h-10 text-center font-mono font-bold text-lg rounded-lg border-teal-300 border focus:border-teal-600 outline-none"
              placeholder="Ex: 140"
              value={data.postBpm || ''}
              onChange={e => onChange({ ...data, postBpm: parseInt(e.target.value) || undefined })}
            />
          </div>
        </div>

        <div>
           <label className="text-xs font-bold text-teal-700 block mb-1">Ressenti de fatigue global (1=En forme, 10=Épuisé)</label>
           <input 
             type="range" min="1" max="10" 
             value={data.globalFatigue || 5} 
             onChange={(e) => onChange({ ...data, globalFatigue: parseInt(e.target.value) })}
             className="w-full accent-teal-600"
           />
           <div className="text-center text-xs font-bold text-teal-700 mt-1">Niveau : {data.globalFatigue || 5}/10</div>
        </div>
      </div>

      {/* Ateliers */}
      <div className="space-y-3">
        <div className="text-sm font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
          <ActivitySquare className="w-4 h-4" />
          Carnet d'ateliers
        </div>
        
        {(data.ateliers || []).map((atelier, i) => (
          <div key={i} className="flex flex-col gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 relative">
            <div className="flex justify-between items-center text-sm font-bold text-slate-700 mb-1">
              <input 
                type="text" 
                placeholder={`Atelier / Exercice ${i + 1}`}
                className="font-bold bg-transparent border-b border-dashed border-slate-300 focus:border-teal-500 outline-none px-1 w-2/3"
                value={atelier.name || ''}
                onChange={e => updateAtelier(i, { name: e.target.value })}
              />
              <button onClick={() => removeAtelier(i)} className="text-red-400 hover:text-red-600 text-xs">Supprimer</button>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 block mb-1 uppercase font-bold">Charge</label>
                <input type="number" className="w-full h-10 text-center font-mono font-bold rounded-lg border-slate-300 border focus:border-teal-500 outline-none text-sm" value={atelier.charge || ''} onChange={e => updateAtelier(i, { charge: parseFloat(e.target.value) || undefined })} placeholder="kg / niv" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1 uppercase font-bold">Répétitions</label>
                <input type="number" className="w-full h-10 text-center font-mono font-bold rounded-lg border-slate-300 border focus:border-teal-500 outline-none text-sm" value={atelier.reps || ''} onChange={e => updateAtelier(i, { reps: parseInt(e.target.value) || undefined })} placeholder="nb / sec" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1 uppercase font-bold">Récup</label>
                <input type="number" className="w-full h-10 text-center font-mono font-bold rounded-lg border-slate-300 border focus:border-teal-500 outline-none text-sm" value={atelier.recovery || ''} onChange={e => updateAtelier(i, { recovery: parseInt(e.target.value) || undefined })} placeholder="sec" />
              </div>
            </div>

            <div className="mt-1">
               <label className="text-[10px] text-slate-500 block mb-1 uppercase font-bold flex justify-between">
                 <span>Ressenti local (RPE)</span>
                 <span className="text-teal-600">{atelier.rpe || 5}/10</span>
               </label>
               <input 
                 type="range" min="1" max="10" 
                 value={atelier.rpe || 5} 
                 onChange={(e) => updateAtelier(i, { rpe: parseInt(e.target.value) })}
                 className="w-full accent-teal-500"
               />
            </div>
          </div>
        ))}
      </div>
      
      <Button variant="outline" className="w-full border-dashed border-2 border-teal-200 text-teal-700 hover:bg-teal-50" onClick={addAtelier}>
        <Plus className="w-4 h-4 mr-2" />
        Ajouter un atelier / série
      </Button>
    </div>
  );
}
