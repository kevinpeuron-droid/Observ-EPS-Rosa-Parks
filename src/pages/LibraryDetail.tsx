import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../store';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ChevronLeft, Plus, Trash2, Settings, Type } from 'lucide-react';
import { ObservationFieldType } from '../types';
import { FIELD_TYPE_LABELS } from '../components/SettingsDialog';

export function LibraryDetail() {
  const { templateId } = useParams<{ templateId: string }>();
  const { templateActivities, templateSheets, addTemplateSheet, deleteTemplateSheet, addFieldToTemplateSheet, removeFieldFromTemplateSheet, settings } = useStore();
  
  const template = templateActivities.find(t => t.id === templateId);
  const sheets = templateSheets.filter(ts => ts.templateActivityId === templateId);

  const [newSheetName, setNewSheetName] = useState('');
  const [newSheetIsMulti, setNewSheetIsMulti] = useState(false);
  const [activeSheetId, setActiveSheetId] = useState<string | null>(null);

  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<ObservationFieldType>('counter');
  const [newFieldBaliseCount, setNewFieldBaliseCount] = useState<number>(10);
  const [newFieldTargetMinutes, setNewFieldTargetMinutes] = useState<number>(5);
  const [newFieldTargetSeconds, setNewFieldTargetSeconds] = useState<number>(0);
  const [newFieldSourceId, setNewFieldSourceId] = useState<string>('');
  const [newFieldMultiplier, setNewFieldMultiplier] = useState<number>(100);
  const [newFieldOffset, setNewFieldOffset] = useState<number>(0);

  if (!template) {
    return <div className="p-8 text-center">Modèle introuvable.</div>;
  }

  const allowedFieldTypes = template.ca && settings?.caFieldMapping?.[template.ca] 
    ? settings.caFieldMapping[template.ca]
    : Object.keys(FIELD_TYPE_LABELS) as ObservationFieldType[];

  // Update newFieldType if the current one is not allowed
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
    if (newFieldType === 'calculated_target') {
      options.sourceFieldId = newFieldSourceId;
      options.multiplier = newFieldMultiplier / 100; // stored as decimal
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500 ease-out max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link to="/library" className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            {template.name}
          </h1>
          <p className="text-slate-500 mt-1">Édition du modèle d'activité et de ses situations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Situations d'observation</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddSheet} className="flex flex-col gap-2 mb-6">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Ex: Match, 30/30..." 
                    value={newSheetName}
                    onChange={e => setNewSheetName(e.target.value)}
                  />
                  <Button type="submit" size="icon" disabled={!newSheetName.trim()}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700 mt-1 cursor-pointer">
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
                    className={`p-3 rounded-lg border cursor-pointer transition-colors flex justify-between items-center group ${
                      activeSheetId === sheet.id ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:border-indigo-300'
                    }`}
                    onClick={() => setActiveSheetId(sheet.id)}
                  >
                    <div>
                      <div className={`font-medium flex items-center gap-2 ${activeSheetId === sheet.id ? 'text-indigo-700' : 'text-slate-700'}`}>
                        {sheet.name}
                        {sheet.isMultiStudent && (
                          <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                            Multi
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">{sheet.fields.length} critères</div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); deleteTemplateSheet(sheet.id); if(activeSheetId === sheet.id) setActiveSheetId(null); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {sheets.length === 0 && (
                  <p className="text-sm text-slate-500 text-center italic py-4">Aucune situation créée.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {activeSheetId ? (
            <Card className="h-full border-indigo-100 shadow-sm animate-in slide-in-from-right-4">
              <CardHeader className="bg-indigo-50/50 border-b border-indigo-100">
                <CardTitle className="text-indigo-900 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configuration des critères : {sheets.find(s => s.id === activeSheetId)?.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-8">
                
                <form onSubmit={handleAddField} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                  <h4 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Ajouter un nouveau critère</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Nom du critère</label>
                      <Input 
                        placeholder="Ex: Passes réussies, FC max..." 
                        value={newFieldLabel}
                        onChange={e => setNewFieldLabel(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Type de saisie</label>
                      <select 
                        className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
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
                      <label className="text-sm font-medium text-slate-700">Nombre de balises</label>
                      <Input 
                        type="number"
                        min={1}
                        value={newFieldBaliseCount}
                        onChange={e => setNewFieldBaliseCount(parseInt(e.target.value) || 10)}
                        className="bg-white"
                      />
                    </div>
                  )}

                  {(newFieldType === 'time_mm_ss' || newFieldType === 'distance_speed') && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Temps de référence (Cible)</label>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="number"
                          min={0}
                          value={newFieldTargetMinutes}
                          onChange={e => setNewFieldTargetMinutes(parseInt(e.target.value) || 0)}
                          className="bg-white w-24"
                          placeholder="Min"
                        />
                        <span className="text-slate-500 font-medium">min</span>
                        <Input 
                          type="number"
                          min={0}
                          max={59}
                          value={newFieldTargetSeconds}
                          onChange={e => setNewFieldTargetSeconds(parseInt(e.target.value) || 0)}
                          className="bg-white w-24"
                          placeholder="Sec"
                        />
                        <span className="text-slate-500 font-medium">sec</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Sert à calculer {newFieldType === 'time_mm_ss' ? 'le % de temps réalisé' : 'la vitesse moyenne'}.
                      </p>
                    </div>
                  )}

                  {newFieldType === 'calculated_target' && (
                    <div className="space-y-4 pt-4 border-t border-slate-200">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Donnée source (issue de la séance passée)</label>
                        <select 
                          className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                          value={newFieldSourceId}
                          onChange={e => setNewFieldSourceId(e.target.value)}
                        >
                          <option value="">Sélectionnez un critère source...</option>
                          {sheets.find(s => s.id === activeSheetId)?.fields.map(f => (
                            <option key={f.id} value={f.id}>{f.label} ({FIELD_TYPE_LABELS[f.type]})</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Multiplicateur (%)</label>
                          <div className="flex items-center gap-2">
                            <Input 
                              type="number"
                              value={newFieldMultiplier}
                              onChange={e => setNewFieldMultiplier(Number(e.target.value))}
                              className="bg-white"
                            />
                            <span className="text-slate-500">%</span>
                          </div>
                          <p className="text-xs text-slate-500">Ex: 80 pour 80% (0.8x)</p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Ajustement final</label>
                          <Input 
                            type="number"
                            value={newFieldOffset}
                            onChange={e => setNewFieldOffset(Number(e.target.value))}
                            className="bg-white"
                          />
                          <p className="text-xs text-slate-500">Ex: +2, -1...</p>
                        </div>
                      </div>
                      <div className="p-3 bg-indigo-50 text-indigo-800 rounded-md text-sm border border-indigo-100">
                        <strong>Formule appliquée :</strong> (Valeur passée × {newFieldMultiplier / 100}) {newFieldOffset >= 0 ? '+' : '-'} {Math.abs(newFieldOffset)}
                      </div>
                    </div>
                  )}

                  <Button type="submit" disabled={!newFieldLabel.trim() || (newFieldType === 'calculated_target' && !newFieldSourceId)} className="w-full bg-indigo-600 hover:bg-indigo-700">
                    Ajouter le critère
                  </Button>
                </form>

                <div>
                  <h4 className="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wide">Critères actuels de la situation</h4>
                  <div className="space-y-3">
                    {sheets.find(s => s.id === activeSheetId)?.fields.map(field => (
                      <div key={field.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                            <Type className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-800">{field.label}</div>
                            <div className="text-xs text-slate-500">{FIELD_TYPE_LABELS[field.type]}</div>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-slate-400 hover:text-red-500"
                          onClick={() => removeFieldFromTemplateSheet(activeSheetId, field.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {sheets.find(s => s.id === activeSheetId)?.fields.length === 0 && (
                      <div className="text-center p-8 border border-dashed rounded-lg text-slate-500">
                        Cette situation ne contient aucun critère d'observation.
                      </div>
                    )}
                  </div>
                </div>

              </CardContent>
            </Card>
          ) : (
            <div className="h-full border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-500 p-12 text-center bg-slate-50/50">
              Sélectionnez ou créez une situation d'observation à gauche pour configurer ses critères.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
