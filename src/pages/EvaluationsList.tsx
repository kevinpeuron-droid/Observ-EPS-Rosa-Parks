import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  Award, 
  ChevronRight, 
  Users, 
  BarChart3, 
  Download, 
  Sparkles, 
  Activity as ActivityIcon, 
  Layers, 
  Filter,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { calculateStudentEvaluation, calculateClassEvaluationStatistics, exportEvaluationToCsv, getDefaultCriteriaForCa } from '../lib/evaluationHelpers';

export function EvaluationsList() {
  const navigate = useNavigate();
  const { classes, activities, sessions, observations } = useStore();
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  const filteredActivities = useMemo(() => {
    if (selectedClassId === 'all') return activities;
    return activities.filter(a => a.classId === selectedClassId);
  }, [activities, selectedClassId]);

  // Compute evaluation stats for each activity
  const activitiesWithStats = useMemo(() => {
    return filteredActivities.map(activity => {
      const parentClass = classes.find(c => c.id === activity.classId);
      const students = parentClass?.students || [];
      const criteria = activity.evaluationCriteria && activity.evaluationCriteria.length > 0 
        ? activity.evaluationCriteria 
        : getDefaultCriteriaForCa(activity.ca);

      const summaries = students.map(st => {
        const studentGrades = activity.grades?.[st.id];
        const appreciation = activity.studentAppreciations?.[st.id];
        return calculateStudentEvaluation(st.id, st.name, criteria, studentGrades, appreciation);
      });

      const stats = calculateClassEvaluationStatistics(summaries, criteria);

      return {
        activity,
        parentClass,
        studentsCount: students.length,
        criteriaCount: criteria.length,
        stats,
        summaries,
        criteria
      };
    });
  }, [filteredActivities, classes]);

  const getCaBadge = (ca?: number) => {
    switch (ca) {
      case 1: return { label: 'CA 1 • Performance', color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 2: return { label: 'CA 2 • Adaptation', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 3: return { label: 'CA 3 • Artistique', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 4: return { label: 'CA 4 • Affrontement', color: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 5: return { label: 'CA 5 • Entretien', color: 'bg-rose-100 text-rose-800 border-rose-200' };
      default: return { label: 'Cycle EPS', color: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Pôle Évaluation EPS
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Gérez les évaluations sommatives, saisissez les notes et exportez les bilans de fin de cycle.
            </p>
          </div>
        </div>

        {/* Class Filter */}
        {classes.length > 0 && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Toutes les classes ({classes.length})</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Activities Grid */}
      {activitiesWithStats.length === 0 ? (
        <Card className="border-dashed p-12 text-center bg-slate-50/50 space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <Award className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-slate-800">Aucune évaluation disponible</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Créez une activité dans une de vos classes pour démarrer une évaluation certificative.
            </p>
          </div>
          <Link to="/">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold">
              Aller à mes classes
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activitiesWithStats.map(({ activity, parentClass, studentsCount, criteriaCount, stats, summaries, criteria }) => {
            const caBadge = getCaBadge(activity.ca);
            const isCompleted = studentsCount > 0 && stats.evaluatedStudents + stats.absentStudents + stats.dispenseStudents >= studentsCount;
            const progressPct = studentsCount > 0 ? Math.round(((stats.evaluatedStudents + stats.absentStudents + stats.dispenseStudents) / studentsCount) * 100) : 0;

            return (
              <Card 
                key={activity.id} 
                className="hover:shadow-md hover:border-amber-300 transition-all flex flex-col justify-between overflow-hidden group cursor-pointer border-slate-200"
                onClick={() => navigate(`/evaluation/${activity.id}`)}
              >
                <div>
                  <CardHeader className="p-5 pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${caBadge.color}`}>
                          {caBadge.label}
                        </span>
                        {(activity.name.toLowerCase().includes('demi') || activity.name.toLowerCase().includes('fond') || activity.name.toLowerCase().includes('temps juste')) && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300 flex items-center gap-1">
                            ⏱️ Temps Juste (4x5')
                          </span>
                        )}
                      </div>

                      {isCompleted ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Clôturée
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold border border-slate-200 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> En cours
                        </span>
                      )}
                    </div>

                    <CardTitle className="text-xl font-bold text-slate-900 group-hover:text-amber-600 transition-colors mt-2">
                      {activity.name}
                    </CardTitle>
                    <p className="text-xs text-slate-500 font-medium">
                      Classe : {parentClass?.name || 'Sans classe'} • {studentsCount} élèves
                    </p>
                  </CardHeader>

                  <CardContent className="p-5 pt-2 space-y-4">
                    {/* Stats Widget */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Moyenne classe
                        </span>
                        <div className="text-xl font-black font-mono text-indigo-700 mt-0.5">
                          {stats.classAverageOn20 !== null ? `${stats.classAverageOn20.toFixed(1)}/20` : '-'}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Notés / Total
                        </span>
                        <div className="text-xl font-black font-mono text-slate-800 mt-0.5">
                          {stats.evaluatedStudents} <span className="text-xs text-slate-400 font-normal">/ {studentsCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-500">Progression de l'évaluation</span>
                        <span className="text-indigo-600">{progressPct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-amber-500 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* Card Footer Actions */}
                <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500 font-medium">
                    {criteriaCount} critère(s)
                  </span>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/evaluation/${activity.id}`);
                      }}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                    >
                      <Award className="w-3.5 h-3.5 mr-1" />
                      Mode Évaluation
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
