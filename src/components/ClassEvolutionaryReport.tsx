import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/Card';
import { Button } from './ui/Button';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  AlertTriangle, 
  Star, 
  Users, 
  FileText, 
  Printer, 
  Filter, 
  ChevronRight, 
  CheckCircle2, 
  UserCheck, 
  UserX, 
  ShieldAlert, 
  ArrowUpRight, 
  Sparkles 
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ClassEvolutionaryReportProps {
  classId: string;
}

export function ClassEvolutionaryReport({ classId }: ClassEvolutionaryReportProps) {
  const { classes, activities, sessions, observations } = useStore();

  const cls = classes.find(c => c.id === classId);
  const classActivities = activities.filter(a => a.classId === classId);
  const [selectedActivityId, setSelectedActivityId] = useState<string>('all');

  if (!cls) return null;

  // Filter sessions by selected activity
  const relevantActivities = selectedActivityId === 'all' 
    ? classActivities 
    : classActivities.filter(a => a.id === selectedActivityId);

  const relevantActivityIds = new Set(relevantActivities.map(a => a.id));

  // Sort sessions chronologically (oldest to newest for evolution)
  const classSessions = sessions
    .filter(s => relevantActivityIds.has(s.activityId))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Compute stats per session
  const sessionsEvolution = classSessions.map((session, index) => {
    const act = classActivities.find(a => a.id === session.activityId);
    const sessionObs = observations.filter(o => o.sessionId === session.id);

    // Absents in this session
    const absentStudentIds = cls.students
      .filter(st => {
        const obs = sessionObs.filter(o => o.targetId === st.id);
        if (obs.length === 0) return false;
        const latest = [...obs].sort((a, b) => b.timestamp - a.timestamp)[0];
        return latest.status === 'absent' || (obs.every(o => Object.values(o.data).length > 0 && Object.values(o.data).every(v => v === 'A')));
      })
      .map(st => st.id);

    // Dispenses in this session
    const dispenseStudentIds = cls.students
      .filter(st => {
        const obs = sessionObs.filter(o => o.targetId === st.id);
        if (obs.length === 0) return false;
        const latest = [...obs].sort((a, b) => b.timestamp - a.timestamp)[0];
        return latest.status === 'dispense' || (obs.every(o => Object.values(o.data).length > 0 && Object.values(o.data).every(v => v === 'D')));
      })
      .map(st => st.id);

    // No gear in this session
    const noGearStudentIds = cls.students
      .filter(st => {
        const obs = sessionObs.filter(o => o.targetId === st.id);
        if (obs.length === 0) return false;
        const latest = [...obs].sort((a, b) => b.timestamp - a.timestamp)[0];
        return !!latest.noGear;
      })
      .map(st => st.id);

    const absentStudents = cls.students.filter(s => absentStudentIds.includes(s.id));
    const dispenseStudents = cls.students.filter(s => dispenseStudentIds.includes(s.id));
    const noGearStudents = cls.students.filter(s => noGearStudentIds.includes(s.id));

    // Positive & negative students
    const positiveStudents = (session.positiveStudentIds || []).map(id => ({
      student: cls.students.find(s => s.id === id),
      note: session.studentImpactNotes?.[id] || 'Moteur du groupe'
    })).filter(item => item.student !== undefined);

    const negativeStudents = (session.negativeStudentIds || []).map(id => ({
      student: cls.students.find(s => s.id === id),
      note: session.studentImpactNotes?.[id] || 'Point de vigilance'
    })).filter(item => item.student !== undefined);

    // Rate
    const totalStudents = cls.students.length;
    const presentCount = Math.max(0, totalStudents - absentStudents.length);
    const presenceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 100;

    return {
      session,
      index: index + 1,
      activity: act,
      absentStudents,
      dispenseStudents,
      noGearStudents,
      positiveStudents,
      negativeStudents,
      totalObservations: sessionObs.length,
      presenceRate,
      presentCount
    };
  });

  // Calculate evolution trends
  const halfLength = Math.floor(sessionsEvolution.length / 2);
  const firstHalf = sessionsEvolution.slice(0, halfLength);
  const secondHalf = sessionsEvolution.slice(halfLength);

  const avgFirstHalfNoGear = firstHalf.length > 0 
    ? firstHalf.reduce((sum, s) => sum + s.noGearStudents.length, 0) / firstHalf.length 
    : 0;
  const avgSecondHalfNoGear = secondHalf.length > 0 
    ? secondHalf.reduce((sum, s) => sum + s.noGearStudents.length, 0) / secondHalf.length 
    : 0;

  const noGearTrend = secondHalf.length === 0 
    ? 'stable' 
    : avgSecondHalfNoGear < avgFirstHalfNoGear 
      ? 'improving' 
      : avgSecondHalfNoGear > avgFirstHalfNoGear 
        ? 'declining' 
        : 'stable';

  // Overall student repeat counts for gear and absences
  const studentRecap = cls.students.map(st => {
    let timesAbsent = 0;
    let timesNoGear = 0;
    let timesPositive = 0;
    let timesNegative = 0;

    sessionsEvolution.forEach(se => {
      if (se.absentStudents.some(s => s.id === st.id)) timesAbsent++;
      if (se.noGearStudents.some(s => s.id === st.id)) timesNoGear++;
      if (se.positiveStudents.some(s => s.student?.id === st.id)) timesPositive++;
      if (se.negativeStudents.some(s => s.student?.id === st.id)) timesNegative++;
    });

    return {
      student: st,
      timesAbsent,
      timesNoGear,
      timesPositive,
      timesNegative
    };
  });

  const topPositiveStudents = studentRecap.filter(s => s.timesPositive > 0).sort((a, b) => b.timesPositive - a.timesPositive).slice(0, 5);
  const studentsNeedingAttention = studentRecap.filter(s => s.timesNoGear >= 2 || s.timesAbsent >= 2 || s.timesNegative > 0).sort((a, b) => (b.timesNoGear + b.timesAbsent + b.timesNegative) - (a.timesNoGear + a.timesAbsent + a.timesNegative));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Controls: Filter & Print */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Filtrer par cycle :</span>
          <select 
            value={selectedActivityId} 
            onChange={e => setSelectedActivityId(e.target.value)}
            className="flex-1 sm:flex-initial h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="all">Tous les cycles EPS de la classe ({classActivities.length})</option>
            {classActivities.map(act => (
              <option key={act.id} value={act.id}>{act.name}</option>
            ))}
          </select>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={handlePrint}
          className="text-xs text-slate-700 border-slate-200 hover:bg-slate-50 w-full sm:w-auto"
        >
          <Printer className="w-3.5 h-3.5 mr-1.5" />
          Imprimer le bilan évolutif
        </Button>
      </div>

      {/* Insights & Trends Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Trend 1: Oublis de matériel */}
        <Card className="border-rose-100 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span>👟</span> Oublis de tenue & matériel
              </CardTitle>
              {noGearTrend === 'improving' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  <TrendingDown className="w-3 h-3" /> En baisse (- d'oublis)
                </span>
              ) : noGearTrend === 'declining' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                  <TrendingUp className="w-3 h-3" /> En hausse (+ d'oublis)
                </span>
              ) : (
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  Stable
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-slate-500">
              {noGearTrend === 'improving'
                ? "Très bonne dynamique collective : les élèves oublient de moins en moins leur tenue de sport."
                : noGearTrend === 'declining'
                  ? "Vigilance nécessaire : une recrudescence d'oublis de tenue a été constatée récemment."
                  : "Le niveau d'équipement reste constant au fil des séances."}
            </p>
            {studentsNeedingAttention.filter(s => s.timesNoGear >= 2).length > 0 && (
              <div className="pt-2 text-xs">
                <span className="font-semibold text-rose-800">Oublis récurrents (2+) : </span>
                <span className="text-slate-600">
                  {studentsNeedingAttention.filter(s => s.timesNoGear >= 2).map(s => `${s.student.name} (${s.timesNoGear})`).join(', ')}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trend 2: Élèves moteurs */}
        <Card className="border-emerald-100 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Star className="w-4 h-4 text-emerald-600 fill-emerald-600" /> Élèves moteurs du groupe
              </CardTitle>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {topPositiveStudents.length} distingué(s)
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {topPositiveStudents.length === 0 ? (
              <p className="text-xs text-slate-400">Aucun élève encore distingué comme moteur dans les bilans de séance.</p>
            ) : (
              <div className="space-y-1.5">
                {topPositiveStudents.map(({ student, timesPositive }) => (
                  <div key={student.id} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span>⭐</span> {student.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 text-[11px]">
                      {timesPositive} fois
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trend 3: Points de vigilance / Climat */}
        <Card className="border-amber-100 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> Vigilance & Climat de classe
              </CardTitle>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                {studentsNeedingAttention.length} élève(s) à suivre
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {studentsNeedingAttention.length === 0 ? (
              <p className="text-xs text-emerald-600 font-medium">Climat de classe exemplaire : aucune remarque récurrente ni alerte.</p>
            ) : (
              <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
                {studentsNeedingAttention.slice(0, 4).map(({ student, timesAbsent, timesNoGear, timesNegative }) => (
                  <div key={student.id} className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 truncate max-w-[140px]">{student.name}</span>
                    <div className="flex items-center gap-1">
                      {timesAbsent > 0 && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 rounded">{timesAbsent} A</span>}
                      {timesNoGear > 0 && <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 rounded">👟 {timesNoGear}</span>}
                      {timesNegative > 0 && <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 rounded">⚠️ {timesNegative}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chronological Evolutionary Timeline Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Évolution chronologique séance par séance</h3>
            <p className="text-xs text-slate-500">
              Historique complet des séances avec suivi de l'assiduité, du matériel, et de la dynamique de groupe.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-full">
            {sessionsEvolution.length} séance{sessionsEvolution.length > 1 ? 's' : ''} analysée{sessionsEvolution.length > 1 ? 's' : ''}
          </span>
        </div>

        {sessionsEvolution.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            Aucune séance enregistrée pour cette sélection d'activités.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sessionsEvolution.map(se => (
              <div key={se.session.id} className="p-5 hover:bg-slate-50/70 transition-colors space-y-4">
                {/* Session Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                      S{se.index}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link 
                          to={`/session/${se.session.id}`}
                          className="font-bold text-slate-900 hover:text-indigo-600 transition-colors text-base"
                        >
                          {se.session.name}
                        </Link>
                        {se.activity && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            {se.activity.name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 capitalize mt-0.5">
                        {format(new Date(se.session.date), 'EEEE d MMMM yyyy', { locale: fr })} • {se.totalObservations} observation{se.totalObservations > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Presence Gauge & Badges */}
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                    {/* Presence Pill */}
                    <div className={`px-3 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                      se.presenceRate >= 90
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : se.presenceRate >= 75
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-red-50 text-red-800 border-red-200'
                    }`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{se.presenceRate}% présence ({se.presentCount}/{cls.students.length})</span>
                    </div>

                    {/* Absents pill */}
                    {se.absentStudents.length > 0 && (
                      <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                        {se.absentStudents.length} absent{se.absentStudents.length > 1 ? 's' : ''} (A)
                      </span>
                    )}

                    {/* No gear pill */}
                    {se.noGearStudents.length > 0 && (
                      <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                        <span>👟</span> {se.noGearStudents.length} sans matériel
                      </span>
                    )}

                    {/* Dispenses pill */}
                    {se.dispenseStudents.length > 0 && (
                      <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        {se.dispenseStudents.length} dispensé{se.dispenseStudents.length > 1 ? 's' : ''}
                      </span>
                    )}

                    <Link to={`/session/${se.session.id}`}>
                      <Button variant="ghost" size="sm" className="text-xs text-indigo-600 hover:bg-indigo-50">
                        Gérer
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Details Breakdown: Names of absents, forgotten gear, positive and negative students */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                  {/* Absents */}
                  <div>
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
                      Absences ({se.absentStudents.length}) :
                    </span>
                    {se.absentStudents.length === 0 ? (
                      <span className="text-slate-400 italic">Aucune absence</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {se.absentStudents.map(st => (
                          <span key={st.id} className="bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded font-medium">
                            {st.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sans matériel */}
                  <div>
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
                      Sans matériel ({se.noGearStudents.length}) :
                    </span>
                    {se.noGearStudents.length === 0 ? (
                      <span className="text-slate-400 italic">Tous équipés ✓</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {se.noGearStudents.map(st => (
                          <span key={st.id} className="bg-rose-50 text-rose-800 border border-rose-200 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                            <span>👟</span> {st.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Élèves très positifs */}
                  <div>
                    <span className="font-bold text-emerald-800 uppercase tracking-wider text-[10px] block mb-1">
                      ⭐ Élèves très positifs ({se.positiveStudents.length}) :
                    </span>
                    {se.positiveStudents.length === 0 ? (
                      <span className="text-slate-400 italic">Non renseigné</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {se.positiveStudents.map(({ student, note }) => (
                          <span key={student?.id} className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold" title={note}>
                            {student?.name} {note && `(${note})`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Élèves très négatifs */}
                  <div>
                    <span className="font-bold text-rose-800 uppercase tracking-wider text-[10px] block mb-1">
                      ⚠️ Points de vigilance ({se.negativeStudents.length}) :
                    </span>
                    {se.negativeStudents.length === 0 ? (
                      <span className="text-slate-400 italic">Rien à signaler ✓</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {se.negativeStudents.map(({ student, note }) => (
                          <span key={student?.id} className="bg-rose-50 text-rose-800 border border-rose-200 px-1.5 py-0.5 rounded font-semibold" title={note}>
                            {student?.name} {note && `(${note})`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bilan qualitatif snippet if present */}
                {se.session.feedback && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-xs text-slate-700">
                    <span className="font-bold text-slate-900 mr-1.5">Bilan professeur :</span>
                    <span className="italic">{se.session.feedback}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
