import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../store';
import { ChevronLeft, User, Activity as ActivityIcon, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function StudentDetail() {
  const { studentId, classId } = useParams<{ studentId: string; classId: string }>();
  const { classes, activities, sessions, observations, sheets } = useStore();
  
  const cls = classes.find(c => c.id === classId);
  const student = cls?.students.find(s => s.id === studentId);
  
  if (!cls || !student) {
    return <div className="p-8 text-center text-slate-500">Élève ou classe introuvable.</div>;
  }

  const classActivities = activities.filter(a => a.classId === classId);
  const allSessions = sessions.filter(s => classActivities.some(a => a.id === s.activityId));
  const studentObservations = observations.filter(o => o.targetId === studentId);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 ease-out">
      <div className="flex items-center gap-4">
        <Link to={`/class/${classId}`} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <User className="w-8 h-8 text-blue-600" />
            {student.name}
          </h1>
          <p className="text-slate-500 mt-1">Bilan de cycle et restitution • {cls.name}</p>
        </div>
      </div>

      <div className="grid gap-8">
        {classActivities.map(activity => {
          const actSessions = allSessions.filter(s => s.activityId === activity.id);
          const actObs = studentObservations.filter(o => actSessions.some(s => s.id === o.sessionId));

          if (actObs.length === 0) return null;

          return (
            <div key={activity.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center gap-2">
                <ActivityIcon className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold text-slate-800">{activity.name}</h2>
              </div>
              
              <div className="p-4 sm:p-6 divide-y divide-slate-100">
                {actSessions.map(session => {
                  const sObs = actObs.filter(o => o.sessionId === session.id);
                  if (sObs.length === 0) return null;
                  
                  const sheet = sheets.find(sh => sh.id === session.sheetId);
                  
                  return (
                    <div key={session.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-2 mb-4 text-slate-600">
                        <Calendar className="w-4 h-4" />
                        <h3 className="font-semibold">{session.name}</h3>
                        <span className="text-sm">({format(new Date(session.date), 'dd/MM/yyyy')})</span>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {sheet?.fields.map(field => {
                          let value: number | string = '-';
                          
                          if (field.type === 'counter' || field.type === 'boolean') {
                            value = sObs.reduce((acc, o) => {
                              if (field.type === 'counter') {
                                return acc + ((o.data[field.id] as number) || 0);
                              }
                              if (field.type === 'boolean') {
                                return acc + (o.data[field.id] ? 1 : 0);
                              }
                              return acc;
                            }, 0);
                          } else if (field.type === 'number' || field.type === 'speed_30s') {
                            const validObs = sObs.filter(o => o.data[field.id] !== undefined && o.data[field.id] !== '');
                            if (validObs.length > 0) {
                              const latest = validObs.sort((a, b) => b.timestamp - a.timestamp)[0];
                              value = latest.data[field.id] as number;
                            }
                          } else if (field.type === 'orienteering_star') {
                            const validObs = sObs.filter(o => o.data[field.id]);
                            if (validObs.length > 0) {
                              const latest = validObs.sort((a, b) => b.timestamp - a.timestamp)[0];
                              const data = latest.data[field.id] as Record<string, any>;
                              let ok = 0;
                              let wrong = 0;
                              let totalMs = 0;
                              Object.values(data).forEach(balise => {
                                if (balise.status === 'ok') { ok++; totalMs += (balise.elapsedMs || 0); }
                                if (balise.status === 'wrong') { wrong++; totalMs += (balise.elapsedMs || 0); }
                              });
                              
                              return (
                                <div key={field.id} className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 flex flex-col justify-between sm:col-span-2">
                                  <div className="text-xs text-emerald-700 font-medium mb-1 uppercase tracking-wider">{field.label}</div>
                                  <div className="flex gap-4 items-center">
                                    <div className="flex flex-col">
                                      <span className="text-xs text-slate-500 font-bold uppercase">Validées</span>
                                      <span className="text-xl font-bold text-emerald-600">{ok}</span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-xs text-slate-500 font-bold uppercase">Fausses</span>
                                      <span className="text-xl font-bold text-red-500">{wrong}</span>
                                    </div>
                                    <div className="flex flex-col ml-4">
                                      <span className="text-xs text-slate-500 font-bold uppercase">Temps cumulé</span>
                                      <span className="text-xl font-bold font-mono text-slate-800">
                                        {Math.floor(totalMs / 60000)}m {Math.floor((totalMs / 1000) % 60).toString().padStart(2, '0')}s
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                          } else if (field.type === 'training_log') {
                            const validObs = sObs.filter(o => o.data[field.id]);
                            if (validObs.length > 0) {
                              const latest = validObs.sort((a, b) => b.timestamp - a.timestamp)[0];
                              const data = latest.data[field.id];
                              let totalVolume = 0;
                              data.sets.forEach((set: any) => totalVolume += (set.reps || 0) * (set.weight || 0));
                              return (
                                <div key={field.id} className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 flex flex-col justify-between sm:col-span-2">
                                  <div className="text-xs text-indigo-700 font-medium mb-1 uppercase tracking-wider">{field.label} {data.profile && `(${data.profile})`}</div>
                                  <div className="flex justify-between mt-1">
                                    <span className="font-bold text-slate-700">Séries: {data.sets.length}</span>
                                    <span className="font-bold text-indigo-700">Volume: {totalVolume} kg</span>
                                  </div>
                                </div>
                              );
                            }
                          } else if (field.type === 'ratio_action') {
                            const validObs = sObs.filter(o => o.data[field.id]);
                            if (validObs.length > 0) {
                              const latest = validObs.sort((a, b) => b.timestamp - a.timestamp)[0];
                              const data = latest.data[field.id];
                              const total = data.success + data.fail;
                              const ratio = total > 0 ? Math.round((data.success / total) * 100) : 0;
                              return (
                                <div key={field.id} className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 flex flex-col justify-between">
                                  <div className="text-xs text-emerald-700 font-medium mb-1 uppercase tracking-wider">{field.label}</div>
                                  <div className="text-2xl font-bold font-mono text-emerald-800">{ratio}%</div>
                                  <div className="text-xs text-slate-500 mt-1">{data.success} réussis / {data.fail} ratés</div>
                                </div>
                              );
                            }
                          } else if (field.type === 'project_target') {
                            const validObs = sObs.filter(o => o.data[field.id]);
                            if (validObs.length > 0) {
                              const latest = validObs.sort((a, b) => b.timestamp - a.timestamp)[0];
                              const data = latest.data[field.id];
                              const diff = data.actual - data.target;
                              return (
                                <div key={field.id} className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 flex flex-col justify-between">
                                  <div className="text-xs text-blue-700 font-medium mb-1 uppercase tracking-wider">{field.label}</div>
                                  <div className="text-lg font-bold text-slate-800">Cible: {data.target}</div>
                                  <div className="text-lg font-bold text-indigo-700">Réel: {data.actual}</div>
                                  <div className={`text-sm font-bold mt-1 ${diff === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>Écart: {diff > 0 ? '+' : ''}{diff}</div>
                                </div>
                              );
                            }
                          } else if (field.type === 'sequence_planner') {
                            const validObs = sObs.filter(o => o.data[field.id]);
                            if (validObs.length > 0) {
                              const latest = validObs.sort((a, b) => b.timestamp - a.timestamp)[0];
                              const data = latest.data[field.id];
                              const validated = data.filter((item: any) => item.validated).length;
                              return (
                                <div key={field.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
                                  <div className="text-xs text-slate-600 font-medium mb-1 uppercase tracking-wider">{field.label}</div>
                                  <div className="text-xl font-bold font-mono text-slate-800">{validated} / {data.length}</div>
                                </div>
                              );
                            }
                          } else if (field.type === 'performance_log') {
                            const validObs = sObs.filter(o => o.data[field.id]);
                            if (validObs.length > 0) {
                              const latest = validObs.sort((a, b) => b.timestamp - a.timestamp)[0];
                              const data = latest.data[field.id];
                              let totalDistance = 0;
                              let rpeSum = 0;
                              data.reps.forEach((rep: any) => {
                                totalDistance += (rep.distance || 0);
                                rpeSum += (rep.rpe || 5);
                              });
                              const avgRpe = data.reps.length > 0 ? (rpeSum / data.reps.length).toFixed(1) : '0';
                              return (
                                <div key={field.id} className="bg-orange-50/50 p-3 rounded-lg border border-orange-100 flex flex-col justify-between sm:col-span-2">
                                  <div className="text-xs text-orange-700 font-medium mb-1 uppercase tracking-wider">{field.label} {data.profile && `(${data.profile})`}</div>
                                  <div className="flex justify-between items-center mt-1">
                                    <span className="font-bold text-slate-700">Fractions: {data.reps.length}</span>
                                    <span className="font-bold text-orange-700">RPE: {avgRpe}/10</span>
                                  </div>
                                  {totalDistance > 0 && (
                                    <div className="text-sm font-bold text-slate-600 mt-1">Distance totale: {totalDistance}m</div>
                                  )}
                                </div>
                              );
                            }
                          } else if (field.type === 'orienteering_log') {
                            const validObs = sObs.filter(o => o.data[field.id]);
                            if (validObs.length > 0) {
                              const latest = validObs.sort((a, b) => b.timestamp - a.timestamp)[0];
                              const data = latest.data[field.id];
                              return (
                                <div key={field.id} className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 flex flex-col justify-between sm:col-span-2">
                                  <div className="text-xs text-emerald-700 font-medium mb-1 uppercase tracking-wider">{field.label} {data.raceType && `(${data.raceType})`}</div>
                                  <div className="flex justify-between items-center mt-1">
                                    <div className="flex gap-4">
                                      <span className="font-bold text-emerald-700">Balises: {data.balisesOk || 0}</span>
                                      <span className="font-bold text-red-600">Erreurs: {data.errors || 0}</span>
                                    </div>
                                    <span className="font-mono font-bold text-slate-700">
                                      {Math.floor((data.globalTimeMs || 0) / 60000)}m {Math.floor(((data.globalTimeMs || 0) / 1000) % 60).toString().padStart(2, '0')}s
                                    </span>
                                  </div>
                                  {data.tactic && (
                                    <div className="text-xs text-slate-600 mt-2">Tactique : {data.tactic}</div>
                                  )}
                                </div>
                              );
                            }
                          } else if (field.type === 'artistic_rating') {
                            const validObs = sObs.filter(o => o.data[field.id] && o.data[field.id].scores);
                            if (validObs.length > 0) {
                              const latest = validObs.sort((a, b) => b.timestamp - a.timestamp)[0];
                              const stats = latest.data[field.id];
                              const total = Object.values(stats.scores as Record<string, number>).reduce((a, b) => a + b, 0);
                              return (
                                <div key={field.id} className="bg-fuchsia-50/50 p-3 rounded-lg border border-fuchsia-100 flex flex-col justify-between sm:col-span-2">
                                  <div className="flex justify-between items-center mb-2">
                                    <div className="text-xs text-fuchsia-800 font-medium uppercase tracking-wider">{field.label}</div>
                                    <div className="text-lg font-bold text-fuchsia-700">{total} / 16</div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                     <div className="flex justify-between text-slate-600"><span>Exécution:</span> <span className="font-bold text-fuchsia-900">{stats.scores.execution || '-'}</span></div>
                                     <div className="flex justify-between text-slate-600"><span>Fluidité:</span> <span className="font-bold text-fuchsia-900">{stats.scores.fluidity || '-'}</span></div>
                                     <div className="flex justify-between text-slate-600"><span>Originalité:</span> <span className="font-bold text-fuchsia-900">{stats.scores.originality || '-'}</span></div>
                                     <div className="flex justify-between text-slate-600"><span>Espace:</span> <span className="font-bold text-fuchsia-900">{stats.scores.space || '-'}</span></div>
                                  </div>
                                </div>
                              );
                            }
                          } else if (field.type === 'match_stats') {
                            const validObs = sObs.filter(o => o.data[field.id]);
                            if (validObs.length > 0) {
                              const latest = validObs.sort((a, b) => b.timestamp - a.timestamp)[0];
                              const stats = latest.data[field.id];
                              const tSuccess = (stats.passes?.success || 0) + (stats.shots?.success || 0) + (stats.defense?.success || 0);
                              const tFail = (stats.passes?.fail || 0) + (stats.shots?.fail || 0) + (stats.defense?.fail || 0);
                              const eff = (tSuccess + tFail) > 0 ? Math.round((tSuccess / (tSuccess + tFail)) * 100) : 0;
                              return (
                                <div key={field.id} className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 flex flex-col justify-between sm:col-span-2">
                                  <div className="flex justify-between items-center mb-2">
                                    <div className="text-xs text-blue-800 font-medium uppercase tracking-wider">{field.label}</div>
                                    <div className="text-lg font-bold text-blue-700">{eff}% Efficacité</div>
                                  </div>
                                  <div className="flex gap-2 mb-2">
                                    {stats.role && <span className="text-[10px] font-bold bg-white text-blue-700 border border-blue-200 px-2 py-1 rounded">{stats.role}</span>}
                                    {stats.zone && <span className="text-[10px] font-bold bg-white text-blue-700 border border-blue-200 px-2 py-1 rounded">{stats.zone}</span>}
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 text-center text-xs mt-1">
                                     <div className="bg-white p-1 rounded border border-slate-200">
                                       <div className="font-bold text-slate-500 mb-1">Passes</div>
                                       <div className="flex justify-center gap-2"><span className="text-emerald-600 font-bold">+{stats.passes?.success || 0}</span><span className="text-red-600 font-bold">-{stats.passes?.fail || 0}</span></div>
                                     </div>
                                     <div className="bg-white p-1 rounded border border-slate-200">
                                       <div className="font-bold text-slate-500 mb-1">Tirs</div>
                                       <div className="flex justify-center gap-2"><span className="text-emerald-600 font-bold">+{stats.shots?.success || 0}</span><span className="text-red-600 font-bold">-{stats.shots?.fail || 0}</span></div>
                                     </div>
                                     <div className="bg-white p-1 rounded border border-slate-200">
                                       <div className="font-bold text-slate-500 mb-1">Défense</div>
                                       <div className="flex justify-center gap-2"><span className="text-emerald-600 font-bold">+{stats.defense?.success || 0}</span><span className="text-red-600 font-bold">-{stats.defense?.fail || 0}</span></div>
                                     </div>
                                  </div>
                                </div>
                              );
                            }
                          } else if (field.type === 'health_fitness_log') {
                            const validObs = sObs.filter(o => o.data[field.id]);
                            if (validObs.length > 0) {
                              const latest = validObs.sort((a, b) => b.timestamp - a.timestamp)[0];
                              const stats = latest.data[field.id];
                              return (
                                <div key={field.id} className="bg-teal-50/50 p-3 rounded-lg border border-teal-100 flex flex-col justify-between sm:col-span-2">
                                  <div className="flex justify-between items-center mb-3">
                                    <div className="text-xs text-teal-800 font-medium uppercase tracking-wider">{field.label}</div>
                                    <div className="text-sm font-bold text-teal-700 bg-teal-100 px-2 py-1 rounded">Fatigue: {stats.globalFatigue || 5}/10</div>
                                  </div>
                                  <div className="flex justify-around items-center bg-white p-2 rounded-lg border border-teal-100 mb-2">
                                    <div className="text-center">
                                      <div className="text-[10px] text-slate-500 font-bold uppercase">BPM Pré-Effort</div>
                                      <div className="font-mono font-bold text-slate-700">{stats.preBpm || '-'}</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-[10px] text-slate-500 font-bold uppercase">BPM Post-Effort</div>
                                      <div className="font-mono font-bold text-red-600">{stats.postBpm || '-'}</div>
                                    </div>
                                  </div>
                                  {stats.ateliers && stats.ateliers.length > 0 && (
                                    <div className="text-xs text-slate-600 mt-1 font-medium">
                                      {stats.ateliers.length} atelier(s) ou série(s) réalisé(s)
                                    </div>
                                  )}
                                </div>
                              );
                            }
                          }
                          
                          return (
                            <div key={field.id} className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 flex flex-col justify-between">
                              <div className="text-xs text-blue-600 font-medium mb-1 uppercase tracking-wider">{field.label}</div>
                              <div className="text-2xl font-bold text-slate-900 font-mono">
                                {value}
                                {field.type === 'speed_30s' && value !== '-' && <span className="text-sm text-slate-500 ml-1">m</span>}
                              </div>
                              {field.type === 'speed_30s' && value !== '-' && (
                                <div className="text-sm font-bold text-emerald-600 mt-1">
                                  {((value as number) * 0.12).toFixed(1)} km/h
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Display Bilan & Perspectives for this session if they exist */}
                      {sObs.some(o => o.bilan || o.perspectives) && (
                        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {sObs.filter(o => o.bilan || o.perspectives).map((o, idx) => (
                            <React.Fragment key={o.id}>
                              {o.bilan && (
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Bilan</div>
                                  <div className="text-sm text-slate-700 whitespace-pre-wrap">{o.bilan}</div>
                                </div>
                              )}
                              {o.perspectives && (
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Perspectives</div>
                                  <div className="text-sm text-slate-700 whitespace-pre-wrap">{o.perspectives}</div>
                                </div>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {studentObservations.length === 0 && (
          <div className="text-center p-12 border border-dashed rounded-xl text-slate-500 bg-slate-50">
            Aucune donnée d'observation enregistrée pour cet élève.
          </div>
        )}
      </div>
    </div>
  );
}
