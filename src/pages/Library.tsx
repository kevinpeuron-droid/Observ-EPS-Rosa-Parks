import React, { useState } from 'react';
import { useStore } from '../store';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  Library as LibraryIcon, 
  Plus, 
  ChevronRight, 
  Settings, 
  Trash2, 
  Edit2, 
  Database, 
  Sparkles,
  Layers
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { UpdateDatabaseModal } from '../components/UpdateDatabaseModal';
import { EditTemplateModal } from '../components/EditTemplateModal';
import { TemplateActivity } from '../types';

export function Library() {
  const { 
    templateActivities, 
    templateSheets, 
    addTemplateActivity, 
    deleteTemplateActivity 
  } = useStore();
  
  const [newActivityName, setNewActivityName] = useState('');
  const [newActivityCA, setNewActivityCA] = useState<number>(1);

  const [isUpdateDbOpen, setIsUpdateDbOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateActivity | null>(null);

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityName.trim()) return;
    addTemplateActivity(newActivityName.trim(), newActivityCA as 1 | 2 | 3 | 4 | 5);
    setNewActivityName('');
  };

  const handleDeleteTemplate = (id: string, name: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le modèle « ${name} » et toutes ses situations associées dans la banque ?`)) {
      deleteTemplateActivity(id);
    }
  };

  const caNames: Record<number, string> = {
    1: 'CA 1 (Performance mesurée)',
    2: 'CA 2 (Adaptation en milieu variable)',
    3: 'CA 3 (Prestation artistique / acrobatique)',
    4: 'CA 4 (Affrontement interindividuel ou collectif)',
    5: 'CA 5 (Entretien et développement de soi)'
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 ease-out max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <LibraryIcon className="w-8 h-8 text-indigo-600" />
            Banque d'activités (Modèles EPS)
          </h1>
          <p className="text-slate-500 mt-1">Créez, modifiez et synchronisez vos modèles d'activités et situations par Champ d'Apprentissage.</p>
        </div>

        <Button
          onClick={() => setIsUpdateDbOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shrink-0"
        >
          <Database className="w-4 h-4 mr-2" />
          Mettre à jour la base de données
        </Button>
      </div>

      {/* Creation card */}
      <Card className="border-indigo-100 bg-indigo-50/30">
        <CardContent className="pt-6">
          <form onSubmit={handleAddActivity} className="flex flex-col sm:flex-row gap-3">
            <select 
              className="bg-white rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium sm:w-64 h-11"
              value={newActivityCA}
              onChange={e => setNewActivityCA(parseInt(e.target.value))}
            >
              {[1, 2, 3, 4, 5].map(ca => (
                <option key={ca} value={ca}>{caNames[ca]}</option>
              ))}
            </select>
            <Input 
              placeholder="Nouveau modèle (ex: Tennis de table, Escalade, Musculation...)" 
              value={newActivityName}
              onChange={e => setNewActivityName(e.target.value)}
              className="bg-white flex-1 h-11"
            />
            <Button type="submit" disabled={!newActivityName.trim()} className="bg-indigo-600 hover:bg-indigo-700 h-11 px-5">
              <Plus className="w-4 h-4 mr-1.5" />
              Créer un modèle
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* List of templates by CA */}
      <div className="space-y-8">
        {[1, 2, 3, 4, 5].map(ca => {
          const actsInCA = templateActivities.filter(a => a.ca === ca || (!a.ca && ca === 1));
          if (actsInCA.length === 0) return null;

          return (
            <div key={ca} className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block"></span>
                  {caNames[ca]}
                </h2>
                <span className="text-xs text-slate-400 font-medium">{actsInCA.length} activité(s)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {actsInCA.map(act => {
                  const actSheets = templateSheets.filter(s => s.templateActivityId === act.id);
                  return (
                    <Card key={act.id} className="h-full flex flex-col group hover:border-indigo-300 transition-colors">
                      <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0 gap-2">
                        <CardTitle className="text-lg font-bold group-hover:text-indigo-600 transition-colors truncate">
                          {act.name}
                        </CardTitle>
                        <div className="flex items-center gap-1 -mt-1 -mr-2 shrink-0">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                            onClick={(e) => { e.preventDefault(); setEditingTemplate(act); }}
                            title="Modifier ce modèle (nom, CA)"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                            onClick={(e) => { e.preventDefault(); handleDeleteTemplate(act.id, act.name); }}
                            title="Supprimer ce modèle"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-indigo-500" />
                            Situations configurées : {actSheets.length}
                          </div>
                          {actSheets.length > 0 ? (
                            <ul className="space-y-1.5 mb-4">
                              {actSheets.slice(0, 3).map(sheet => (
                                <li key={sheet.id} className="text-xs bg-slate-50 p-2 rounded-lg border border-slate-100 flex justify-between items-center">
                                  <span className="truncate pr-2 font-medium text-slate-700">{sheet.name}</span>
                                  <span className="text-slate-400 text-[10px] shrink-0">{sheet.fields.length} champs</span>
                                </li>
                              ))}
                              {actSheets.length > 3 && (
                                <li className="text-[11px] text-slate-400 italic pl-1">
                                  + {actSheets.length - 3} autre(s) situation(s)
                                </li>
                              )}
                            </ul>
                          ) : (
                            <div className="text-xs text-slate-400 italic mb-4 p-2 bg-slate-50 rounded-lg">
                              Aucune situation dans ce modèle.
                            </div>
                          )}
                        </div>
                        
                        <div className="pt-3 mt-auto border-t border-slate-100">
                          <Link to={`/library/${act.id}`}>
                            <Button variant="secondary" className="w-full justify-between group-hover:bg-indigo-50 group-hover:text-indigo-700 text-xs font-semibold">
                              Éditer les situations & critères
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
          <div className="text-center p-12 border border-dashed rounded-2xl text-slate-500 bg-slate-50 space-y-3">
            <p>Aucun modèle d'activité dans votre banque.</p>
            <Button onClick={() => setIsUpdateDbOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Database className="w-4 h-4 mr-2" />
              Charger la base de données officielle EPS
            </Button>
          </div>
        )}
      </div>

      {/* Modals */}
      <UpdateDatabaseModal
        isOpen={isUpdateDbOpen}
        onClose={() => setIsUpdateDbOpen(false)}
      />

      {editingTemplate && (
        <EditTemplateModal
          template={editingTemplate}
          isOpen={!!editingTemplate}
          onClose={() => setEditingTemplate(null)}
        />
      )}
    </div>
  );
}
