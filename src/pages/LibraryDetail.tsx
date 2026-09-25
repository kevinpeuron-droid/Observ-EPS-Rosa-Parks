import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../store';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ChevronLeft, Plus, Trash2, Settings, Type, Edit2, Check } from 'lucide-react';
import { ObservationFieldType } from '../types';
import { FIELD_TYPE_LABELS } from '../components/SettingsDialog';
import { EditTemplateModal } from '../components/EditTemplateModal';

export function LibraryDetail() {
  const { templateId } = useParams<{ templateId: string }>();
  const { 
    templateActivities, 
    templateSheets, 
    addTemplateSheet, 
    updateTemplateSheet,
    deleteTemplateSheet, 
    addFieldToTemplateSheet, 
    removeFieldFromTemplateSheet, 
    settings 
  } = useStore();
  
  const template = templateActivities.find(t => t.id === templateId);
  const sheets = templateSheets.filter(ts => ts.templateActivityId === templateId);

  const [newSheetName, setNewSheetName] = useState('');
  const [newSheetIsMulti, setNewSheetIsMulti] = useState(false);
  const [activeSheetId, setActiveSheetId] = useState<string | null>(null);

  const [isEditTemplateModalOpen, setIsEditTemplateModalOpen] = useState(false);

  // Editable selected sheet name
  const [editingSheetName, setEditingSheetName] = useState('');

  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<ObservationFieldType>('counter');
  const [newFieldBaliseCount, setNewFieldBaliseCount] = useState<number>(10);
  const [newFieldTargetMinutes, setNewFieldTargetMinutes] = useState<number>(5);
  const [newFieldTargetSeconds, setNewFieldTargetSeconds] = useState<number>(0);
  const [newFieldSourceId, setNewFieldSourceId] = useState<string>('');
  const [newFieldMultiplier, setNewFieldMultiplier] = useState<number>(100);
  const [newFieldOffset, setNewFieldOffset] = useState<number>(0);
  const [newFieldUnits, setNewFieldUnits] = useState<{ hours: boolean; minutes: boolean; seconds: boolean }>({
    hours: false,
    minutes: true,
    seconds: true
  });

  // Auto-select first sheet if none selected
  useEffect(() => {
    if (!activeSheetId && sheets.length > 0) {
      setActiveSheetId(sheets[0].id);
    }
  }, [sheets, activeSheetId]);

  // Sync editing sheet name with active sheet
  useEffect(() => {
    const current = sheets.find(s => s.id === activeSheetId);
    if (current) {
      setEditingSheetName(current.name);
    }
  }, [activeSheetId]);

  if (!template) {
    return <div className="p-8 text-center text-slate-500">Modèle introuvable.</div>;
  }

  const allowedFieldTypes = template.ca && settings?.caFieldMapping?.[template.ca] 
    ? settings.caFieldMapping[template.ca]
    : Object.keys(FIELD_TYPE_LABELS) as ObservationFieldType[];

  useEffect(() => {
    if (!allowedFieldTypes.includes(newFieldType) && allowedFieldTypes.length > 0) {
      setNewFieldType(allowedFieldTypes[0]);
    }
  }, [allowedFieldTypes, newFieldType]);

  const handleAddSheet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSheetName.trim()) return;
    addTemplateSheet(template.id, newSheetName.trim(), newSheetIsMulti);
    setNewSheetName('');
    setNewSheetIsMulti(false);
  };

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldLabel.trim() || !activeSheetId) return;
    
    const options: any = {};
    if (newFieldType === 'orienteering_star') {
      options.baliseCount = newFieldBaliseCount;
    }
    if (newFieldType === 'time_mm_ss' || newFieldType === 'distance_speed') {
      options.targetDuration = (newFieldTargetMinutes * 60) + newFieldTargetSeconds;
    }
    if (newFieldType === 'time_duration') {
      const selectedUnits = [];
      if (newFieldUnits.hours) selectedUnits.push('hours');
      if (newFieldUnits.minutes) selectedUnits.push('minutes');
      if (newFieldUnits.seconds) selectedUnits.push('seconds');
      options.units = selectedUnits.length > 0 ? selectedUnits : ['minutes', 'seconds'];
      if (newFieldTargetMinutes > 0 || newFieldTargetSeconds > 0) {
        options.targetDuration = (newFieldTargetMinutes * 60) + newFieldTargetSeconds;
      }
    }
    if (newFieldType === 'calculated_target') {
      options.sourceFieldId = newFieldSourceId;
      options.multiplier = newFieldMultiplier / 100;
      options.offset = newFieldOffset;
    }

    addFieldToTemplateSheet(activeSheetId, { 
      label: newFieldLabel.trim(), 
      type: newFieldType,
      options 
    });
    setNewFieldLabel('');
    setNewFieldType('counter');
    setNewFieldSourceId('');
  };

  const activeSheet = sheets.find(s => s.id === activeSheetId);

  const getCaLabel = (ca?: number) => {
    switch (ca) {
      case 1: return { label: 'CA 1 • Performance', color: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 2: return { label: 'CA 2 • Adaptation', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      case 3: return { label: 'CA 3 • Artistique', color: 'bg-amber-100 text-amber-700 border-amber-200' };
      case 4: return { label: 'CA 4 • Affrontement', color: 'bg-purple-100 text-purple-700 border-purple-200' };
      case 5: return { label: 'CA 5 • Entretien', color: 'bg-rose-100 text-rose-700 border-rose-200' };
      default: return { label: 'Modèle EPS', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const caInfo = getCaLabel(template.ca);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 ease-out max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link to="/library" className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                {template.name}
              </h1>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${caInfo.color}`}>
                {caInfo.label}
              </span>
            </div>
            <p className="text-slate-500 mt-1">Édition du modèle d'activité et de ses situations d'observation.</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditTemplateModalOpen(true)}
          className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
        >
          <Edit2 className="w-4 h-4 mr-1.5" />
          Renommer / Modifier le modèle
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Situations List & Add Form */}
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-900">Situations d'observation</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddSheet} className="flex flex-col gap-2 mb-6 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Ex: Match, 30/30, Parcours..." 
                    value={newSheetName}
                    onChange={e => setNewSheetName(e.target.value)}
                    className="bg-white h-9 text-xs"
                  />
                  <Button type="submit" size="sm" disabled={!newSheetName.trim()} className="h-9 px-3">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={newSheetIsMulti}
                    onChange={e => setNewSheetIsMulti(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                  />
                  Fiche multi-élèves
                </label>
              </form>

              <div className="space-y-2">
                {sheets.map(sheet => (
                  <div 
                    key={sheet.id}
                    className={`p-3 rounded-xl border cursor-pointer transition-colors flex justify-between items-center group ${
                      activeSheetId === sheet.id ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:border-indigo-300'
                    }`}
                    onClick={() => setActiveSheetId(sheet.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className={`font-semibold flex items-center gap-2 text-sm ${activeSheetId === sheet.id ? 'text-indigo-700' : 'text-slate-700'}`}>
                        <span className="truncate">{sheet.name}</span>
                        {sheet.isMultiStudent && (
                          <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider shrink-0">
                            Multi
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">{sheet.fields.length} critère(s)</div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (window.confirm(`Supprimer la situation « ${sheet.name} » de ce modèle ?`)) {
                          deleteTemplateSheet(sheet.id); 
                          if (activeSheetId === sheet.id) setActiveSheetId(null);
                        }
                      }}
                      title="Supprimer la situation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {sheets.length === 0 && (
                  <p className="text-xs text-slate-400 text-center italic py-6 border border-dashed rounded-xl">
                    Aucune situation créée.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Active Situation Criteria & Configuration */}
        <div className="lg:col-span-2">
          {activeSheet ? (
            <Card className="h-full border-indigo-100 shadow-sm animate-in slide-in-from-right-4">
              <CardHeader className="bg-indigo-50/50 border-b border-indigo-100 py-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <Settings className="w-5 h-5 text-indigo-600 shrink-0" />
                    <Input
                      value={editingSheetName}
                      onChange={e => setEditingSheetName(e.target.value)}
                      onBlur={() => {
                        if (editingSheetName.trim() && editingSheetName !== activeSheet.name) {
                          updateTemplateSheet(activeSheet.id, { name: editingSheetName.trim() });
                        }
                      }}
                      className="font-bold text-lg text-indigo-950 bg-transparent border-transparent hover:border-indigo-300 focus:bg-white focus:border-indigo-500 h-9 px-2"
                      title="Cliquez pour renommer cette situation"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-indigo-900 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeSheet.isMultiStudent || false}
                        onChange={e => updateTemplateSheet(activeSheet.id, { isMultiStudent: e.target.checked })}
                        className="rounded text-indigo-600 focus:ring-indigo-600"
                      />
                      Multi-élèves
                    </label>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6 space-y-8">
                {/* Form to add a criterion */}
                <form onSubmit={handleAddField} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                  <h4 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Ajouter un nouveau critère</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700 uppercase">Nom du critère</label>
                      <Input 
                        placeholder="Ex: Temps au 50m, Passes réussies..." 
                        value={newFieldLabel}
                        onChange={e => setNewFieldLabel(e.target.value)}
                        className="bg-white text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700 uppercase">Type de saisie</label>
                      <select 
                        className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                        value={newFieldType}
                        onChange={e => setNewFieldType(e.target.value as ObservationFieldType)}
                      >
                        {allowedFieldTypes.map((key) => (
                          <option key={key} value={key}>{FIELD_TYPE_LABELS[key]}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {newFieldType === 'orienteering_star' && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700 uppercase">Nombre de balises</label>
                      <Input 
                        type="number"
                        min={1}
                        value={newFieldBaliseCount}
                        onChange={e => setNewFieldBaliseCount(Number(e.target.value))}
                        className="bg-white"
                      />
                    </div>
                  )}

                  {/* Time Duration Units Customization */}
                  {newFieldType === 'time_duration' && (
                    <div className="p-3 bg-white rounded-lg border border-indigo-200 space-y-3 text-xs">
                      <div className="font-semibold text-indigo-900">Unités de mesure au choix :</div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newFieldUnits.hours}
                            onChange={e => setNewFieldUnits(u => ({ ...u, hours: e.target.checked }))}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>Heures (h)</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newFieldUnits.minutes}
                            onChange={e => setNewFieldUnits(u => ({ ...u, minutes: e.target.checked }))}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>Minutes (min)</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newFieldUnits.seconds}
                            onChange={e => setNewFieldUnits(u => ({ ...u, seconds: e.target.checked }))}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>Secondes (s)</span>
                        </label>
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                        <span className="text-slate-500">Temps cible / référence (optionnel) :</span>
                        <Input
                          type="number"
                          placeholder="min"
                          value={newFieldTargetMinutes || ''}
                          onChange={e => setNewFieldTargetMinutes(parseInt(e.target.value) || 0)}
                          className="w-16 h-8 text-xs bg-slate-50"
                        />
                        <span>min</span>
                        <Input
                          type="number"
                          placeholder="sec"
                          value={newFieldTargetSeconds || ''}
                          onChange={e => setNewFieldTargetSeconds(parseInt(e.target.value) || 0)}
                          className="w-16 h-8 text-xs bg-slate-50"
                        />
                        <span>sec</span>
                      </div>
                    </div>
                  )}

                  <Button type="submit" disabled={!newFieldLabel.trim()} className="w-full bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-1.5" />
                    Ajouter le critère
                  </Button>
                </form>

                {/* Criteria List */}
                <div>
                  <h4 className="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wide">
                    Critères configurés ({activeSheet.fields.length})
                  </h4>
                  <div className="space-y-3">
                    {activeSheet.fields.map(field => (
                      <div key={field.id} className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                            <Type className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-slate-800">{field.label}</div>
                            <div className="text-xs text-slate-500">{FIELD_TYPE_LABELS[field.type] || field.type}</div>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                          onClick={() => removeFieldFromTemplateSheet(activeSheet.id, field.id)}
                          title="Supprimer ce critère"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {activeSheet.fields.length === 0 && (
                      <div className="text-center p-8 border border-dashed rounded-xl text-slate-400 text-xs italic">
                        Cette situation ne contient aucun critère d'observation.
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-500 p-12 text-center bg-slate-50/50">
              Sélectionnez ou créez une situation d'observation à gauche pour configurer ses critères.
            </div>
          )}
        </div>
      </div>

      {/* Edit Template Modal */}
      {isEditTemplateModalOpen && (
        <EditTemplateModal
          template={template}
          isOpen={isEditTemplateModalOpen}
          onClose={() => setIsEditTemplateModalOpen(false)}
        />
      )}
    </div>
  );
}
