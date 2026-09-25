import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Activity as ActivityIcon, Plus, ChevronRight, UserPlus, Trash2, Eye, Edit2, Save, X, RefreshCw, Sparkles, BookOpen } from 'lucide-react';
import { EditActivityModal } from '../components/EditActivityModal';
import { SyncActivityModal } from '../components/SyncActivityModal';
import { DeleteActivityModal } from '../components/DeleteActivityModal';
import { Activity } from '../types';
import { ClassPermanentStatsBanner } from '../components/ClassPermanentStatsBanner';

export function ClassDetail() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { 
    classes, 
    activities, 
    sessions, 
    sheets, 
    updateClass, 
    deleteClass, 
    templateActivities, 
    addActivityFromTemplate, 
    createCustomActivity, 
    mergeClasses 
  } = useStore();
  
  const cls = classes.find(c => c.id === classId);
  const classActivities = activities.filter(a => a.classId === classId);
  const otherClasses = classes.filter(c => c.id !== classId);

  const [newStudentName, setNewStudentName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedMergeClassId, setSelectedMergeClassId] = useState('');

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  // Modals for Activity
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [syncingActivity, setSyncingActivity] = useState<Activity | null>(null);
  const [deletingActivity, setDeletingActivity] = useState<Activity | null>(null);

  // Custom activity creation toggle
  const [showCustomActivityInput, setShowCustomActivityInput] = useState(false);
  const [customActivityName, setCustomActivityName] = useState('');
  const [customActivityCA, setCustomActivityCA] = useState<number>(1);

  useEffect(() => {
    if (cls) setEditedName(cls.name);
  }, [cls?.name]);

  if (!cls) {
    return <div className="p-8 text-center text-slate-500">Classe introuvable.</div>;
  }

  const handleSaveName = () => {
    if (editedName.trim()) {
      updateClass(cls.id, { name: editedName.trim() });
    }
    setIsEditingName(false);
  };

  const handleDeleteClass = () => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette classe et toutes ses données ? Cette action est irréversible.")) {
      deleteClass(cls.id);
      navigate('/');
    }
  };

  const handleMergeClass = () => {
    if (!selectedMergeClassId) return;
    const targetClass = classes.find(c => c.id === selectedMergeClassId);
    if (!targetClass) return;
    if (window.confirm(`Êtes-vous sûr de vouloir fusionner cette classe dans "${targetClass.name}" ?\n\nTous les élèves, équipes et activités seront transférés, puis cette classe sera supprimée.`)) {
      mergeClasses(targetClass.id, cls.id);
      navigate(`/class/${targetClass.id}`);
    }
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    updateClass(cls.id, {
      students: [...cls.students, { id: Math.random().toString(36).substr(2, 9), name: newStudentName.trim() }]
    });
    setNewStudentName('');
  };

  const handleRemoveStudent = (studentId: string) => {
    updateClass(cls.id, {
      students: cls.students.filter(s => s.id !== studentId)
    });
  };

  const handleAddTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    updateClass(cls.id, {
      teams: [...(cls.teams || []), { id: Math.random().toString(36).substr(2, 9), name: newTeamName.trim(), studentIds: [] }]
    });
    setNewTeamName('');
  };

  const handleRemoveTeam = (teamId: string) => {
    updateClass(cls.id, {
      teams: (cls.teams || []).filter(t => t.id !== teamId)
    });
  };

  const handleToggleStudentInTeam = (teamId: string, studentId: string) => {
    const teams = cls.teams || [];
    updateClass(cls.id, {
      teams: teams.map(t => {
        if (t.id === teamId) {
          const hasStudent = t.studentIds.includes(studentId);
          return {
            ...t,
            studentIds: hasStudent ? t.studentIds.filter(id => id !== studentId) : [...t.studentIds, studentId]
          };
        }
        return t;
      })
    });
  };

  const handleAddActivityFromTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId) return;
    addActivityFromTemplate(cls.id, selectedTemplateId);
    setSelectedTemplateId('');
  };

  const handleCreateCustomActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customActivityName.trim()) return;
    createCustomActivity(cls.id, customActivityName.trim(), customActivityCA as 1 | 2 | 3 | 4 | 5);
    setCustomActivityName('');
    setShowCustomActivityInput(false);
  };

  const getCaLabel = (ca?: number) => {
    switch (ca) {
      case 1: return { label: 'CA 1 • Performance', color: 'bg-blue-100 text-blue-700' };
      case 2: return { label: 'CA 2 • Adaptation', color: 'bg-emerald-100 text-emerald-700' };
      case 3: return { label: 'CA 3 • Artistique', color: 'bg-amber-100 text-amber-700' };
      case 4: return { label: 'CA 4 • Affrontement', color: 'bg-purple-100 text-purple-700' };
      case 5: return { label: 'CA 5 • Entretien', color: 'bg-rose-100 text-rose-700' };
      default: return { label: 'Cycle EPS', color: 'bg-slate-100 text-slate-600' };
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 ease-out">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input 
                value={editedName} 
                onChange={e => setEditedName(e.target.value)} 
                className="text-2xl font-bold h-12 w-64"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSaveName()}
              />
              <Button size="icon" onClick={handleSaveName} className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
                <Save className="w-5 h-5" />
              </Button>
              <Button size="icon" variant="outline" onClick={() => { setIsEditingName(false); setEditedName(cls.name); }} className="shrink-0">
                <X className="w-5 h-5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 group">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Classe : {cls.name}</h1>
              <button 
                onClick={() => setIsEditingName(true)}
                className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                title="Renommer la classe"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            </div>
          )}
          <p className="text-slate-500 mt-1">Gérez les élèves et les activités (cycles) de cette classe.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Link to={`/class/${classId}/synthesis`}>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto shadow-sm">
              <Eye className="w-4 h-4 mr-2" />
              Synthèse Classe
            </Button>
          </Link>
          {otherClasses.length > 0 && (
            <div className="flex items-center gap-2">
              <select 
                className="h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                value={selectedMergeClassId}
                onChange={e => setSelectedMergeClassId(e.target.value)}
              >
                <option value="">Fusionner avec...</option>
                {otherClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <Button variant="outline" disabled={!selectedMergeClassId} onClick={handleMergeClass}>
                Fusionner
              </Button>
            </div>
          )}
          <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={handleDeleteClass}>
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer
          </Button>
        </div>
      </div>

      {/* Bannière permanente : Absences, Oublis de matériel, Assiduité */}
      <ClassPermanentStatsBanner classId={classId} activeView="detail" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Activités (Cycles) */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <ActivityIcon className="w-5 h-5 text-blue-600" />
              Activités (Cycles d'enseignement)
            </h2>
            <Link to="/library" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              Banque d'activités
            </Link>
          </div>
          
          <div className="grid gap-4">
            {/* Add activity form */}
            {!showCustomActivityInput ? (
              <div className="space-y-2">
                <form onSubmit={handleAddActivityFromTemplate} className="flex gap-2">
                  <select 
                    className="flex-1 h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    value={selectedTemplateId}
                    onChange={e => setSelectedTemplateId(e.target.value)}
                  >
                    <option value="" disabled>-- Ajouter depuis la banque d'activités --</option>
                    {templateActivities.map(t => (
                      <option key={t.id} value={t.id}>{t.name} (CA {t.ca || 1})</option>
                    ))}
                  </select>
                  <Button type="submit" disabled={!selectedTemplateId}>Ajouter</Button>
                </form>
                <div className="flex justify-between items-center text-xs text-slate-500 px-1">
                  <span>Modèles pré-configurés avec situations</span>
                  <button 
                    type="button" 
                    onClick={() => setShowCustomActivityInput(true)}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    + Créer une activité personnalisée
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateCustomActivity} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Nouvelle activité personnalisée</span>
                  <button 
                    type="button" 
                    onClick={() => setShowCustomActivityInput(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Nom du cycle (ex: Ultimate, Natation...)"
                    value={customActivityName}
                    onChange={e => setCustomActivityName(e.target.value)}
                    className="bg-white flex-1"
                    autoFocus
                  />
                  <select
                    value={customActivityCA}
                    onChange={e => setCustomActivityCA(parseInt(e.target.value))}
                    className="h-10 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium"
                  >
                    <option value={1}>CA 1 (Performance)</option>
                    <option value={2}>CA 2 (Adaptation)</option>
                    <option value={3}>CA 3 (Artistique)</option>
                    <option value={4}>CA 4 (Affrontement)</option>
                    <option value={5}>CA 5 (Entretien)</option>
                  </select>
                  <Button type="submit" disabled={!customActivityName.trim()}>Créer</Button>
                </div>
              </form>
            )}

            {/* List of activities in the class */}
            {classActivities.map(act => {
              const actSessions = sessions.filter(s => s.activityId === act.id);
              const actSheets = sheets.filter(s => s.activityId === act.id);
              const caInfo = getCaLabel(act.ca);

              return (
                <Card key={act.id} className="hover:border-blue-300 transition-colors group">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <Link to={`/activity/${act.id}`} className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {act.name}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${caInfo.color}`}>
                          {caInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>{actSessions.length} séance(s)</span>
                        <span>•</span>
                        <span>{actSheets.length} situation(s)</span>
                      </div>
                    </Link>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setSyncingActivity(act)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Mettre à jour avec la base de données / banque"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingActivity(act)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Modifier l'activité (nom, CA)"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingActivity(act)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer cette activité (cycle)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <Link to={`/activity/${act.id}`} className="p-2 text-slate-400 group-hover:text-blue-600 transition-colors">
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {classActivities.length === 0 && (
              <div className="text-center p-8 border border-dashed rounded-xl text-slate-500 bg-slate-50">
                Aucune activité pour le moment. Ajoutez un cycle d'EPS ci-dessus.
              </div>
            )}
          </div>
        </div>

        {/* Élèves */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-green-600" />
              Liste des élèves ({cls.students.length})
            </h2>
          </div>

          <Card>
            <CardContent className="p-0">
              <form onSubmit={handleAddStudent} className="p-4 border-b border-slate-100 flex gap-2">
                <Input 
                  placeholder="Nom de l'élève" 
                  value={newStudentName}
                  onChange={e => setNewStudentName(e.target.value)}
                />
                <Button variant="secondary" type="submit" disabled={!newStudentName.trim()}>Ajouter</Button>
              </form>
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                {cls.students.map(student => (
                  <div key={student.id} className="p-4 flex items-center justify-between hover:bg-slate-50 group">
                    <span className="font-medium text-slate-700">{student.name}</span>
                    <div className="flex gap-2">
                      <Link to={`/student/${student.id}/class/${cls.id}`}>
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-blue-600">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveStudent(student.id)} className="text-slate-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {cls.students.length === 0 && (
                  <div className="p-8 text-center text-slate-500">
                    La classe est vide. Ajoutez des élèves.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between pt-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-600" />
              Équipes / Groupes
            </h2>
          </div>
          <Card>
            <CardContent className="p-0">
              <form onSubmit={handleAddTeam} className="p-4 border-b border-slate-100 flex gap-2">
                <Input 
                  placeholder="Nom de l'équipe (ex: Groupe 1)" 
                  value={newTeamName}
                  onChange={e => setNewTeamName(e.target.value)}
                />
                <Button variant="secondary" type="submit" disabled={!newTeamName.trim()}>Ajouter</Button>
              </form>
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                {(cls.teams || []).map(team => (
                  <div key={team.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-slate-800">{team.name}</span>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveTeam(team.id)} className="text-slate-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {cls.students.map(student => {
                        const inTeam = team.studentIds.includes(student.id);
                        return (
                          <button
                            key={student.id}
                            onClick={() => handleToggleStudentInTeam(team.id, student.id)}
                            className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                              inTeam 
                                ? 'bg-purple-100 border-purple-200 text-purple-700 font-medium' 
                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            {student.name} {inTeam && '✓'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {(cls.teams || []).length === 0 && (
                  <div className="p-8 text-center text-slate-500">
                    Aucune équipe créée.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals for Editing, Syncing, and Deleting Activity */}
      {editingActivity && (
        <EditActivityModal
          activity={editingActivity}
          isOpen={!!editingActivity}
          onClose={() => setEditingActivity(null)}
          onOpenSync={() => setSyncingActivity(editingActivity)}
          onOpenDelete={() => setDeletingActivity(editingActivity)}
        />
      )}

      {syncingActivity && (
        <SyncActivityModal
          activity={syncingActivity}
          isOpen={!!syncingActivity}
          onClose={() => setSyncingActivity(null)}
        />
      )}

      {deletingActivity && (
        <DeleteActivityModal
          activity={deletingActivity}
          isOpen={!!deletingActivity}
          onClose={() => setDeletingActivity(null)}
        />
      )}
    </div>
  );
}
