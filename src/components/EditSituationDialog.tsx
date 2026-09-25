import React, { useState } from 'react';
import { ObservationSheet, ObservationField, ObservationFieldType } from '../types';
import { useStore } from '../store';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { X, Plus, Trash2, Settings, FileText, CheckCircle2 } from 'lucide-react';
import { FIELD_TYPE_LABELS } from './SettingsDialog';

interface EditSituationDialogProps {
  sheet: ObservationSheet;
  isOpen: boolean;
  onClose: () => void;
}

export function EditSituationDialog({ sheet, isOpen, onClose }: EditSituationDialogProps) {
  const { updateSheet, addFieldToSheet, removeFieldFromSheet, activities } = useStore();
  const activity = activities.find(a => a.id === sheet.activityId);

  const [sheetName, setSheetName] = useState(sheet.name);
  const [isMulti, setIsMulti] = useState(sheet.isMultiStudent || false);

  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<ObservationFieldType>('counter');
  const [newBaliseCount, setNewBaliseCount] = useState<number>(10);
  const [newTargetMinutes, setNewTargetMinutes] = useState<number>(5);
  const [newTargetSeconds, setNewTargetSeconds] = useState<number>(0);
  const [newFieldUnits, setNewFieldUnits] = useState<{ hours: boolean; minutes: boolean; seconds: boolean }>({
    hours: false,
    minutes: true,
    seconds: true
  });

  if (!isOpen) return null;

  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetName.trim()) return;
    updateSheet(sheet.id, {
      name: sheetName.trim(),
      isMultiStudent: isMulti
    });
  };

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    const options: any = {};
    if (newType === 'orienteering_star') {
      options.baliseCount = newBaliseCount;
    }
    if (newType === 'time_mm_ss' || newType === 'distance_speed') {
      options.targetDuration = (newTargetMinutes * 60) + newTargetSeconds;
    }
    if (newType === 'time_duration') {
      const selectedUnits = [];
      if (newFieldUnits.hours) selectedUnits.push('hours');
      if (newFieldUnits.minutes) selectedUnits.push('minutes');
      if (newFieldUnits.seconds) selectedUnits.push('seconds');
      options.units = selectedUnits.length > 0 ? selectedUnits : ['minutes', 'seconds'];
      if (newTargetMinutes > 0 || newTargetSeconds > 0) {
        options.targetDuration = (newTargetMinutes * 60) + newTargetSeconds;
      }
    }

    addFieldToSheet(sheet.id, {
      label: newLabel.trim(),
      type: newType,
      options
    });

    setNewLabel('');
    setNewType('counter');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-100 text-purple-600 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Éditer la situation d'observation</h2>
              <p className="text-xs text-slate-500">Cycle : {activity?.name || 'Activité'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Situation Name and Multi-student toggle */}
          <form onSubmit={handleSaveInfo} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nom de la situation</label>
                <Input
                  value={sheetName}
                  onChange={e => setSheetName(e.target.value)}
                  onBlur={() => {
                    if (sheetName.trim() && sheetName !== sheet.name) {
                      updateSheet(sheet.id, { name: sheetName.trim() });
                    }
                  }}
                  className="bg-white font-medium"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 h-10 px-3 py-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isMulti}
                    onChange={e => {
                      setIsMulti(e.target.checked);
                      updateSheet(sheet.id, { isMultiStudent: e.target.checked });
                    }}
                    className="rounded text-purple-600 focus:ring-purple-600"
                  />
                  Fiche multi-élèves
                </label>
              </div>
            </div>
          </form>

          {/* Add Criteria Form */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-purple-600" />
              Ajouter un critère d'observation
            </h3>
            <form onSubmit={handleAddField} className="p-4 border rounded-xl bg-purple-50/30 border-purple-100 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Libellé (ex: Temps au 50m, Points marqués, Fautes...)"
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="sm:w-64">
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value as ObservationFieldType)}
                    className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-purple-500"
                  >
                    {Object.entries(FIELD_TYPE_LABELS).map(([t, label]) => (
                      <option key={t} value={t}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom options for Time Duration */}
              {newType === 'time_duration' && (
                <div className="p-3 bg-white rounded-lg border border-purple-200 space-y-3 text-xs">
                  <div className="font-semibold text-purple-900">Unités de mesure au choix :</div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newFieldUnits.hours}
                        onChange={e => setNewFieldUnits(u => ({ ...u, hours: e.target.checked }))}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>Heures (h)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newFieldUnits.minutes}
                        onChange={e => setNewFieldUnits(u => ({ ...u, minutes: e.target.checked }))}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>Minutes (min)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newFieldUnits.seconds}
                        onChange={e => setNewFieldUnits(u => ({ ...u, seconds: e.target.checked }))}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>Secondes (s)</span>
                    </label>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    <span className="text-slate-500">Temps cible / référence (optionnel) :</span>
                    <Input
                      type="number"
                      placeholder="min"
                      value={newTargetMinutes || ''}
                      onChange={e => setNewTargetMinutes(parseInt(e.target.value) || 0)}
                      className="w-16 h-8 text-xs bg-slate-50"
                    />
                    <span>min</span>
                    <Input
                      type="number"
                      placeholder="sec"
                      value={newTargetSeconds || ''}
                      onChange={e => setNewTargetSeconds(parseInt(e.target.value) || 0)}
                      className="w-16 h-8 text-xs bg-slate-50"
                    />
                    <span>sec</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button type="submit" disabled={!newLabel.trim()} className="bg-purple-600 hover:bg-purple-700 text-white text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Ajouter le critère
                </Button>
              </div>
            </form>
          </div>

          {/* List of current criteria */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              Critères configurés ({sheet.fields.length})
            </h3>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
              {sheet.fields.map(field => (
                <div key={field.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{field.label}</div>
                    <div className="text-xs text-slate-400">
                      Type : <span className="text-purple-600 font-medium">{FIELD_TYPE_LABELS[field.type] || field.type}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFieldFromSheet(sheet.id, field.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Supprimer ce critère"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {sheet.fields.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-400 italic">
                  Aucun critère dans cette situation. Ajoutez-en un ci-dessus.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <Button onClick={onClose} className="bg-slate-800 hover:bg-slate-900 text-white">
            Terminé
          </Button>
        </div>
      </div>
    </div>
  );
}
