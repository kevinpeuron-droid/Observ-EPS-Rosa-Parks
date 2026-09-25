import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { QrCode, MonitorPlay, Save, CheckCircle2, Trash2, ChevronLeft, Users, UserCheck, UserX, ShieldAlert, Eye } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { StudentSessionStatus } from '../types';

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
    setStudentSessionAttendance 
  } = useStore();
  
  const session = sessions.find(s => s.id === sessionId);
  const sessionSheets = sheets.filter(s => s.activityId === session?.activityId);
  const activity = activities.find(a => a.id === session?.activityId);
  const cls = classes.find(c => c.id === activity?.classId);
  const sessionObs = observations.filter(o => o.sessionId === session?.id);

  const [feedback, setFeedback] = useState(session?.feedback || '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (session) {
      setFeedback(session.feedback);
    }
  }, [session]);

  if (!session) return <div className="p-8 text-center text-slate-500">Séance introuvable.</div>;

  const handleSaveFeedback = () => {
    updateSession(session.id, { feedback });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
            Classe : <span className="font-semibold text-slate-700">{cls?.name || 'Inconnue'}</span> • Appel, matériel, observations et projection.
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

          <a href={observeUrl} target="_blank" rel="noreferrer">
            <Button size="lg" variant="outline" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200">
              <Eye className="w-5 h-5 mr-2" />
              Saisie Terrain
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
                  Cochez les élèves absents (A), dispensés (D) ou sans tenue / matériel. Ces valeurs sont reconnues automatiquement dans tous les barèmes et bilans.
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
            <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
              {studentsList.map((st, idx) => {
                const status = getStudentStatus(st.id);
                const noGear = getStudentNoGear(st.id);
                const studentObsCount = sessionObs.filter(o => o.targetId === st.id).length;

                return (
                  <div 
                    key={st.id} 
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 transition-colors ${
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* QR Code et Fiche */}
        <div className="space-y-6">
          <Card className="h-full border-blue-100 shadow-sm">
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
              <div className="mb-6 w-full">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Fiche d'observation active :
                </label>
                <select 
                  className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  value={session.sheetId || ''}
                  onChange={handleSheetChange}
                >
                  <option value="" disabled>-- Sélectionner une fiche --</option>
                  {sessionSheets.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {!session.sheetId && (
                  <p className="text-xs text-amber-600 mt-2">
                    ⚠️ Veuillez sélectionner une fiche pour que la saisie élève fonctionne.
                  </p>
                )}
              </div>

              {session.sheetId && (
                <div className="p-4 bg-white border-4 border-slate-900 rounded-xl shadow-xs">
                  <QRCodeSVG value={observeUrl} size={200} level="H" />
                </div>
              )}
              {session.sheetId && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-slate-500 mb-2">Ou utilisez ce lien :</p>
                  <a href={observeUrl} target="_blank" rel="noreferrer" className="text-blue-600 font-medium text-sm hover:underline break-all">
                    {observeUrl}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bilan de séance */}
        <div className="space-y-6">
          <Card className="h-full shadow-sm">
            <CardHeader>
              <CardTitle>Bilan Qualitatif</CardTitle>
              <CardDescription>
                Notes pédagogiques, réussites, consignes et ajustements pour la prochaine séance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full min-h-[300px] p-4 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none text-sm"
                placeholder="Rédigez le bilan de votre séance ici..."
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
              />
            </CardContent>
            <CardFooter className="flex justify-end gap-4 border-t border-slate-100 pt-6">
              {saved && <span className="text-emerald-600 flex items-center gap-1 text-sm"><CheckCircle2 className="w-4 h-4" /> Enregistré</span>}
              <Button onClick={handleSaveFeedback}>
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder le bilan
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
