import React from 'react';
import { Button } from './ui/Button';
import { Minus, Plus, Dumbbell } from 'lucide-react';

interface SetRecord {
  reps: number;
  weight: number;
  rpe?: number; // Rate of perceived exertion 1-10
}

interface TrainingLogData {
  profile: 'Tonification' | 'Volume' | 'Force' | '';
  sets: SetRecord[];
}

interface TrainingLogProps {
  value: TrainingLogData;
  onChange: (value: TrainingLogData) => void;
}

export function TrainingLog({ value, onChange }: TrainingLogProps) {
  const data = value || { profile: '', sets: [] };

  const addSet = () => {
    onChange({
      ...data,
      sets: [...data.sets, { reps: 10, weight: 0 }]
    });
  };

  const updateSet = (index: number, updates: Partial<SetRecord>) => {
    const newSets = [...data.sets];
    newSets[index] = { ...newSets[index], ...updates };
    onChange({ ...data, sets: newSets });
  };

  const removeSet = (index: number) => {
    const newSets = [...data.sets];
    newSets.splice(index, 1);
    onChange({ ...data, sets: newSets });
  };

  return (
    <div className="space-y-4 w-full">
      <div className="flex gap-2">
        {['Tonification', 'Volume', 'Force'].map(p => (
          <button
            key={p}
            onClick={() => onChange({ ...data, profile: p as any })}
            className={`flex-1 py-2 text-sm font-bold rounded-lg border-2 transition-colors ${data.profile === p ? 'bg-indigo-100 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-200'}`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {data.sets.map((set, i) => (
          <div key={i} className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center text-sm font-bold text-slate-500 mb-1">
              <span>Série {i + 1}</span>
              <button onClick={() => removeSet(i)} className="text-red-400 hover:text-red-600 text-xs">Supprimer</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Répétitions</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateSet(i, { reps: Math.max(0, set.reps - 1) })} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 rounded text-slate-600">
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="flex-1 text-center font-mono font-bold">{set.reps}</div>
                  <button onClick={() => updateSet(i, { reps: set.reps + 1 })} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 rounded text-slate-600">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Charge (kg)</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateSet(i, { weight: Math.max(0, set.weight - 2.5) })} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 rounded text-slate-600">
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="flex-1 text-center font-mono font-bold">{set.weight}</div>
                  <button onClick={() => updateSet(i, { weight: set.weight + 2.5 })} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 rounded text-slate-600">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-2">
               <label className="text-xs text-slate-500 block mb-1">Ressenti (1=Facile, 10=Max)</label>
               <input 
                 type="range" min="1" max="10" 
                 value={set.rpe || 5} 
                 onChange={(e) => updateSet(i, { rpe: parseInt(e.target.value) })}
                 className="w-full accent-indigo-600"
               />
               <div className="text-center text-xs font-bold text-indigo-600 mt-1">RPE: {set.rpe || 5}/10</div>
            </div>
          </div>
        ))}
      </div>
      
      <Button variant="outline" className="w-full border-dashed border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50" onClick={addSet}>
        <Dumbbell className="w-4 h-4 mr-2" />
        Ajouter une série
      </Button>
    </div>
  );
}
