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
  AlertCircle,
  Search,
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Users,
  MessageSquareQuote
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
  const { 
    sessions, 
    sheets, 
    activities, 
    classes, 
    addObservation, 
    saveStudentFullObservation,
    observations, 
    loaded, 
    createDefaultSheetForActivity 
  } = useStore();
  
  const session = sessions.find(s => s.id === sessionId);
  const activity = activities.find(a => a.id === session?.activityId);
  const cls = classes.find(c => c.id === activity?.classId);
  const activitySheets = sheets.filter(s => s.activityId === session?.activityId);

  const [selectedSheetId, setSelectedSheetId] = useState<string>(session?.sheetId || '');

  useEffect(() => {
    if (session?.sheetId && sheets.some(s => s.id === session.sheetId)) {
      setSelectedSheetId(session.sheetId);
    } else if (activitySheets.length > 0 && !selectedSheetId) {
      setSelectedSheetId(activitySheets[0].id);
    }
  }, [session?.sheetId, activitySheets.length]);

  const sheet = sheets.find(s => s.id === selectedSheetId) || 
    (session?.sheetId ? sheets.find(s => s.id === session.sheetId) : undefined) || 
    activitySheets[0];

  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [isObserving, setIsObserving] = useState(false);
  
  // Active student index when multiple students are observed
  const [activeTargetIndex, setActiveTargetIndex] = useState(0);

  // Search filter for student selection
  const [studentSearch, setStudentSearch] = useState('');
  
  // Data per target and field
  const [data, setData] = useState<Record<string, Record<string, any>>>({});
  // Attendance status per student: 'present' | 'absent' | 'dispense'
  const [studentStatus, setStudentStatus] = useState<Record<string, StudentSessionStatus>>({});
  // Equipment forget toggle per student
  const [studentNoGear, setStudentNoGear] = useState<Record<string, boolean>>({});

  const [bilans, setBilans] = useState<Record<string, string>>({});
  const [perspectives, setPerspectives] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // Quick feedback tags for Bilan
  const QUICK_BILAN_TAGS = [
    'Très bon engagement',
    'Consignes respectées',
    'Progrès technique',
    'Effort régulier',
    'Bonne écoute',
    'Attention sécurité',
    'Rythme à adapter',
    'Régularité à stabiliser'
  ];

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

  // Loading state
  if (!loaded) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold">Chargement de la séance EPS...</h2>
        <p className="text-slate-400 text-sm mt-1">Connexion à la base de données en cours...</p>
      </div>
    );
  }

  // Session missing state
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Séance introuvable</h1>
        <p className="text-slate-400 text-sm max-w-sm mb-6">
          Cette séance n'a pas été trouvée. Demandez à votre enseignant de vérifier le QR Code ou le lien.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors"
        >
          Actualiser la page
        </button>
      </div>
    );
  }

  // Activity or Class missing
  if (!cls || !activity) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Configuration de classe incomplète</h1>
        <p className="text-slate-400 text-sm max-w-sm mb-6">
          L'activité ou la classe liée à cette séance n'est pas accessible.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
        >
          Actualiser
        </button>
      </div>
    );
  }

  // No sheet in activity yet
  if (!sheet) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Situation d'observation à initialiser</h1>
        <p className="text-slate-300 text-sm max-w-md mb-6">
          Aucune fiche d'observation n'est encore configurée pour ce cycle ({activity.name}). Vous pouvez l'initialiser en un clic :
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button
            size="lg"
            onClick={() => {
              const newId = createDefaultSheetForActivity(activity.id);
              setSelectedSheetId(newId);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            Créer la fiche d'observation (1 clic)
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => window.location.reload()}
            className="text-slate-300 border-slate-700 hover:bg-slate-800"
          >
            Actualiser
          </Button>
        </div>
      </div>
    );
  }

  // Handlers for attendance
  const handleSetStudentStatus = (targetId: string, status: StudentSessionStatus) => {
    setStudentStatus(prev => ({
      ...prev,
      [targetId]: status
    }));

    if (status === 'absent' || status === 'dispense') {
      const code = status === 'absent' ? 'A' : 'D';
      setData(prev => {
        const currentTargetData = { ...(prev[targetId] || {}) };
        (sheet.fields || []).forEach(f => {
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
      setData(prev => {
        const currentTargetData = { ...(prev[targetId] || {}) };
        (sheet.fields || []).forEach(f => {
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

  const handleQuickNudgeNumber = (targetId: string, fieldId: string, delta: number) => {
    setData(prev => {
      const targetData = prev[targetId] || {};
      const current = targetData[fieldId];
      const baseNum = typeof current === 'number' ? current : 0;
      const nextVal = Math.max(0, Math.round((baseNum + delta) * 10) / 10);
      return {
        ...prev,
        [targetId]: {
          ...targetData,
          [fieldId]: nextVal
        }
      };
    });
  };

  const handleSetBoolean = (targetId: string, fieldId: string, val: boolean) => {
    setData(prev => {
      const targetData = prev[targetId] || {};
      return {
        ...prev,
        [targetId]: {
          ...targetData,
          [fieldId]: val
        }
      };
    });
  };

  const handleAddBilanTag = (targetId: string, tag: string) => {
    setBilans(prev => {
      const current = prev[targetId] || '';
      if (!current.trim()) return { ...prev, [targetId]: tag };
      if (current.includes(tag)) return prev;
      return { ...prev, [targetId]: `${current}. ${tag}` };
    });
  };

  const handleSubmit = async () => {
    if (selectedTargets.length === 0 || !sheet) return;
    
    for (const targetId of selectedTargets) {
      await saveStudentFullObservation(
        session.id,
        targetId,
        data[targetId] || {},
        {
          status: studentStatus[targetId] || 'present',
          noGear: !!studentNoGear[targetId],
          bilan: bilans[targetId] || '',
          perspectives: perspectives[targetId] || ''
        }
      );
    }

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
      setActiveTargetIndex(0);
    }, 1800);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-emerald-600 text-white flex flex-col items-center justify-center p-6 animate-in zoom-in duration-300 text-center">
        <CheckCircle2 className="w-20 h-20 mb-4 stroke-[2.5]" />
        <h1 className="text-3xl font-extrabold tracking-tight">Observation enregistrée !</h1>
        <p className="text-emerald-100 text-sm mt-2">Merci. Les données sont synchronisées en temps réel.</p>
      </div>
    );
  }

  // Filtered lists for selection
  const filteredStudents = (cls.students || []).filter(s => 
    s.name.toLowerCase().includes(studentSearch.toLowerCase())
  );
  const filteredTeams = (cls.teams || []).filter(t =>
    t.name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  // STEP 1: TARGET SELECTION SCREEN (HIGHLY OPTIMIZED FOR MOBILE)
  if (!isObserving) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
        {/* Sticky Mobile Header */}
        <header className="bg-indigo-600 text-white px-4 py-3.5 shadow-sm sticky top-0 z-30">
          <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-indigo-200 text-[11px] font-semibold">
                <span>{cls.name}</span>
                <span>•</span>
                <span className="truncate">{session.name}</span>
              </div>
              <h1 className="font-bold text-base text-white truncate">{sheet.name}</h1>
            </div>

            {activitySheets.length > 1 && (
              <select
                value={sheet.id}
                onChange={e => setSelectedSheetId(e.target.value)}
                className="bg-indigo-700/90 text-white text-xs font-bold rounded-xl px-2.5 py-1.5 border border-indigo-500/40 focus:outline-none shrink-0"
              >
                {activitySheets.map(s => (
                  <option key={s.id} value={s.id} className="text-slate-900 bg-white">
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </header>

        {/* Main Selection Area */}
        <main className="flex-1 p-4 max-w-lg mx-auto w-full space-y-4">
          <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {sheet.isMultiStudent ? 'Qui observez-vous ?' : 'Sélectionnez l\'élève à observer'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {sheet.isMultiStudent 
                  ? 'Cochez un ou plusieurs élèves ou équipes pour cet atelier.' 
                  : 'Touchez le nom de l\'élève pour lancer la saisie.'}
              </p>
            </div>

            {/* Instant Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                placeholder="Rechercher un prénom ou nom..."
                className="w-full h-11 pl-10 pr-9 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
              {studentSearch && (
                <button
                  type="button"
                  onClick={() => setStudentSearch('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Multi-student Quick action bar */}
            {sheet.isMultiStudent && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-slate-600">
                  {selectedTargets.length} sélectionné(s)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = [
                        ...(cls.teams || []).map(t => t.id),
                        ...(cls.students || []).map(s => s.id)
                      ];
                      setSelectedTargets(allIds);
                    }}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-lg bg-indigo-50"
                  >
                    Tout cocher
                  </button>
                  {selectedTargets.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedTargets([])}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg bg-slate-100"
                    >
                      Effacer
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Touch-Friendly Student List / Grid */}
            <div className="space-y-2 max-h-[58vh] overflow-y-auto pr-1">
              {/* Teams list */}
              {filteredTeams.length > 0 && (
                <div className="space-y-1.5 pb-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block px-1">
                    Équipes ({filteredTeams.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredTeams.map(t => {
                      const isSelected = selectedTargets.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            if (sheet.isMultiStudent) {
                              setSelectedTargets(prev => 
                                isSelected ? prev.filter(id => id !== t.id) : [...prev, t.id]
                              );
                            } else {
                              setSelectedTargets([t.id]);
                            }
                          }}
                          className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all active:scale-[0.98] min-h-[52px] ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-600 text-indigo-950 font-bold shadow-xs'
                              : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                              isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              ÉQ
                            </div>
                            <span className="text-sm font-bold truncate">Équipe : {t.name}</span>
                          </div>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                            isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Students list */}
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block px-1 pt-1">
                Élèves ({filteredStudents.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredStudents.map((s) => {
                  const isSelected = selectedTargets.includes(s.id);
                  const initial = s.name.charAt(0).toUpperCase();

                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        if (sheet.isMultiStudent) {
                          setSelectedTargets(prev => 
                            isSelected ? prev.filter(id => id !== s.id) : [...prev, s.id]
                          );
                        } else {
                          setSelectedTargets([s.id]);
                        }
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all active:scale-[0.98] min-h-[52px] ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-950 font-bold shadow-xs ring-1 ring-indigo-600'
                          : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {initial}
                        </div>
                        <span className="text-sm truncate font-semibold">{s.name}</span>
                      </div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 transition-all ${
                        isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <div className="p-6 text-center text-xs text-slate-500">
                    Aucun élève trouvé pour « {studentSearch} ».
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Sticky Thumb-Zone Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-lg">
          <div className="max-w-lg mx-auto">
            <Button
              size="lg"
              disabled={selectedTargets.length === 0}
              onClick={() => {
                setActiveTargetIndex(0);
                setIsObserving(true);
              }}
              className="w-full h-13 text-base font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <span>Commencer l'observation</span>
              {selectedTargets.length > 0 && (
                <span className="bg-indigo-500 text-white px-2 py-0.5 rounded-full text-xs">
                  {selectedTargets.length}
                </span>
              )}
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: ACTIVE OBSERVATION SCREEN (TOUCH-OPTIMIZED FORM)
  const currentTargetId = selectedTargets[activeTargetIndex] || selectedTargets[0];
  const student = cls.students.find(s => s.id === currentTargetId);
  const team = cls.teams?.find(t => t.id === currentTargetId);
  const targetName = student?.name || (team ? `Équipe : ${team.name}` : 'Inconnu');
  const studentData = data[currentTargetId] || {};
  const currentStatus = studentStatus[currentTargetId] || 'present';
  const hasNoGear = !!studentNoGear[currentTargetId];

  // Count answered fields for this student
  const answeredFieldsCount = (sheet.fields || []).filter(f => {
    const val = studentData[f.id];
    return val !== undefined && val !== '' && val !== null;
  }).length;
  const totalFields = (sheet.fields || []).length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col pb-28">
      {/* Sticky Mobile Header */}
      <header className="bg-indigo-600 text-white px-4 py-3 shadow-sm sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[11px] text-indigo-200 font-semibold block truncate">
              {cls.name} • {session.name}
            </span>
            <h1 className="font-bold text-base text-white truncate">{sheet.name}</h1>
          </div>

          <button
            type="button"
            onClick={() => setIsObserving(false)}
            className="text-xs font-bold text-indigo-100 bg-indigo-700 hover:bg-indigo-800 px-3 py-1.5 rounded-xl border border-indigo-500/40 shrink-0"
          >
            Changer élèves
          </button>
        </div>

        {/* Multi-student Horizontal Thumb-Switcher Tabs */}
        {selectedTargets.length > 1 && (
          <div className="max-w-2xl mx-auto mt-2 pt-2 border-t border-indigo-500/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {selectedTargets.map((id, idx) => {
              const st = cls.students.find(s => s.id === id);
              const tm = cls.teams?.find(t => t.id === id);
              const name = st?.name.split(' ')[0] || tm?.name || `Élève ${idx + 1}`;
              const isSelected = idx === activeTargetIndex;
              const targetAnswered = (sheet.fields || []).filter(f => (data[id] || {})[f.id] !== undefined).length;
              const isComplete = totalFields > 0 && targetAnswered >= totalFields;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTargetIndex(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all shrink-0 ${
                    isSelected
                      ? 'bg-white text-indigo-900 shadow-sm'
                      : 'bg-indigo-700/60 text-indigo-100 hover:bg-indigo-700'
                  }`}
                >
                  <span>{name}</span>
                  {isComplete ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 fill-emerald-100" />
                  ) : targetAnswered > 0 ? (
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Single-Student Active View */}
      <main className="flex-1 p-3 sm:p-4 max-w-2xl mx-auto w-full space-y-4">
        {/* Student Profile & Attendance Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-extrabold text-sm shrink-0">
                {targetName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">{targetName}</h2>
                <span className="text-[11px] text-slate-500 font-medium">
                  Critères complétés : <strong>{answeredFieldsCount} / {totalFields}</strong>
                </span>
              </div>
            </div>

            {selectedTargets.length > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={activeTargetIndex === 0}
                  onClick={() => setActiveTargetIndex(prev => Math.max(0, prev - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 flex items-center justify-center text-slate-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-600 px-1">
                  {activeTargetIndex + 1}/{selectedTargets.length}
                </span>
                <button
                  type="button"
                  disabled={activeTargetIndex >= selectedTargets.length - 1}
                  onClick={() => setActiveTargetIndex(prev => Math.min(selectedTargets.length - 1, prev + 1))}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 flex items-center justify-center text-slate-700"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Large Thumb-Friendly Attendance Controls */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => handleSetStudentStatus(currentTargetId, 'present')}
              className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 border transition-all active:scale-95 ${
                currentStatus === 'present'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>Présent</span>
            </button>

            <button
              type="button"
              onClick={() => handleSetStudentStatus(currentTargetId, 'absent')}
              className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 border transition-all active:scale-95 ${
                currentStatus === 'absent'
                  ? 'bg-red-600 text-white border-red-600 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>Absent (A)</span>
            </button>

            <button
              type="button"
              onClick={() => handleSetStudentStatus(currentTargetId, 'dispense')}
              className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 border transition-all active:scale-95 ${
                currentStatus === 'dispense'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>Dispensé (D)</span>
            </button>

            <button
              type="button"
              onClick={() => handleToggleNoGear(currentTargetId)}
              className={`py-2 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 border transition-all active:scale-95 ${
                hasNoGear
                  ? 'bg-rose-100 text-rose-800 border-rose-300 shadow-xs'
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>👟 Sans tenue</span>
            </button>
          </div>

          {/* Quick Notice if Absent or Dispensé */}
          {currentStatus === 'absent' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-800">
              <span className="font-semibold">Élève noté ABSENT (A) pour la séance</span>
              <button
                type="button"
                onClick={() => handleSetStudentStatus(currentTargetId, 'present')}
                className="font-bold underline text-red-700 hover:text-red-900"
              >
                Rétablir Présent
              </button>
            </div>
          )}
          {currentStatus === 'dispense' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-800">
              <span className="font-semibold">Élève noté DISPENSÉ (D)</span>
              <button
                type="button"
                onClick={() => handleSetStudentStatus(currentTargetId, 'present')}
                className="font-bold underline text-amber-700 hover:text-amber-900"
              >
                Rétablir Présent
              </button>
            </div>
          )}
        </div>

        {/* Observation Criteria Fields (Touch-Optimized) */}
        <div className="space-y-3">
          {(sheet.fields || []).map(field => {
            const val = studentData[field.id];
            const isA = val === 'A' || val === 'a';
            const isD = val === 'D' || val === 'd';

            return (
              <div 
                key={field.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3"
              >
                {/* Field Header */}
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">{field.label}</h3>
                    {field.options?.units && (
                      <span className="text-[11px] font-mono text-slate-400">
                        Unité : {field.options.units}
                      </span>
                    )}
                  </div>

                  {/* Quick A and D tags */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSetFieldCode(currentTargetId, field.id, 'A')}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors ${
                        isA 
                          ? 'bg-red-600 text-white border-red-600' 
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-red-600'
                      }`}
                    >
                      A
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetFieldCode(currentTargetId, field.id, 'D')}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors ${
                        isD 
                          ? 'bg-amber-600 text-white border-amber-600' 
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-amber-600'
                      }`}
                    >
                      D
                    </button>
                  </div>
                </div>

                {/* State: Absent or Dispense in this field */}
                {isA ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs font-bold text-red-700">
                    <span>ABSENT (A) SUR CE CRITÈRE</span>
                    <button
                      type="button"
                      onClick={() => handleSetFieldCode(currentTargetId, field.id, 'A')}
                      className="text-red-500 underline text-[11px] font-semibold"
                    >
                      Effacer
                    </button>
                  </div>
                ) : isD ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs font-bold text-amber-700">
                    <span>DISPENSÉ (D) SUR CE CRITÈRE</span>
                    <button
                      type="button"
                      onClick={() => handleSetFieldCode(currentTargetId, field.id, 'D')}
                      className="text-amber-500 underline text-[11px] font-semibold"
                    >
                      Effacer
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* TYPE: COUNTER */}
                    {field.type === 'counter' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleCounterChange(currentTargetId, field.id, -1)}
                            className="w-14 h-14 rounded-xl bg-white border border-slate-200 text-slate-700 font-extrabold text-2xl flex items-center justify-center active:scale-90 active:bg-slate-100 transition-all shadow-xs shrink-0"
                          >
                            <Minus className="w-6 h-6 stroke-[3]" />
                          </button>
                          
                          <div className="text-3xl font-extrabold font-mono text-slate-900 tracking-tight text-center">
                            {typeof val === 'number' ? val : 0}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCounterChange(currentTargetId, field.id, 1)}
                            className="w-14 h-14 rounded-xl bg-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center active:scale-90 active:bg-indigo-700 transition-all shadow-md shrink-0"
                          >
                            <Plus className="w-6 h-6 stroke-[3]" />
                          </button>
                        </div>

                        {/* Quick increment chips */}
                        <div className="flex items-center justify-center gap-1.5 pt-0.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Raccourcis :</span>
                          {[1, 2, 5].map(step => (
                            <button
                              key={step}
                              type="button"
                              onClick={() => handleCounterChange(currentTargetId, field.id, step)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors active:scale-95 border border-indigo-200/60"
                            >
                              +{step}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* TYPE: BOOLEAN */}
                    {field.type === 'boolean' && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleSetBoolean(currentTargetId, field.id, false)}
                          className={`h-12 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all active:scale-95 ${
                            val === false
                              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <X className="w-4 h-4 stroke-[2.5]" />
                          <span>Non validé</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSetBoolean(currentTargetId, field.id, true)}
                          className={`h-12 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all active:scale-95 ${
                            val === true
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Validé (OUI)</span>
                        </button>
                      </div>
                    )}

                    {/* TYPE: RATING (1-5) */}
                    {field.type === 'rating' && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-5 gap-1.5">
                          {[1, 2, 3, 4, 5].map(starNum => {
                            const isChosen = Number(val) >= starNum;
                            return (
                              <button
                                key={starNum}
                                type="button"
                                onClick={() => {
                                  setData(prev => ({
                                    ...prev,
                                    [currentTargetId]: {
                                      ...(prev[currentTargetId] || {}),
                                      [field.id]: starNum
                                    }
                                  }));
                                }}
                                className={`h-14 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
                                  isChosen
                                    ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                                }`}
                              >
                                <Star className={`w-5 h-5 ${isChosen ? 'fill-white' : ''}`} />
                                <span className="text-[10px] font-extrabold">{starNum}</span>
                              </button>
                            );
                          })}
                        </div>
                        {val && (
                          <div className="text-center text-xs font-bold text-slate-700">
                            Niveau {val}/5 : {
                              val === 1 ? 'À consolider' :
                              val === 2 ? 'En cours d\'acquisition' :
                              val === 3 ? 'Acquis' :
                              val === 4 ? 'Maîtrisé' : 'Expert'
                            }
                          </div>
                        )}
                      </div>
                    )}

                    {/* TYPE: SPEED_30S */}
                    {field.type === 'speed_30s' && (
                      <div className="space-y-2">
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={val !== undefined ? val : ''}
                            onChange={e => handleNumberChange(currentTargetId, field.id, e.target.value)}
                            placeholder="Distance en mètres..."
                            className="w-full h-12 text-center text-xl font-bold font-mono rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 pr-10"
                          />
                          <span className="absolute right-3.5 top-3.5 text-xs font-bold text-slate-400">m</span>
                        </div>

                        {/* Quick nudge buttons */}
                        <div className="flex items-center justify-center gap-1.5">
                          {[-10, -5, +5, +10].map(delta => (
                            <button
                              key={delta}
                              type="button"
                              onClick={() => handleQuickNudgeNumber(currentTargetId, field.id, delta)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold active:scale-95"
                            >
                              {delta > 0 ? `+${delta}m` : `${delta}m`}
                            </button>
                          ))}
                        </div>

                        {typeof val === 'number' && val > 0 && (
                          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-emerald-800 font-extrabold text-sm flex items-center justify-center gap-1.5">
                            <span>⚡</span>
                            <span>Allure calculée : {(val * 0.12).toFixed(1)} km/h</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TYPE: NUMBER, DISTANCE, CALCULATED */}
                    {(field.type === 'number' || field.type === 'distance_speed' || field.type === 'calculated_target') && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={val !== undefined ? val : ''}
                          onChange={e => handleNumberChange(currentTargetId, field.id, e.target.value)}
                          placeholder="Saisir valeur..."
                          className="w-full h-12 text-center text-xl font-bold font-mono rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        />

                        {/* Quick nudge chips */}
                        <div className="flex items-center justify-center gap-1.5">
                          {[-5, -1, +1, +5].map(delta => (
                            <button
                              key={delta}
                              type="button"
                              onClick={() => handleQuickNudgeNumber(currentTargetId, field.id, delta)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold active:scale-95"
                            >
                              {delta > 0 ? `+${delta}` : `${delta}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* TYPE: TIME_MM_SS */}
                    {field.type === 'time_mm_ss' && (
                      <TimeMmSs
                        value={val}
                        onChange={(newVal) => {
                          setData(prev => ({
                            ...prev,
                            [currentTargetId]: { ...(prev[currentTargetId] || {}), [field.id]: newVal }
                          }));
                        }}
                      />
                    )}

                    {/* TYPE: TIME_DURATION */}
                    {field.type === 'time_duration' && (
                      <TimeDurationInput
                        value={val}
                        units={field.options?.units || ['minutes', 'seconds']}
                        targetDurationSeconds={field.options?.targetDuration}
                        onChange={(newVal) => {
                          setData(prev => ({
                            ...prev,
                            [currentTargetId]: { ...(prev[currentTargetId] || {}), [field.id]: newVal }
                          }));
                        }}
                      />
                    )}

                    {/* SPECIALIZED TYPES */}
                    {field.type === 'orienteering_star' && (
                      <OrienteeringStar
                        baliseCount={field.options?.baliseCount || 10}
                        value={val || {}}
                        onChange={(newVal) => {
                          setData(prev => ({
                            ...prev,
                            [currentTargetId]: { ...(prev[currentTargetId] || {}), [field.id]: newVal }
                          }));
                        }}
                      />
                    )}

                    {field.type === 'training_log' && (
                      <TrainingLog
                        value={val}
                        onChange={(newVal) => {
                          setData(prev => ({
                            ...prev,
                            [currentTargetId]: { ...(prev[currentTargetId] || {}), [field.id]: newVal }
                          }));
                        }}
                      />
                    )}

                    {field.type === 'match_stats' && (
                      <MatchStats
                        value={val}
                        onChange={(newVal) => {
                          setData(prev => ({
                            ...prev,
                            [currentTargetId]: { ...(prev[currentTargetId] || {}), [field.id]: newVal }
                          }));
                        }}
                      />
                    )}

                    {field.type === 'artistic_rating' && (
                      <ArtisticRating
                        value={val}
                        onChange={(newVal) => {
                          setData(prev => ({
                            ...prev,
                            [currentTargetId]: { ...(prev[currentTargetId] || {}), [field.id]: newVal }
                          }));
                        }}
                      />
                    )}

                    {field.type === 'health_fitness_log' && (
                      <HealthFitnessLog
                        value={val}
                        onChange={(newVal) => {
                          setData(prev => ({
                            ...prev,
                            [currentTargetId]: { ...(prev[currentTargetId] || {}), [field.id]: newVal }
                          }));
                        }}
                      />
                    )}

                    {field.type === 'sequence_planner' && (
                      <SequencePlanner
                        value={val}
                        onChange={(newVal) => {
                          setData(prev => ({
                            ...prev,
                            [currentTargetId]: { ...(prev[currentTargetId] || {}), [field.id]: newVal }
                          }));
                        }}
                      />
                    )}

                    {field.type === 'ratio_action' && (
                      <RatioAction
                        value={val}
                        onChange={(newVal) => {
                          setData(prev => ({
                            ...prev,
                            [currentTargetId]: { ...(prev[currentTargetId] || {}), [field.id]: newVal }
                          }));
                        }}
                      />
                    )}

                    {field.type === 'performance_log' && (
                      <PerformanceLog
                        value={val}
                        onChange={(newVal) => {
                          setData(prev => ({
                            ...prev,
                            [currentTargetId]: { ...(prev[currentTargetId] || {}), [field.id]: newVal }
                          }));
                        }}
                      />
                    )}

                    {field.type === 'orienteering_log' && (
                      <OrienteeringLog
                        value={val}
                        onChange={(newVal) => {
                          setData(prev => ({
                            ...prev,
                            [currentTargetId]: { ...(prev[currentTargetId] || {}), [field.id]: newVal }
                          }));
                        }}
                      />
                    )}

                    {field.type === 'project_target' && (
                      <ProjectTarget
                        value={val}
                        onChange={(newVal) => {
                          setData(prev => ({
                            ...prev,
                            [currentTargetId]: { ...(prev[currentTargetId] || {}), [field.id]: newVal }
                          }));
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bilan & Quick EPS Comment Chips */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wide">
            <MessageSquareQuote className="w-4 h-4 text-indigo-600" />
            <span>Remarque / Bilan élève</span>
          </div>

          {/* Quick Comment Chips */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_BILAN_TAGS.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => handleAddBilanTag(currentTargetId, tag)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-semibold transition-all active:scale-95 border border-slate-200"
              >
                + {tag}
              </button>
            ))}
          </div>

          <textarea
            value={bilans[currentTargetId] || ''}
            onChange={e => setBilans(prev => ({ ...prev, [currentTargetId]: e.target.value }))}
            placeholder="Écrivez un conseil ou appuyez sur les suggestions ci-dessus..."
            rows={3}
            className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none"
          />
        </div>
      </main>

      {/* Sticky Bottom Action Bar (Thumb Zone) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          {/* Multi-student Next button or status summary */}
          <div className="text-xs">
            <span className="font-extrabold text-slate-900 block">
              {answeredFieldsCount}/{totalFields} critères
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              {selectedTargets.length > 1 ? `${activeTargetIndex + 1}/${selectedTargets.length} élèves` : 'Prêt à valider'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {selectedTargets.length > 1 && activeTargetIndex < selectedTargets.length - 1 && (
              <Button
                variant="outline"
                onClick={() => setActiveTargetIndex(prev => prev + 1)}
                className="h-12 px-3 text-xs font-bold text-slate-700 border-slate-300"
              >
                Suivant →
              </Button>
            )}

            <Button
              size="lg"
              onClick={handleSubmit}
              className="h-12 px-5 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Valider & Enregistrer</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
