import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, ArrowRight, Layers, X, Sparkles } from 'lucide-react';
import { useStore } from '../store';
import { Activity } from '../types';
import { Button } from './ui/Button';

interface SyncActivityModalProps {
  activity: Activity;
  isOpen: boolean;
  onClose: () => void;
}

export function SyncActivityModal({ activity, isOpen, onClose }: SyncActivityModalProps) {
  const { templateActivities, templateSheets, sheets, syncActivityFromTemplate } = useStore();
  
  // Find default template
  const defaultTemplate = templateActivities.find(t => t.id === activity.templateId) ||
    templateActivities.find(t => t.name.toLowerCase().trim() === activity.name.toLowerCase().trim()) ||
    templateActivities[0];

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(defaultTemplate?.id || '');
  const [syncMode, setSyncMode] = useState<'merge_missing' | 'replace'>('merge_missing');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentSheets = sheets.filter(s => s.activityId === activity.id);
  const selectedTemplate = templateActivities.find(t => t.id === selectedTemplateId);
  const templateSheetsForSelected = selectedTemplate ? templateSheets.filter(ts => ts.templateActivityId === selectedTemplate.id) : [];

  const existingSheetNames = new Set(currentSheets.map(s => s.name.toLowerCase().trim()));
  const missingSheets = templateSheetsForSelected.filter(ts => !existingSheetNames.has(ts.name.toLowerCase().trim()));

  const handleSync = () => {
    if (!selectedTemplateId) return;
    syncActivityFromTemplate(activity.id, selectedTemplateId, syncMode);
    setSuccessMsg(
      syncMode === 'merge_missing'
        ? `${missingSheets.length} situation(s) ajoutée(s) avec succès !`
        : `Toutes les situations ont été synchronisées avec "${selectedTemplate?.name}" !`
    );
    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Mettre à jour le cycle</h2>
              <p className="text-xs text-slate-500">Synchroniser avec la banque d'activités & base de données</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm font-medium animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
              Modèle de référence dans la banque
            </label>
            <select
              value={selectedTemplateId}
              onChange={e => setSelectedTemplateId(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
            >
              {templateActivities.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} (CA {t.ca || 1}) — {templateSheets.filter(ts => ts.templateActivityId === t.id).length} situation(s)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <div className="text-xs text-slate-500 font-medium">Situations actuelles ({currentSheets.length}) :</div>
              <ul className="mt-1 space-y-1 text-xs text-slate-700">
                {currentSheets.length > 0 ? (
                  currentSheets.map(s => (
                    <li key={s.id} className="truncate">• {s.name}</li>
                  ))
                ) : (
                  <li className="text-slate-400 italic">Aucune situation</li>
                )}
              </ul>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Dans le modèle ({templateSheetsForSelected.length}) :</div>
              <ul className="mt-1 space-y-1 text-xs text-slate-700">
                {templateSheetsForSelected.length > 0 ? (
                  templateSheetsForSelected.map(s => (
                    <li key={s.id} className="truncate">• {s.name}</li>
                  ))
                ) : (
                  <li className="text-slate-400 italic">Aucune situation</li>
                )}
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Mode de mise à jour
            </label>
            <div className="grid gap-3">
              <label 
                className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  syncMode === 'merge_missing' 
                    ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="syncMode"
                  value="merge_missing"
                  checked={syncMode === 'merge_missing'}
                  onChange={() => setSyncMode('merge_missing')}
                  className="mt-1 text-blue-600 focus:ring-blue-600"
                />
                <div>
                  <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    Ajouter les situations manquantes (Recommandé)
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Ajoute uniquement les nouvelles situations du modèle sans supprimer les situations existantes ni les données d'observation déjà saisies par vos élèves.
                  </p>
                  {missingSheets.length > 0 ? (
                    <div className="mt-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded inline-block">
                      + {missingSheets.length} nouvelle(s) situation(s) à ajouter
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-slate-500 italic">
                      Ce cycle possède déjà toutes les situations du modèle.
                    </div>
                  )}
                </div>
              </label>

              <label 
                className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  syncMode === 'replace' 
                    ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="syncMode"
                  value="replace"
                  checked={syncMode === 'replace'}
                  onChange={() => setSyncMode('replace')}
                  className="mt-1 text-amber-600 focus:ring-amber-600"
                />
                <div>
                  <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-600" />
                    Remplacer / Réinitialiser selon le modèle
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Remplace l'ensemble des fiches d'observation de cette activité par une copie propre et conforme au modèle sélectionné.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSync} className="bg-blue-600 hover:bg-blue-700 text-white">
            <RefreshCw className="w-4 h-4 mr-2" />
            Appliquer la mise à jour
          </Button>
        </div>
      </div>
    </div>
  );
}
