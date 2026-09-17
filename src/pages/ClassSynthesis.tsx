import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../store';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ChevronRight, Activity, TrendingUp } from 'lucide-react';

export function ClassSynthesis() {
  const { classId } = useParams<{ classId: string }>();
  const { classes, activities, sessions, observations, sheets } = useStore();
  
  const cls = classes.find(c => c.id === classId);
  const classActivities = activities.filter(a => a.classId === classId);

  if (!cls) {
    return <div className="p-8 text-center">Classe introuvable.</div>;
  }

  // Calculate some stats per student
  const studentsStats = cls.students.map(student => {
    const studentObs = observations.filter(o => o.targetId === student.id);
    const sessionsParticipated = new Set(studentObs.map(o => o.sessionId)).size;
    
    // Count total observations
    const totalObservations = studentObs.length;

    // Has written bilans/perspectives
    const hasBilans = studentObs.some(o => !!o.bilan);

    return {
      student,
      sessionsParticipated,
      totalObservations,
      hasBilans
    };
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 ease-out max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Synthèse : {cls.name}</h1>
        <p className="text-slate-500 mt-1">Vue d'ensemble de la classe, évolution et suivi des élèves.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4 font-bold">Élève</th>
                <th className="px-6 py-4 font-bold text-center">Séances actées</th>
                <th className="px-6 py-4 font-bold text-center">Nbr. Observations</th>
                <th className="px-6 py-4 font-bold text-center">Bilan EPS</th>
                <th className="px-6 py-4 text-right font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {studentsStats.map((stat, i) => (
                <tr key={stat.student.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {i + 1}
                      </div>
                      <div className="font-medium text-slate-900">{stat.student.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center bg-blue-100 text-blue-700 rounded-full px-3 py-1 font-bold text-xs">
                      {stat.sessionsParticipated}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-slate-600 font-mono">
                    {stat.totalObservations}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {stat.hasBilans ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-medium text-xs bg-emerald-50 px-2 py-1 rounded">
                        <TrendingUp className="w-3 h-3" />
                        Renseigné
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">Vide</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/student/${stat.student.id}/class/${cls.id}`}>
                      <Button variant="ghost" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                        Voir le détail
                        <ChevronRight className="w-4 h-4 ml-1" />
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
    </div>
  );
}
