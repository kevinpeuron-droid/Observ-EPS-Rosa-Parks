import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Calendar, ChevronRight, FileText, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function ActivityDetail() {
  const { activityId } = useParams<{ activityId: string }>();
  const navigate = useNavigate();
  const { activities, sessions, sheets, addSession, deleteSession } = useStore();
  
  const activity = activities.find(a => a.id === activityId);
  const actSessions = sessions.filter(s => s.activityId === activityId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const actSheets = sheets.filter(s => s.activityId === activityId);

  const [newSessionName, setNewSessionName] = useState('');

  if (!activity) {
    return (
      <div className="p-8 text-center flex flex-col items-center">
        <div className="text-xl font-bold mb-2">Activité introuvable.</div>
        <div className="text-sm text-slate-500 max-w-md text-left bg-slate-100 p-4 rounded mt-4">
          <p>ID recherché: {activityId}</p>
          <p>Activités disponibles: {activities.length}</p>
          <ul className="list-disc pl-4 mt-2">
            {activities.map(a => <li key={a.id}>{a.name} ({a.id})</li>)}
          </ul>
        </div>
      </div>
    );
  }

  const handleAddSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;
    addSession({
      activityId: activity.id,
      name: newSessionName.trim(),
      date: new Date().toISOString(),
      feedback: '',
    });
    setNewSessionName('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 ease-out">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{activity.name}</h1>
        <p className="text-slate-500 mt-1">Gestion des séances pour cette classe.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Séances */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Historique des Séances
            </h2>
          </div>
          
          <form onSubmit={handleAddSession} className="flex gap-2">
            <Input 
              placeholder="Nom de la séance (ex: Séance 1 - Évaluation)" 
              value={newSessionName}
              onChange={e => setNewSessionName(e.target.value)}
            />
            <Button type="submit" disabled={!newSessionName.trim()}>Nouvelle Séance</Button>
          </form>

          <div className="grid gap-4">
            {actSessions.map(session => (
              <Card key={session.id} className="hover:border-blue-300 transition-colors group cursor-pointer" onClick={() => navigate(`/session/${session.id}`)}>
                <CardContent className="p-4 sm:p-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg group-hover:text-blue-600 transition-colors">{session.name}</h3>
                    <p className="text-sm text-slate-500 capitalize">
                      {format(new Date(session.date), 'EEEE d MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm("Voulez-vous vraiment supprimer cette séance et toutes ses observations ?")) {
                          deleteSession(session.id);
                        }
                      }} 
                      className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title="Supprimer la séance"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            ))}
            {actSessions.length === 0 && (
              <div className="text-center p-12 border border-dashed rounded-xl text-slate-500 bg-slate-50">
                Aucune séance. Créez votre première séance.
              </div>
            )}
          </div>
        </div>

        {/* Fiches d'observation */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Situations (Fiches)
            </h2>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <CardDescription>
                Ces situations ont été importées depuis la banque d'activités lors de la création de ce cycle.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {actSheets.map(sheet => (
                  <div key={sheet.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex flex-col gap-1">
                    <div className="font-medium flex items-center gap-2 text-sm text-slate-800">
                      {sheet.name}
                      {sheet.isMultiStudent && (
                        <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                          Multi
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">{sheet.fields.length} critères configurés</div>
                  </div>
                ))}
                {actSheets.length === 0 && (
                  <div className="text-sm text-slate-500 text-center py-4">
                    Aucune situation liée à cette activité.
                  </div>
                )}
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link to="/library">
                  <Button variant="outline" className="w-full text-sm">
                    Gérer la banque d'activités
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
