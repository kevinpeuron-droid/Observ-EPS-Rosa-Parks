import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  QrCode, 
  MonitorPlay, 
  Save, 
  CheckCircle2, 
  Trash2, 
  ChevronLeft, 
  Users, 
  UserCheck, 
  UserX, 
  ShieldAlert, 
  Eye, 
  ThumbsUp, 
  ThumbsDown, 
  Sparkles, 
  AlertTriangle,
  Tag,
  Star,
  FileSpreadsheet
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { StudentSessionStatus } from '../types';

const POSITIVE_PRESETS = [
  '🌟 Moteur / Dynamique',
  '🤝 Entraide & Solidarité',
  '⚖️ Arbitre exemplaire',
  '💪 Engagement maximal',
  '🗣️ Encourage les autres',
  '🎯 Progrès remarquables'
];

const NEGATIVE_PRESETS = [
  '⚡ Perturbateur / Dissipé',
  '💬 Bavardages incessants',
  '🛑 Refus d\'activité / Passivité',
  '😠 Conflit / Non-respect',
  '📉 Démotive le groupe',
  '⏳ Retard / Démarrage lent'
];

export function SessionDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { 
    sessions, 
    sheets, 
    activities, 
    classes, 
    observations, 
    updateSession, 
    deleteSession, 
    setStudentSessionAttendance,
    createDefaultSheetForActivity
  } = useStore();
  
  const session = sessions.find(s => s.id === sessionId);
  const sessionSheets = sheets.filter(s => s.activityId === session?.activityId);
  const activity = activities.find(a => a.id === session?.activityId);
  const cls = classes.find(c => c.id === activity?.classId);
  const sessionObs = observations.filter(o => o.sessionId === session?.id);

  const [feedback, setFeedback] = useState(session?.feedback || '');
  const [positiveStudentIds, setPositiveStudentIds] = useState<string[]>(session?.positiveStudentIds || []);
  const [negativeStudentIds, setNegativeStudentIds] = useState<string[]>(session?.negativeStudentIds || []);
  const [studentImpactNotes, setStudentImpactNotes] = useState<Record<string, string>>(session?.studentImpactNotes || {});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (session) {
      setFeedback(session.feedback || '');
      setPositiveStudentIds(session.positiveStudentIds || []);
      setNegativeStudentIds(session.negativeStudentIds || []);
      setStudentImpactNotes(session.studentImpactNotes || {});

      // Auto-assign first sheet if not assigned yet and sheets exist
      if (!session.sheetId && sessionSheets.length > 0) {
        updateSession(session.id, { sheetId: sessionSheets[0].id });
      }
    }
  }, [session?.id, session?.sheetId, sessionSheets.length]);

  if (!session) return <div className="p-8 text-center text-slate-500">Séance introuvable.</div>;

  const handleSaveFeedback = () => {
    updateSession(session.id, { 
      feedback,
      positiveStudentIds,
      negativeStudentIds,
      studentImpactNotes
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTogglePositive = (studentId: string) => {
    if (positiveStudentIds.includes(studentId)) {
      setPositiveStudentIds(prev => prev.filter(id => id !== studentId));
      setStudentImpactNotes(prev => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
    } else {
      setPositiveStudentIds(prev => [...prev, studentId]);
      setNegativeStudentIds(prev => prev.filter(id => id !== studentId));
      if (!studentImpactNotes[studentId]) {
        setStudentImpactNotes(prev => ({ ...prev, [studentId]: 'Moteur / Dynamique' }));
      }
    }
  };

  const handleToggleNegative = (studentId: string) => {
    if (negativeStudentIds.includes(studentId)) {
      setNegativeStudentIds(prev => prev.filter(id => id !== studentId));
      setStudentImpactNotes(prev => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
    } else {
      setNegativeStudentIds(prev => [...prev, studentId]);
      setPositiveStudentIds(prev => prev.filter(id => id !== studentId));
      if (!studentImpactNotes[studentId]) {
        setStudentImpactNotes(prev => ({ ...prev, [studentId]: 'Perturbateur / Dissipé' }));
      }
    }
  };

  const handleSetTag = (studentId: string, tag: string) => {
    setStudentImpactNotes(prev => ({ ...prev, [studentId]: tag }));
  };

  const handleSheetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSession(session.id, { sheetId: e.target.value });
  };

  const observeUrl = `${window.location.origin}/#/observe/${session.id}`;

  const handleDeleteSession = () => {
    if (window.confirm("Voulez-vous vraiment supprimer cette séance et toutes ses observations ? Cette action est irréversible.")) {
      deleteSession(session.id);
      navigate(`/activity/${session.activityId}`);
    }
  };

  // Student attendance and gear computation
  const getStudentStatus = (studentId: string): StudentSessionStatus => {
    const studentObs = sessionObs.filter(o => o.targetId === studentId);
    if (studentObs.length === 0) return 'present';
    const latest = [...studentObs].sort((a, b) => b.timestamp - a.timestamp)[0];
    if (latest.status) return latest.status;
    if (studentObs.every(o => Object.values(o.data).length > 0 && Object.values(o.data).every(v => v === 'A'))) return 'absent';
    if (studentObs.every(o => Object.values(o.data).length > 0 && Object.values(o.data).every(v => v === 'D'))) return 'dispense';
    return 'present';
  };

  const getStudentNoGear = (studentId: string): boolean => {
    const studentObs = sessionObs.filter(o => o.targetId === studentId);
    if (studentObs.length === 0) return false;
    const latest = [...studentObs].sort((a, b) => b.timestamp - a.timestamp)[0];
    return !!latest.noGear;
  };

  const handleStatusChange = async (studentId: string, newStatus: StudentSessionStatus) => {
    const currentNoGear = getStudentNoGear(studentId);
    await setStudentSessionAttendance(session.id, studentId, newStatus, currentNoGear);
  };

  const handleToggleNoGear = async (studentId: string) => {
    const currentStatus = getStudentStatus(studentId);
    const currentNoGear = getStudentNoGear(studentId);
    await setStudentSessionAttendance(session.id, studentId, currentStatus, !currentNoGear);
  };

  const handleMarkAllPresent = async () => {
    if (!cls?.students) return;
    for (const st of cls.students) {
      const currentNoGear = getStudentNoGear(st.id);
      await setStudentSessionAttendance(session.id, st.id, 'present', currentNoGear);
    }
  };

  const studentsList = cls?.students || [];
  const presentCount = studentsList.filter(s => getStudentStatus(s.id) === 'present').length;
  const absentCount = studentsList.filter(s => getStudentStatus(s.id) === 'absent').length;
  const dispenseCount = studentsList.filter(s => getStudentStatus(s.id) === 'dispense').length;
  const noGearCount = studentsList.filter(s => getStudentNoGear(s.id)).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 ease-out max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link 
            to={`/activity/${session.activityId}`} 
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 font-medium mb-1 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Retour à l'activité {activity ? `(${activity.name})` : ''}
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{session.name}</h1>
          <p className="text-slate-500 mt-1">
            Classe : <span className="font-semibold text-slate-700">{cls?.name || 'Inconnue'}</span> • Appel, matériel, dynamique de groupe et bilan.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            size="lg" 
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 shrink-0"
            onClick={handleDeleteSession}
            title="Supprimer la séance"
          >
            <Trash2 className="w-5 h-5 sm:mr-2" />
            <span className="hidden sm:inline">Supprimer</span>
          </Button>

          <Link to={`/session/${session.id}/entry`}>
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
              <FileSpreadsheet className="w-5 h-5 mr-2" />
              Mode Saisie Prof (Tableau)
            </Button>
          </Link>

          <a href={observeUrl} target="_blank" rel="noreferrer">
            <Button size="lg" variant="outline" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200">
              <Eye className="w-5 h-5 mr-2" />
              Saisie Élèves (Tablette)
            </Button>
          </a>

          <Link to={`/project/${session.id}`} className="flex-1 sm:flex-none">
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg w-full">
              <MonitorPlay className="w-5 h-5 mr-2" />
              Lancer la Projection
            </Button>
          </Link>
        </div>
      </div>

      {/* Appel et Matériel (Tenue) Section */}
      <Card className="border-indigo-100 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-indigo-50/40 border-b border-slate-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-900">Appel & Matériel de la séance</CardTitle>
                <CardDescription>
                  Pointez les présences, absences (A), dispenses (D) et les oublis de tenue ou matériel.
                </CardDescription>
              </div>
            </div>

            {/* Quick stats pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {presentCount} Présents
              </span>
              {absentCount > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                  {absentCount} Absents (A)
                </span>
              )}
              {dispenseCount > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  {dispenseCount} Dispensés (D)
                </span>
              )}
              {noGearCount > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                  <span>👟</span> {noGearCount} Sans matériel
                </span>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleMarkAllPresent}
                className="text-xs font-semibold bg-white hover:bg-slate-100"
              >
                Tous présents
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {studentsList.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Aucun élève enregistré dans cette classe.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
              {studentsList.map((st, idx) => {
                const status = getStudentStatus(st.id);
                const noGear = getStudentNoGear(st.id);
                const studentObsCount = sessionObs.filter(o => o.targetId === st.id).length;

                return (
                  <div 
                    key={st.id} 
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 gap-3 transition-colors ${
                      status === 'absent' 
                        ? 'bg-red-50/50' 
                        : status === 'dispense' 
                          ? 'bg-amber-50/50' 
                          : noGear 
                            ? 'bg-rose-50/40' 
                            : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>{st.name}</span>
                          {status === 'absent' && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
                              ABSENT (A)
                            </span>
                          )}
                          {status === 'dispense' && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                              DISPENSÉ (D)
                            </span>
                          )}
                          {noGear && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                              <span>👟</span> Sans matériel
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">
                          {studentObsCount > 0 ? (
                            <span className="text-blue-600 font-medium">{studentObsCount} observation(s) saisie(s)</span>
                          ) : (
                            <span>Aucune observation pour le moment</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                      {/* Segmented control Présent / Absent / Dispensé */}
                      <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.id, 'present')}
                          className={`px-3 py-1 rounded-lg transition-all ${
                            status === 'present'
                              ? 'bg-emerald-600 text-white shadow-xs font-bold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Présent
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.id, 'absent')}
                          className={`px-3 py-1 rounded-lg transition-all ${
                            status === 'absent'
                              ? 'bg-red-600 text-white shadow-xs font-bold'
                              : 'text-slate-600 hover:text-red-700'
                          }`}
                          title="Marquer comme Absent (A)"
                        >
                          Absent (A)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.id, 'dispense')}
                          className={`px-3 py-1 rounded-lg transition-all ${
                            status === 'dispense'
                              ? 'bg-amber-600 text-white shadow-xs font-bold'
                              : 'text-slate-600 hover:text-amber-700'
                          }`}
                          title="Marquer comme Dispensé (D)"
                        >
                          Dispensé (D)
                        </button>
                      </div>

                      {/* Gear toggle checkbox */}
                      <label 
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors select-none ${
                          noGear 
                            ? 'bg-rose-100 border-rose-300 text-rose-800' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                        title="Cocher si l'élève a oublié sa tenue ou n'a pas son matériel"
                      >
                        <input
                          type="checkbox"
                          checked={noGear}
                          onChange={() => handleToggleNoGear(st.id)}
                          className="rounded text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>👟 Sans matériel</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* BILAN & DYNAMIQUE DE GROUPE */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/80 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                Bilan de séance & Dynamique de groupe
              </CardTitle>
              <CardDescription>
                Identifiez les élèves ayant eu un impact très positif ou très négatif pour la dynamique du groupe, et rédigez votre synthèse.
              </CardDescription>
            </div>
            <Button onClick={handleSaveFeedback} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shrink-0">
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder le bilan
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-8">
          {/* Section 1 : Élèves très positifs pour le groupe */}
          <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-base">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                  <Star className="w-4 h-4 fill-white" />
                </div>
                <span>Élèves très positifs pour le groupe ({positiveStudentIds.length})</span>
              </div>
              <span className="text-xs text-emerald-700 font-medium">
                Cliquez pour ajouter / retirer un élève moteur
              </span>
            </div>

            {/* Quick click selector pills */}
            <div className="flex flex-wrap gap-2">
              {studentsList.map(st => {
                const isSelected = positiveStudentIds.includes(st.id);
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleTogglePositive(st.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm scale-105'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/60'
                    }`}
                  >
                    <span>{st.name}</span>
                    {isSelected && <span>⭐</span>}
                  </button>
                );
              })}
            </div>

            {/* Detail cards for selected positive students with preset tags / notes */}
            {positiveStudentIds.length > 0 && (
              <div className="mt-4 pt-3 border-t border-emerald-200/60 space-y-2">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                  Détail de l'impact positif :
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {positiveStudentIds.map(stId => {
                    const student = studentsList.find(s => s.id === stId);
                    const currentNote = studentImpactNotes[stId] || '';

                    return (
                      <div key={stId} className="bg-white p-3 rounded-xl border border-emerald-200 shadow-xs flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-900 text-sm flex items-center gap-1.5">
                            <span>⭐</span> {student?.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleTogglePositive(stId)}
                            className="text-xs text-slate-400 hover:text-red-500 font-medium"
                          >
                            Retirer
                          </button>
                        </div>

                        {/* Quick preset chips */}
                        <div className="flex flex-wrap gap-1">
                          {POSITIVE_PRESETS.map(preset => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleSetTag(stId, preset)}
                              className={`text-[10px] px-2 py-0.5 rounded-md font-medium border transition-colors ${
                                currentNote === preset 
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold' 
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50'
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>

                        <input
                          type="text"
                          placeholder="Commentaire ou motif spécifique..."
                          value={currentNote}
                          onChange={(e) => handleSetTag(stId, e.target.value)}
                          className="text-xs p-2 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section 2 : Élèves très négatifs pour le groupe */}
          <div className="p-5 rounded-2xl bg-rose-50/50 border border-rose-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-base">
                <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <span>Élèves très négatifs pour le groupe ({negativeStudentIds.length})</span>
              </div>
              <span className="text-xs text-rose-700 font-medium">
                Cliquez pour ajouter / retirer un élève perturbateur
              </span>
            </div>

            {/* Quick click selector pills */}
            <div className="flex flex-wrap gap-2">
              {studentsList.map(st => {
                const isSelected = negativeStudentIds.includes(st.id);
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleToggleNegative(st.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm scale-105'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-rose-300 hover:bg-rose-50/60'
                    }`}
                  >
                    <span>{st.name}</span>
                    {isSelected && <span>⚠️</span>}
                  </button>
                );
              })}
            </div>

            {/* Detail cards for selected negative students with preset tags / notes */}
            {negativeStudentIds.length > 0 && (
              <div className="mt-4 pt-3 border-t border-rose-200/60 space-y-2">
                <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">
                  Détail du point de vigilance :
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {negativeStudentIds.map(stId => {
                    const student = studentsList.find(s => s.id === stId);
                    const currentNote = studentImpactNotes[stId] || '';

                    return (
                      <div key={stId} className="bg-white p-3 rounded-xl border border-rose-200 shadow-xs flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-rose-900 text-sm flex items-center gap-1.5">
                            <span>⚠️</span> {student?.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleNegative(stId)}
                            className="text-xs text-slate-400 hover:text-red-500 font-medium"
                          >
                            Retirer
                          </button>
                        </div>

                        {/* Quick preset chips */}
                        <div className="flex flex-wrap gap-1">
                          {NEGATIVE_PRESETS.map(preset => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleSetTag(stId, preset)}
                              className={`text-[10px] px-2 py-0.5 rounded-md font-medium border transition-colors ${
                                currentNote === preset 
                                  ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold' 
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-rose-50'
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>

                        <input
                          type="text"
                          placeholder="Commentaire ou motif spécifique..."
                          value={currentNote}
                          onChange={(e) => handleSetTag(stId, e.target.value)}
                          className="text-xs p-2 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section 3 : Bilan Qualitatif général */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-800">
                Notes pédagogiques, réussites, consignes et ajustements :
              </label>
              <span className="text-xs text-slate-400">Bilan qualitatif de la séance</span>
            </div>
            <textarea
              className="w-full min-h-[160px] p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-y text-sm bg-white"
              placeholder="Rédigez le bilan global de la séance (climat de classe, réussites, remédiations nécessaires pour la prochaine fois)..."
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 p-6 bg-slate-50/50">
          <div className="text-xs text-slate-500">
            {saved ? (
              <span className="text-emerald-600 font-bold flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" /> Bilan et dynamique de groupe enregistrés !
              </span>
            ) : (
              <span>Pensez à sauvegarder votre bilan en fin de séance.</span>
            )}
          </div>
          <Button onClick={handleSaveFeedback} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto">
            <Save className="w-4 h-4 mr-2" />
            Sauvegarder le bilan
          </Button>
        </CardFooter>
      </Card>

      {/* Partage terrain QR Code */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-blue-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <QrCode className="w-5 h-5" />
              Partage Terrain (Élèves)
            </CardTitle>
            <CardDescription>
              Flashez ce QR Code avec une tablette ou un smartphone pour permettre aux élèves d'effectuer les observations en direct.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {sessionSheets.length === 0 ? (
              <div className="w-full p-4 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-3">
                <p className="text-xs text-amber-800 font-medium">
                  Aucune situation d'observation n'est encore configurée pour ce cycle.
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    const newId = createDefaultSheetForActivity(session.activityId);
                    updateSession(session.id, { sheetId: newId });
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs mx-auto"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Créer la situation d'observation (1 clic)
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-6 w-full">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Fiche d'observation active :
                  </label>
                  <select 
                    className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 font-medium"
                    value={session.sheetId || sessionSheets[0]?.id || ''}
                    onChange={handleSheetChange}
                  >
                    {sessionSheets.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.fields.length} critères)</option>
                    ))}
                  </select>
                </div>

                <div className="p-4 bg-white border-4 border-slate-900 rounded-xl shadow-xs">
                  <QRCodeSVG value={observeUrl} size={180} level="H" />
                </div>

                <div className="mt-4 text-center">
                  <p className="text-sm text-slate-500 mb-2">Ou utilisez ce lien direct :</p>
                  <a href={observeUrl} target="_blank" rel="noreferrer" className="text-blue-600 font-medium text-sm hover:underline break-all">
                    {observeUrl}
                  </a>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Quick summary of recorded session data */}
        <Card className="shadow-sm border-slate-200 flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-slate-800">Données de la séance</CardTitle>
            <CardDescription>
              Aperçu des relevés collectés et état d'avancement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                <div className="text-3xl font-bold text-blue-600">{sessionObs.length}</div>
                <div className="text-xs text-slate-500 mt-1 uppercase font-semibold">Observations</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                <div className="text-3xl font-bold text-emerald-600">{presentCount} / {studentsList.length}</div>
                <div className="text-xs text-slate-500 mt-1 uppercase font-semibold">Présents</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                <div className="text-3xl font-bold text-amber-600">{noGearCount}</div>
                <div className="text-xs text-slate-500 mt-1 uppercase font-semibold">Oublis matériel</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                <div className="text-3xl font-bold text-indigo-600">{positiveStudentIds.length} ⭐</div>
                <div className="text-xs text-slate-500 mt-1 uppercase font-semibold">Élèves moteurs</div>
              </div>
            </div>

            <div className="pt-2">
              <Link to={`/project/${session.id}`} className="block w-full">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                  <MonitorPlay className="w-4 h-4 mr-2" />
                  Ouvrir le tableau de bord de projection
                </Button>
              </Link>
            </div>
          </CardContent>
          <CardFooter className="border-t border-slate-100 p-4 text-xs text-slate-400 text-center justify-center">
            Les données sont synchronisées en direct avec les tablettes des élèves.
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
