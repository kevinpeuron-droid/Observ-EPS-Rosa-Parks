import React, { useState } from 'react';
import { useStore } from '../store';
import { Button } from './ui/Button';
import { Database, Sparkles, RefreshCw, CheckCircle2, AlertCircle, X, ShieldAlert } from 'lucide-react';

interface UpdateDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpdateDatabaseModal({ isOpen, onClose }: UpdateDatabaseModalProps) {
  const { loadOfficialEpsDatabase } = useStore();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApply = (mode: 'merge' | 'reset') => {
    loadOfficialEpsDatabase(mode);
    setSuccessMsg(
      mode === 'merge'
        ? "Base d'activités EPS enrichie avec succès !"
        : "Base d'activités EPS réinitialisée avec les modèles officiels !"
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
            <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Mise à jour de la base de données EPS</h2>
              <p className="text-xs text-slate-500">Modèles officiels couvrant les 5 Champs d'Apprentissage (CA 1 à 5)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm font-medium animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-blue-900 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-blue-800">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              Ce que contient la nouvelle base de données officielle :
            </div>
            <p>
              Une collection complète d'activités prêtes pour le terrain avec leurs fiches d'observation, barèmes d'évaluation, et les <strong>nouveaux chronomètres configurables</strong> (heures, minutes, secondes au choix) :
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 pl-2 text-blue-800 font-medium">
              <li>• <strong>CA 1 :</strong> 1/2 Fond, Relais-Vitesse, Natation</li>
              <li>• <strong>CA 2 :</strong> Course d'Orientation, Escalade SAE</li>
              <li>• <strong>CA 3 :</strong> Acrosport, Gymnastique au sol, Danse</li>
              <li>• <strong>CA 4 :</strong> Badminton, Tennis de table, Sports Co</li>
              <li>• <strong>CA 5 :</strong> Musculation, Course en durée</li>
            </ul>
          </div>

          <div className="space-y-4">
            <div className="p-5 border border-indigo-200 bg-indigo-50/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Option 1 : Enrichir la banque d'activités (Recommandé)
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Ajoute toutes les activités officielles manquantes sans modifier ni supprimer vos modèles personnalisés actuels.
                </p>
              </div>
              <Button
                onClick={() => handleApply('merge')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 w-full sm:w-auto text-xs"
              >
                Enrichir la banque
              </Button>
            </div>

            <div className="p-5 border border-slate-200 bg-slate-50/50 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-slate-600" />
                  Option 2 : Réinitialiser complètement la banque
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Recharge l'intégralité du catalogue officiel standard. Utile pour repartir d'une base propre.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  if (window.confirm("Attention : cela va remplacer vos modèles d'activités dans la banque par le catalogue officiel par défaut. Vos classes et observations d'élèves existantes ne seront pas supprimées. Continuer ?")) {
                    handleApply('reset');
                  }
                }}
                className="border-slate-300 text-slate-700 hover:bg-slate-100 shrink-0 w-full sm:w-auto text-xs"
              >
                Réinitialiser
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </div>
  );
}
