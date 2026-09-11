import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Activity, Plus, ChevronRight, UserPlus, Trash2, Eye, Edit2, Save, X } from 'lucide-react';

export function ClassDetail() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { classes, activities, updateClass, deleteClass, templateActivities, addActivityFromTemplate, mergeClasses } = useStore();
  
  const cls = classes.find(c => c.id === classId);
  const classActivities = activities.filter(a => a.classId === classId);
  const otherClasses = classes.filter(c => c.id !== classId);

  const [newStudentName, setNewStudentName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedMergeClassId, setSelectedMergeClassId] = useState('');

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

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

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId) return;
    addActivityFromTemplate(cls.id, selectedTemplateId);
    setSelectedTemplateId('');
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
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Classe: {cls.name}</h1>
              <button 
                onClick={() => setIsEditingName(true)}
                className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                title="Renommer la classe"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            </div>
          )}
          <p className="text-slate-500 mt-1">Gérez les élèves et les cycles de cette classe.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Activités */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Activités (Cycles)
            </h2>
          </div>
          
          <div className="grid gap-4">
            <form onSubmit={handleAddActivity} className="flex gap-2">
              <select 
                className="flex-1 h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                value={selectedTemplateId}
                onChange={e => setSelectedTemplateId(e.target.value)}
              >
                <option value="" disabled>-- Sélectionner une activité de la banque --</option>
                {templateActivities.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <Button type="submit" disabled={!selectedTemplateId}>Ajouter</Button>
            </form>

            {classActivities.map(act => (
              <Link key={act.id} to={`/activity/${act.id}`}>
                <Card className="hover:border-blue-300 transition-colors group">
                  <CardContent className="p-4 flex items-center justify-between">
                    <span className="font-medium">{act.name}</span>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                  </CardContent>
                </Card>
              </Link>
            ))}
            {classActivities.length === 0 && (
              <div className="text-center p-8 border border-dashed rounded-xl text-slate-500 bg-slate-50">
                Aucune activité pour le moment.
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
    </div>
  );
}
