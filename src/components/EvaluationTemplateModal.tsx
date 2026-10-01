import React, { useState, useEffect } from 'react';
import { EvaluationCriterion, TemplateActivity } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { getDefaultCriteriaForCa, getCriterionLevels } from '../lib/evaluationHelpers';
import { 
  X, 
  Plus, 
  Trash2, 
  Award, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  FileText,
  HelpCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Eye,
  Sliders
} from 'lucide-react';

interface EvaluationTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: TemplateActivity | null;
  onSave: (data: { name: string; ca: 1 | 2 | 3 | 4 | 5; criteria: EvaluationCriterion[] }) => void;
}

export function EvaluationTemplateModal({
  isOpen,
  onClose,
  template,
  onSave
}: EvaluationTemplateModalProps) {
  const [name, setName] = useState('');
  const [ca, setCa] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedCritIndex, setExpandedCritIndex] = useState<number | null>(null);

  const toggleExpandCriterion = (index: number) => {
    if (expandedCritIndex === index) {
      setExpandedCritIndex(null);
    } else {
      const crit = criteria[index];
      if (!crit.levels || crit.levels.length !== 4) {
        const initializedLevels = getCriterionLevels(crit);
        handleUpdateCriterion(index, { levels: initializedLevels });
      }
      setExpandedCritIndex(index);
    }
  };

  const handleUpdateLevel = (critIndex: number, levelNum: 1 | 2 | 3 | 4, updates: { descriptor?: string; points?: number }) => {
    const crit = criteria[critIndex];
    const currentLevels = getCriterionLevels(crit);
    const updatedLevels = currentLevels.map(lvl => lvl.level === levelNum ? { ...lvl, ...updates } : lvl);
    handleUpdateCriterion(critIndex, { levels: updatedLevels });
  };

  useEffect(() => {
    if (template) {
      setName(template.name);
      setCa(template.ca || 1);
      if (template.evaluationCriteria && template.evaluationCriteria.length > 0) {
        setCriteria(JSON.parse(JSON.stringify(template.evaluationCriteria)));
      } else {
        setCriteria(getDefaultCriteriaForCa(template.ca, template.name));
      }
    } else {
      setName('');
      setCa(1);
      setCriteria(getDefaultCriteriaForCa(1, 'Demi-Fond - Course au Temps Juste (4 x 5\')'));
    }
    setError(null);
  }, [template, isOpen]);

  if (!isOpen) return null;

  const totalPoints = criteria.reduce((sum, c) => sum + (Number(c.maxScore) || 0), 0);
  const isExact20 = Math.abs(totalPoints - 20) < 0.01;

  const handleAddCriterion = () => {
    const genId = Math.random().toString(36).substring(2, 9);
    setCriteria(prev => [
      ...prev,
      {
        id: genId,
        label: `Critère ${prev.length + 1}`,
        maxScore: 5,
        weight: 1,
        description: ''
      }
    ]);
  };

  const handleUpdateCriterion = (index: number, updates: Partial<EvaluationCriterion>) => {
    setCriteria(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c));
  };

  const handleRemoveCriterion = (index: number) => {
    setCriteria(prev => prev.filter((_, i) => i !== index));
  };

  const handleLoadOfficialScale = () => {
    const defaults = getDefaultCriteriaForCa(ca, name);
    setCriteria(defaults);
  };

  const handleLoadTempsJuste = () => {
    setName(prev => prev.toLowerCase().includes('demi') ? prev : 'Demi-Fond - Course au Temps Juste (4 x 5\')');
    setCa(1);
    setCriteria(getDefaultCriteriaForCa(1, 'Demi-Fond - Course au Temps Juste (4 x 5\')'));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Veuillez saisir un titre pour le modèle d\'évaluation.');
      return;
    }
    if (criteria.length === 0) {
      setError('Ajoutez au moins un critère d\'évaluation.');
      return;
    }
    onSave({
      name: name.trim(),
      ca,
      criteria
    });
    onClose();
  };

  const caNames: Record<number, { label: string; color: string; desc: string }> = {
    1: { label: 'CA 1 • Performance mesurée', color: 'border-blue-300 text-blue-800 bg-blue-50', desc: 'Athlétisme, Natation, Demi-fond' },
    2: { label: 'CA 2 • Adaptation milieu variable', color: 'border-emerald-300 text-emerald-800 bg-emerald-50', desc: 'Course d\'orientation, Escalade' },
    3: { label: 'CA 3 • Artistique & acrobatique', color: 'border-amber-300 text-amber-800 bg-amber-50', desc: 'Acrosport, Gymnastique, Danse' },
    4: { label: 'CA 4 • Affrontement individuel/collectif', color: 'border-purple-300 text-purple-800 bg-purple-50', desc: 'Badminton, Tennis de table, Sports co' },
    5: { label: 'CA 5 • Entretien de soi', color: 'border-rose-300 text-rose-800 bg-rose-50', desc: 'Musculation, Course en durée, Cardio' }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50/50 via-white to-indigo-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {template ? 'Modifier le modèle d\'évaluation' : 'Nouveau modèle d\'évaluation'}
              </h2>
              <p className="text-xs text-slate-500">
                Banque d'évaluation : configurez les critères, points et barèmes sur 20 points
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Activity name and CA */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Intitulé de l'épreuve / Activité *
              </label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Demi-Fond - Course au Temps Juste (4 x 5'), Badminton..."
                className="font-bold text-slate-900 h-11"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Champ d'apprentissage (CA)
              </label>
              <select
                value={ca}
                onChange={e => setCa(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {[1, 2, 3, 4, 5].map(c => (
                  <option key={c} value={c}>
                    CA {c} : {caNames[c].label.split('• ')[1]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick presets bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-slate-600 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Barèmes officiels de référence :
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleLoadTempsJuste}
                className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold border border-amber-300 transition-colors flex items-center gap-1"
              >
                ⏱️ Temps Juste (4x5')
              </button>
              <button
                type="button"
                onClick={handleLoadOfficialScale}
                className="px-2.5 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-900 font-bold border border-indigo-200 transition-colors"
              >
                Charger barème CA {ca}
              </button>
            </div>
          </div>

          {/* Criteria section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div>
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide flex items-center gap-2">
                  Critères et barème d'évaluation ({criteria.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Définissez la répartition des points par critère sommative.
                </p>
              </div>

              {/* Total Points Badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Barème total :</span>
                <span className={`text-xs px-3 py-1 rounded-full font-black border flex items-center gap-1.5 ${
                  isExact20 
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}>
                  {isExact20 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  {totalPoints} / 20 pts
                </span>
              </div>
            </div>

            {!isExact20 && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  Le total actuel est de <strong>{totalPoints} pts</strong>. Le barème recommandé en EPS est sur <strong>20 points</strong> (le calcul sera automatiquement normalisé sur 20 dans le bilan élève).
                </span>
              </div>
            )}

            {/* Criteria Cards */}
            <div className="space-y-3">
              {criteria.map((crit, index) => {
                const isExpanded = expandedCritIndex === index;
                const levels = getCriterionLevels(crit);

                return (
                  <div 
                    key={crit.id || index}
                    className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 hover:border-slate-300 transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <Input
                          value={crit.label}
                          onChange={e => handleUpdateCriterion(index, { label: e.target.value })}
                          placeholder="Libellé du critère (ex: Régularité, Vitesse, Lucidité...)"
                          className="bg-white font-bold text-xs h-9 flex-1"
                          required
                        />
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
                          <span className="text-[11px] text-slate-500 font-medium">Barème:</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            max="20"
                            value={crit.maxScore}
                            onChange={e => handleUpdateCriterion(index, { maxScore: parseFloat(e.target.value) || 0 })}
                            className="w-12 text-xs font-black text-amber-700 text-center focus:outline-none"
                          />
                          <span className="text-[11px] font-bold text-slate-600">pts</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveCriterion(index)}
                          disabled={criteria.length <= 1}
                          className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Supprimer ce critère"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <Input
                        value={crit.description || ''}
                        onChange={e => handleUpdateCriterion(index, { description: e.target.value })}
                        placeholder="Description générale de l'attendu..."
                        className="bg-white text-[11px] text-slate-600 h-8 flex-1"
                      />

                      <button
                        type="button"
                        onClick={() => toggleExpandCriterion(index)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 border ${
                          isExpanded 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                            : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Paliers d'observation ({levels.length})</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* EXPANDED OBSERVABLE TILES */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-slate-200 space-y-3 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between text-[11px] text-slate-600 font-bold bg-white p-2 rounded-lg border border-slate-200">
                          <span className="flex items-center gap-1 text-indigo-900">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            Observation de terrain : ce que fait l'élève ➔ Note calculée selon le barème
                          </span>
                          <span className="text-slate-400">Total critère : /{crit.maxScore} pts</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {levels.map(lvl => {
                            const badgeColor = lvl.level === 1
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : lvl.level === 2
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : lvl.level === 3
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-indigo-100 text-indigo-800 border-indigo-300';

                            return (
                              <div key={lvl.level} className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${badgeColor}`}>
                                    Palier {lvl.level} • {lvl.label}
                                  </span>

                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-bold text-slate-500">Note:</span>
                                    <input
                                      type="number"
                                      step="0.25"
                                      min="0"
                                      max={crit.maxScore}
                                      value={lvl.points}
                                      onChange={e => handleUpdateLevel(index, lvl.level, { points: parseFloat(e.target.value) || 0 })}
                                      className="w-12 text-center text-xs font-mono font-black text-indigo-700 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 focus:outline-none"
                                    />
                                    <span className="text-[10px] text-slate-400">pts</span>
                                  </div>
                                </div>

                                <div>
                                  <textarea
                                    rows={2}
                                    value={lvl.descriptor}
                                    onChange={e => handleUpdateLevel(index, lvl.level, { descriptor: e.target.value })}
                                    placeholder="Ce qui est fait / comportement observable sur le terrain..."
                                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-tight"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddCriterion}
              className="w-full border-dashed border-slate-300 hover:border-amber-400 hover:bg-amber-50/50 text-slate-700 text-xs font-bold py-2.5 rounded-xl"
            >
              <Plus className="w-4 h-4 mr-1.5 text-amber-600" />
              Ajouter un critère d'évaluation
            </Button>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-xs font-bold text-slate-600"
          >
            Annuler
          </Button>

          <Button
            onClick={handleSubmit}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-6 shadow-sm"
          >
            <Award className="w-4 h-4 mr-1.5" />
            {template ? 'Enregistrer les modifications' : 'Ajouter à ma banque d\'évaluation'}
          </Button>
        </div>
      </div>
    </div>
  );
}
