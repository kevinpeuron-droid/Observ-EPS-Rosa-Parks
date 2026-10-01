import React, { useState } from 'react';
import { useStore } from '../store';
import { TemplateActivity } from '../types';
import { Button } from './ui/Button';
import { X, Check, Users, Award, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ApplyTemplateToClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: TemplateActivity | null;
}

export function ApplyTemplateToClassModal({
  isOpen,
  onClose,
  template
}: ApplyTemplateToClassModalProps) {
  const navigate = useNavigate();
  const { classes, addActivityFromTemplate } = useStore();
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  if (!isOpen || !template) return null;

  const handleApply = () => {
    if (!selectedClassId) return;
    const newActId = addActivityFromTemplate(selectedClassId, template.id);
    onClose();
    navigate(`/evaluation/${newActId}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50/50 via-white to-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Appliquer l'évaluation à une classe
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-[240px]">
                {template.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Sélectionnez la classe destinataire :
          </label>

          {classes.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
              Aucune classe n'est encore créée. Créez d'abord une classe sur le tableau de bord.
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {classes.map(c => (
                <div
                  key={c.id}
                  onClick={() => setSelectedClassId(c.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    selectedClassId === c.id
                      ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                      {c.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-800">{c.name}</div>
                      <div className="text-[11px] text-slate-500">{c.students?.length || 0} élève(s)</div>
                    </div>
                  </div>

                  {selectedClassId === c.id && (
                    <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs font-bold">
            Annuler
          </Button>
          <Button
            size="sm"
            onClick={handleApply}
            disabled={!selectedClassId}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4"
          >
            Lancer l'évaluation
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
