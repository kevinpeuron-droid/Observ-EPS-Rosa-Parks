import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../store';
import { Button } from '../components/ui/Button';
import { 
  CheckCircle2, 
  Minus, 
  Plus, 
  Star, 
  AlertCircle,
  Search, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Users, 
  MessageSquareQuote,
  CheckCheck,
  Loader2,
  Clock,
  Sparkles,
  ArrowRight,
  ListFilter,
  BarChart3
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
import { StudentSessionStatus, ObservationField } from '../types';
import { ClassSessionOverview } from '../components/ClassSessionOverview';
import { RunningExactTime } from '../components/RunningExactTime';

export function Observe() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { 
    sessions, 
    sheets, 
    activities, 
    classes, 
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
  // Filter tab: 'all' | 'incomplete' | 'completed' | 'absent'
  const [filterTab, setFilterTab] = useState<'all' | 'incomplete' | 'completed' | 'absent'>('all');
  
  // Data per target and field (pre-loaded with previous observations)
  const [data, setData] = useState<Record<string, Record<string, any>>>({});
  // Attendance status per student: 'present' | 'absent' | 'dispense'
  const [studentStatus, setStudentStatus] = useState<Record<string, StudentSessionStatus>>({});
  // Equipment forget toggle per student
  const [studentNoGear, setStudentNoGear] = useState<Record<string, boolean>>({});

  const [bilans, setBilans] = useState<Record<string, string>>({});
  const [perspectives, setPerspectives] = useState<Record<string, string>>({});
  
  // Save status for progressive real-time feedback
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showClassOverview, setShowClassOverview] = useState(false);

  // Debounce timer ref for auto-saving typing fields
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const saveStatusTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Filter observations for this session
  const sessionObs = useMemo(() => {
    if (!session) return [];
    return observations.filter(o => o.sessionId === session.id);
  }, [session?.id, observations]);

  // Map of existing observations by targetId for quick lookup
  const obsByTarget = useMemo(() => {
    const map = new Map<string, typeof sessionObs[0]>();
    sessionObs.forEach(o => {
      map.set(o.targetId, o);
    });
    return map;
  }, [sessionObs]);

  // SYNC WITH EXISTING RECORDED OBSERVATIONS:
  // Pre-load all previous data, status, noGear, bilan and perspectives so nothing is lost!
  useEffect(() => {
    if (!session) return;
    
    const initialStatus: Record<string, StudentSessionStatus> = {};
    const initialNoGear: Record<string, boolean> = {};
    const initialData: Record<string, Record<string, any>> = {};
    const initialBilans: Record<string, string> = {};
    const initialPerspectives: Record<string, string> = {};

    sessionObs.forEach(o => {
      if (o.status) initialStatus[o.targetId] = o.status;
      if (o.noGear !== undefined) initialNoGear[o.targetId] = o.noGear;
      if (o.data && Object.keys(o.data).length > 0) {
        initialData[o.targetId] = { ...o.data };
      }
      if (o.bilan) initialBilans[o.targetId] = o.bilan;
      if (o.perspectives) initialPerspectives[o.targetId] = o.perspectives;
    });

    setStudentStatus(prev => ({ ...initialStatus, ...prev }));
    setStudentNoGear(prev => ({ ...initialNoGear, ...prev }));
    
    // Merge existing DB data with any in-memory unsaved edits
    setData(prev => {
      const merged: Record<string, Record<string, any>> = {};
      Object.keys(initialData).forEach(tid => {
        merged[tid] = { ...initialData[tid] };
      });
      Object.keys(prev).forEach(tid => {
        merged[tid] = { ...(merged[tid] || {}), ...prev[tid] };
      });
      return merged;
    });

    setBilans(prev => ({ ...initialBilans, ...prev }));
    setPerspectives(prev => ({ ...initialPerspectives, ...prev }));
  }, [session?.id, sessionObs]);

  // Helper to get total fields count for current sheet
  const totalFields = (sheet?.fields || []).length;

  // Helper to count answered fields for a target
  const getTargetAnsweredCount = useCallback((targetId: string) => {
    if (!sheet?.fields) return 0;
    const targetData = data[targetId] || obsByTarget.get(targetId)?.data || {};
    return sheet.fields.filter(f => {
      const val = targetData[f.id];
      return val !== undefined && val !== '' && val !== null;
    }).length;
  }, [data, obsByTarget, sheet?.fields]);

  // Helper to get a summary snippet of answered data
  const getTargetDataSummary = useCallback((targetId: string) => {
    if (!sheet?.fields) return '';
    const targetData = data[targetId] || obsByTarget.get(targetId)?.data || {};
    const parts: string[] = [];
    
    for (const f of sheet.fields) {
      const val = targetData[f.id];
      if (val !== undefined && val !== '' && val !== null) {
        if (f.type === 'rating') {
          parts.push(`${val}★`);
        } else if (f.type === 'speed_30s' && typeof val === 'number') {
          parts.push(`${(val * 0.12).toFixed(1)} km/h`);
        } else if ((f.type === 'running_exact_time' || f.type === 'demi_fond_temps_juste') && val?.blocks) {
          const completed = (val.blocks || []).filter((b: any) => b.actualDistance !== undefined && b.effectiveRunningTimeSeconds !== undefined);
          const totalDist = completed.reduce((sum: number, b: any) => sum + (b.actualDistance || 0), 0);
          parts.push(`${completed.length} blocs (${totalDist}m)`);
        } else if (f.type === 'counter') {
          parts.push(`${f.label.slice(0, 8)}: ${val}`);
        } else if (f.type === 'boolean') {
          parts.push(val ? `✓ ${f.label.slice(0, 10)}` : `✗`);
        } else if (typeof val === 'number') {
          parts.push(`${val}${f.options?.units ? ' ' + f.options.units : ''}`);
        } else if (typeof val === 'string' && val.length <= 10) {
          parts.push(val);
        }
        if (parts.length >= 2) break;
      }
    }
    return parts.join(' • ');
  }, [data, obsByTarget, sheet?.fields]);

  // Progressive auto-save function
  const persistTargetObservation = useCallback(async (
    targetId: string,
    specificData?: Record<string, any>,
    specificStatus?: StudentSessionStatus,
    specificNoGear?: boolean,
    specificBilan?: string,
    specificPerspectives?: string
  ) => {
    if (!session) return;
    setSaveStatus('saving');
    
    const targetData = specificData !== undefined 
      ? specificData 
      : (data[targetId] || obsByTarget.get(targetId)?.data || {});
    
    const status = specificStatus !== undefined 
      ? specificStatus 
      : (studentStatus[targetId] || obsByTarget.get(targetId)?.status || 'present');
    
    const noGear = specificNoGear !== undefined 
      ? specificNoGear 
      : (studentNoGear[targetId] !== undefined ? studentNoGear[targetId] : !!obsByTarget.get(targetId)?.noGear);
    
    const bilan = specificBilan !== undefined 
      ? specificBilan 
      : (bilans[targetId] ?? obsByTarget.get(targetId)?.bilan ?? '');
    
    const perspectivesVal = specificPerspectives !== undefined 
      ? specificPerspectives 
      : (perspectives[targetId] ?? obsByTarget.get(targetId)?.perspectives ?? '');

    try {
      await saveStudentFullObservation(session.id, targetId, targetData, {
        status,
        noGear,
        bilan,
        perspectives: perspectivesVal
      });

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSavedTime(timeStr);
      setSaveStatus('saved');

      if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
      saveStatusTimerRef.current = setTimeout(() => {
        setSaveStatus('idle');
      }, 2500);
    } catch (err) {
      console.error("Erreur lors de la sauvegarde progressive :", err);
      setSaveStatus('error');
    }
  }, [session, data, obsByTarget, studentStatus, studentNoGear, bilans, perspectives, saveStudentFullObservation]);

  // Debounced auto-save for typing fields (number input, textarea)
  const scheduleDebouncedAutoSave = useCallback((targetId: string, updatedData?: Record<string, any>) => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    setSaveStatus('saving');
    autoSaveTimerRef.current = setTimeout(() => {
      persistTargetObservation(targetId, updatedData);
    }, 600);
  }, [persistTargetObservation]);

  // Handlers for attendance
  const handleSetStudentStatus = (targetId: string, status: StudentSessionStatus) => {
    setStudentStatus(prev => ({
      ...prev,
      [targetId]: status
    }));

    let updatedTargetData = { ...(data[targetId] || obsByTarget.get(targetId)?.data || {}) };

    if (status === 'absent' || status === 'dispense') {
      const code = status === 'absent' ? 'A' : 'D';
      (sheet?.fields || []).forEach(f => {
        if (updatedTargetData[f.id] === undefined || updatedTargetData[f.id] === '') {
          updatedTargetData[f.id] = code;
        }
      });
    } else if (status === 'present') {
      (sheet?.fields || []).forEach(f => {
        if (updatedTargetData[f.id] === 'A' || updatedTargetData[f.id] === 'D') {
          delete updatedTargetData[f.id];
        }
      });
    }

    setData(prev => ({
      ...prev,
      [targetId]: updatedTargetData
    }));

    // Immediate progressive persistence
    persistTargetObservation(targetId, updatedTargetData, status);
  };

  const handleToggleNoGear = (targetId: string) => {
    const nextVal = !studentNoGear[targetId];
    setStudentNoGear(prev => ({
      ...prev,
      [targetId]: nextVal
    }));
    persistTargetObservation(targetId, undefined, undefined, nextVal);
  };

  // Quick field value setter for 'A' or 'D'
  const handleSetFieldCode = (targetId: string, fieldId: string, code: 'A' | 'D') => {
    const current = (data[targetId] || obsByTarget.get(targetId)?.data || {})[fieldId];
    const nextVal = current === code ? '' : code;
    
    const updatedTargetData = {
      ...(data[targetId] || obsByTarget.get(targetId)?.data || {}),
      [fieldId]: nextVal
    };

    setData(prev => ({
      ...prev,
      [targetId]: updatedTargetData
    }));

    persistTargetObservation(targetId, updatedTargetData);
  };

  const handleCounterChange = (targetId: string, fieldId: string, delta: number) => {
    const targetData = data[targetId] || obsByTarget.get(targetId)?.data || {};
    const current = targetData[fieldId];
    const baseNum = (typeof current === 'number') ? current : 0;
    const nextVal = Math.max(0, baseNum + delta);

    const updatedTargetData = {
      ...targetData,
      [fieldId]: nextVal
    };

    setData(prev => ({
      ...prev,
      [targetId]: updatedTargetData
    }));

    // Instant progressive save on tap
    persistTargetObservation(targetId, updatedTargetData);
  };

  const handleNumberChange = (targetId: string, fieldId: string, value: string) => {
    const raw = value.trim().toUpperCase();
    let nextVal: any;

    if (raw === 'A' || raw === 'ABS') {
      nextVal = 'A';
    } else if (raw === 'D' || raw === 'DISP') {
      nextVal = 'D';
    } else if (raw === '') {
      nextVal = '';
    } else {
      const num = parseFloat(value.replace(',', '.'));
      nextVal = isNaN(num) ? value : num;
    }

    const updatedTargetData = {
      ...(data[targetId] || obsByTarget.get(targetId)?.data || {}),
      [fieldId]: nextVal
    };

    setData(prev => ({
      ...prev,
      [targetId]: updatedTargetData
    }));

    scheduleDebouncedAutoSave(targetId, updatedTargetData);
  };

  const handleQuickNudgeNumber = (targetId: string, fieldId: string, delta: number) => {
    const targetData = data[targetId] || obsByTarget.get(targetId)?.data || {};
    const current = targetData[fieldId];
    const baseNum = typeof current === 'number' ? current : 0;
    const nextVal = Math.max(0, Math.round((baseNum + delta) * 10) / 10);

    const updatedTargetData = {
      ...targetData,
      [fieldId]: nextVal
    };

    setData(prev => ({
      ...prev,
      [targetId]: updatedTargetData
    }));

    persistTargetObservation(targetId, updatedTargetData);
  };

  const handleSetBoolean = (targetId: string, fieldId: string, val: boolean) => {
    const updatedTargetData = {
      ...(data[targetId] || obsByTarget.get(targetId)?.data || {}),
      [fieldId]: val
    };

    setData(prev => ({
      ...prev,
      [targetId]: updatedTargetData
    }));

    persistTargetObservation(targetId, updatedTargetData);
  };

  const handleSetRating = (targetId: string, fieldId: string, starNum: number) => {
    const updatedTargetData = {
      ...(data[targetId] || obsByTarget.get(targetId)?.data || {}),
      [fieldId]: starNum
    };

    setData(prev => ({
      ...prev,
      [targetId]: updatedTargetData
    }));

    persistTargetObservation(targetId, updatedTargetData);
  };

  const handleAddBilanTag = (targetId: string, tag: string) => {
    const current = bilans[targetId] || obsByTarget.get(targetId)?.bilan || '';
    let nextBilan = '';
    if (!current.trim()) nextBilan = tag;
    else if (current.includes(tag)) return;
    else nextBilan = `${current}. ${tag}`;

    setBilans(prev => ({
      ...prev,
      [targetId]: nextBilan
    }));

    persistTargetObservation(targetId, undefined, undefined, undefined, nextBilan);
  };

  const handleBilanTextChange = (targetId: string, text: string) => {
    setBilans(prev => ({
      ...prev,
      [targetId]: text
    }));
    
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      persistTargetObservation(targetId, undefined, undefined, undefined, text);
    }, 600);
  };

  // Explicit Save & Validate (Non-destructive: keeps all results in memory & displays quick toast)
  const handleExplicitSave = async (andNext: boolean = false) => {
    if (selectedTargets.length === 0 || !sheet) return;

    for (const targetId of selectedTargets) {
      await persistTargetObservation(targetId);
    }

    setToastMessage('✓ Résultats enregistrés avec succès !');
    setTimeout(() => setToastMessage(null), 3000);

    if (andNext) {
      handleGoToNextStudent();
    }
  };

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

  const allStudents = cls.students || [];
  const allTeams = cls.teams || [];

  // Filtered lists for selection
  const filteredStudents = allStudents.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(studentSearch.toLowerCase());
    if (!matchesSearch) return false;

    const answered = getTargetAnsweredCount(s.id);
    const status = studentStatus[s.id] || obsByTarget.get(s.id)?.status || 'present';
    const isComplete = totalFields > 0 && answered >= totalFields;
    const isAbsentOrDisp = status === 'absent' || status === 'dispense';

    if (filterTab === 'incomplete') {
      return !isComplete && !isAbsentOrDisp;
    }
    if (filterTab === 'completed') {
      return isComplete;
    }
    if (filterTab === 'absent') {
      return isAbsentOrDisp;
    }
    return true;
  });

  const filteredTeams = allTeams.filter(t =>
    t.name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  // Stats for filter tabs
  const completedCount = allStudents.filter(s => {
    const status = studentStatus[s.id] || obsByTarget.get(s.id)?.status || 'present';
    if (status === 'absent' || status === 'dispense') return false;
    return totalFields > 0 && getTargetAnsweredCount(s.id) >= totalFields;
  }).length;

  const absentCount = allStudents.filter(s => {
    const status = studentStatus[s.id] || obsByTarget.get(s.id)?.status || 'present';
    return status === 'absent' || status === 'dispense';
  }).length;

  const incompleteCount = Math.max(0, allStudents.length - completedCount - absentCount);

  // Quick direct open for a student
  const handleOpenStudentObservation = (studentId: string) => {
    setSelectedTargets([studentId]);
    setActiveTargetIndex(0);
    setIsObserving(true);
  };

  // Quick navigation to next student in class list
  const handleGoToNextStudent = () => {
    if (selectedTargets.length > 1) {
      if (activeTargetIndex < selectedTargets.length - 1) {
        setActiveTargetIndex(prev => prev + 1);
      } else {
        setActiveTargetIndex(0);
      }
    } else {
      // Single student mode: move to the next student in the class!
      const currentId = selectedTargets[0];
      const currentIndex = allStudents.findIndex(s => s.id === currentId);
      if (currentIndex !== -1 && currentIndex < allStudents.length - 1) {
        const nextStudent = allStudents[currentIndex + 1];
        setSelectedTargets([nextStudent.id]);
        setActiveTargetIndex(0);
      } else if (currentIndex === allStudents.length - 1 && allStudents.length > 0) {
        setSelectedTargets([allStudents[0].id]);
        setActiveTargetIndex(0);
      }
    }
  };

  const handleGoToPrevStudent = () => {
    if (selectedTargets.length > 1) {
      if (activeTargetIndex > 0) {
        setActiveTargetIndex(prev => prev - 1);
      }
    } else {
      const currentId = selectedTargets[0];
      const currentIndex = allStudents.findIndex(s => s.id === currentId);
      if (currentIndex > 0) {
        const prevStudent = allStudents[currentIndex - 1];
        setSelectedTargets([prevStudent.id]);
        setActiveTargetIndex(0);
      }
    }
  };

  // STEP 1: TARGET SELECTION SCREEN (PROGRESSIVE WORKSPACE)
  if (!isObserving) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
        {/* Sticky Mobile Header */}
        <header className="bg-indigo-600 text-white px-4 py-3.5 shadow-sm sticky top-0 z-30">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-indigo-200 text-[11px] font-semibold">
                <span>{cls.name}</span>
                <span>•</span>
                <span className="truncate">{session.name}</span>
              </div>
              <h1 className="font-bold text-base text-white truncate">{sheet.name}</h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowClassOverview(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold border border-indigo-500/40 shadow-xs transition-colors"
                title="Consulter la vue d'ensemble de la séance pour toute la classe"
              >
                <BarChart3 className="w-3.5 h-3.5 text-indigo-200" />
                <span className="hidden xs:inline">Vue classe</span>
              </button>

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
          </div>
        </header>

        {/* Main Selection Area */}
        <main className="flex-1 p-4 max-w-xl mx-auto w-full space-y-4">
          {/* Progressive Mode Info Banner */}
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200/80 rounded-2xl p-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-indigo-950 flex items-center gap-1.5">
                  <span>Saisie progressive au fil de la séance</span>
                </h2>
                <p className="text-xs text-indigo-800/90 mt-0.5 leading-relaxed">
                  Renseignez les élèves atelier après atelier. Toutes les informations précédentes sont automatiquement conservées et pré-chargées.
                </p>
              </div>
            </div>

            {/* Quick Session Progress Bar */}
            <div className="mt-3 pt-3 border-t border-indigo-200/60 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-900">
                <span>Progression classe</span>
                <span>{completedCount} / {allStudents.length} élèves terminés</span>
              </div>
              <div className="w-full h-2 bg-indigo-200/60 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${allStudents.length > 0 ? (completedCount / allStudents.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {sheet.isMultiStudent ? 'Qui observez-vous ?' : 'Sélectionnez un élève'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {sheet.isMultiStudent 
                    ? 'Cochez un ou plusieurs élèves ou équipes pour cet atelier.' 
                    : 'Touchez directement un élève pour consulter ou continuer sa saisie.'}
                </p>
              </div>

              {selectedTargets.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedTargets([])}
                  className="text-xs text-indigo-600 font-bold hover:underline self-start sm:self-auto"
                >
                  Désélectionner tout
                </button>
              )}
            </div>

            {/* Instant Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                placeholder="Rechercher un prénom ou nom..."
                className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all placeholder:text-slate-400"
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

            {/* Filter Tabs for Quick Triage */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  filterTab === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tous ({allStudents.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('incomplete')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                  filterTab === 'incomplete'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                <span>À compléter</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  filterTab === 'incomplete' ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-900'
                }`}>
                  {incompleteCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('completed')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                  filterTab === 'completed'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <span>Terminés</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  filterTab === 'completed' ? 'bg-emerald-700 text-white' : 'bg-emerald-200 text-emerald-900'
                }`}>
                  {completedCount}
                </span>
              </button>

              {absentCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterTab('absent')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    filterTab === 'absent'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                  }`}
                >
                  Absents ({absentCount})
                </button>
              )}
            </div>

            {/* Students list */}
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredStudents.map((s) => {
                  const isSelected = selectedTargets.includes(s.id);
                  const initial = s.name.charAt(0).toUpperCase();
                  const answeredCount = getTargetAnsweredCount(s.id);
                  const isComplete = totalFields > 0 && answeredCount >= totalFields;
                  const status = studentStatus[s.id] || obsByTarget.get(s.id)?.status || 'present';
                  const hasNoGear = studentNoGear[s.id] !== undefined ? studentNoGear[s.id] : !!obsByTarget.get(s.id)?.noGear;
                  const dataSummary = getTargetDataSummary(s.id);
                  const hasExistingData = answeredCount > 0;

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
                          handleOpenStudentObservation(s.id);
                        }
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all active:scale-[0.98] min-h-[64px] ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-950 shadow-xs ring-2 ring-indigo-600'
                          : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50/80 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          status === 'absent'
                            ? 'bg-red-100 text-red-700'
                            : status === 'dispense'
                            ? 'bg-amber-100 text-amber-700'
                            : isComplete
                            ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500'
                            : isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {isComplete ? (
                            <Check className="w-4 h-4 stroke-[3]" />
                          ) : (
                            initial
                          )}
                        </div>

                        <div className="min-w-0 flex-1 pr-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-bold truncate">{s.name}</span>
                            {hasNoGear && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-md">
                                Sans tenue
                              </span>
                            )}
                          </div>

                          {/* Progressive Status Subtitle */}
                          <div className="flex items-center gap-2 mt-0.5">
                            {status === 'absent' ? (
                              <span className="text-[11px] font-bold text-red-600">Absent (A)</span>
                            ) : status === 'dispense' ? (
                              <span className="text-[11px] font-bold text-amber-600">Dispensé (D)</span>
                            ) : isComplete ? (
                              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                <span>Complet ({answeredCount}/{totalFields})</span>
                              </span>
                            ) : hasExistingData ? (
                              <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                <span>En cours ({answeredCount}/{totalFields})</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium">Non débuté</span>
                            )}

                            {dataSummary && (
                              <span className="text-[10px] text-slate-500 truncate hidden xs:inline">
                                • {dataSummary}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right indicator or check */}
                      <div className="shrink-0 pl-1">
                        {sheet.isMultiStudent ? (
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 transition-all ${
                            isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-xl bg-slate-100 group-hover:bg-indigo-50 text-slate-400 flex items-center justify-center">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-500 col-span-full bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Aucun élève trouvé dans cette catégorie.
                  </div>
                )}
              </div>

              {/* Teams list if available */}
              {cls.teams && cls.teams.length > 0 && (
                <div className="pt-4 space-y-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block px-1">
                    Équipes ({filteredTeams.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredTeams.map((t) => {
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
                              handleOpenStudentObservation(t.id);
                            }
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all active:scale-[0.98] ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-600 text-indigo-950 font-bold shadow-xs ring-2 ring-indigo-600'
                              : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                              <Users className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-semibold">{t.name}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Multi-student Start Observation sticky button */}
        {sheet.isMultiStudent && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-lg">
            <div className="max-w-xl mx-auto">
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
                  <span className="bg-indigo-500 text-white px-2 py-0.5 rounded-full text-xs font-extrabold">
                    {selectedTargets.length}
                  </span>
                )}
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Modal Class Overview */}
        {showClassOverview && session && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex flex-col justify-start p-2 sm:p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-6xl mx-auto my-auto">
              <ClassSessionOverview
                sessionId={session.id}
                isModal={true}
                onClose={() => setShowClassOverview(false)}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // STEP 2: ACTIVE OBSERVATION SCREEN (PROGRESSIVE FIELD-BY-FIELD ENTRY)
  const currentTargetId = selectedTargets[activeTargetIndex] || selectedTargets[0];
  const student = cls.students.find(s => s.id === currentTargetId);
  const team = cls.teams?.find(t => t.id === currentTargetId);
  const targetName = student?.name || (team ? `Équipe : ${team.name}` : 'Inconnu');
  
  // Directly grab data from state or DB
  const studentData = data[currentTargetId] || obsByTarget.get(currentTargetId)?.data || {};
  const currentStatus = studentStatus[currentTargetId] || obsByTarget.get(currentTargetId)?.status || 'present';
  const hasNoGear = studentNoGear[currentTargetId] !== undefined 
    ? studentNoGear[currentTargetId] 
    : !!obsByTarget.get(currentTargetId)?.noGear;

  const currentBilan = bilans[currentTargetId] ?? obsByTarget.get(currentTargetId)?.bilan ?? '';

  // Count answered fields for this student
  const answeredFieldsCount = (sheet.fields || []).filter(f => {
    const val = studentData[f.id];
    return val !== undefined && val !== '' && val !== null;
  }).length;

  const hasPreviousData = answeredFieldsCount > 0;
  const isComplete = totalFields > 0 && answeredFieldsCount >= totalFields;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col pb-32">
      {/* Toast message if present */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-4 h-4 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sticky Mobile Header */}
      <header className="bg-indigo-600 text-white px-4 py-3 shadow-sm sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setIsObserving(false)}
              className="w-8 h-8 rounded-xl bg-indigo-700/80 hover:bg-indigo-800 text-white flex items-center justify-center shrink-0"
              title="Retour à la sélection des élèves"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <span className="text-[11px] text-indigo-200 font-semibold block truncate">
                {cls.name} • {session.name}
              </span>
              <h1 className="font-bold text-sm sm:text-base text-white truncate leading-tight">
                {sheet.name}
              </h1>
            </div>
          </div>

          {/* Real-time Save status badge */}
          <div className="flex items-center gap-2 shrink-0">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/25 border border-amber-300/40 text-amber-200 rounded-full text-[11px] font-bold">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="hidden xs:inline">Sauvegarde...</span>
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/25 border border-emerald-300/40 text-emerald-200 rounded-full text-[11px] font-bold animate-in fade-in">
                <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span className="hidden xs:inline">Enregistré en direct</span>
              </span>
            )}
            {saveStatus === 'idle' && lastSavedTime && (
              <span className="flex items-center gap-1 text-[11px] text-indigo-200 font-medium opacity-80">
                <Clock className="w-3 h-3" />
                <span>{lastSavedTime}</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => setShowClassOverview(true)}
              className="flex items-center gap-1 text-xs font-bold text-indigo-100 bg-indigo-700/80 hover:bg-indigo-800 px-2.5 py-1.5 rounded-xl border border-indigo-500/40 shrink-0 transition-colors"
              title="Consulter la vue d'ensemble de la séance pour toute la classe"
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-200" />
              <span className="hidden xs:inline">Vue classe</span>
            </button>

            <button
              type="button"
              onClick={() => setIsObserving(false)}
              className="text-xs font-bold text-indigo-100 bg-indigo-700 hover:bg-indigo-800 px-3 py-1.5 rounded-xl border border-indigo-500/40 shrink-0 ml-1"
            >
              Liste
            </button>
          </div>
        </div>

        {/* Multi-student Horizontal Thumb-Switcher Tabs */}
        {selectedTargets.length > 1 && (
          <div className="max-w-2xl mx-auto mt-2 pt-2 border-t border-indigo-500/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {selectedTargets.map((id, idx) => {
              const st = cls.students.find(s => s.id === id);
              const tm = cls.teams?.find(t => t.id === id);
              const name = st?.name.split(' ')[0] || tm?.name || `Élève ${idx + 1}`;
              const isSelected = idx === activeTargetIndex;
              const targetAnswered = getTargetAnsweredCount(id);
              const isTargetComplete = totalFields > 0 && targetAnswered >= totalFields;

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
                  {isTargetComplete ? (
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
      <main className="flex-1 p-3 sm:p-4 max-w-2xl mx-auto w-full space-y-3 sm:space-y-4">
        {/* Reassuring Progressive Saisie Banner */}
        <div className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-2 shadow-2xs ${
          hasPreviousData
            ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
            : 'bg-indigo-50/90 border-indigo-200 text-indigo-900'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCheck className={`w-4 h-4 shrink-0 ${hasPreviousData ? 'text-emerald-600' : 'text-indigo-600'}`} />
            <span>
              {hasPreviousData 
                ? `Données précédentes prises en compte : ${answeredFieldsCount}/${totalFields} critères complétés.`
                : 'Saisie progressive : vous pouvez compléter les critères un à un sans rien perdre.'}
            </span>
          </div>

          {answeredFieldsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-200/80 text-emerald-900 shrink-0">
              {answeredFieldsCount}/{totalFields}
            </span>
          )}
        </div>

        {/* Student Profile & Quick Stepper Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-extrabold text-base shrink-0 shadow-2xs">
                {targetName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 leading-tight truncate">{targetName}</h2>
                  {isComplete && (
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium mt-0.5">
                  <span>Critères complétés : <strong>{answeredFieldsCount} / {totalFields}</strong></span>
                  {allStudents.length > 1 && (
                    <>
                      <span>•</span>
                      <span>Élève {allStudents.findIndex(s => s.id === currentTargetId) + 1}/{allStudents.length}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Next/Prev Stepper on Student Card */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleGoToPrevStudent}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors"
                title="Élève précédent"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={handleGoToNextStudent}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors"
                title="Élève suivant"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Attendance Controls */}
          <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-100">
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
              className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 border transition-all active:scale-95 ${
                hasNoGear
                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>{hasNoGear ? 'Sans tenue ✓' : 'Sans tenue'}</span>
            </button>
          </div>

          {currentStatus === 'absent' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-800">
              <span className="font-semibold">Élève noté ABSENT (A)</span>
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
            const isFieldAnswered = val !== undefined && val !== '' && val !== null;

            return (
              <div 
                key={field.id}
                className={`bg-white p-4 rounded-2xl border transition-all shadow-xs space-y-3 ${
                  isFieldAnswered ? 'border-indigo-200/90' : 'border-slate-200'
                }`}
              >
                {/* Field Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {isFieldAnswered && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Critère renseigné" />
                    )}
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">{field.label}</h3>
                      {field.options?.units && (
                        <span className="text-[11px] font-mono text-slate-400">
                          Unité : {field.options.units}
                        </span>
                      )}
                    </div>
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
                                onClick={() => handleSetRating(currentTargetId, field.id, starNum)}
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
                          const updated = { ...(data[currentTargetId] || obsByTarget.get(currentTargetId)?.data || {}), [field.id]: newVal };
                          setData(prev => ({
                            ...prev,
                            [currentTargetId]: updated
                          }));
                          persistTargetObservation(currentTargetId, updated);
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
                          const updated = { ...(data[currentTargetId] || obsByTarget.get(currentTargetId)?.data || {}), [field.id]: newVal };
                          setData(prev => ({
                            ...prev,
                            [currentTargetId]: updated
                          }));
                          persistTargetObservation(currentTargetId, updated);
                        }}
                      />
                    )}

                    {/* SPECIALIZED TYPES */}
                    {field.type === 'orienteering_star' && (
                      <OrienteeringStar
                        baliseCount={field.options?.baliseCount || 10}
                        value={val || {}}
                        onChange={(newVal) => {
                          const updated = { ...(data[currentTargetId] || obsByTarget.get(currentTargetId)?.data || {}), [field.id]: newVal };
                          setData(prev => ({
                            ...prev,
                            [currentTargetId]: updated
                          }));
                          persistTargetObservation(currentTargetId, updated);
                        }}
                      />
                    )}

                    {field.type === 'training_log' && (
                      <TrainingLog
                        value={val}
                        onChange={(newVal) => {
                          const updated = { ...(data[currentTargetId] || obsByTarget.get(currentTargetId)?.data || {}), [field.id]: newVal };
                          setData(prev => ({
                            ...prev,
                            [currentTargetId]: updated
                          }));
                          persistTargetObservation(currentTargetId, updated);
                        }}
                      />
                    )}

                    {field.type === 'match_stats' && (
                      <MatchStats
                        value={val}
                        onChange={(newVal) => {
                          const updated = { ...(data[currentTargetId] || obsByTarget.get(currentTargetId)?.data || {}), [field.id]: newVal };
                          setData(prev => ({
                            ...prev,
                            [currentTargetId]: updated
                          }));
                          persistTargetObservation(currentTargetId, updated);
                        }}
                      />
                    )}

                    {field.type === 'artistic_rating' && (
                      <ArtisticRating
                        value={val}
                        onChange={(newVal) => {
                          const updated = { ...(data[currentTargetId] || obsByTarget.get(currentTargetId)?.data || {}), [field.id]: newVal };
                          setData(prev => ({
                            ...prev,
                            [currentTargetId]: updated
                          }));
                          persistTargetObservation(currentTargetId, updated);
                        }}
                      />
                    )}

                    {field.type === 'health_fitness_log' && (
                      <HealthFitnessLog
                        value={val}
                        onChange={(newVal) => {
                          const updated = { ...(data[currentTargetId] || obsByTarget.get(currentTargetId)?.data || {}), [field.id]: newVal };
                          setData(prev => ({
                            ...prev,
                            [currentTargetId]: updated
                          }));
                          persistTargetObservation(currentTargetId, updated);
                        }}
                      />
                    )}

                    {field.type === 'sequence_planner' && (
                      <SequencePlanner
                        value={val}
                        onChange={(newVal) => {
                          const updated = { ...(data[currentTargetId] || obsByTarget.get(currentTargetId)?.data || {}), [field.id]: newVal };
                          setData(prev => ({
                            ...prev,
                            [currentTargetId]: updated
                          }));
                          persistTargetObservation(currentTargetId, updated);
                        }}
                      />
                    )}

                    {field.type === 'ratio_action' && (
                      <RatioAction
                        value={val}
                        onChange={(newVal) => {
                          const updated = { ...(data[currentTargetId] || obsByTarget.get(currentTargetId)?.data || {}), [field.id]: newVal };
                          setData(prev => ({
                            ...prev,
                            [currentTargetId]: updated
                          }));
                          persistTargetObservation(currentTargetId, updated);
                        }}
                      />
                    )}

                    {field.type === 'performance_log' && (
                      <PerformanceLog
                        value={val}
                        onChange={(newVal) => {
                          const updated = { ...(data[currentTargetId] || obsByTarget.get(currentTargetId)?.data || {}), [field.id]: newVal };
                          setData(prev => ({
                            ...prev,
                            [currentTargetId]: updated
                          }));
                          persistTargetObservation(currentTargetId, updated);
                        }}
                      />
                    )}

                    {field.type === 'orienteering_log' && (
                      <OrienteeringLog
                        value={val}
                        onChange={(newVal) => {
                          const updated = { ...(data[currentTargetId] || obsByTarget.get(currentTargetId)?.data || {}), [field.id]: newVal };
                          setData(prev => ({
                            ...prev,
                            [currentTargetId]: updated
                          }));
                          persistTargetObservation(currentTargetId, updated);
                        }}
                      />
                    )}

                    {field.type === 'project_target' && (
                      <ProjectTarget
                        value={val}
                        onChange={(newVal) => {
                          const updated = { ...(data[currentTargetId] || obsByTarget.get(currentTargetId)?.data || {}), [field.id]: newVal };
                          setData(prev => ({
                            ...prev,
                            [currentTargetId]: updated
                          }));
                          persistTargetObservation(currentTargetId, updated);
                        }}
                      />
                    )}

                    {(field.type === 'running_exact_time' || field.type === 'demi_fond_temps_juste') && (
                      <RunningExactTime
                        value={val}
                        options={field.options}
                        onChange={(newVal) => {
                          const updated = { ...(data[currentTargetId] || obsByTarget.get(currentTargetId)?.data || {}), [field.id]: newVal };
                          setData(prev => ({
                            ...prev,
                            [currentTargetId]: updated
                          }));
                          persistTargetObservation(currentTargetId, updated);
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
            value={currentBilan}
            onChange={e => handleBilanTextChange(currentTargetId, e.target.value)}
            placeholder="Écrivez un conseil ou appuyez sur les suggestions ci-dessus..."
            rows={3}
            className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none"
          />
        </div>
      </main>

      {/* Sticky Bottom Action Bar (Thumb Zone) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
          {/* Progress summary */}
          <div className="text-xs min-w-0 pr-1">
            <span className="font-extrabold text-slate-900 block truncate">
              {answeredFieldsCount}/{totalFields} critères saisis
            </span>
            <span className="text-[11px] text-slate-500 font-medium truncate block">
              {saveStatus === 'saved' ? '✓ Enregistré' : 'Saisie progressive active'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Next Student Button */}
            <Button
              variant="outline"
              onClick={() => handleExplicitSave(true)}
              className="h-12 px-3 text-xs font-bold text-slate-700 border-slate-300 hover:bg-slate-100 flex items-center gap-1"
            >
              <span>Suivant</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>

            {/* Validate / Explicit Save Button */}
            <Button
              size="lg"
              onClick={() => handleExplicitSave(false)}
              className="h-12 px-4 sm:px-5 text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Enregistrer</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Modal Class Overview */}
      {showClassOverview && session && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex flex-col justify-start p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-6xl mx-auto my-auto">
            <ClassSessionOverview
              sessionId={session.id}
              isModal={true}
              onClose={() => setShowClassOverview(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
