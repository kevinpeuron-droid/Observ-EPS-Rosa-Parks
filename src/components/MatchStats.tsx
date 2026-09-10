import React from 'react';
import { Plus, Minus, Target, Shield, Send } from 'lucide-react';

export interface ActionStats {
  success: number;
  fail: number;
}

export interface MatchStatsData {
  role: string;
  zone: string;
  passes: ActionStats;
  shots: ActionStats;
  defense: ActionStats;
}

interface MatchStatsProps {
  value: MatchStatsData;
  onChange: (value: MatchStatsData) => void;
}

export function MatchStats({ value, onChange }: MatchStatsProps) {
  const data = value || {
    role: '',
    zone: '',
    passes: { success: 0, fail: 0 },
    shots: { success: 0, fail: 0 },
    defense: { success: 0, fail: 0 }
  };

  const updateStat = (category: 'passes' | 'shots' | 'defense', type: 'success' | 'fail', delta: number) => {
    onChange({
      ...data,
      [category]: {
        ...data[category],
        [type]: Math.max(0, data[category][type] + delta)
      }
    });
  };

  const totalSuccess = data.passes.success + data.shots.success + data.defense.success;
  const totalFail = data.passes.fail + data.shots.fail + data.defense.fail;
  const totalActions = totalSuccess + totalFail;
  const efficiency = totalActions > 0 ? Math.round((totalSuccess / totalActions) * 100) : 0;

  const renderCounterRow = (category: 'passes' | 'shots' | 'defense', label: string, icon: React.ReactNode, successLabel: string, failLabel: string) => (
    <div className="flex flex-col bg-slate-50 p-3 rounded-xl border border-slate-200 gap-3">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
        {icon} {label}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {/* Success */}
        <div className="flex flex-col items-center bg-emerald-50 rounded-lg p-2 border border-emerald-100">
          <span className="text-[10px] font-bold text-emerald-700 uppercase mb-2">{successLabel}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => updateStat(category, 'success', -1)} className="w-6 h-6 rounded-full bg-white border border-emerald-300 text-emerald-600 flex items-center justify-center active:bg-emerald-100"><Minus className="w-3 h-3" /></button>
            <span className="text-xl font-bold font-mono text-emerald-800 w-6 text-center">{data[category].success}</span>
            <button onClick={() => updateStat(category, 'success', 1)} className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 active:scale-95"><Plus className="w-4 h-4" /></button>
          </div>
        </div>
        {/* Fail */}
        <div className="flex flex-col items-center bg-red-50 rounded-lg p-2 border border-red-100">
          <span className="text-[10px] font-bold text-red-700 uppercase mb-2">{failLabel}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => updateStat(category, 'fail', -1)} className="w-6 h-6 rounded-full bg-white border border-red-300 text-red-600 flex items-center justify-center active:bg-red-100"><Minus className="w-3 h-3" /></button>
            <span className="text-xl font-bold font-mono text-red-800 w-6 text-center">{data[category].fail}</span>
            <button onClick={() => updateStat(category, 'fail', 1)} className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 active:scale-95"><Plus className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 w-full">
      <div className="flex justify-between items-center bg-blue-50 p-3 rounded-xl border border-blue-200 mb-2">
         <div className="text-sm text-blue-800 font-bold uppercase tracking-wider">Efficacité globale</div>
         <div className="text-xl font-bold font-mono text-blue-700">
           {totalActions > 0 ? `${efficiency}%` : '-'}
         </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Rôle / Poste</label>
          <select 
            className="w-full h-10 px-2 rounded-lg border-2 border-slate-200 bg-white focus:border-blue-600 focus:outline-none text-sm"
            value={data.role || ''}
            onChange={e => onChange({ ...data, role: e.target.value })}
          >
            <option value="" disabled>-- Sélectionner --</option>
            <option value="Attaquant">Attaquant / Avant</option>
            <option value="Défenseur">Défenseur / Arrière</option>
            <option value="Milieu / Centre">Milieu / Centre</option>
            <option value="Gardien">Gardien</option>
            <option value="Polyvalent">Polyvalent</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Zone de jeu</label>
          <select 
            className="w-full h-10 px-2 rounded-lg border-2 border-slate-200 bg-white focus:border-blue-600 focus:outline-none text-sm"
            value={data.zone || ''}
            onChange={e => onChange({ ...data, zone: e.target.value })}
          >
            <option value="" disabled>-- Sélectionner --</option>
            <option value="Zone Offensive">Zone Offensive (Avant)</option>
            <option value="Zone Défensive">Zone Défensive (Arrière)</option>
            <option value="Axe central">Axe central</option>
            <option value="Couloirs (Ailes)">Couloirs (Ailes)</option>
            <option value="Tout terrain">Tout terrain</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {renderCounterRow('passes', 'Passes / Construction', <Send className="w-4 h-4 text-blue-500" />, 'Réussies', 'Perdues')}
        {renderCounterRow('shots', 'Tirs / Marque', <Target className="w-4 h-4 text-blue-500" />, 'Cadrés/Buts', 'Ratés/Hors cadre')}
        {renderCounterRow('defense', 'Défense / Interventions', <Shield className="w-4 h-4 text-blue-500" />, 'Récupérations', 'Fautes/Pertes')}
      </div>
    </div>
  );
}
