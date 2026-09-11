import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../store';
import { Button } from '../components/ui/Button';
import { CheckCircle2, Minus, Plus, Star } from 'lucide-react';
import { OrienteeringStar } from '../components/OrienteeringStar';
import { TrainingLog } from '../components/TrainingLog';
import { RatioAction } from '../components/RatioAction';
import { ProjectTarget } from '../components/ProjectTarget';
import { SequencePlanner } from '../components/SequencePlanner';
import { PerformanceLog } from '../components/PerformanceLog';
import { OrienteeringLog } from '../components/OrienteeringLog';
import { ArtisticRating } from '../components/ArtisticRating';
import { MatchStats } from '../components/MatchStats';
import { HealthFitnessLog } from '../components/HealthFitnessLog';
import { TimeMmSs } from '../components/TimeMmSs';

export function Observe() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { sessions, sheets, activities, classes, addObservation } = useStore();
  
  const session = sessions.find(s => s.id === sessionId);
  const sheet = sheets.find(s => s.id === session?.sheetId);
  const activity = activities.find(a => a.id === session?.activityId);
  const cls = classes.find(c => c.id === activity?.classId);

  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [isObserving, setIsObserving] = useState(false);
  const [data, setData] = useState<Record<string, Record<string, any>>>({});
  const [submitted, setSubmitted] = useState(false);

  if (!session || !sheet || !cls) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">Séance non configurée</h1>
          <p className="text-slate-400">Demandez à votre professeur de vérifier le QR Code ou la configuration.</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl text-left text-xs font-mono text-slate-300 space-y-1 w-full max-w-sm">
          <p className="text-slate-400 font-bold mb-2 border-b border-slate-700 pb-1">-- Diagnostic --</p>
          <p>ID Séance (URL) : <span className="text-white">{sessionId}</span></p>
          <p>Séance trouvée : {session ? <span className="text-emerald-400">Oui</span> : <span className="text-red-400">Non</span>}</p>
          {session && (
            <>
              <p>Activité liée : {activity ? <span className="text-emerald-400">Oui</span> : <span className="text-red-400">Non</span>}</p>
              <p>Classe liée : {cls ? <span className="text-emerald-400">Oui</span> : <span className="text-red-400">Non</span>}</p>
              <p>Fiche sél. (ID) : <span className="text-white">{session.sheetId || 'Aucune'}</span></p>
              <p>Fiche trouvée : {sheet ? <span className="text-emerald-400">Oui</span> : <span className="text-red-400">Non</span>}</p>
            </>
          )}
          <p className="pt-2 mt-2 border-t border-slate-700">Données chargées :</p>
          <p>{sessions.length} séances, {sheets.length} fiches, {classes.length} classes.</p>
        </div>
      </div>
    );
  }

  const handleCounterChange = (targetId: string, fieldId: string, delta: number) => {
    setData(prev => {
      const targetData = prev[targetId] || {};
      return {
        ...prev,
        [targetId]: {
          ...targetData,
          [fieldId]: Math.max(0, ((targetData[fieldId] as number) || 0) + delta)
        }
      };
    });
  };

  const handleNumberChange = (targetId: string, fieldId: string, value: string) => {
    const num = parseInt(value, 10);
    setData(prev => {
      const targetData = prev[targetId] || {};
      return {
        ...prev,
        [targetId]: {
          ...targetData,
          [fieldId]: isNaN(num) ? '' : num
        }
      };
    });
  };

  const handleToggle = (targetId: string, fieldId: string) => {
    setData(prev => {
      const targetData = prev[targetId] || {};
      return {
        ...prev,
        [targetId]: {
          ...targetData,
          [fieldId]: !targetData[fieldId]
        }
      };
    });
  };

  const handleSubmit = () => {
    if (selectedTargets.length === 0) return;
    
    selectedTargets.forEach(targetId => {
      addObservation({
        sessionId: session.id,
        targetId,
        data: data[targetId] || {},
        timestamp: Date.now()
      });
    });

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setData({});
      setSelectedTargets([]);
      setIsObserving(false);
    }, 2000);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-emerald-600 text-white flex flex-col items-center justify-center p-4 animate-in zoom-in duration-300">
        <CheckCircle2 className="w-24 h-24 mb-4" />
        <h1 className="text-3xl font-bold text-center">Observation enregistrée !</h1>
      </div>
    );
  }

  if (!isObserving) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-blue-600 text-white p-4 shadow-md sticky top-0 z-10">
          <h1 className="font-bold text-lg">{sheet.name}</h1>
          <p className="text-blue-100 text-sm">{cls.name} - {session.name}</p>
        </header>

        <main className="flex-1 p-4 max-w-lg mx-auto w-full space-y-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <label className="block text-sm font-bold text-slate-700 mb-4">
              {sheet.isMultiStudent ? 'Qui observez-vous ? (Plusieurs choix possibles)' : 'Qui observez-vous ?'}
            </label>
            
            {sheet.isMultiStudent ? (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {cls.teams && cls.teams.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide">Équipes</h3>
                    <div className="space-y-2">
                      {cls.teams.map(t => (
                        <label key={t.id} className="flex items-center p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-600 mr-3"
                            checked={selectedTargets.includes(t.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedTargets(prev => [...prev, t.id]);
                              else setSelectedTargets(prev => prev.filter(id => id !== t.id));
                            }}
                          />
                          <span className="font-bold text-slate-800">{t.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide">Élèves</h3>
                  <div className="space-y-2">
                    {cls.students.map(s => (
                      <label key={s.id} className="flex items-center p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-600 mr-3"
                          checked={selectedTargets.includes(s.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedTargets(prev => [...prev, s.id]);
                            else setSelectedTargets(prev => prev.filter(id => id !== s.id));
                          }}
                        />
                        <span className="font-medium text-slate-800">{s.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <select 
                className="w-full h-12 rounded-lg border-2 border-slate-200 px-3 text-lg focus:border-blue-600 focus:outline-none"
                value={selectedTargets[0] || ''}
                onChange={e => setSelectedTargets([e.target.value])}
              >
                <option value="" disabled>-- Sélectionner un élève ou une équipe --</option>
                {cls.teams && cls.teams.length > 0 && (
                  <optgroup label="Équipes">
                    {cls.teams.map(t => (
                      <option key={t.id} value={t.id}>Équipe : {t.name}</option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Élèves">
                  {cls.students.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </optgroup>
              </select>
            )}

            <Button 
              size="lg" 
              className="w-full mt-6 h-14 text-lg"
              disabled={selectedTargets.length === 0}
              onClick={() => setIsObserving(true)}
            >
              Commencer l'observation
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-blue-600 text-white p-4 shadow-md sticky top-0 z-10 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">{sheet.name}</h1>
          <p className="text-blue-100 text-sm">{cls.name} - {session.name}</p>
        </div>
        <button onClick={() => setIsObserving(false)} className="text-blue-100 hover:text-white text-sm underline">
          Modifier
        </button>
      </header>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-6">
        {selectedTargets.map(targetId => {
          const student = cls.students.find(s => s.id === targetId);
          const team = cls.teams?.find(t => t.id === targetId);
          const targetName = student?.name || (team ? `Équipe : ${team.name}` : 'Inconnu');
          const studentData = data[targetId] || {};
          
          return (
            <div key={targetId} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-5">
              {sheet.isMultiStudent && (
                <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-3">{targetName}</h2>
              )}
              
              <div className="space-y-6">
                {sheet.fields.map(field => (
                  <div key={field.id} className="flex flex-col gap-3">
                    <div className="font-semibold text-slate-800 text-lg text-center">{field.label}</div>
                    
                    {field.type === 'counter' && (
                      <div className="flex items-center justify-between gap-4 bg-slate-50 p-2 rounded-xl">
                        <button 
                          onClick={() => handleCounterChange(targetId, field.id, -1)}
                          className="w-16 h-16 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center active:bg-slate-100 touch-manipulation shadow-sm"
                        >
                          <Minus className="w-8 h-8" />
                        </button>
                        <div className="text-4xl font-bold font-mono text-slate-800">
                          {studentData[field.id] || 0}
                        </div>
                        <button 
                          onClick={() => handleCounterChange(targetId, field.id, 1)}
                          className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center active:bg-blue-200 touch-manipulation shadow-sm"
                        >
                          <Plus className="w-8 h-8" />
                        </button>
                      </div>
                    )}

                    {field.type === 'boolean' && (
                      <button
                        onClick={() => handleToggle(targetId, field.id)}
                        className={`w-full py-4 rounded-xl font-bold text-xl transition-colors ${
                          studentData[field.id] ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {studentData[field.id] ? 'OUI' : 'NON'}
                      </button>
                    )}

                    {field.type === 'rating' && (
                      <div className="flex items-center justify-center gap-2 h-16 bg-slate-100 rounded-xl">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            onClick={() => {
                              setData(prev => {
                                const targetData = prev[targetId] || {};
                                return {
                                  ...prev,
                                  [targetId]: { ...targetData, [field.id]: star }
                                };
                              });
                            }}
                            className="p-2 transition-transform hover:scale-110 focus:outline-none"
                          >
                            <Star 
                              className={`w-10 h-10 ${
                                (studentData[field.id] as number || 0) >= star
                                  ? 'fill-amber-400 text-amber-400' 
                                  : 'fill-transparent text-slate-300'
                              }`} 
                            />
                          </button>
                        ))}
                      </div>
                    )}

                    {field.type === 'number' && (
                      <div className="flex flex-col items-center gap-2">
                        <input 
                          type="number"
                          className="w-full h-16 text-center text-3xl font-bold font-mono rounded-xl border-2 border-slate-200 focus:border-blue-600 focus:outline-none"
                          placeholder="Saisir valeur..."
                          value={studentData[field.id] === undefined ? '' : studentData[field.id] as number}
                          onChange={(e) => handleNumberChange(targetId, field.id, e.target.value)}
                        />
                      </div>
                    )}

                    {field.type === 'speed_30s' && (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-full relative">
                          <input 
                            type="number"
                            className="w-full h-16 text-center text-3xl font-bold font-mono rounded-xl border-2 border-slate-200 focus:border-blue-600 focus:outline-none pr-12"
                            placeholder="Distance (m)"
                            value={studentData[field.id] === undefined ? '' : studentData[field.id] as number}
                            onChange={(e) => handleNumberChange(targetId, field.id, e.target.value)}
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">m</span>
                        </div>
                        {studentData[field.id] !== undefined && studentData[field.id] !== '' && (
                          <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg font-bold w-full text-center text-lg">
                            Vitesse : {((studentData[field.id] as number) * 0.12).toFixed(1)} km/h
                          </div>
                        )}
                      </div>
                    )}

                    {field.type === 'distance_speed' && (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-full relative">
                          <input 
                            type="number"
                            className="w-full h-16 text-center text-3xl font-bold font-mono rounded-xl border-2 border-slate-200 focus:border-blue-600 focus:outline-none pr-12"
                            placeholder="Distance (m)"
                            value={studentData[field.id] === undefined ? '' : studentData[field.id] as number}
                            onChange={(e) => handleNumberChange(targetId, field.id, e.target.value)}
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">m</span>
                        </div>
                        {studentData[field.id] !== undefined && studentData[field.id] !== '' && field.options?.targetDuration && (
                          <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg font-bold w-full text-center text-lg">
                            Vitesse : {(((studentData[field.id] as number) / field.options.targetDuration) * 3.6).toFixed(1)} km/h
                          </div>
                        )}
                      </div>
                    )}

                    {field.type === 'time_mm_ss' && (() => {
                      const timeVal = studentData[field.id];
                      const currentSeconds = timeVal ? (timeVal.minutes || 0) * 60 + (timeVal.seconds || 0) : 0;
                      const targetSeconds = field.options?.targetDuration;
                      const percent = targetSeconds ? Math.round((currentSeconds / targetSeconds) * 100) : null;
                      
                      return (
                        <div className="flex flex-col gap-2">
                          <TimeMmSs 
                            value={timeVal}
                            onChange={(newVal) => {
                              setData(prev => {
                                const targetData = prev[targetId] || {};
                                return {
                                  ...prev,
                                  [targetId]: { ...targetData, [field.id]: newVal }
                                };
                              });
                            }}
                          />
                          {percent !== null && currentSeconds > 0 && (
                            <div className="bg-indigo-100 text-indigo-800 px-4 py-2 rounded-lg font-bold w-full text-center text-lg mt-2">
                              Temps effectif : {percent}%
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {field.type === 'orienteering_star' && (
                      <OrienteeringStar 
                        baliseCount={field.options?.baliseCount || 10}
                        value={studentData[field.id] || {}}
                        onChange={(newVal) => {
                          setData(prev => {
                            const targetData = prev[targetId] || {};
                            return {
                              ...prev,
                              [targetId]: { ...targetData, [field.id]: newVal }
                            };
                          });
                        }}
                      />
                    )}

                    {field.type === 'training_log' && (
                      <TrainingLog 
                        value={studentData[field.id]}
                        onChange={(newVal) => {
                          setData(prev => {
                            const targetData = prev[targetId] || {};
                            return {
                              ...prev,
                              [targetId]: { ...targetData, [field.id]: newVal }
                            };
                          });
                        }}
                      />
                    )}

                    {field.type === 'project_target' && (
                      <ProjectTarget 
                        value={studentData[field.id]}
                        onChange={(newVal) => {
                          setData(prev => {
                            const targetData = prev[targetId] || {};
                            return {
                              ...prev,
                              [targetId]: { ...targetData, [field.id]: newVal }
                            };
                          });
                        }}
                      />
                    )}

                    {field.type === 'ratio_action' && (
                      <RatioAction 
                        value={studentData[field.id]}
                        onChange={(newVal) => {
                          setData(prev => {
                            const targetData = prev[targetId] || {};
                            return {
                              ...prev,
                              [targetId]: { ...targetData, [field.id]: newVal }
                            };
                          });
                        }}
                      />
                    )}

                    {field.type === 'sequence_planner' && (
                      <SequencePlanner 
                        value={studentData[field.id]}
                        onChange={(newVal) => {
                          setData(prev => {
                            const targetData = prev[targetId] || {};
                            return {
                              ...prev,
                              [targetId]: { ...targetData, [field.id]: newVal }
                            };
                          });
                        }}
                      />
                    )}

                    {field.type === 'performance_log' && (
                      <PerformanceLog 
                        value={studentData[field.id]}
                        onChange={(newVal) => {
                          setData(prev => {
                            const targetData = prev[targetId] || {};
                            return {
                              ...prev,
                              [targetId]: { ...targetData, [field.id]: newVal }
                            };
                          });
                        }}
                      />
                    )}

                    {field.type === 'orienteering_log' && (
                      <OrienteeringLog 
                        value={studentData[field.id]}
                        onChange={(newVal) => {
                          setData(prev => {
                            const targetData = prev[targetId] || {};
                            return {
                              ...prev,
                              [targetId]: { ...targetData, [field.id]: newVal }
                            };
                          });
                        }}
                      />
                    )}

                    {field.type === 'artistic_rating' && (
                      <ArtisticRating 
                        value={studentData[field.id]}
                        onChange={(newVal) => {
                          setData(prev => {
                            const targetData = prev[targetId] || {};
                            return {
                              ...prev,
                              [targetId]: { ...targetData, [field.id]: newVal }
                            };
                          });
                        }}
                      />
                    )}

                    {field.type === 'match_stats' && (
                      <MatchStats 
                        value={studentData[field.id]}
                        onChange={(newVal) => {
                          setData(prev => {
                            const targetData = prev[targetId] || {};
                            return {
                              ...prev,
                              [targetId]: { ...targetData, [field.id]: newVal }
                            };
                          });
                        }}
                      />
                    )}

                    {field.type === 'health_fitness_log' && (
                      <HealthFitnessLog 
                        value={studentData[field.id]}
                        onChange={(newVal) => {
                          setData(prev => {
                            const targetData = prev[targetId] || {};
                            return {
                              ...prev,
                              [targetId]: { ...targetData, [field.id]: newVal }
                            };
                          });
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <Button 
          size="lg" 
          className="w-full h-16 text-lg rounded-xl shadow-lg mt-8 mb-12 bg-emerald-600 hover:bg-emerald-700"
          onClick={handleSubmit}
        >
          Envoyer {selectedTargets.length > 1 ? 'les observations' : 'l\'observation'}
        </Button>
      </main>
    </div>
  );
}
