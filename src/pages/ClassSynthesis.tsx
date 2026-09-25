import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../store';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ChevronRight, Activity, TrendingUp, ChevronLeft, Users, Calendar, Star, AlertTriangle } from 'lucide-react';
import { ClassPermanentStatsBanner } from '../components/ClassPermanentStatsBanner';
import { ClassEvolutionaryReport } from '../components/ClassEvolutionaryReport';

export function ClassSynthesis() {
  const { classId } = useParams<{ classId: string }>();
  const { classes, activities, sessions, observations, sheets } = useStore();
  const [activeTab, setActiveTab] = useState<'evolution' | 'students'>('evolution');
  
  const cls = classes.find(c => c.id === classId);
  const classActivities = activities.filter(a => a.classId === classId);
  const classSessions = sessions.filter(s => classActivities.some(a => a.id === s.activityId));

  if (!cls) {
    return <div className="p-8 text-center text-slate-500">Classe introuvable.</div>;
  }

  // Calculate detailed stats per student
  const studentsStats = cls.students.map(student => {
    const studentObs = observations.filter(o => o.targetId === student.id);
    const sessionsParticipated = new Set(studentObs.map(o => o.sessionId)).size;
    
    const totalObservations = studentObs.length;
    const absentCount = studentObs.filter(o => o.status === 'absent' || (Object.values(o.data).length > 0 && Object.values(o.data).every(v => v === 'A'))).length;
    const dispenseCount = studentObs.filter(o => o.status === 'dispense' || (Object.values(o.data).length > 0 && Object.values(o.data).every(v => v === 'D'))).length;
    const noGearCount = studentObs.filter(o => !!o.noGear).length;

    // Positive & negative group dynamics across sessions
    const positiveCount = classSessions.filter(s => s.positiveStudentIds?.includes(student.id)).length;
    const negativeCount = classSessions.filter(s => s.negativeStudentIds?.includes(student.id)).length;

    const hasBilans = studentObs.some(o => !!o.bilan);

    return {
      student,
      sessionsParticipated,
      totalObservations,
      absentCount,
      dispenseCount,
      noGearCount,
      positiveCount,
      negativeCount,
      hasBilans
    };
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 ease-out max-w-6xl mx-auto">
      {/* Header and Back Link */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link to={`/class/${classId}`} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 font-medium mb-1 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Retour à la classe ({cls.name})
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Bilan & Synthèse : {cls.name}</h1>
          <p className="text-slate-500 mt-1">
            Information permanente, bilan évolutif séance par séance et suivi individuel de chaque élève.
          </p>
        </div>
      </div>

      {/* INFORMATION PERMANENTE : Bannière permanente avec compteurs toujours visibles */}
      <ClassPermanentStatsBanner classId={classId} activeView="synthesis" />

      {/* Navigation Tabs : Bilan Évolutif vs Synthèse Élèves */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('evolution')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'evolution'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Bilan Évolutif de la classe (Séance par séance)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'students'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Suivi individuel par élève ({cls.students.length})</span>
        </button>
      </div>

      {/* TAB 1 : BILAN ÉVOLUTIF */}
      {activeTab === 'evolution' && (
        <ClassEvolutionaryReport classId={classId} />
      )}

      {/* TAB 2 : TABLEAU NOMINATIF PAR ÉLÈVE */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Tableau récapitulatif des élèves</h2>
            <span className="text-xs text-slate-500 font-medium">Assiduité, tenue, dynamique collective et bilans</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4 font-bold">Élève</th>
                  <th className="px-3 py-4 font-bold text-center">Séances notées</th>
                  <th className="px-3 py-4 font-bold text-center">Absences (A)</th>
                  <th className="px-3 py-4 font-bold text-center">Dispensés (D)</th>
                  <th className="px-3 py-4 font-bold text-center">Sans matériel</th>
                  <th className="px-3 py-4 font-bold text-center">Moteur (⭐)</th>
                  <th className="px-3 py-4 font-bold text-center">Vigilance (⚠️)</th>
                  <th className="px-3 py-4 font-bold text-center">Bilan EPS</th>
                  <th className="px-6 py-4 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentsStats.map((stat, i) => (
                  <tr key={stat.student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {i + 1}
                        </div>
                        <div className="font-bold text-slate-900">{stat.student.name}</div>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-center">
                      <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 rounded-full px-2.5 py-0.5 font-bold text-xs">
                        {stat.sessionsParticipated}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-center">
                      {stat.absentCount > 0 ? (
                        <span className="inline-flex items-center justify-center bg-red-100 text-red-700 rounded-full px-2.5 py-0.5 font-bold text-xs border border-red-200">
                          {stat.absentCount}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-center">
                      {stat.dispenseCount > 0 ? (
                        <span className="inline-flex items-center justify-center bg-amber-100 text-amber-800 rounded-full px-2.5 py-0.5 font-bold text-xs border border-amber-200">
                          {stat.dispenseCount}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-center">
                      {stat.noGearCount > 0 ? (
                        <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 rounded-full px-2.5 py-0.5 font-bold text-xs border border-rose-200">
                          <span>👟</span> {stat.noGearCount}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-center">
                      {stat.positiveCount > 0 ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 rounded-full px-2.5 py-0.5 font-bold text-xs border border-emerald-200">
                          <span>⭐</span> {stat.positiveCount}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-center">
                      {stat.negativeCount > 0 ? (
                        <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 rounded-full px-2.5 py-0.5 font-bold text-xs border border-rose-200">
                          <span>⚠️</span> {stat.negativeCount}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-center">
                      {stat.hasBilans ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium text-xs bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                          <TrendingUp className="w-3 h-3" />
                          Renseigné
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Vide</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/student/${stat.student.id}/class/${cls.id}`}>
                        <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-semibold text-xs">
                          Fiche élève
                          <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {studentsStats.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                Aucun élève dans cette classe.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
