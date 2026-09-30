import React, { useState, useEffect } from 'react';
import { Settings, X, Plus, Trash2, Award, Sparkles } from 'lucide-react';
import { useStore } from '../store';
import { EvaluationCriterion } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { getDefaultCriteriaForCa } from '../lib/evaluationHelpers';

export function EvaluationConfigDialog({ 
  activityId,
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  triggerButton,
  onSaved
}: { 
  activityId: string;
  isOpen?: boolean;
  onClose?: () => void;
  triggerButton?: React.ReactNode;
  onSaved?: (criteria: EvaluationCriterion[]) => void;
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const { activities, updateActivity } = useStore();
  const activity = activities.find(a => a.id === activityId);

  const [criteria, setCriteria] = useState<EvaluationCriterion[]>(activity?.evaluationCriteria || []);
  const [newLabel, setNewLabel] = useState('');
  const [newMax, setNewMax] = useState(8);
  const [newWeight, setNewWeight] = useState(1);
  const [newDescription, setNewDescription] = useState('');

  useEffect(() => {
    if (activity?.evaluationCriteria && activity.evaluationCriteria.length > 0) {
      setCriteria(activity.evaluationCriteria);
    } else if (activity) {
      setCriteria(getDefaultCriteriaForCa(activity.ca));
    }
  }, [activity?.evaluationCriteria, activity?.ca]);

  if (!activity) return null;

  const handleOpen = () => {
    setCriteria(activity.evaluationCriteria && activity.evaluationCriteria.length > 0 
      ? activity.evaluationCriteria 
      : getDefaultCriteriaForCa(activity.ca)
    );
    if (isControlled) {
      // Handled by parent
    } else {
      setInternalIsOpen(true);
    }
  };

  const handleClose = () => {
    if (isControlled && controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    const newCriteria = [...criteria, {
      id: Math.random().toString(36).substr(2, 9),
      label: newLabel.trim(),
      maxScore: newMax,
      weight: newWeight,
      description: newDescription.trim() || undefined
    }];
    setCriteria(newCriteria);
    setNewLabel('');
    setNewDescription('');
  };

  const handleRemove = (id: string) => {
    setCriteria(criteria.filter(c => c.id !== id));
  };

  const handleLoadTempsJustePreset = () => {
    const tempsJusteCrits = getDefaultCriteriaForCa(1, 'Demi-Fond - Course au Temps Juste (4 x 5\')');
    setCriteria(tempsJusteCrits);
  };

  const handleLoadOfficialDefaults = () => {
    if (window.confirm("Voulez-vous charger les critères et barèmes officiels recommandés pour ce cycle ?")) {
      const defaults = getDefaultCriteriaForCa(activity.ca, activity.name);
      setCriteria(defaults);
    }
  };

  const handleSave = () => {
    updateActivity(activityId, { evaluationCriteria: criteria });
    if (onSaved) onSaved(criteria);
    handleClose();
  };

  const totalMaxPoints = criteria.reduce((sum, c) => sum + (c.maxScore * c.weight), 0);

  return (
    <>
      {triggerButton !== undefined ? (
        <span onClick={handleOpen}>{triggerButton}</span>
      ) : !isControlled ? (
        <Button 
          variant="outline" 
          onClick={handleOpen}
          className="text-amber-600 border-amber-200 hover:bg-amber-50"
        >
          <Award className="w-4 h-4 mr-2" />
          Barème & Évaluation
        </Button>
      ) : null}

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Configuration du Barème d'Évaluation
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Critères sommatifs, barèmes et coefficients pour {activity.name}.
                  </p>
                </div>
              </div>

              <button 
                onClick={handleClose} 
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Summary Bar */}
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200/80 p-3 rounded-xl text-xs text-amber-900">
                <div className="font-bold flex items-center gap-1.5">
                  <span>{criteria.length} critère(s) défini(s)</span>
                  <span>•</span>
                  <span>Total barème pondéré : {totalMaxPoints} pts</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadTempsJustePreset}
                    className="font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 bg-amber-100/80 hover:bg-amber-200/80 px-2.5 py-1 rounded-lg border border-amber-300 shadow-2xs transition-colors"
                    title="Charger les 4 critères officiels de la Course au Temps Juste (4x5') sur 20 points"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                    Barème Demi-Fond (Temps Juste 4x5')
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadOfficialDefaults}
                    className="font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Barème officiel CA
                  </button>
                </div>
              </div>

              {/* Form to add criterion */}
              <form onSubmit={handleAdd} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  + Ajouter un critère d'évaluation
                </span>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 space-y-1">
                    <label className="text-[11px] font-bold text-slate-500">Nom du critère</label>
                    <Input 
                      placeholder="Ex: Performance motrice, Régularité, Rôle social..." 
                      value={newLabel}
                      onChange={e => setNewLabel(e.target.value)}
                      className="bg-white text-xs h-9"
                    />
                  </div>
                  <div className="w-full sm:w-28 space-y-1">
                    <label className="text-[11px] font-bold text-slate-500">Barème max</label>
                    <Input 
                      type="number" 
                      min={1} 
                      max={40}
                      value={newMax}
                      onChange={e => setNewMax(Number(e.target.value))}
                      className="bg-white text-xs h-9 text-center font-mono font-bold"
                    />
                  </div>
                  <div className="w-full sm:w-24 space-y-1">
                    <label className="text-[11px] font-bold text-slate-500">Coefficient</label>
                    <Input 
                      type="number" 
                      min={0.1}
                      step={0.1}
                      value={newWeight}
                      onChange={e => setNewWeight(Number(e.target.value))}
                      className="bg-white text-xs h-9 text-center font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="flex gap-2 items-center">
                  <Input 
                    placeholder="Description / Attendus de fin de cycle (optionnel)..." 
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    className="bg-white text-xs h-9 flex-1"
                  />
                  <Button type="submit" disabled={!newLabel.trim()} className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold h-9">
                    <Plus className="w-4 h-4 mr-1" /> Ajouter
                  </Button>
                </div>
              </form>

              {/* Criteria List */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Liste des critères actifs
                </span>

                {criteria.length === 0 ? (
                  <div className="text-center p-8 text-slate-400 border border-dashed border-slate-200 rounded-xl text-xs">
                    Aucun critère défini. Ajoutez-en ci-dessus ou cliquez sur « Barème officiel suggéré ».
                  </div>
                ) : (
                  criteria.map((c, idx) => (
                    <div key={c.id} className="p-3 border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-colors flex items-center justify-between gap-3 group">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-slate-800 truncate">{c.label}</div>
                          {c.description && (
                            <div className="text-xs text-slate-400 truncate">{c.description}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-mono font-bold bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700">
                          /{c.maxScore} <span className="text-slate-400 font-normal">(c{c.weight})</span>
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRemove(c.id)} 
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                          title="Supprimer ce critère"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <span className="text-xs text-slate-500">
                La note globale de chaque élève sera automatiquement ramenée sur 20.
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleClose}>
                  Annuler
                </Button>
                <Button size="sm" onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                  Enregistrer le barème
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
