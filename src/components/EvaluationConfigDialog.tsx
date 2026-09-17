import React, { useState } from 'react';
import { Settings, X, Plus, Trash2, Award } from 'lucide-react';
import { useStore } from '../store';
import { EvaluationCriterion } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

export function EvaluationConfigDialog({ activityId }: { activityId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { activities, updateActivity } = useStore();
  const activity = activities.find(a => a.id === activityId);

  const [criteria, setCriteria] = useState<EvaluationCriterion[]>(activity?.evaluationCriteria || []);
  const [newLabel, setNewLabel] = useState('');
  const [newMax, setNewMax] = useState(20);
  const [newWeight, setNewWeight] = useState(1);

  if (!activity) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    const newCriteria = [...criteria, {
      id: Math.random().toString(36).substr(2, 9),
      label: newLabel.trim(),
      maxScore: newMax,
      weight: newWeight
    }];
    setCriteria(newCriteria);
    setNewLabel('');
  };

  const handleRemove = (id: string) => {
    setCriteria(criteria.filter(c => c.id !== id));
  };

  const handleSave = () => {
    updateActivity(activityId, { evaluationCriteria: criteria });
    setIsOpen(false);
  };

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => {
          setCriteria(activity.evaluationCriteria || []);
          setIsOpen(true);
        }}
        className="text-amber-600 border-amber-200 hover:bg-amber-50"
      >
        <Award className="w-4 h-4 mr-2" />
        Barème & Évaluation
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  Barème d'évaluation
                </h2>
                <p className="text-sm text-slate-500 mt-1">Configurez les critères d'évaluation pour ce cycle.</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 items-end bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex-1 w-full space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Critère</label>
                  <Input 
                    placeholder="Ex: Performance, Maîtrise, Investissement..." 
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="w-full sm:w-24 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Note max</label>
                  <Input 
                    type="number" 
                    min={1} 
                    value={newMax}
                    onChange={e => setNewMax(Number(e.target.value))}
                    className="bg-white"
                  />
                </div>
                <div className="w-full sm:w-24 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Coeff</label>
                  <Input 
                    type="number" 
                    min={0.1}
                    step={0.1}
                    value={newWeight}
                    onChange={e => setNewWeight(Number(e.target.value))}
                    className="bg-white"
                  />
                </div>
                <Button type="submit" disabled={!newLabel.trim()} className="w-full sm:w-auto">
                  <Plus className="w-4 h-4" />
                </Button>
              </form>

              <div className="space-y-2">
                {criteria.length === 0 ? (
                  <div className="text-center p-8 text-slate-500 border border-dashed border-slate-200 rounded-lg">
                    Aucun critère d'évaluation défini.
                  </div>
                ) : (
                  criteria.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-white">
                      <div className="font-medium text-slate-800">{c.label}</div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-slate-500">
                          <span className="font-bold text-slate-700">/{c.maxScore}</span> (coeff {c.weight})
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleRemove(c.id)} className="text-slate-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsOpen(false)}>Annuler</Button>
              <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white">Enregistrer le barème</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
