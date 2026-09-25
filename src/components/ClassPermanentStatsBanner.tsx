import React from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store';
import { TrendingUp, Users, Calendar, AlertTriangle, Star, CheckCircle, ShieldAlert, ChevronRight } from 'lucide-react';

interface ClassPermanentStatsBannerProps {
  classId: string;
  activeView?: 'detail' | 'synthesis';
}

export function ClassPermanentStatsBanner({ classId, activeView = 'detail' }: ClassPermanentStatsBannerProps) {
  const { classes, activities, sessions, observations } = useStore();

  const cls = classes.find(c => c.id === classId);
  if (!cls) return null;

  const classActivities = activities.filter(a => a.classId === classId);
  const classSessions = sessions.filter(s => classActivities.some(a => a.id === s.activityId));
  const classSessionIds = new Set(classSessions.map(s => s.id));
  const classObservations = observations.filter(o => classSessionIds.has(o.sessionId));

  // Compute key permanent metrics
  const totalStudents = cls.students.length;
  const totalSessions = classSessions.length;

  // Absences (A)
  const totalAbsences = classObservations.filter(
    o => o.status === 'absent' || (Object.values(o.data).length > 0 && Object.values(o.data).every(v => v === 'A'))
  ).length;

  // Dispenses (D)
  const totalDispenses = classObservations.filter(
    o => o.status === 'dispense' || (Object.values(o.data).length > 0 && Object.values(o.data).every(v => v === 'D'))
  ).length;

  // Oublis de matériel (👟)
  const totalNoGear = classObservations.filter(o => !!o.noGear).length;

  // Group dynamic mentions
  const totalPositives = classSessions.reduce((acc, s) => acc + (s.positiveStudentIds?.length || 0), 0);
  const totalNegatives = classSessions.reduce((acc, s) => acc + (s.negativeStudentIds?.length || 0), 0);

  // Presence rate estimation
  const totalSlots = totalStudents * Math.max(1, totalSessions);
  const estimatedPresenceRate = totalSessions > 0
    ? Math.max(0, Math.min(100, Math.round(((totalSlots - totalAbsences) / totalSlots) * 100)))
    : 100;

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-lg border border-indigo-900/60 relative overflow-hidden">
      {/* Background ambient accents */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left header / title */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Information permanente de classe
            </span>
            <span className="text-xs text-slate-400">
              {cls.name} • {totalStudents} élèves • {totalSessions} séance{totalSessions > 1 ? 's' : ''}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Bilan évolutif & Suivi de classe</span>
          </h2>
        </div>

        {/* Action Link button */}
        <div className="flex items-center gap-3 shrink-0">
          {activeView === 'detail' ? (
            <Link to={`/class/${classId}/synthesis`}>
              <button 
                type="button"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all flex items-center gap-2 hover:gap-3"
              >
                <span>Accéder au Bilan Évolutif complet</span>
                <ChevronRight className="w-4 h-4 transition-transform" />
              </button>
            </Link>
          ) : (
            <Link to={`/class/${classId}`}>
              <button 
                type="button"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
              >
                Retour aux activités
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* Metrics Row: Absences, Oublis de matériel, Dispenses, Présence, Dynamique */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 relative z-10">
        {/* Metric 1 : Absences */}
        <div className="bg-slate-900/80 backdrop-blur-xs p-3.5 rounded-xl border border-red-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-red-400 font-semibold mb-1">
            <span>Absences (A)</span>
            <span className="w-2 h-2 rounded-full bg-red-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono flex items-baseline gap-1">
            <span>{totalAbsences}</span>
            <span className="text-xs text-red-400 font-normal">notée{totalAbsences > 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Metric 2 : Oublis de matériel */}
        <div className="bg-slate-900/80 backdrop-blur-xs p-3.5 rounded-xl border border-rose-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-rose-300 font-semibold mb-1">
            <span>Sans matériel</span>
            <span>👟</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono flex items-baseline gap-1">
            <span>{totalNoGear}</span>
            <span className="text-xs text-rose-300 font-normal">oubli{totalNoGear > 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Metric 3 : Dispenses */}
        <div className="bg-slate-900/80 backdrop-blur-xs p-3.5 rounded-xl border border-amber-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-amber-300 font-semibold mb-1">
            <span>Dispensés (D)</span>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono flex items-baseline gap-1">
            <span>{totalDispenses}</span>
            <span className="text-xs text-amber-300 font-normal">séance{totalDispenses > 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Metric 4 : Taux de présence */}
        <div className="bg-slate-900/80 backdrop-blur-xs p-3.5 rounded-xl border border-emerald-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold mb-1">
            <span>Taux d'assiduité</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
            {estimatedPresenceRate}%
          </div>
        </div>

        {/* Metric 5 : Émulation positive */}
        <div className="bg-slate-900/80 backdrop-blur-xs p-3.5 rounded-xl border border-emerald-400/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold mb-1">
            <span>Élèves moteurs</span>
            <Star className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono flex items-baseline gap-1">
            <span>{totalPositives}</span>
            <span className="text-xs text-emerald-300 font-normal">⭐</span>
          </div>
        </div>

        {/* Metric 6 : Points de vigilance */}
        <div className="bg-slate-900/80 backdrop-blur-xs p-3.5 rounded-xl border border-rose-400/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-rose-300 font-semibold mb-1">
            <span>Points vigilance</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono flex items-baseline gap-1">
            <span>{totalNegatives}</span>
            <span className="text-xs text-rose-300 font-normal">⚠️</span>
          </div>
        </div>
      </div>
    </div>
  );
}
