import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../store';
import { ChevronLeft, Maximize, Activity, Star } from 'lucide-react';
import { cn } from '../lib/utils';
import { formatTimeDuration } from '../components/TimeDurationInput';

export function Project() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { sessions, observations, sheets, classes, activities } = useStore();
  
  const session = sessions.find(s => s.id === sessionId);
  const sheet = sheets.find(s => s.id === session?.sheetId);
  const activity = activities.find(a => a.id === session?.activityId);
  const cls = classes.find(c => c.id === activity?.classId);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const sessionObs = observations.filter(o => o.sessionId === sessionId);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error("Error attempting to enable fullscreen:", err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!session || !sheet || !cls) {
    return <div className="p-8 text-center text-xl">Séance non trouvée ou non configurée.</div>;
  }

  // Calculate aggregates for both students and teams
  const allTargets = [
    ...cls.students.map(s => ({ ...s, isTeam: false })),
    ...(cls.teams || []).map(t => ({ ...t, isTeam: true }))
  ];

  const targetStats = allTargets.map(target => {
    const obs = sessionObs.filter(o => o.targetId === target.id);
    const aggregates: Record<string, any> = {};
    const latestObs = obs.length > 0 ? [...obs].sort((a, b) => b.timestamp - a.timestamp)[0] : null;

    const isAbsent = latestObs?.status === 'absent' || (obs.length > 0 && obs.every(o => Object.values(o.data).some(v => v === 'A')));
    const isDispense = latestObs?.status === 'dispense' || (obs.length > 0 && obs.every(o => Object.values(o.data).some(v => v === 'D')));
    const noGear = latestObs?.noGear || false;
    
    sheet.fields.forEach(f => {
      // Check if latest observation has 'A' or 'D' for this field
      const validObs = obs.filter(o => o.data[f.id] !== undefined && o.data[f.id] !== '');
      if (validObs.length > 0) {
        const latest = [...validObs].sort((a, b) => b.timestamp - a.timestamp)[0];
        const latestVal = latest.data[f.id];
        if (latestVal === 'A' || latestVal === 'a') {
          aggregates[f.id] = 'A';
          return;
        }
        if (latestVal === 'D' || latestVal === 'd') {
          aggregates[f.id] = 'D';
          return;
        }
      }

      if (f.type === 'counter') {
        aggregates[f.id] = obs.reduce((sum, o) => {
          const v = o.data[f.id];
          return sum + (typeof v === 'number' ? v : 0);
        }, 0);
      } else if (f.type === 'number' || f.type === 'speed_30s' || f.type === 'distance_speed' || f.type === 'rating') {
        if (validObs.length > 0) {
           const latest = [...validObs].sort((a, b) => b.timestamp - a.timestamp)[0];
           aggregates[f.id] = latest.data[f.id];
        }
      } else if (f.type === 'time_mm_ss' || f.type === 'time_duration') {
        if (validObs.length > 0) {
           const latest = [...validObs].sort((a, b) => b.timestamp - a.timestamp)[0];
           aggregates[f.id] = latest.data[f.id];
        }
      } else if (f.type === 'orienteering_star') {
        const validObs = obs.filter(o => o.data[f.id]);
        if (validObs.length > 0) {
           const latest = validObs.sort((a, b) => b.timestamp - a.timestamp)[0];
           const data = latest.data[f.id] as Record<string, any>;
           let ok = 0;
           let wrong = 0;
           let totalMs = 0;
           Object.values(data).forEach(balise => {
             if (balise.status === 'ok') { ok++; totalMs += (balise.elapsedMs || 0); }
             if (balise.status === 'wrong') { wrong++; totalMs += (balise.elapsedMs || 0); }
           });
           aggregates[f.id] = { ok, wrong, totalMs };
        }
      } else if (f.type === 'training_log') {
        const validObs = obs.filter(o => o.data[f.id]);
        if (validObs.length > 0) {
           const latest = validObs.sort((a, b) => b.timestamp - a.timestamp)[0];
           const data = latest.data[f.id];
           let totalVolume = 0;
           data.sets.forEach((set: any) => {
             totalVolume += (set.reps || 0) * (set.weight || 0);
           });
           aggregates[f.id] = { profile: data.profile, sets: data.sets.length, volume: totalVolume };
        }
      } else if (f.type === 'project_target') {
        const validObs = obs.filter(o => o.data[f.id]);
        if (validObs.length > 0) {
           const latest = validObs.sort((a, b) => b.timestamp - a.timestamp)[0];
           aggregates[f.id] = latest.data[f.id];
        }
      } else if (f.type === 'ratio_action') {
        const validObs = obs.filter(o => o.data[f.id]);
        if (validObs.length > 0) {
           const latest = validObs.sort((a, b) => b.timestamp - a.timestamp)[0];
           aggregates[f.id] = latest.data[f.id];
        }
      } else if (f.type === 'sequence_planner') {
        const validObs = obs.filter(o => o.data[f.id]);
        if (validObs.length > 0) {
           const latest = validObs.sort((a, b) => b.timestamp - a.timestamp)[0];
           const data = latest.data[f.id];
           const validated = data.filter((item: any) => item.validated).length;
           aggregates[f.id] = { total: data.length, validated };
        }
      } else if (f.type === 'performance_log') {
        const validObs = obs.filter(o => o.data[f.id]);
        if (validObs.length > 0) {
           const latest = validObs.sort((a, b) => b.timestamp - a.timestamp)[0];
           const data = latest.data[f.id];
           let totalDistance = 0;
           let totalEffort = 0;
           let rpeSum = 0;
           data.reps.forEach((rep: any) => {
             totalDistance += (rep.distance || 0);
             totalEffort += (rep.effortTime || 0);
             rpeSum += (rep.rpe || 5);
           });
           const avgRpe = data.reps.length > 0 ? (rpeSum / data.reps.length).toFixed(1) : 0;
           aggregates[f.id] = { 
             profile: data.profile, 
             reps: data.reps.length, 
             totalDistance, 
             totalEffort,
             avgRpe 
           };
        }
      } else if (f.type === 'orienteering_log') {
        const validObs = obs.filter(o => o.data[f.id]);
        if (validObs.length > 0) {
           const latest = validObs.sort((a, b) => b.timestamp - a.timestamp)[0];
           aggregates[f.id] = latest.data[f.id];
        }
      } else if (f.type === 'artistic_rating') {
        const validObs = obs.filter(o => o.data[f.id] && o.data[f.id].scores);
        if (validObs.length > 0) {
           const latest = validObs.sort((a, b) => b.timestamp - a.timestamp)[0];
           aggregates[f.id] = latest.data[f.id];
        }
      } else if (f.type === 'match_stats') {
        const validObs = obs.filter(o => o.data[f.id]);
        if (validObs.length > 0) {
           const latest = validObs.sort((a, b) => b.timestamp - a.timestamp)[0];
           aggregates[f.id] = latest.data[f.id];
        }
      } else if (f.type === 'health_fitness_log') {
        const validObs = obs.filter(o => o.data[f.id]);
        if (validObs.length > 0) {
           const latest = validObs.sort((a, b) => b.timestamp - a.timestamp)[0];
           aggregates[f.id] = latest.data[f.id];
        }
      }
    });

    return {
      target,
      obsCount: obs.length,
      aggregates,
      isAbsent,
      isDispense,
      noGear
    };
  }).filter(s => s.obsCount > 0).sort((a, b) => b.obsCount - a.obsCount);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col overflow-hidden">
      <header className="p-6 flex items-center justify-between border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-4">
          <Link to={`/session/${session.id}`} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="w-6 h-6 text-emerald-500" />
              Live Dashboard: {session.name}
            </h1>
            <p className="text-slate-400">{cls.name} • {sheet.name}</p>
          </div>
        </div>
        <button 
          onClick={toggleFullscreen}
          className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2 font-medium"
        >
          <Maximize className="w-5 h-5" />
          {isFullscreen ? 'Quitter' : 'Plein écran'}
        </button>
      </header>

      <main className="flex-1 p-8 overflow-y-auto">
        {targetStats.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
            <Activity className="w-16 h-16 opacity-50 animate-pulse" />
            <p className="text-2xl">En attente de données...</p>
            <p>Les observations saisies par les élèves apparaîtront ici en temps réel.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {targetStats.map(({ target, obsCount, aggregates, isAbsent, isDispense, noGear }) => (
              <div 
                key={target.id} 
                className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-500"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full -mr-8 -mt-8" />
                
                {/* Header with Attendance and Material Badges */}
                <div className="flex items-start justify-between gap-3 mb-6 relative z-10">
                  <div>
                    <h3 className="text-2xl font-bold text-white">
                      {target.name}
                    </h3>
                    {target.isTeam && <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider block mt-0.5">Équipe</span>}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 justify-end">
                    {isAbsent && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                        ABSENT (A)
                      </span>
                    )}
                    {isDispense && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        DISPENSÉ (D)
                      </span>
                    )}
                    {noGear && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                        <span>👟</span> SANS MATÉRIEL
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4 relative z-10">
                  {sheet.fields.map(field => {
                    const val = aggregates[field.id];

                    // Check for special attendance codes 'A' or 'D' in any field
                    if (val === 'A' || val === 'a' || val === 'D' || val === 'd') {
                      const isA = val === 'A' || val === 'a';
                      return (
                        <div key={field.id} className="flex flex-col bg-slate-950/50 p-4 rounded-xl gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium">{field.label}</span>
                            <span className={`px-3 py-1 rounded-lg text-lg font-bold border ${
                              isA 
                                ? 'text-red-400 bg-red-500/20 border-red-500/30' 
                                : 'text-amber-400 bg-amber-500/20 border-amber-500/30'
                            }`}>
                              {isA ? 'ABS (A)' : 'DISP (D)'}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    if (field.type === 'counter' || field.type === 'number' || field.type === 'speed_30s' || field.type === 'distance_speed' || field.type === 'rating') {
                      const isDistanceSpeed = field.type === 'distance_speed';
                      const hasTargetDuration = field.options?.targetDuration;
                      const val = aggregates[field.id];
                      
                      return (
                        <div key={field.id} className="flex flex-col bg-slate-950/50 p-4 rounded-xl gap-2">
                          <div className="flex items-center justify-between">
                             <span className="text-slate-400 font-medium">{field.label}</span>
                             <span className="text-3xl font-bold font-mono text-emerald-400 flex items-center gap-1">
                               {field.type === 'rating' ? (
                                 <span className="flex items-center text-amber-400">
                                   {val !== undefined ? val : '-'} 
                                   <Star className="w-6 h-6 ml-1 fill-amber-400" />
                                 </span>
                               ) : (
                                 <>
                                   {val !== undefined ? val : '-'}
                                   {(field.type === 'speed_30s' || isDistanceSpeed) && val !== undefined && ' m'}
                                 </>
                               )}
                             </span>
                          </div>
                          {field.type === 'speed_30s' && val !== undefined && (
                             <div className="text-right text-sm text-emerald-500/80 font-bold">
                               {((val as number) * 0.12).toFixed(1)} km/h
                             </div>
                          )}
                          {isDistanceSpeed && val !== undefined && hasTargetDuration && (
                             <div className="text-right text-sm text-emerald-500/80 font-bold">
                               {(((val as number) / field.options!.targetDuration) * 3.6).toFixed(1)} km/h
                             </div>
                          )}
                        </div>
                      );
                    } else if (field.type === 'time_mm_ss' && aggregates[field.id]) {
                      const time = aggregates[field.id];
                      const m = time.minutes || 0;
                      const s = time.seconds || 0;
                      const currentSeconds = m * 60 + s;
                      const targetSeconds = field.options?.targetDuration;
                      const percent = targetSeconds ? Math.round((currentSeconds / targetSeconds) * 100) : null;
                      
                      return (
                        <div key={field.id} className="flex flex-col bg-slate-950/50 p-4 rounded-xl gap-2">
                          <div className="flex items-center justify-between">
                             <span className="text-slate-400 font-medium">{field.label}</span>
                             <div className="flex flex-col items-end">
                               <span className="text-3xl font-bold font-mono text-emerald-400">
                                 {m}:{s < 10 ? `0${s}` : s}
                               </span>
                               {percent !== null && currentSeconds > 0 && (
                                 <span className="text-sm text-indigo-400 font-bold mt-1">
                                   Perf : {percent}%
                                 </span>
                               )}
                             </div>
                          </div>
                        </div>
                      );
                    } else if (field.type === 'time_duration' && aggregates[field.id]) {
                      const time = aggregates[field.id];
                      const totalSec = typeof time === 'number' 
                        ? time 
                        : (time.totalSeconds ?? ((time.hours || 0) * 3600 + (time.minutes || 0) * 60 + (time.seconds || 0)));
                      const targetSeconds = field.options?.targetDuration;
                      const percent = (targetSeconds && targetSeconds > 0 && totalSec > 0) ? Math.round((totalSec / targetSeconds) * 100) : null;

                      return (
                        <div key={field.id} className="flex flex-col bg-slate-950/50 p-4 rounded-xl gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium">{field.label}</span>
                            <div className="flex flex-col items-end">
                              <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
                                {formatTimeDuration(time, field.options?.units)}
                              </span>
                              {percent !== null && totalSec > 0 && (
                                <span className="text-sm text-indigo-400 font-bold mt-1">
                                  Cible : {percent}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    } else if (field.type === 'orienteering_star' && aggregates[field.id]) {
                      const stats = aggregates[field.id];
                      return (
                        <div key={field.id} className="flex flex-col bg-slate-950/50 p-4 rounded-xl gap-3 border border-slate-800">
                          <span className="text-slate-400 font-medium">{field.label}</span>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col">
                              <span className="text-xs text-slate-500 uppercase font-bold">Validées</span>
                              <span className="text-2xl font-bold text-emerald-400">{stats.ok}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs text-slate-500 uppercase font-bold">Fausses</span>
                              <span className="text-2xl font-bold text-red-400">{stats.wrong}</span>
                            </div>
                          </div>
                          <div className="mt-2 text-sm text-emerald-500 font-mono">
                            Temps cumulé: {Math.floor(stats.totalMs / 60000)}m {Math.floor((stats.totalMs / 1000) % 60).toString().padStart(2, '0')}s
                          </div>
                        </div>
                      );
                    } else if (field.type === 'training_log' && aggregates[field.id]) {
                      const stats = aggregates[field.id];
                      return (
                        <div key={field.id} className="flex flex-col bg-slate-950/50 p-4 rounded-xl gap-2 border border-slate-800">
                          <span className="text-slate-400 font-medium">{field.label} {stats.profile && `(${stats.profile})`}</span>
                          <div className="flex justify-between items-center mt-2">
                             <div className="text-sm text-slate-500">Séries: <span className="text-emerald-400 font-bold">{stats.sets}</span></div>
                             <div className="text-sm text-slate-500">Volume: <span className="text-indigo-400 font-bold">{stats.volume} kg</span></div>
                          </div>
                        </div>
                      );
                    } else if (field.type === 'ratio_action' && aggregates[field.id]) {
                      const stats = aggregates[field.id];
                      const total = stats.success + stats.fail;
                      const ratio = total > 0 ? Math.round((stats.success / total) * 100) : 0;
                      return (
                        <div key={field.id} className="flex flex-col bg-slate-950/50 p-4 rounded-xl gap-2 border border-slate-800">
                          <div className="flex justify-between items-center">
                             <span className="text-slate-400 font-medium">{field.label}</span>
                             <span className={`text-xl font-bold font-mono ${ratio >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>{ratio}%</span>
                          </div>
                          <div className="flex gap-4 mt-2">
                             <div className="text-xs text-slate-500">Réussis: <span className="text-emerald-400 font-bold">{stats.success}</span></div>
                             <div className="text-xs text-slate-500">Ratés: <span className="text-red-400 font-bold">{stats.fail}</span></div>
                          </div>
                        </div>
                      );
                    } else if (field.type === 'project_target' && aggregates[field.id]) {
                      const stats = aggregates[field.id];
                      const diff = stats.actual - stats.target;
                      return (
                        <div key={field.id} className="flex flex-col bg-slate-950/50 p-4 rounded-xl gap-2 border border-slate-800">
                          <span className="text-slate-400 font-medium">{field.label}</span>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="text-xs text-slate-500">Cible: <span className="text-blue-400 font-bold">{stats.target}</span></div>
                            <div className="text-xs text-slate-500">Réel: <span className="text-indigo-400 font-bold">{stats.actual}</span></div>
                          </div>
                          <div className={`text-sm mt-1 font-bold ${Math.abs(diff) === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                             Écart: {diff > 0 ? '+' : ''}{diff}
                          </div>
                        </div>
                      );
                    } else if (field.type === 'sequence_planner' && aggregates[field.id]) {
                      const stats = aggregates[field.id];
                      return (
                        <div key={field.id} className="flex flex-col bg-slate-950/50 p-4 rounded-xl gap-2 border border-slate-800">
                          <div className="flex justify-between items-center">
                             <span className="text-slate-400 font-medium">{field.label}</span>
                             <span className={`text-xl font-bold font-mono ${stats.validated === stats.total && stats.total > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                               {stats.validated} / {stats.total}
                             </span>
                          </div>
                        </div>
                      );
                    } else if (field.type === 'performance_log' && aggregates[field.id]) {
                      const stats = aggregates[field.id];
                      return (
                        <div key={field.id} className="flex flex-col bg-slate-950/50 p-4 rounded-xl gap-2 border border-slate-800">
                          <span className="text-slate-400 font-medium">{field.label} {stats.profile && `(${stats.profile})`}</span>
                          <div className="flex justify-between items-center mt-2">
                             <div className="text-sm text-slate-500">Répétitions: <span className="text-emerald-400 font-bold">{stats.reps}</span></div>
                             <div className="text-sm text-slate-500">RPE Moy: <span className="text-indigo-400 font-bold">{stats.avgRpe}/10</span></div>
                          </div>
                          {(stats.totalDistance > 0 || stats.totalEffort > 0) && (
                            <div className="text-xs text-slate-500 mt-1 flex gap-3">
                              {stats.totalDistance > 0 && <span>Dist: {stats.totalDistance}m</span>}
                              {stats.totalEffort > 0 && <span>Effort: {Math.floor(stats.totalEffort / 60)}m {stats.totalEffort % 60}s</span>}
                            </div>
                          )}
                        </div>
                      );
                    } else if (field.type === 'orienteering_log' && aggregates[field.id]) {
                      const stats = aggregates[field.id];
                      return (
                        <div key={field.id} className="flex flex-col bg-slate-950/50 p-4 rounded-xl gap-2 border border-slate-800">
                          <span className="text-slate-400 font-medium">{field.label}</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {stats.raceType && <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded font-bold">{stats.raceType}</span>}
                            {stats.tactic && <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded font-bold">{stats.tactic}</span>}
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-3 text-center">
                             <div className="bg-slate-900 rounded p-2 border border-emerald-900/50">
                               <div className="text-[10px] text-slate-500 uppercase font-bold">Balises OK</div>
                               <div className="text-xl font-bold text-emerald-400">{stats.balisesOk}</div>
                             </div>
                             <div className="bg-slate-900 rounded p-2 border border-red-900/50">
                               <div className="text-[10px] text-slate-500 uppercase font-bold">Erreurs</div>
                               <div className="text-xl font-bold text-red-400">{stats.errors}</div>
                             </div>
                          </div>
                          <div className="mt-2 text-center flex items-center justify-center">
                            <span className="text-sm font-mono font-bold text-slate-300">
                              Chrono: {Math.floor(stats.globalTimeMs / 60000)}m {Math.floor((stats.globalTimeMs / 1000) % 60).toString().padStart(2, '0')}s
                            </span>
                            {stats.isRunning && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}
                          </div>
                        </div>
                      );
                    } else if (field.type === 'artistic_rating' && aggregates[field.id]) {
                      const stats = aggregates[field.id];
                      const total = Object.values(stats.scores as Record<string, number>).reduce((a, b) => a + b, 0);
                      return (
                        <div key={field.id} className="flex flex-col bg-slate-950/50 p-4 rounded-xl gap-2 border border-slate-800">
                          <div className="flex justify-between items-center mb-1">
                             <span className="text-slate-400 font-medium">{field.label}</span>
                             <span className="text-lg font-bold text-fuchsia-400">{total} <span className="text-sm text-slate-500">/ 16</span></span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                             <div className="flex justify-between text-slate-400"><span>Exécution:</span> <span className="text-white font-bold">{stats.scores.execution || '-'}</span></div>
                             <div className="flex justify-between text-slate-400"><span>Fluidité:</span> <span className="text-white font-bold">{stats.scores.fluidity || '-'}</span></div>
                             <div className="flex justify-between text-slate-400"><span>Originalité:</span> <span className="text-white font-bold">{stats.scores.originality || '-'}</span></div>
                             <div className="flex justify-between text-slate-400"><span>Espace:</span> <span className="text-white font-bold">{stats.scores.space || '-'}</span></div>
                          </div>
                        </div>
                      );
                    } else if (field.type === 'match_stats' && aggregates[field.id]) {
                      const stats = aggregates[field.id];
                      const tSuccess = (stats.passes?.success || 0) + (stats.shots?.success || 0) + (stats.defense?.success || 0);
                      const tFail = (stats.passes?.fail || 0) + (stats.shots?.fail || 0) + (stats.defense?.fail || 0);
                      const totalActions = tSuccess + tFail;
                      const eff = totalActions > 0 ? Math.round((tSuccess / totalActions) * 100) : 0;

                      return (
                        <div key={field.id} className="flex flex-col bg-slate-950/50 p-4 rounded-xl gap-2 border border-slate-800">
                          <div className="flex justify-between items-center mb-1">
                             <span className="text-slate-400 font-medium">{field.label}</span>
                             <span className={`text-lg font-bold ${eff >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>{eff}% <span className="text-xs text-slate-500 font-normal">Eff.</span></span>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-1">
                            {stats.role && <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded font-bold">{stats.role}</span>}
                            {stats.zone && <span className="px-2 py-1 bg-indigo-500/20 text-indigo-400 text-xs rounded font-bold">{stats.zone}</span>}
                          </div>
                          <div className="flex justify-between text-xs text-slate-400 mt-1">
                            <span>Total Actions: {totalActions}</span>
                            <span className="text-emerald-400">{tSuccess} réussies</span>
                          </div>
                        </div>
                      );
                    } else if (field.type === 'health_fitness_log' && aggregates[field.id]) {
                      const stats = aggregates[field.id];
                      return (
                        <div key={field.id} className="flex flex-col bg-slate-950/50 p-4 rounded-xl gap-2 border border-slate-800">
                          <div className="flex justify-between items-center mb-1">
                             <span className="text-slate-400 font-medium">{field.label}</span>
                             <span className="text-teal-400 font-bold text-sm">Fatigue: {stats.globalFatigue || 5}/10</span>
                          </div>
                          <div className="flex justify-between items-center text-xs text-slate-300 bg-slate-900 p-2 rounded">
                            <div className="flex flex-col items-center">
                               <span className="text-[10px] text-slate-500 uppercase">BPM Pré</span>
                               <span className="font-mono font-bold text-teal-300">{stats.preBpm || '-'}</span>
                            </div>
                            <div className="w-px h-6 bg-slate-700"></div>
                            <div className="flex flex-col items-center">
                               <span className="text-[10px] text-slate-500 uppercase">BPM Post</span>
                               <span className="font-mono font-bold text-red-400">{stats.postBpm || '-'}</span>
                            </div>
                          </div>
                          {stats.ateliers && stats.ateliers.length > 0 && (
                            <div className="text-xs text-slate-400 mt-1">
                              <span className="font-bold text-teal-400">{stats.ateliers.length}</span> ateliers réalisés
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-800/50 flex justify-between items-center text-sm text-slate-500">
                  <span>Mises à jour: {obsCount}</span>
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
