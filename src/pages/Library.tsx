import React, { useState } from 'react';
import { useStore } from '../store';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Library as LibraryIcon, Plus, ChevronRight, Settings, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Library() {
  const { templateActivities, templateSheets, addTemplateActivity, deleteTemplateActivity, updateTemplateActivity } = useStore();
  const [newActivityName, setNewActivityName] = useState('');
  const [newActivityCA, setNewActivityCA] = useState<number>(1);

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityName.trim()) return;
    addTemplateActivity(newActivityName.trim(), newActivityCA as 1 | 2 | 3 | 4 | 5);
    setNewActivityName('');
  };

  const caNames = {
    1: 'CA 1 (Performance)',
    2: 'CA 2 (Adaptation)',
    3: 'CA 3 (Artistique)',
    4: 'CA 4 (Affrontement)',
    5: 'CA 5 (Entretien)'
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 ease-out max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <LibraryIcon className="w-8 h-8 text-indigo-600" />
          Banque d'activités (Modèles)
        </h1>
        <p className="text-slate-500 mt-1">Créez et configurez vos modèles d'activités classés par Champ d'Apprentissage.</p>
      </div>

      <Card className="border-indigo-100 bg-indigo-50/30">
        <CardContent className="pt-6">
          <form onSubmit={handleAddActivity} className="flex gap-4">
            <select 
              className="bg-white rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={newActivityCA}
              onChange={e => setNewActivityCA(parseInt(e.target.value))}
            >
              {[1, 2, 3, 4, 5].map(ca => (
                <option key={ca} value={ca}>{caNames[ca as 1 | 2 | 3 | 4 | 5]}</option>
              ))}
            </select>
            <Input 
              placeholder="Nouvelle activité (ex: Tennis de table, Musculation...)" 
              value={newActivityName}
              onChange={e => setNewActivityName(e.target.value)}
              className="bg-white flex-1"
            />
            <Button type="submit" disabled={!newActivityName.trim()} className="bg-indigo-600 hover:bg-indigo-700">
              Créer un modèle
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-8">
        {[1, 2, 3, 4, 5].map(ca => {
          const actsInCA = templateActivities.filter(a => a.ca === ca || (!a.ca && ca === 1)); // Default CA1 for old data
          if (actsInCA.length === 0) return null;

          return (
            <div key={ca} className="space-y-4">
              <h2 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-2">{caNames[ca as 1 | 2 | 3 | 4 | 5]}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {actsInCA.map(act => {
                  const actSheets = templateSheets.filter(s => s.templateActivityId === act.id);
                  return (
                    <Card key={act.id} className="h-full flex flex-col group hover:border-indigo-300 transition-colors">
                      <CardHeader className="pb-4 flex flex-row items-start justify-between space-y-0">
                        <CardTitle className="text-xl group-hover:text-indigo-600 transition-colors">{act.name}</CardTitle>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-slate-400 hover:text-red-500 -mt-2 -mr-2"
                          onClick={(e) => { e.preventDefault(); deleteTemplateActivity(act.id); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="text-sm font-medium text-slate-500 mb-2">Situations configurées : {actSheets.length}</div>
                          {actSheets.length > 0 && (
                            <ul className="space-y-2 mb-4">
                              {actSheets.slice(0, 3).map(sheet => (
                                <li key={sheet.id} className="text-sm bg-slate-50 p-2 rounded border border-slate-100 flex justify-between">
                                  <span className="truncate pr-2">{sheet.name}</span>
                                  <span className="text-slate-400 text-xs shrink-0">{sheet.fields.length} champs</span>
                                </li>
                              ))}
                              {actSheets.length > 3 && (
                                <li className="text-xs text-slate-400 italic">... et {actSheets.length - 3} autres</li>
                              )}
                            </ul>
                          )}
                        </div>
                        
                        <div className="pt-4 mt-auto border-t border-slate-100">
                          <Link to={`/library/${act.id}`}>
                            <Button variant="secondary" className="w-full justify-between group-hover:bg-indigo-50 group-hover:text-indigo-700">
                              Éditer les situations
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
        {templateActivities.length === 0 && (
          <div className="text-center p-12 border border-dashed rounded-xl text-slate-500 bg-slate-50">
            Aucun modèle d'activité. Créez-en un pour commencer.
          </div>
        )}
      </div>
    </div>
  );
}
