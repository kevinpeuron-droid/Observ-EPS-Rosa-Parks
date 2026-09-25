import React, { useState } from 'react';
import { Settings, X } from 'lucide-react';
import { useStore } from '../store';
import { ObservationFieldType } from '../types';

export const FIELD_TYPE_LABELS: Record<ObservationFieldType, string> = {
  counter: 'Compteur (+/-)',
  rating: 'Évaluation (Étoiles)',
  boolean: 'Oui / Non',
  number: 'Valeur Numérique Libre',
  speed_30s: 'Vitesse sur 30" (m -> km/h)',
  distance_speed: 'Distance + Temps cible (Vitesse moyenne)',
  time_mm_ss: 'Chrono + Temps cible (% Réussite)',
  time_duration: 'Temps Chronométré (Heures, Minutes, Secondes au choix)',
  orienteering_star: 'Course en étoile (Chrono Balises)',
  training_log: 'Carnet Musculation (Séries/Reps/Charge)',
  project_target: 'Projet de performance (Cible vs Réel)',
  ratio_action: 'Bilan de passes/actions (Réussite / Échec)',
  sequence_planner: 'Projet d\'enchaînement (Step / Gym)',
  performance_log: 'Carnet de Perf CA1 (1/2 fond, Allure, RPE)',
  orienteering_log: 'Carnet de Course d\'Orientation (CA2)',
  artistic_rating: 'Grille d\'évaluation CA3 (Danse / Gym)',
  match_stats: 'Statistiques de Match CA4 (Sports Co / Raquettes)',
  health_fitness_log: 'Carnet Santé & Entretien CA5 (BPM, Ateliers, Fatigue)',
  calculated_target: 'Calcul depuis une séance passée (Cible, %)'
};

const CA_NAMES = {
  1: 'CA 1 (Performance)',
  2: 'CA 2 (Adaptation)',
  3: 'CA 3 (Artistique)',
  4: 'CA 4 (Affrontement)',
  5: 'CA 5 (Entretien)'
};

export function SettingsDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, updateSettings } = useStore();
  const caMapping = settings?.caFieldMapping || {};

  const handleToggleField = (ca: number, field: ObservationFieldType) => {
    const currentFields = caMapping[ca] || [];
    let newFields;
    if (currentFields.includes(field)) {
      newFields = currentFields.filter(f => f !== field);
    } else {
      newFields = [...currentFields, field];
    }
    updateSettings({
      caFieldMapping: {
        ...caMapping,
        [ca]: newFields
      }
    });
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <Settings className="w-4 h-4" />
        <span className="hidden sm:inline">Paramètres</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Paramétrage des champs par Champ d'Apprentissage (CA)</h2>
                <p className="text-sm text-slate-500 mt-1">Sélectionnez quels types de saisie doivent être proposés lors de la création d'une fiche pour chaque CA.</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5].map(ca => {
                const selectedFields = caMapping[ca as 1|2|3|4|5] || [];
                return (
                  <div key={ca} className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h3 className="font-bold text-slate-800 text-lg border-b border-slate-200 pb-2">{CA_NAMES[ca as 1|2|3|4|5]}</h3>
                    <div className="space-y-2 h-64 overflow-y-auto pr-2">
                      {(Object.keys(FIELD_TYPE_LABELS) as ObservationFieldType[]).map(field => (
                        <label key={field} className="flex items-start gap-2 cursor-pointer group">
                          <input 
                            type="checkbox"
                            checked={selectedFields.includes(field)}
                            onChange={() => handleToggleField(ca, field)}
                            className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                          />
                          <span className="text-sm text-slate-700 group-hover:text-slate-900 leading-tight">
                            {FIELD_TYPE_LABELS[field]}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setIsOpen(false)}
                className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
