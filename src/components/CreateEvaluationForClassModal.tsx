import React, { useState } from 'react';
import { useStore } from '../store';
import { ClassGroup, TemplateActivity } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { getDefaultCriteriaForCa } from '../lib/evaluationHelpers';
import { 
  X, 
  Award, 
  Sparkles, 
  Check, 
  Search, 
  Layers, 
  Plus, 
  BookOpen, 
  ChevronRight,
  Filter
} from 'lucide-react';

interface CreateEvaluationForClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClass: ClassGroup;
  onEvaluationCreated: (activityId: string) => void;
}

export function CreateEvaluationForClassModal({
  isOpen,
  onClose,
  selectedClass,
  onEvaluationCreated
}: CreateEvaluationForClassModalProps) {
  const { templateActivities, addActivityFromTemplate, createCustomActivity, updateActivity } = useStore();
  
  const [activeTab, setActiveTab] = useState<'bank' | 'custom'>('bank');
  const [selectedCaFilter, setSelectedCaFilter] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Custom evaluation state
  const [customName, setCustomName] = useState('');
  const [customCa, setCustomCa] = useState<1 | 2 | 3 | 4 | 5>(1);

  if (!isOpen) return null;

  const filteredTemplates = templateActivities.filter(t => {
    if (selectedCaFilter !== 'all' && t.ca !== selectedCaFilter) return false;
    if (searchQuery.trim() && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getCaBadge = (ca?: number) => {
    switch (ca) {
      case 1: return { label: 'CA 1 • Performance', color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 2: return { label: 'CA 2 • Adaptation', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 3: return { label: 'CA 3 • Artistique', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 4: return { label: 'CA 4 • Affrontement', color: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 5: return { label: 'CA 5 • Entretien', color: 'bg-rose-100 text-rose-800 border-rose-200' };
      default: return { label: 'EPS', color: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  const handleSelectTemplate = (template: TemplateActivity) => {
    const newActId = addActivityFromTemplate(selectedClass.id, template.id);
    onEvaluationCreated(newActId);
    onClose();
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newActId = createCustomActivity(selectedClass.id, customName.trim(), customCa);
    const criteria = getDefaultCriteriaForCa(customCa, customName.trim());
    updateActivity(newActId, { evaluationCriteria: criteria });

    onEvaluationCreated(newActId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50/50 via-white to-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Nouvelle évaluation pour la classe {selectedClass.name}
              </h2>
              <p className="text-xs text-slate-500">
                {selectedClass.students?.length || 0} élève(s) dans cette classe
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

        {/* Tab switch */}
        <div className="px-5 pt-3 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('bank')}
            className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 ${
              activeTab === 'bank'
                ? 'text-amber-600 border-b-2 border-amber-600'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Choisir dans ma Banque d'évaluations ({templateActivities.length})
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 ${
              activeTab === 'custom'
                ? 'text-amber-600 border-b-2 border-amber-600'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Plus className="w-4 h-4" />
            Créer une évaluation personnalisée
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'bank' ? (
            <div className="space-y-4">
              {/* Filter & search bar */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Rechercher une évaluation (ex: Demi-Fond, Badminton, Course...)"
                    className="pl-9 h-10 text-xs font-medium bg-slate-50 border-slate-200"
                  />
                </div>

                {/* CA filter pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                  <button
                    onClick={() => setSelectedCaFilter('all')}
                    className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-all shrink-0 ${
                      selectedCaFilter === 'all'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Tous les CA
                  </button>
                  {[1, 2, 3, 4, 5].map(ca => (
                    <button
                      key={ca}
                      onClick={() => setSelectedCaFilter(ca)}
                      className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-all shrink-0 ${
                        selectedCaFilter === ca
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      CA {ca}
                    </button>
                  ))}
                </div>
              </div>

              {/* Templates grid */}
              {filteredTemplates.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-2">
                  <Award className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">Aucun modèle d'évaluation trouvé</p>
                  <p className="text-[11px] text-slate-400">Essayez un autre mot-clé ou créez une évaluation personnalisée.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {filteredTemplates.map(template => {
                    const caBadge = getCaBadge(template.ca);
                    const crits = template.evaluationCriteria || getDefaultCriteriaForCa(template.ca, template.name);
                    const totalPts = crits.reduce((sum, c) => sum + (Number(c.maxScore) || 0), 0);
                    const isDemiFond = template.name.toLowerCase().includes('demi') || template.name.toLowerCase().includes('fond') || template.name.toLowerCase().includes('temps juste');

                    return (
                      <div
                        key={template.id}
                        onClick={() => handleSelectTemplate(template)}
                        className="p-4 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/20 bg-white transition-all cursor-pointer group flex flex-col justify-between shadow-xs hover:shadow-md"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${caBadge.color}`}>
                              {caBadge.label}
                            </span>
                            <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              {totalPts} pts
                            </span>
                          </div>

                          <div>
                            <h4 className="font-bold text-sm text-slate-900 group-hover:text-amber-700 transition-colors flex items-center gap-1.5">
                              {template.name}
                            </h4>
                            {isDemiFond && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md mt-1 border border-amber-200">
                                ⏱️ Course au Temps Juste (4 x 5')
                              </span>
                            )}
                          </div>

                          {/* Criteria list preview */}
                          <div className="space-y-1 pt-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Critères ({crits.length}) :
                            </span>
                            <div className="space-y-0.5">
                              {crits.slice(0, 3).map((c, i) => (
                                <div key={c.id || i} className="text-[11px] text-slate-600 flex justify-between">
                                  <span className="truncate pr-2">• {c.label}</span>
                                  <span className="font-bold text-slate-500 shrink-0">{c.maxScore} pts</span>
                                </div>
                              ))}
                              {crits.length > 3 && (
                                <div className="text-[10px] text-slate-400 font-medium italic">
                                  + {crits.length - 3} autre(s) critère(s)...
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400 group-hover:text-amber-600 font-medium flex items-center">
                            Prêt à l'emploi
                          </span>
                          <Button
                            size="sm"
                            className="bg-amber-600 group-hover:bg-amber-700 text-white text-xs font-bold px-3 h-8 shadow-xs"
                          >
                            Choisir ce modèle
                            <ChevronRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Custom form */
            <form onSubmit={handleCreateCustom} className="max-w-md mx-auto space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nom de l'évaluation *
                </label>
                <Input
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="Ex: Évaluation Badminton 3ème, Cycle Natation..."
                  className="font-bold text-slate-900 h-11"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Champ d'Apprentissage (CA)
                </label>
                <select
                  value={customCa}
                  onChange={e => setCustomCa(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                  className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value={1}>CA 1 • Performance motrice mesurée</option>
                  <option value={2}>CA 2 • Adaptation en milieu variable</option>
                  <option value={3}>CA 3 • Prestation artistique ou acrobatique</option>
                  <option value={4}>CA 4 • Affrontement interindividuel ou collectif</option>
                  <option value={5}>CA 5 • Entretien et développement de soi</option>
                </select>
              </div>

              <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                💡 Les critères officiels EPS sur 20 points recommandés pour ce Champ d'Apprentissage seront automatiquement appliqués. Vous pourrez ensuite les modifier librement.
              </p>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={!customName.trim()}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold h-11 shadow-sm"
                >
                  <Award className="w-4 h-4 mr-1.5" />
                  Créer l'évaluation pour {selectedClass.name}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
