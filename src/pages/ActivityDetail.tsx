import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  Calendar, 
  ChevronRight, 
  ChevronLeft, 
  FileText, 
  Trash2, 
  Edit2, 
  RefreshCw, 
  Plus, 
  Layers, 
  BookOpen, 
  Sparkles,
  Settings,
  FileSpreadsheet
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { EvaluationConfigDialog } from '../components/EvaluationConfigDialog';
import { EditActivityModal } from '../components/EditActivityModal';
import { SyncActivityModal } from '../components/SyncActivityModal';
import { DeleteActivityModal } from '../components/DeleteActivityModal';
import { EditSituationDialog } from '../components/EditSituationDialog';
import { ObservationSheet } from '../types';

export function ActivityDetail() {
  const { activityId } = useParams<{ activityId: string }>();
  const navigate = useNavigate();
  const { 
    activities, 
    classes, 
    sessions, 
    sheets, 
    observations,
    addSession, 
    deleteSession, 
    addSheet, 
    deleteSheet,
    createDefaultSheetForActivity
  } = useStore();
  
  const activity = activities.find(a => a.id === activityId);
  const parentClass = activity ? classes.find(c => c.id === activity.classId) : null;
  const actSessions = sessions.filter(s => s.activityId === activityId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const actSheets = sheets.filter(s => s.activityId === activityId);

  const [newSessionName, setNewSessionName] = useState('');
  
  // Modals for Activity
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Situation creation
  const [showAddSituation, setShowAddSituation] = useState(false);
  const [newSituationName, setNewSituationName] = useState('');
  const [newSituationMulti, setNewSituationMulti] = useState(false);

  // Editing existing situation
  const [editingSheet, setEditingSheet] = useState<ObservationSheet | null>(null);

  if (!activity) {
    return (
      <div className="p-8 text-center flex flex-col items-center">
        <div className="text-xl font-bold mb-2">Activité introuvable.</div>
        <Link to="/">
          <Button variant="outline">Retour à l'accueil</Button>
        </Link>
      </div>
    );
  }

  const handleAddSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;

    let targetSheetId = actSheets[0]?.id;
    if (!targetSheetId) {
      targetSheetId = createDefaultSheetForActivity(activity.id);
    }

    addSession({
      activityId: activity.id,
      name: newSessionName.trim(),
      date: new Date().toISOString(),
      feedback: '',
      sheetId: targetSheetId,
    });
    setNewSessionName('');
  };

  const handleCreateSituation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSituationName.trim()) return;
    addSheet({
      activityId: activity.id,
      name: newSituationName.trim(),
      isMultiStudent: newSituationMulti,
      fields: []
    });
    setNewSituationName('');
    setNewSituationMulti(false);
    setShowAddSituation(false);
  };

  const handleDeleteSheet = (sheetId: string, sheetName: string) => {
    if (window.confirm(`Voulez-vous vraiment supprimer la situation « ${sheetName} » de cette activité ?`)) {
      deleteSheet(sheetId);
    }
  };

  const getCaLabel = (ca?: number) => {
    switch (ca) {
      case 1: return { label: 'CA 1 • Performance', color: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 2: return { label: 'CA 2 • Adaptation', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      case 3: return { label: 'CA 3 • Artistique', color: 'bg-amber-100 text-amber-700 border-amber-200' };
      case 4: return { label: 'CA 4 • Affrontement', color: 'bg-purple-100 text-purple-700 border-purple-200' };
      case 5: return { label: 'CA 5 • Entretien', color: 'bg-rose-100 text-rose-700 border-rose-200' };
      default: return { label: 'Cycle EPS', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const caInfo = getCaLabel(activity.ca);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 ease-out">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          {parentClass && (
            <Link 
              to={`/class/${parentClass.id}`} 
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 font-medium mb-1 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Classe : {parentClass.name}
            </Link>
          )}
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{activity.name}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border ${caInfo.color}`}>
              {caInfo.label}
            </span>
          </div>
          <p className="text-slate-500 mt-1">Gestion des séances et des situations d'observation pour ce cycle.</p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsSyncModalOpen(true)}
            className="text-blue-700 border-blue-200 hover:bg-blue-50"
            title="Mettre à jour avec la base de données / banque"
          >
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Mettre à jour
          </Button>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsEditModalOpen(true)}
            className="text-indigo-700 border-indigo-200 hover:bg-indigo-50"
            title="Modifier le nom ou le CA"
          >
            <Edit2 className="w-4 h-4 mr-1.5" />
            Modifier
          </Button>

          <EvaluationConfigDialog activityId={activity.id} />

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsDeleteModalOpen(true)}
            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            title="Supprimer ce cycle"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Supprimer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Séances */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Historique des Séances ({actSessions.length})
            </h2>
          </div>
          
          <form onSubmit={handleAddSession} className="flex gap-2">
            <Input 
              placeholder="Nom de la séance (ex: Séance 1 - Évaluation diagnostique)" 
              value={newSessionName}
              onChange={e => setNewSessionName(e.target.value)}
              className="bg-white"
            />
            <Button type="submit" disabled={!newSessionName.trim()}>Nouvelle Séance</Button>
          </form>

          <div className="grid gap-4">
            {actSessions.map(session => {
              const sObs = observations.filter(o => o.sessionId === session.id);
              const sAbsent = sObs.filter(o => o.status === 'absent' || (Object.values(o.data).length > 0 && Object.values(o.data).every(v => v === 'A'))).length;
              const sDispense = sObs.filter(o => o.status === 'dispense' || (Object.values(o.data).length > 0 && Object.values(o.data).every(v => v === 'D'))).length;
              const sNoGear = sObs.filter(o => !!o.noGear).length;

              return (
                <Card key={session.id} className="hover:border-blue-300 transition-colors group cursor-pointer" onClick={() => navigate(`/session/${session.id}`)}>
                  <CardContent className="p-4 sm:p-6 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg group-hover:text-blue-600 transition-colors">{session.name}</h3>
                      </div>
                      <p className="text-sm text-slate-500 capitalize mt-0.5">
                        {format(new Date(session.date), 'EEEE d MMMM yyyy', { locale: fr })}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="text-xs text-slate-400 font-medium mr-1">
                          {sObs.length} relevé(s)
                        </span>
                        {sAbsent > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
                            {sAbsent} absent{sAbsent > 1 ? 's' : ''} (A)
                          </span>
                        )}
                        {sDispense > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            {sDispense} dispensé{sDispense > 1 ? 's' : ''} (D)
                          </span>
                        )}
                        {sNoGear > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                            <span>👟</span> {sNoGear} sans matériel
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/session/${session.id}/entry`);
                        }}
                        className="text-xs text-indigo-700 bg-indigo-50/60 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300"
                        title="Ouvrir la saisie rapide en tableau pour le professeur"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
                        Saisie Prof
                      </Button>
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
              );
            })}
            {actSessions.length === 0 && (
              <div className="text-center p-12 border border-dashed rounded-xl text-slate-500 bg-slate-50">
                Aucune séance. Créez votre première séance ci-dessus.
              </div>
            )}
          </div>
        </div>

        {/* Fiches d'observation (Situations) */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Situations (Fiches)
            </h2>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setShowAddSituation(!showAddSituation)}
              className="text-xs text-purple-700 border-purple-200 hover:bg-purple-50"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Nouvelle
            </Button>
          </div>

          {/* New Situation form */}
          {showAddSituation && (
            <Card className="border-purple-200 bg-purple-50/30 animate-in fade-in">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-purple-900 uppercase">Créer une situation</span>
                  <button onClick={() => setShowAddSituation(false)} className="text-slate-400 hover:text-slate-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <form onSubmit={handleCreateSituation} className="space-y-2">
                  <Input
                    placeholder="Nom de la situation (ex: Match 1v1, 30/30...)"
                    value={newSituationName}
                    onChange={e => setNewSituationName(e.target.value)}
                    className="bg-white text-xs h-9"
                    autoFocus
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newSituationMulti}
                        onChange={e => setNewSituationMulti(e.target.checked)}
                        className="rounded text-purple-600 focus:ring-purple-600"
                      />
                      Fiche multi-élèves
                    </label>
                    <Button type="submit" size="sm" disabled={!newSituationName.trim()} className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8">
                      Créer
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">
                Ces situations définissent les grilles de saisie et de mesure pour vos séances.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {actSheets.map(sheet => (
                  <div key={sheet.id} className="p-3 bg-slate-50 hover:bg-slate-100/70 transition-colors rounded-xl border border-slate-100 flex items-center justify-between gap-2 group">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold flex items-center gap-2 text-sm text-slate-800 truncate">
                        <span className="truncate">{sheet.name}</span>
                        {sheet.isMultiStudent && (
                          <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider shrink-0">
                            Multi
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">{sheet.fields.length} critères configurés</div>
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditingSheet(sheet)}
                        className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Éditer les critères de cette situation"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSheet(sheet.id, sheet.name)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer cette situation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {actSheets.length === 0 && (
                  <div className="text-sm text-slate-500 text-center py-6 border border-dashed rounded-xl">
                    Aucune situation liée à cette activité.
                    <div className="mt-2">
                      <Button size="sm" variant="outline" onClick={() => setIsSyncModalOpen(true)}>
                        Importer depuis la banque
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsSyncModalOpen(true)}
                  className="w-full text-xs text-blue-700 border-blue-200 hover:bg-blue-50 justify-center"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                  Mettre à jour avec la base de données
                </Button>
                <Link to="/library">
                  <Button variant="ghost" className="w-full text-xs text-slate-600 hover:text-slate-900 justify-center">
                    <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                    Ouvrir la banque de modèles
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <EditActivityModal
        activity={activity}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onOpenSync={() => setIsSyncModalOpen(true)}
        onOpenDelete={() => setIsDeleteModalOpen(true)}
      />

      <SyncActivityModal
        activity={activity}
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
      />

      <DeleteActivityModal
        activity={activity}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        redirectPath={parentClass ? `/class/${parentClass.id}` : '/'}
      />

      {editingSheet && (
        <EditSituationDialog
          sheet={editingSheet}
          isOpen={!!editingSheet}
          onClose={() => setEditingSheet(null)}
        />
      )}
    </div>
  );
}
