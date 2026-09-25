import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../store';
import { Button } from '../components/ui/Button';
import { 
  CheckCircle2, 
  Minus, 
  Plus, 
  Star, 
  UserCheck, 
  UserX, 
  ShieldAlert, 
  RotateCcw,
  AlertCircle
} from 'lucide-react';
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
import { TimeDurationInput } from '../components/TimeDurationInput';
import { StudentSessionStatus } from '../types';

export function Observe() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { sessions, sheets, activities, classes, addObservation, observations } = useStore();
  
  const session = sessions.find(s => s.id === sessionId);
  const sheet = sheets.find(s => s.id === session?.sheetId);
  const activity = activities.find(a => a.id === session?.activityId);
  const cls = classes.find(c => c.id === activity?.classId);

  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [isObserving, setIsObserving] = useState(false);
  
  // Data per target and field
  const [data, setData] = useState<Record<string, Record<string, any>>>({});
  // Attendance status per student: 'present' | 'absent' | 'dispense'
  const [studentStatus, setStudentStatus] = useState<Record<string, StudentSessionStatus>>({});
  // Equipment forget toggle per student
  const [studentNoGear, setStudentNoGear] = useState<Record<string, boolean>>({});

  const [bilans, setBilans] = useState<Record<string, string>>({});
  const [perspectives, setPerspectives] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // Sync with existing recorded observations for this session
  useEffect(() => {
    if (!session) return;
    const sessionObs = observations.filter(o => o.sessionId === session.id);
    const initialStatus: Record<string, StudentSessionStatus> = {};
    const initialNoGear: Record<string, boolean> = {};
    sessionObs.forEach(o => {
      if (o.status) initialStatus[o.targetId] = o.status;
      if (o.noGear !== undefined) initialNoGear[o.targetId] = o.noGear;
    });
    setStudentStatus(prev => ({ ...initialStatus, ...prev }));
    setStudentNoGear(prev => ({ ...initialNoGear, ...prev }));
  }, [session?.id, observations]);

  if (!session || !sheet || !cls) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">Séance non configurée</h1>
          <p className="text-slate-400">Demandez à votre professeur de vérifier le QR Code ou la configuration.</p>
        </div>
      </div>
    );
  }

  // Handle setting student-level attendance status
  const handleSetStudentStatus = (targetId: string, status: StudentSessionStatus) => {
    setStudentStatus(prev => ({
      ...prev,
      [targetId]: status
    }));

    // If absent or dispensé, optionally prefill empty fields
    if (status === 'absent' || status === 'dispense') {
      const code = status === 'absent' ? 'A' : 'D';
      setData(prev => {
        const currentTargetData = { ...(prev[targetId] || {}) };
        sheet.fields.forEach(f => {
          if (currentTargetData[f.id] === undefined || currentTargetData[f.id] === '') {
            currentTargetData[f.id] = code;
          }
        });
        return {
          ...prev,
          [targetId]: currentTargetData
        };
      });
    } else if (status === 'present') {
      // Revert any fields that were 'A' or 'D' back to empty
      setData(prev => {
        const currentTargetData = { ...(prev[targetId] || {}) };
        sheet.fields.forEach(f => {
          if (currentTargetData[f.id] === 'A' || currentTargetData[f.id] === 'D') {
            delete currentTargetData[f.id];
          }
        });
        return {
          ...prev,
          [targetId]: currentTargetData
        };
      });
    }
  };

  const handleToggleNoGear = (targetId: string) => {
    setStudentNoGear(prev => ({
      ...prev,
      [targetId]: !prev[targetId]
    }));
  };

  // Quick field value setter for 'A' or 'D'
  const handleSetFieldCode = (targetId: string, fieldId: string, code: 'A' | 'D') => {
    setData(prev => {
      const current = prev[targetId]?.[fieldId];
      const nextVal = current === code ? '' : code;
      return {
        ...prev,
        [targetId]: {
          ...(prev[targetId] || {}),
          [fieldId]: nextVal
        }
      };
    });
  };

  const handleCounterChange = (targetId: string, fieldId: string, delta: number) => {
    setData(prev => {
      const targetData = prev[targetId] || {};
      const current = targetData[fieldId];
      const baseNum = (typeof current === 'number') ? current : 0;
      return {
        ...prev,
        [targetId]: {
          ...targetData,
          [fieldId]: Math.max(0, baseNum + delta)
        }
      };
    });
  };

  const handleNumberChange = (targetId: string, fieldId: string, value: string) => {
    const raw = value.trim().toUpperCase();
    if (raw === 'A' || raw === 'ABS') {
      setData(prev => ({
        ...prev,
        [targetId]: { ...(prev[targetId] || {}), [fieldId]: 'A' }
      }));
      return;
    }
    if (raw === 'D' || raw === 'DISP') {
      setData(prev => ({
        ...prev,
        [targetId]: { ...(prev[targetId] || {}), [fieldId]: 'D' }
      }));
      return;
    }
    if (raw === '') {
      setData(prev => ({
        ...prev,
        [targetId]: { ...(prev[targetId] || {}), [fieldId]: '' }
      }));
      return;
    }

    const num = parseFloat(value.replace(',', '.'));
    setData(prev => ({
      ...prev,
      [targetId]: {
        ...(prev[targetId] || {}),
        [fieldId]: isNaN(num) ? value : num
      }
    }));
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
        status: studentStatus[targetId] || 'present',
        noGear: !!studentNoGear[targetId],
        bilan: bilans[targetId] || '',
        perspectives: perspectives[targetId] || '',
        timestamp: Date.now()
      });
    });

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setData({});
      setStudentStatus({});
      setStudentNoGear({});
      setBilans({});
      setPerspectives({});
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

  // Target selection screen
  if (!isObserving) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-blue-600 text-white p-4 shadow-md sticky top-0 z-10">
          <h1 className="font-bold text-lg">{sheet.name}</h1>
          <p className="text-blue-100 text-sm">{cls.name} • {session.name}</p>
        </header>

        <main className="flex-1 p-4 max-w-lg mx-auto w-full space-y-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <label className="block text-sm font-bold text-slate-800 mb-4">
              {sheet.isMultiStudent ? 'Qui observez-vous ? (Sélectionnez les élèves)' : 'Qui observez-vous ?'}
            </label>
            
            {sheet.isMultiStudent ? (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {cls.teams && cls.teams.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Équipes</h3>
                    <div className="space-y-2">
                      {cls.teams.map(t => (
                        <label key={t.id} className="flex items-center p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-600 mr-3"
                            checked={selectedTargets.includes(t.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTargets(prev => [...prev, t.id]);
                              } else {
                                setSelectedTargets(prev => prev.filter(id => id !== t.id));
                              }
                            }}
                          />
                          <span className="font-bold text-slate-800">Équipe : {t.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Élèves</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {cls.students.map(s => (
                      <label key={s.id} className="flex items-center p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-600 mr-3"
                          checked={selectedTargets.includes(s.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTargets(prev => [...prev, s.id]);
                            } else {
                              setSelectedTargets(prev => prev.filter(id => id !== s.id));
                            }
                          }}
                        />
                        <span className="font-medium text-slate-800 text-sm truncate">{s.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <select 
                className="w-full h-14 rounded-xl border-2 border-slate-200 bg-white px-4 text-base font-semibold text-slate-800 focus:border-blue-600 focus:outline-none"
                value={selectedTargets[0] || ''}
                onChange={(e) => setSelectedTargets(e.target.value ? [e.target.value] : [])}
              >
                <option value="">-- Choisir un élève ou une équipe --</option>
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
              className="w-full mt-6 h-14 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md"
              disabled={selectedTargets.length === 0}
              onClick={() => setIsObserving(true)}
            >
              Commencer l'observation ({selectedTargets.length})
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Active observation form
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-blue-600 text-white p-4 shadow-md sticky top-0 z-20 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">{sheet.name}</h1>
          <p className="text-blue-100 text-xs">{cls.name} • {session.name}</p>
        </div>
        <button 
          onClick={() => setIsObserving(false)} 
          className="text-blue-100 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-700/60"
        >
          Changer élèves
        </button>
      </header>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-6">
        {selectedTargets.map(targetId => {
          const student = cls.students.find(s => s.id === targetId);
          const team = cls.teams?.find(t => t.id === targetId);
          const targetName = student?.name || (team ? `Équipe : ${team.name}` : 'Inconnu');
          const studentData = data[targetId] || {};
          const currentStatus = studentStatus[targetId] || 'present';
          const hasNoGear = !!studentNoGear[targetId];
          
          return (
            <div key={targetId} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-5 relative overflow-hidden">
              {/* Target Header */}
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{targetName}</h2>
                  <p className="text-xs text-slate-400">Relevé de séance</p>
                </div>

                {/* Attendance & Equipment status bar */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => handleSetStudentStatus(targetId, 'present')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        currentStatus === 'present'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Présent
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetStudentStatus(targetId, 'absent')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        currentStatus === 'absent'
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-red-700'
                      }`}
                      title="Marquer comme Absent (A)"
                    >
                      Absent (A)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetStudentStatus(targetId, 'dispense')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        currentStatus === 'dispense'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-amber-700'
                      }`}
                      title="Marquer comme Dispensé (D)"
                    >
                      Dispensé (D)
                    </button>
                  </div>

                  {/* Gear toggle */}
                  <label 
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                      hasNoGear 
                        ? 'bg-rose-100 border-rose-300 text-rose-800' 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={hasNoGear}
                      onChange={() => handleToggleNoGear(targetId)}
                      className="rounded text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
                    />
                    <span>Sans matériel</span>
                  </label>
                </div>
              </div>

              {/* Status Alert notice if not present */}
              {currentStatus === 'absent' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-800">
                  <div className="flex items-center gap-2">
                    <UserX className="w-4 h-4 text-red-600" />
                    <span>Élève noté <strong>ABSENT (A)</strong> pour cette séance.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...(data[targetId] || {}) };
                      sheet.fields.forEach(f => { updated[f.id] = 'A'; });
                      setData(prev => ({ ...prev, [targetId]: updated }));
                    }}
                    className="font-bold underline text-red-700 hover:text-red-900"
                  >
                    Remplir tous les critères avec 'A'
                  </button>
                </div>
              )}

              {currentStatus === 'dispense' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-800">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>Élève noté <strong>DISPENSÉ (D)</strong> médicalement.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...(data[targetId] || {}) };
                      sheet.fields.forEach(f => { updated[f.id] = 'D'; });
                      setData(prev => ({ ...prev, [targetId]: updated }));
                    }}
                    className="font-bold underline text-amber-700 hover:text-amber-900"
                  >
                    Remplir tous les critères avec 'D'
                  </button>
                </div>
              )}

              {/* Observation Fields */}
              <div className="space-y-6">
                {sheet.fields.map(field => {
                  const val = studentData[field.id];
                  const isA = val === 'A' || val === 'a';
                  const isD = val === 'D' || val === 'd';

                  return (
                    <div key={field.id} className="flex flex-col gap-2 p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-slate-800 text-sm">{field.label}</div>
                        
                        {/* Quick A and D buttons for EVERY field */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSetFieldCode(targetId, field.id, 'A')}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                              isA 
                                ? 'bg-red-600 text-white border-red-600 shadow-xs' 
                                : 'bg-white text-slate-500 border-slate-200 hover:border-red-300 hover:text-red-600'
                            }`}
                            title="Absent sur ce critère"
                          >
                            A
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetFieldCode(targetId, field.id, 'D')}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                              isD 
                                ? 'bg-amber-600 text-white border-amber-600 shadow-xs' 
                                : 'bg-white text-slate-500 border-slate-200 hover:border-amber-300 hover:text-amber-600'
                            }`}
                            title="Dispensé sur ce critère"
                          >
                            D
                          </button>
                        </div>
                      </div>

                      {/* Display special badge if A or D */}
                      {isA ? (
                        <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-bold text-sm">
                          <span className="flex items-center gap-2">
                            <UserX className="w-4 h-4 text-red-600" />
                            ABSENT (A)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSetFieldCode(targetId, field.id, 'A')}
                            className="text-xs font-normal underline text-red-600 hover:text-red-800"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : isD ? (
                        <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 font-bold text-sm">
                          <span className="flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-amber-600" />
                            DISPENSÉ (D)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSetFieldCode(targetId, field.id, 'D')}
                            className="text-xs font-normal underline text-amber-600 hover:text-amber-800"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* Standard field controls */}
                          {field.type === 'counter' && (
                            <div className="flex items-center justify-between gap-4 bg-white p-2 rounded-xl border border-slate-200">
                              <button 
                                onClick={() => handleCounterChange(targetId, field.id, -1)}
                                className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center active:bg-slate-200 touch-manipulation shadow-xs"
                              >
                                <Minus className="w-7 h-7" />
                              </button>
                              <div className="text-3xl font-bold font-mono text-slate-800">
                                {typeof studentData[field.id] === 'number' ? studentData[field.id] : 0}
                              </div>
                              <button 
                                onClick={() => handleCounterChange(targetId, field.id, 1)}
                                className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center active:bg-blue-200 touch-manipulation shadow-xs"
                              >
                                <Plus className="w-7 h-7" />
                              </button>
                            </div>
                          )}

                          {field.type === 'boolean' && (
                            <button
                              onClick={() => handleToggle(targetId, field.id)}
                              className={`w-full py-3.5 rounded-xl font-bold text-base transition-colors ${
                                studentData[field.id] ? 'bg-emerald-500 text-white' : 'bg-white text-slate-600 border border-slate-200'
                              }`}
                            >
                              {studentData[field.id] ? 'OUI (Validé)' : 'NON (Non validé)'}
                            </button>
                          )}

                          {field.type === 'rating' && (
                            <div className="flex items-center justify-center gap-2 h-14 bg-white rounded-xl border border-slate-200">
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
                                  className="p-1.5 transition-transform hover:scale-110 focus:outline-none"
                                >
                                  <Star 
                                    className={`w-8 h-8 ${
                                      (studentData[field.id] as number || 0) >= star
                                        ? 'fill-amber-400 text-amber-400' 
                                        : 'fill-transparent text-slate-300'
                                    }`} 
                                  />
                                </button>
                              ))}
                            </div>
                          )}

                          {field.type === 'calculated_target' && (() => {
                            const sourceId = field.options?.sourceFieldId;
                            const multiplier = field.options?.multiplier || 1;
                            const offset = field.options?.offset || 0;
                            
                            const pastObs = observations
                              .filter(o => o.targetId === targetId && o.sessionId !== session.id && o.data[sourceId] !== undefined)
                              .sort((a, b) => b.timestamp - a.timestamp);
                            
                            const pastValue = pastObs.length > 0 ? (pastObs[0].data[sourceId] as number) : null;
                            const targetValue = pastValue !== null ? (pastValue * multiplier) + offset : null;

                            return (
                              <div className="flex flex-col items-center gap-3">
                                {targetValue !== null ? (
                                  <div className="bg-indigo-50 text-indigo-800 px-4 py-2 rounded-lg font-bold w-full text-center border border-indigo-100 flex flex-col">
                                    <span className="text-xs uppercase tracking-wider text-indigo-500 mb-1">Cible calculée</span>
                                    <span className="text-2xl">{targetValue % 1 !== 0 ? targetValue.toFixed(1) : targetValue}</span>
                                  </div>
                                ) : (
                                  <div className="bg-slate-50 text-slate-500 px-4 py-2 rounded-lg text-sm w-full text-center border border-slate-100">
                                    Aucune donnée passée pour calculer la cible.
                                  </div>
                                )}
                                <input 
                                  type="text"
                                  inputMode="decimal"
                                  className="w-full h-14 text-center text-2xl font-bold font-mono rounded-xl border-2 border-slate-200 focus:border-indigo-600 focus:outline-none bg-white"
                                  placeholder="Résultat final ou 'A' / 'D'..."
                                  value={studentData[field.id] === undefined ? '' : studentData[field.id]}
                                  onChange={(e) => handleNumberChange(targetId, field.id, e.target.value)}
                                />
                              </div>
                            );
                          })()}

                          {field.type === 'number' && (
                            <div className="flex flex-col items-center gap-2">
                              <input 
                                type="text"
                                inputMode="decimal"
                                className="w-full h-14 text-center text-2xl font-bold font-mono rounded-xl border-2 border-slate-200 focus:border-blue-600 focus:outline-none bg-white"
                                placeholder="Saisir valeur ou 'A' / 'D'..."
                                value={studentData[field.id] === undefined ? '' : studentData[field.id]}
                                onChange={(e) => handleNumberChange(targetId, field.id, e.target.value)}
                              />
                            </div>
                          )}

                          {field.type === 'speed_30s' && (
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-full relative">
                                <input 
                                  type="text"
                                  inputMode="decimal"
                                  className="w-full h-14 text-center text-2xl font-bold font-mono rounded-xl border-2 border-slate-200 focus:border-blue-600 focus:outline-none pr-12 bg-white"
                                  placeholder="Distance (m) ou 'A' / 'D'"
                                  value={studentData[field.id] === undefined ? '' : studentData[field.id]}
                                  onChange={(e) => handleNumberChange(targetId, field.id, e.target.value)}
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">m</span>
                              </div>
                              {typeof studentData[field.id] === 'number' && (
                                <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg font-bold w-full text-center text-base">
                                  Vitesse : {((studentData[field.id] as number) * 0.12).toFixed(1)} km/h
                                </div>
                              )}
                            </div>
                          )}

                          {field.type === 'distance_speed' && (
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-full relative">
                                <input 
                                  type="text"
                                  inputMode="decimal"
                                  className="w-full h-14 text-center text-2xl font-bold font-mono rounded-xl border-2 border-slate-200 focus:border-blue-600 focus:outline-none pr-12 bg-white"
                                  placeholder="Distance (m) ou 'A' / 'D'"
                                  value={studentData[field.id] === undefined ? '' : studentData[field.id]}
                                  onChange={(e) => handleNumberChange(targetId, field.id, e.target.value)}
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">m</span>
                              </div>
                              {typeof studentData[field.id] === 'number' && field.options?.targetDuration && (
                                <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg font-bold w-full text-center text-base">
                                  Vitesse : {(((studentData[field.id] as number) / field.options.targetDuration) * 3.6).toFixed(1)} km/h
                                </div>
                              )}
                            </div>
                          )}

                          {field.type === 'time_mm_ss' && (() => {
                            const timeVal = studentData[field.id];
                            const currentSeconds = (typeof timeVal === 'object' && timeVal) ? (timeVal.minutes || 0) * 60 + (timeVal.seconds || 0) : 0;
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
                                  <div className="bg-indigo-100 text-indigo-800 px-4 py-2 rounded-lg font-bold w-full text-center text-sm mt-1">
                                    Temps effectif : {percent}%
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {field.type === 'time_duration' && (() => {
                            const timeVal = studentData[field.id];
                            const units = field.options?.units || ['minutes', 'seconds'];
                            const targetSeconds = field.options?.targetDuration;

                            return (
                              <TimeDurationInput
                                value={timeVal}
                                units={units}
                                targetDurationSeconds={targetSeconds}
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
                        </>
                      )}
                    </div>
                  );
                })}

                {/* Bilan and Perspectives */}
                <div className="pt-6 space-y-4 border-t border-slate-100 mt-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                      Bilan de l'observation
                    </label>
                    <textarea 
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs focus:bg-white focus:border-blue-600 focus:outline-none min-h-[80px]"
                      placeholder="Analyse des réussites, progrès ou points à travailler..."
                      value={bilans[targetId] || ''}
                      onChange={e => setBilans(prev => ({ ...prev, [targetId]: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                      Perspectives
                    </label>
                    <textarea 
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs focus:bg-white focus:border-blue-600 focus:outline-none min-h-[80px]"
                      placeholder="Objectifs pour la prochaine séance..."
                      value={perspectives[targetId] || ''}
                      onChange={e => setPerspectives(prev => ({ ...prev, [targetId]: e.target.value }))}
                    />
                  </div>
                </div>

              </div>
            </div>
          );
        })}

        <Button 
          size="lg" 
          className="w-full h-16 text-base font-bold rounded-xl shadow-lg mt-6 mb-12 bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handleSubmit}
        >
          Valider et enregistrer {selectedTargets.length > 1 ? `(${selectedTargets.length} observations)` : ''}
        </Button>
      </main>
    </div>
  );
}
