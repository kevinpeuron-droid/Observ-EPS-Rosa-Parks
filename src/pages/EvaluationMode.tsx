import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  Award, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Printer, 
  Sparkles, 
  Search, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Sliders, 
  Settings, 
  TrendingUp, 
  BarChart3, 
  FileSpreadsheet, 
  UserCheck, 
  UserX, 
  ShieldAlert, 
  Check, 
  X, 
  HelpCircle,
  FileText,
  Star,
  Activity as ActivityIcon,
  Timer,
  Footprints,
  Zap,
  Flame,
  Edit3,
  ArrowRight,
  BookmarkPlus,
  BookmarkCheck,
  Eye
} from 'lucide-react';
import { EvaluationConfigDialog } from '../components/EvaluationConfigDialog';
import { DemiFondTempsJusteEvaluationCard } from '../components/DemiFondTempsJusteEvaluationCard';
import { RunningExactTime, RunningExactTimeData, formatSecondsToMMSS } from '../components/RunningExactTime';
import { ObserveCriterionModal } from '../components/ObserveCriterionModal';
import { FastFieldObservationModal } from '../components/FastFieldObservationModal';
import { 
  calculateStudentEvaluation, 
  calculateClassEvaluationStatistics, 
  exportEvaluationToCsv, 
  getDefaultCriteriaForCa,
  getCriterionLevels,
  suggestCriterionScoreFromObservations,
  extractDemiFondTempsJusteData,
  computeTempsJusteOfficialGrades,
  getCompetenceLevel,
  StudentEvaluationSummary
} from '../lib/evaluationHelpers';
import { EvaluationCriterion, Student } from '../types';

export function EvaluationMode() {
  const { activityId } = useParams<{ activityId: string }>();
  const navigate = useNavigate();
  const { 
    activities, 
    classes, 
    sessions, 
    sheets,
    addSheet,
    addSession,
    saveStudentFullObservation,
    observations, 
    updateActivity,
    saveActivityAsTemplate 
  } = useStore();

  const activity = activities.find(a => a.id === activityId);
  const parentClass = activity ? classes.find(c => c.id === activity.classId) : null;
  const actSessions = useMemo(() => {
    return sessions.filter(s => s.activityId === activityId);
  }, [sessions, activityId]);
  
  const actObservations = useMemo(() => {
    return observations.filter(o => actSessions.some(s => s.id === o.sessionId));
  }, [observations, actSessions]);

  // Tab: 'grid' (Tableau classe) | 'student' (Fiche pas-à-pas) | 'tempsJuste' (Course au Temps Juste 4x5') | 'stats' (Statistiques & Graphiques)
  const [activeTab, setActiveTab] = useState<'grid' | 'student' | 'tempsJuste' | 'stats'>('grid');

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'evaluated' | 'pending' | 'absent'>('all');

  // Selected student index for individual evaluation view
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Editing state for Course au Temps Juste (4x5') direct evaluation modal
  const [editingTempsJusteStudent, setEditingTempsJusteStudent] = useState<Student | null>(null);
  const [editingTempsJusteData, setEditingTempsJusteData] = useState<RunningExactTimeData | null>(null);

  // Local state for grades and appreciations (synchronized with activity)
  const [localGrades, setLocalGrades] = useState<Record<string, Record<string, number | string>>>(activity?.grades || {});
  const [localAppreciations, setLocalAppreciations] = useState<Record<string, string>>(activity?.studentAppreciations || {});

  // Criteria configuration state
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>(() => {
    if (activity?.evaluationCriteria && activity.evaluationCriteria.length > 0) {
      return activity.evaluationCriteria;
    }
    return getDefaultCriteriaForCa(activity?.ca);
  });

  const [isCriteriaModalOpen, setIsCriteriaModalOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showAutoSuggestModal, setShowAutoSuggestModal] = useState(false);
  const [printMode, setPrintMode] = useState<'summary' | 'bulletins' | null>(null);
  const [savedToBankSuccess, setSavedToBankSuccess] = useState(false);

  // Mode de grille : 'observation' (Paliers observables & ce qui est fait) vs 'numeric' (Saisie chiffrée directe)
  const [gridDisplayMode, setGridDisplayMode] = useState<'observation' | 'numeric'>('observation');
  const [observingModalState, setObservingModalState] = useState<{
    studentId: string;
    studentName: string;
    criterion: EvaluationCriterion;
  } | null>(null);
  const [isFastObservationModalOpen, setIsFastObservationModalOpen] = useState(false);
  const [showRubricLegend, setShowRubricLegend] = useState(false);
  const [conversionToast, setConversionToast] = useState<string | null>(null);

  const handleSaveCurrentToBank = () => {
    if (!activity) return;
    saveActivityAsTemplate(activity.id);
    setSavedToBankSuccess(true);
    setTimeout(() => setSavedToBankSuccess(false), 3500);
  };

  // Transformer automatiquement toutes les observations récoltées en notes selon le barème officiel
  const handleTransformFieldObservationsToGrades = () => {
    if (!parentClass) return;
    let convertedCount = 0;
    const nextGrades = { ...localGrades };
    const nextAppreciations = { ...localAppreciations };

    parentClass.students.forEach(student => {
      const studentObs = actObservations.filter(o => o.targetId === student.id);
      if (studentObs.length === 0) return;

      const studentGrades = { ...(nextGrades[student.id] || {}) };
      let studentChanged = false;

      // 1. Spécifique Demi-Fond : Course au Temps Juste 4x5'
      const tempsJuste = extractDemiFondTempsJusteData(studentObs);
      if (tempsJuste.hasData && tempsJuste.completedBlocks > 0) {
        const { scores, appreciation } = computeTempsJusteOfficialGrades(tempsJuste);
        criteria.forEach((c, idx) => {
          const lbl = c.label.toLowerCase();
          if (lbl.includes('régul') || lbl.includes('allure') || lbl.includes('marche') || lbl.includes('tm') || idx === 0) {
            studentGrades[c.id] = Math.min(c.maxScore, scores.regularity);
          } else if (lbl.includes('perf') || lbl.includes('vitesse') || lbl.includes('distance') || idx === 1) {
            studentGrades[c.id] = Math.min(c.maxScore, scores.performance);
          } else if (lbl.includes('lucid') || lbl.includes('régulat') || lbl.includes('contrat') || idx === 2) {
            studentGrades[c.id] = Math.min(c.maxScore, scores.lucidity);
          } else if (lbl.includes('observ') || lbl.includes('pilote') || lbl.includes('rôle') || idx === 3) {
            studentGrades[c.id] = Math.min(c.maxScore, scores.observer);
          }
        });
        nextAppreciations[student.id] = appreciation;
        studentChanged = true;
      } else {
        // 2. Autres activités EPS : conversion selon les critères et paliers observés
        criteria.forEach(crit => {
          const suggested = suggestCriterionScoreFromObservations(crit, studentObs);
          if (suggested !== null) {
            studentGrades[crit.id] = suggested;
            studentChanged = true;
          }
        });
      }

      if (studentChanged) {
        nextGrades[student.id] = studentGrades;
        convertedCount++;
      }
    });

    if (convertedCount > 0) {
      setLocalGrades(nextGrades);
      setLocalAppreciations(nextAppreciations);
      handleSaveAll(nextGrades, nextAppreciations, criteria);
      setConversionToast(`${convertedCount} élève(s) ont été évalué(s) automatiquement d'après leurs observations de terrain et le barème !`);
      setTimeout(() => setConversionToast(null), 5000);
    } else {
      setConversionToast("Aucune observation de terrain n'est encore enregistrée pour cette classe. Utilisez le mode 'Observer' ou la saisie des blocs pour renseigner ce que font les élèves.");
      setTimeout(() => setConversionToast(null), 5000);
    }
  };

  // Sync when activity changes
  useEffect(() => {
    if (activity) {
      if (activity.grades) setLocalGrades(activity.grades);
      if (activity.studentAppreciations) setLocalAppreciations(activity.studentAppreciations);
      if (activity.evaluationCriteria && activity.evaluationCriteria.length > 0) {
        setCriteria(activity.evaluationCriteria);
      } else {
        const defaultCrits = getDefaultCriteriaForCa(activity.ca);
        setCriteria(defaultCrits);
        // Sauvegarder automatiquement les critères par défaut si aucun n'est présent
        updateActivity(activity.id, { evaluationCriteria: defaultCrits });
      }
    }
  }, [activity?.id]);

  // Ensure an active student is selected
  useEffect(() => {
    if (parentClass?.students && parentClass.students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(parentClass.students[0].id);
    }
  }, [parentClass?.students, selectedStudentId]);

  const isDemiFond = useMemo(() => {
    if (!activity) return false;
    const name = activity.name.toLowerCase();
    return name.includes('demi') || name.includes('fond') || name.includes('temps juste') || activity.ca === 1;
  }, [activity?.name, activity?.ca]);

  const actSheets = useMemo(() => {
    return sheets.filter(s => s.activityId === activityId);
  }, [sheets, activityId]);

  const hasTempsJusteSheet = useMemo(() => {
    return actSheets.some(sh => 
      sh.fields?.some(f => f.type === 'running_exact_time' || f.type === 'demi_fond_temps_juste') ||
      sh.name.toLowerCase().includes('temps juste')
    );
  }, [actSheets]);

  const currentStudent = useMemo(() => {
    return parentClass?.students.find(s => s.id === selectedStudentId);
  }, [parentClass?.students, selectedStudentId]);

  const currentStudentTempsJuste = useMemo(() => {
    if (!selectedStudentId) return null;
    const studentObs = actObservations.filter(o => o.targetId === selectedStudentId);
    return extractDemiFondTempsJusteData(studentObs);
  }, [actObservations, selectedStudentId]);

  if (!activity || !parentClass) {
    return (
      <div className="p-8 text-center max-w-xl mx-auto space-y-4">
        <div className="text-xl font-bold text-slate-800">Activité ou classe introuvable</div>
        <p className="text-slate-500">L'activité sélectionnée n'existe plus ou la classe a été déplacée.</p>
        <Link to="/">
          <Button variant="outline">Retour au tableau de bord</Button>
        </Link>
      </div>
    );
  }

  // Quick feedback tags for EPS report
  const QUICK_APPRECIATIONS = [
    'Excellent engagement moteur et régularité exemplaire.',
    'Très bonne maîtrise technique et respect des consignes.',
    'Progrès constants tout au long du cycle.',
    'Allure bien régulée et lucidité dans l\'effort.',
    'Gestion de l\'effort maîtrisée, contrat respecté.',
    'Manque de régularité, décrochage en fin d\'effort.',
    'Rôle d\'observateur et de co-pilote très sérieux.',
    'Consignes de sécurité et d\'assurage bien appliquées.',
    'Bel esprit d\'équipe et fair-play remarquable.'
  ];

  // Calculate evaluations for all students
  const studentsSummaries: StudentEvaluationSummary[] = useMemo(() => {
    return (parentClass.students || []).map(student => {
      const studentGrades = localGrades[student.id];
      const appreciation = localAppreciations[student.id];
      return calculateStudentEvaluation(student.id, student.name, criteria, studentGrades, appreciation);
    });
  }, [parentClass.students, criteria, localGrades, localAppreciations]);

  // Statistics
  const stats = useMemo(() => {
    return calculateClassEvaluationStatistics(studentsSummaries, criteria);
  }, [studentsSummaries, criteria]);

  // Filtered summaries
  const filteredSummaries = useMemo(() => {
    return studentsSummaries.filter(s => {
      const matchSearch = s.studentName.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;
      if (filterType === 'evaluated') return s.scoreOn20 !== null;
      if (filterType === 'pending') return s.scoreOn20 === null && s.status !== 'absent' && s.status !== 'dispense';
      if (filterType === 'absent') return s.status === 'absent' || s.status === 'dispense';
      return true;
    });
  }, [studentsSummaries, searchQuery, filterType]);

  // Données Course au Temps Juste (4x5') pour tous les élèves de la classe
  const studentsTempsJusteList = useMemo(() => {
    return (parentClass?.students || []).map((student, idx) => {
      const studentObs = actObservations.filter(o => o.targetId === student.id);
      const summary = extractDemiFondTempsJusteData(studentObs);
      const studentGrades = localGrades[student.id];
      const appreciation = localAppreciations[student.id];
      const evalSummary = calculateStudentEvaluation(student.id, student.name, criteria, studentGrades, appreciation);
      const officialGrades = summary ? computeTempsJusteOfficialGrades(summary) : null;

      return {
        index: idx + 1,
        student,
        summary,
        evalSummary,
        officialGrades,
        obsCount: studentObs.length
      };
    });
  }, [parentClass?.students, actObservations, localGrades, localAppreciations, criteria]);

  // Statistiques spécifiques Course au Temps Juste (4x5')
  const tempsJusteStats = useMemo(() => {
    const evaluated = studentsTempsJusteList.filter(item => item.summary && item.summary.completedBlocks > 0);
    const regular = evaluated.filter(item => item.summary?.profile === 'Régulier / Continu');
    const adaptive = evaluated.filter(item => item.summary?.profile === 'Lucide / Adaptatif');
    const overpaced = evaluated.filter(item => item.summary?.profile === 'Sur-estimé / Obstiné');
    const prudent = evaluated.filter(item => item.summary?.profile === 'Prudent / En réserve');
    
    let sumSpeed = 0;
    let sumTm = 0;
    evaluated.forEach(item => {
      sumSpeed += (item.summary?.realSpeedKmH || 0);
      sumTm += (item.summary?.totalTmSeconds || 0);
    });

    const avgSpeed = evaluated.length > 0 ? Math.round((sumSpeed / evaluated.length) * 10) / 10 : 0;
    const avgTm = evaluated.length > 0 ? Math.round(sumTm / evaluated.length) : 0;

    return {
      total: studentsTempsJusteList.length,
      evaluatedCount: evaluated.length,
      regularCount: regular.length,
      adaptiveCount: adaptive.length,
      overpacedCount: overpaced.length,
      prudentCount: prudent.length,
      avgSpeed,
      avgTm
    };
  }, [studentsTempsJusteList]);

  // Ajouter la situation Course au Temps Juste (4x5') au cycle
  const handleAddTempsJusteSituation = () => {
    addSheet({
      activityId: activity.id,
      name: 'Demi-Fond - Course au Temps Juste (4 x 5\')',
      isMultiStudent: false,
      fields: [
        {
          id: Math.random().toString(36).substr(2, 9),
          label: 'Course au Temps Juste (4 x 5\')',
          type: 'running_exact_time',
          options: {
            blockCount: 4,
            blockDurationSeconds: 300,
            presetsDistances: [700, 750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200]
          }
        }
      ]
    });
  };

  // Appliquer le barème officiel Demi-Fond
  const handleSetOfficialTempsJusteCriteria = () => {
    const officialCrits = getDefaultCriteriaForCa(1, 'Demi-Fond - Course au Temps Juste (4 x 5\')');
    setCriteria(officialCrits);
    handleSaveAll(localGrades, localAppreciations, officialCrits);
  };

  // Appliquer les notes automatiques Temps Juste pour un élève
  const handleApplyTempsJusteScores = (studentId: string, scores: { regularity: number; performance: number; lucidity: number; observer: number } | Record<string, number>, appreciation: string) => {
    const updatedGradesForStudent = { ...(localGrades[studentId] || {}) };
    
    criteria.forEach((c, idx) => {
      const lbl = c.label.toLowerCase();
      if (lbl.includes('régul') || lbl.includes('allure') || lbl.includes('marche') || lbl.includes('tm') || idx === 0) {
        updatedGradesForStudent[c.id] = Math.min(c.maxScore, (scores as any).regularity ?? 4);
      } else if (lbl.includes('perf') || lbl.includes('vitesse') || lbl.includes('distance') || idx === 1) {
        updatedGradesForStudent[c.id] = Math.min(c.maxScore, (scores as any).performance ?? 4);
      } else if (lbl.includes('lucid') || lbl.includes('régulat') || lbl.includes('contrat') || idx === 2) {
        updatedGradesForStudent[c.id] = Math.min(c.maxScore, (scores as any).lucidity ?? 3);
      } else if (lbl.includes('observ') || lbl.includes('pilote') || lbl.includes('rôle') || idx === 3) {
        updatedGradesForStudent[c.id] = Math.min(c.maxScore, (scores as any).observer ?? 2);
      }
    });

    const nextGrades = { ...localGrades, [studentId]: updatedGradesForStudent };
    const nextAppreciations = { ...localAppreciations, [studentId]: appreciation };
    setLocalGrades(nextGrades);
    setLocalAppreciations(nextAppreciations);
    handleSaveAll(nextGrades, nextAppreciations, criteria);
  };

  // Enregistrer ou modifier l'observation Course au Temps Juste directement depuis l'évaluation
  const handleSaveTempsJusteObservation = async (studentId: string, data: any) => {
    let sheetId = actSheets.find(sh => sh.fields?.some(f => f.type === 'running_exact_time' || f.type === 'demi_fond_temps_juste'))?.id;

    if (!sheetId) {
      sheetId = Math.random().toString(36).substr(2, 9);
      addSheet({
        id: sheetId,
        activityId: activity.id,
        name: 'Demi-Fond - Course au Temps Juste (4 x 5\')',
        isMultiStudent: false,
        fields: [{
          id: Math.random().toString(36).substr(2, 9),
          label: 'Course au Temps Juste (4 x 5\')',
          type: 'running_exact_time',
          options: { blockCount: 4, blockDurationSeconds: 300 }
        }]
      } as any);
    }

    let targetSession = actSessions.find(s => s.name.toLowerCase().includes('évaluation') || s.isEvaluationSession) || actSessions[0];

    if (!targetSession) {
      const newSessId = Math.random().toString(36).substr(2, 9);
      addSession({
        activityId: activity.id,
        name: 'Séance d\'Évaluation - Course au Temps Juste (4x5\')',
        date: new Date().toISOString(),
        feedback: 'Épreuve certificative Course au Temps Juste (4 x 5\')',
        sheetId,
        isEvaluationSession: true
      });
      await saveStudentFullObservation(newSessId, studentId, { [sheetId]: data });
    } else {
      await saveStudentFullObservation(targetSession.id, studentId, { [sheetId || targetSession.sheetId || 'temps_juste']: data });
    }
  };

  // Ouvrir le modal d'édition directe des 4 blocs pour un élève
  const handleOpenEditBlocks = (student: Student) => {
    const studentObs = actObservations.filter(o => o.targetId === student.id);
    const summary = extractDemiFondTempsJusteData(studentObs);
    const initialBlocks = summary?.blocks && summary.blocks.length > 0 ? summary.blocks : [
      { blockIndex: 1, targetDistance: 800 },
      { blockIndex: 2, targetDistance: 800 },
      { blockIndex: 3, targetDistance: 800 },
      { blockIndex: 4, targetDistance: 800 }
    ];
    setEditingTempsJusteStudent(student);
    setEditingTempsJusteData({
      config: summary?.config || { blockCount: 4, blockDurationSeconds: 300, presetsDistances: [700, 750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200] },
      blocks: initialBlocks
    });
  };

  // Sauvegarder les données saisies dans le modal
  const handleSaveModalObservation = async (applyGrades: boolean) => {
    if (!editingTempsJusteStudent || !editingTempsJusteData) return;
    const stId = editingTempsJusteStudent.id;
    await handleSaveTempsJusteObservation(stId, editingTempsJusteData);

    if (applyGrades) {
      // Re-calculer les notes à partir des données éditées
      const fakeObs = [{
        id: 'tmp',
        sessionId: 'tmp',
        targetId: stId,
        date: new Date().toISOString(),
        data: { val: editingTempsJusteData }
      }] as any;
      const summary = extractDemiFondTempsJusteData(fakeObs);
      if (summary) {
        const { scores, appreciation } = computeTempsJusteOfficialGrades(summary);
        handleApplyTempsJusteScores(stId, scores, appreciation);
      }
    }

    setEditingTempsJusteStudent(null);
    setEditingTempsJusteData(null);
  };

  // Appliquer le barème Temps Juste à toute la classe en 1 clic
  const handleApplyTempsJusteAllStudents = () => {
    let anyChanged = false;
    const nextGrades = { ...localGrades };
    const nextAppreciations = { ...localAppreciations };

    parentClass.students.forEach(st => {
      const studentObs = actObservations.filter(o => o.targetId === st.id);
      const tempsJuste = extractDemiFondTempsJusteData(studentObs);
      if (tempsJuste && tempsJuste.completedBlocks > 0) {
        const studentG = { ...(nextGrades[st.id] || {}) };
        const { scores, appreciation } = computeTempsJusteOfficialGrades(tempsJuste);

        criteria.forEach((c, idx) => {
          const lbl = c.label.toLowerCase();
          if (lbl.includes('régul') || lbl.includes('allure') || lbl.includes('marche') || lbl.includes('tm') || idx === 0) {
            studentG[c.id] = Math.min(c.maxScore, scores.regularity);
          } else if (lbl.includes('perf') || lbl.includes('vitesse') || lbl.includes('distance') || idx === 1) {
            studentG[c.id] = Math.min(c.maxScore, scores.performance);
          } else if (lbl.includes('lucid') || lbl.includes('régulat') || lbl.includes('contrat') || idx === 2) {
            studentG[c.id] = Math.min(c.maxScore, scores.lucidity);
          } else if (lbl.includes('observ') || lbl.includes('pilote') || lbl.includes('rôle') || idx === 3) {
            studentG[c.id] = Math.min(c.maxScore, scores.observer);
          }
        });

        nextGrades[st.id] = studentG;

        if (!nextAppreciations[st.id]) {
          nextAppreciations[st.id] = appreciation;
        }
        anyChanged = true;
      }
    });

    if (anyChanged) {
      setLocalGrades(nextGrades);
      setLocalAppreciations(nextAppreciations);
      handleSaveAll(nextGrades, nextAppreciations, criteria);
    }
  };

  // Save changes
  const handleSaveAll = (updatedGrades = localGrades, updatedAppreciations = localAppreciations, updatedCriteria = criteria) => {
    setSaveStatus('saving');
    updateActivity(activity.id, {
      grades: updatedGrades,
      studentAppreciations: updatedAppreciations,
      evaluationCriteria: updatedCriteria,
      evaluationDate: new Date().toISOString()
    });
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 300);
  };

  // Change a single score
  const handleScoreChange = (studentId: string, criterionId: string, val: string | number) => {
    setLocalGrades(prev => {
      const studentG = { ...(prev[studentId] || {}) };
      if (val === '' || val === null || val === undefined) {
        delete studentG[criterionId];
      } else {
        studentG[criterionId] = val;
      }
      const next = { ...prev, [studentId]: studentG };
      handleSaveAll(next, localAppreciations, criteria);
      return next;
    });
  };

  // Set student status: 'present' | 'absent' | 'dispense'
  const handleSetStudentStatus = (studentId: string, status: 'present' | 'absent' | 'dispense') => {
    setLocalGrades(prev => {
      const studentG = { ...(prev[studentId] || {}) };
      if (status === 'absent') {
        criteria.forEach(c => { studentG[c.id] = 'A'; });
      } else if (status === 'dispense') {
        criteria.forEach(c => { studentG[c.id] = 'D'; });
      } else {
        criteria.forEach(c => {
          if (studentG[c.id] === 'A' || studentG[c.id] === 'D') {
            delete studentG[c.id];
          }
        });
      }
      const next = { ...prev, [studentId]: studentG };
      handleSaveAll(next, localAppreciations, criteria);
      return next;
    });
  };

  // Change appreciation
  const handleAppreciationChange = (studentId: string, text: string) => {
    setLocalAppreciations(prev => {
      const next = { ...prev, [studentId]: text };
      handleSaveAll(localGrades, next, criteria);
      return next;
    });
  };

  // Suggest scores automatically for one student based on their observations
  const handleAutoSuggestForStudent = (studentId: string) => {
    const studentObs = actObservations.filter(o => o.targetId === studentId);
    let changed = false;
    const newGrades = { ...(localGrades[studentId] || {}) };

    criteria.forEach(crit => {
      const current = newGrades[crit.id];
      if (current === undefined || current === '' || current === null) {
        const suggested = suggestCriterionScoreFromObservations(crit, studentObs);
        if (suggested !== null) {
          newGrades[crit.id] = suggested;
          changed = true;
        }
      }
    });

    if (changed) {
      setLocalGrades(prev => {
        const next = { ...prev, [studentId]: newGrades };
        handleSaveAll(next, localAppreciations, criteria);
        return next;
      });
    }
  };

  // Suggest scores for the entire class
  const handleAutoSuggestAll = () => {
    let anyChanged = false;
    const nextGrades = { ...localGrades };

    parentClass.students.forEach(student => {
      const studentObs = actObservations.filter(o => o.targetId === student.id);
      const studentG = { ...(nextGrades[student.id] || {}) };
      let studentChanged = false;

      criteria.forEach(crit => {
        const current = studentG[crit.id];
        if (current === undefined || current === '' || current === null) {
          const suggested = suggestCriterionScoreFromObservations(crit, studentObs);
          if (suggested !== null) {
            studentG[crit.id] = suggested;
            studentChanged = true;
          }
        }
      });

      if (studentChanged) {
        nextGrades[student.id] = studentG;
        anyChanged = true;
      }
    });

    if (anyChanged) {
      setLocalGrades(nextGrades);
      handleSaveAll(nextGrades, localAppreciations, criteria);
    }
    setShowAutoSuggestModal(false);
  };

  // Export CSV
  const handleExportCsv = () => {
    const csvContent = exportEvaluationToCsv(activity, parentClass, criteria, studentsSummaries);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Evaluation_${parentClass.name}_${activity.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print trigger
  const handlePrint = (mode: 'summary' | 'bulletins') => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // CA Info badge helper
  const getCaBadge = (ca?: number) => {
    switch (ca) {
      case 1: return { label: 'CA 1 • Performance mesurée', color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 2: return { label: 'CA 2 • Adaptation en milieu variable', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 3: return { label: 'CA 3 • Prestation artistique', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 4: return { label: 'CA 4 • Affrontement collectif / duel', color: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 5: return { label: 'CA 5 • Entretien et santé', color: 'bg-rose-100 text-rose-800 border-rose-200' };
      default: return { label: 'Cycle EPS', color: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  const caInfo = getCaBadge(activity.ca);

  // Current selected student summary for individual view
  const currentStudentSummary = studentsSummaries.find(s => s.studentId === selectedStudentId);
  const currentStudentObs = useMemo(() => {
    return actObservations.filter(o => o.targetId === selectedStudentId);
  }, [actObservations, selectedStudentId]);

  const currentStudentIndex = parentClass.students.findIndex(s => s.id === selectedStudentId);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
            <Link to={`/evaluation?classId=${parentClass.id}`} className="hover:text-amber-600 transition-colors flex items-center gap-1 font-bold text-amber-700">
              <ChevronLeft className="w-3.5 h-3.5" />
              Évaluations {parentClass.name}
            </Link>
            <span>•</span>
            <Link to={`/activity/${activity.id}`} className="hover:text-blue-600 transition-colors">
              Cycle : {activity.name}
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Mode Évaluation
                </h1>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${caInfo.color}`}>
                  {caInfo.label}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Grille certificative de fin de cycle, barème de compétences et saisie des notes pour {parentClass.name}.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveCurrentToBank}
            className={`text-xs transition-all ${
              savedToBankSuccess 
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold' 
                : 'text-indigo-700 bg-indigo-50/60 border-indigo-200 hover:bg-indigo-100'
            }`}
            title="Enregistrer cette évaluation et ses critères dans votre Banque d'évaluations réutilisables"
          >
            {savedToBankSuccess ? (
              <>
                <BookmarkCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                Enregistré dans la banque !
              </>
            ) : (
              <>
                <BookmarkPlus className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                Enregistrer dans la Banque
              </>
            )}
          </Button>

          {/* Bouton phare : Mode Observateur Terrain */}
          <Button
            size="sm"
            onClick={() => setIsFastObservationModalOpen(true)}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-xs ring-1 ring-emerald-500/30"
            title="Observer directement ce que font les élèves sur le terrain (paliers 1 à 4) avec conversion instantanée en note /20"
          >
            <Eye className="w-4 h-4 mr-1.5" />
            Mode Observateur Terrain
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCriteriaModalOpen(true)}
            className="text-xs text-amber-700 bg-amber-50/60 border-amber-200 hover:bg-amber-100"
          >
            <Settings className="w-3.5 h-3.5 mr-1 text-amber-600" />
            Barème ({criteria.length})
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAutoSuggestModal(true)}
            className="text-xs text-indigo-700 bg-indigo-50/60 border-indigo-200 hover:bg-indigo-100"
            title="Suggérer automatiquement les notes à partir des observations récoltées"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-600" />
            Aide aux notes
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="text-xs text-emerald-700 bg-emerald-50/60 border-emerald-200 hover:bg-emerald-100"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            Export Pronote (CSV)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePrint('summary')}
            className="text-xs text-slate-700 border-slate-300 hover:bg-slate-100"
          >
            <Printer className="w-3.5 h-3.5 mr-1" />
            Imprimer bordereau
          </Button>

          <Button
            size="sm"
            onClick={() => handleSaveAll()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
          >
            {saveStatus === 'saving' ? (
              <span className="flex items-center gap-1">Enregistrement...</span>
            ) : saveStatus === 'saved' ? (
              <span className="flex items-center gap-1 text-emerald-200">
                <Check className="w-3.5 h-3.5" /> Enregistré !
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Save className="w-3.5 h-3.5 mr-1" /> Sauvegarder
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* BANNIÈRE SPÉCIALE DEMI-FOND : COURSE AU TEMPS JUSTE (4 x 5') */}
      {isDemiFond && (
        <Card className="border-amber-300 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-white shadow-sm overflow-hidden print:hidden">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Timer className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base text-slate-900">
                    Épreuve Certificative Demi-Fond : Course au Temps Juste (4 x 5')
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                    Situation Officielle
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Évaluation basée sur les 4 blocs de 5 min : Temps de Marche (TM &lt; 30s), Vitesse réelle de course (km/h), Lucidité de régulation du contrat et Rôle d'observateur.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Button
                size="sm"
                onClick={() => setActiveTab('tempsJuste')}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs"
              >
                <Timer className="w-3.5 h-3.5 mr-1" />
                Grille Évaluation Temps Juste (4x5')
              </Button>
              {!hasTempsJusteSheet && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddTempsJusteSituation}
                  className="text-xs text-amber-800 bg-white border-amber-300 hover:bg-amber-50 font-bold"
                >
                  + Ajouter la situation (4x5') au cycle
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleSetOfficialTempsJusteCriteria}
                className="bg-white hover:bg-amber-50 text-amber-900 border-amber-300 text-xs font-bold shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-600" />
                Charger le barème Temps Juste (4 critères /20)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 print:hidden">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-blue-500" /> Notés
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {stats.evaluatedStudents}
            </span>
            <span className="text-xs text-slate-400">/ {stats.totalStudents}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${stats.totalStudents > 0 ? (stats.evaluatedStudents / stats.totalStudents) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <BarChart3 className="w-3.5 h-3.5 text-indigo-500" /> Moyenne
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black text-indigo-600 font-mono">
              {stats.classAverageOn20 !== null ? stats.classAverageOn20.toFixed(1) : '-'}
            </span>
            <span className="text-xs text-slate-400 font-medium">/ 20</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 truncate">Moyenne de classe</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Note Max
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black text-emerald-600 font-mono">
              {stats.maxNoteOn20 !== null ? stats.maxNoteOn20.toFixed(1) : '-'}
            </span>
            <span className="text-xs text-slate-400">/ 20</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">
            Min : {stats.minNoteOn20 !== null ? `${stats.minNoteOn20.toFixed(1)}/20` : '-'}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" /> Réussite
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black text-teal-600 font-mono">
              {stats.successRate}%
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">Note ≥ 10/20</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <UserX className="w-3.5 h-3.5 text-red-500" /> Absents (A)
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className={`text-2xl font-black font-mono ${stats.absentStudents > 0 ? 'text-red-600' : 'text-slate-400'}`}>
              {stats.absentStudents}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">Sans note certificative</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" /> Dispensés (D)
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className={`text-2xl font-black font-mono ${stats.dispenseStudents > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
              {stats.dispenseStudents}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">Certificat médical</span>
        </div>
      </div>

      {/* NAVIGATION TABS (Grille Classe vs Temps Juste vs Fiche Individuelle vs Statistiques) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('grid')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'grid'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Tableau Classe (Grille)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tempsJuste')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'tempsJuste'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Timer className={`w-4 h-4 ${activeTab === 'tempsJuste' ? 'text-white' : 'text-amber-600'}`} />
            <span>Épreuve Course au Temps Juste (4x5')</span>
            {isDemiFond && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === 'tempsJuste' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900'
              }`}>
                Épreuve
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('student')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'student'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Fiche Individuelle (Pas-à-pas)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'stats'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Statistiques & Bilan</span>
          </button>
        </div>

        {/* Filters and search for Grid mode */}
        {activeTab === 'grid' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Chercher un élève..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as any)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
            >
              <option value="all">Tous ({studentsSummaries.length})</option>
              <option value="evaluated">Notés ({stats.evaluatedStudents})</option>
              <option value="pending">À noter ({stats.totalStudents - stats.evaluatedStudents - stats.absentStudents - stats.dispenseStudents})</option>
              <option value="absent">Absents / Dispensés ({stats.absentStudents + stats.dispenseStudents})</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: GRILLE DE NOTATION CLASSE */}
      {activeTab === 'grid' && (
        <Card className="border-slate-200 shadow-sm overflow-hidden print:hidden">
          {conversionToast && (
            <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-xs font-bold text-emerald-900 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                {conversionToast}
              </span>
              <button 
                onClick={() => setConversionToast(null)} 
                className="text-emerald-700 hover:text-emerald-950 font-bold ml-2 text-sm"
              >
                ×
              </button>
            </div>
          )}

          <CardHeader className="bg-slate-50/70 border-b border-slate-200 p-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                  Grille d'observation & d'évaluation ({filteredSummaries.length} élèves affichés)
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  {gridDisplayMode === 'observation' 
                    ? 'Sélectionnez les paliers observables (ce qui est fait). L\'application calcule et applique directement la note selon le barème.'
                    : 'Mode saisie chiffrée directe par critère avec calcul automatique de la note finale /20.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                {/* Switcher Mode Observation / Mode Chiffré */}
                <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-white shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setGridDisplayMode('observation')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      gridDisplayMode === 'observation'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Observer ce que fait l'élève (paliers 1 à 4) et convertir en note"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Paliers observés (1 à 4)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGridDisplayMode('numeric')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      gridDisplayMode === 'numeric'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Saisie chiffrée manuelle"
                  >
                    <span>🔢 Chiffres</span>
                  </button>
                </div>

                {/* Bouton Mode Terrain direct */}
                <Button
                  size="sm"
                  onClick={() => setIsFastObservationModalOpen(true)}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-2xs"
                  title="Ouvrir le mode observateur plein écran pour observer ce que font les élèves"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  Mode Terrain
                </Button>

                {/* Bouton Magique : Transformer les observations de terrain en notes */}
                <Button
                  size="sm"
                  onClick={handleTransformFieldObservationsToGrades}
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-2xs"
                  title="Transformer les observations réelles prises pendant les séances (Temps Juste, compteurs, chronos) en notes selon le barème"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-300" />
                  Convertir observations terrain
                </Button>

                <button
                  type="button"
                  onClick={() => setShowRubricLegend(v => !v)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border flex items-center gap-1 ${
                    showRubricLegend
                      ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                  title="Afficher les repères d'observation (ce qui est fait) pour chaque palier"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>{showRubricLegend ? 'Masquer repères' : 'Repères d\'observation'}</span>
                </button>

                <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200">
                  Barème : {criteria.reduce((acc, c) => acc + (c.maxScore * c.weight), 0)} pts max
                </span>
              </div>
            </div>
          </CardHeader>

          {/* RUBRIC LEGEND (CE QUI EST FAIT ➔ POINTS BARÈME) */}
          {showRubricLegend && (
            <div className="p-4 bg-gradient-to-r from-amber-50/50 via-slate-50 to-indigo-50/50 border-b border-slate-200 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Repères d'observation du barème (« Ce qui est fait sur le terrain » ➔ Note calculée)
                </span>
                <span className="text-[11px] text-slate-500">
                  Cliquez sur un palier dans le tableau ou ouvrez l'œil pour évaluer un élève.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {criteria.map((crit, cIdx) => {
                  const levels = getCriterionLevels(crit);
                  return (
                    <div key={crit.id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 font-black text-[10px] flex items-center justify-center shrink-0">
                            {cIdx + 1}
                          </span>
                          <span className="font-bold text-xs text-slate-900 truncate" title={crit.label}>
                            {crit.label}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 shrink-0">
                          /{crit.maxScore} pts
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {levels.map(lvl => {
                          const badgeColor = lvl.level === 1
                            ? 'bg-red-100 text-red-800 border-red-200'
                            : lvl.level === 2
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : lvl.level === 3
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-indigo-100 text-indigo-800 border-indigo-200';

                          return (
                            <div key={lvl.level} className="text-[11px] p-1.5 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span className={`text-[9px] font-black uppercase px-1 py-0.2 rounded border ${badgeColor}`}>
                                  P{lvl.level} • {lvl.label}
                                </span>
                                <span className="font-mono font-bold text-[10px] text-indigo-700">
                                  {lvl.points} pts
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-600 line-clamp-2 leading-tight">
                                « {lvl.descriptor} »
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[70vh]">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[11px] sticky top-0 z-10 shadow-xs border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-bold w-12 text-center">N°</th>
                    <th className="px-4 py-3 font-bold min-w-[160px]">Élève</th>
                    <th className="px-3 py-3 font-bold text-center w-28">Statut</th>
                    {criteria.map((crit, idx) => (
                      <th key={crit.id} className="px-3 py-3 font-bold text-center min-w-[110px] bg-slate-50">
                        <div className="truncate max-w-[130px] font-black text-slate-900" title={crit.label}>
                          {crit.label}
                        </div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          /{crit.maxScore} (coeff {crit.weight})
                        </div>
                      </th>
                    ))}
                    <th className="px-3 py-3 font-bold text-center w-24 bg-indigo-50/80 text-indigo-900 border-l border-indigo-100">
                      Total brut
                    </th>
                    <th className="px-3 py-3 font-bold text-center w-28 bg-indigo-100/80 text-indigo-950 font-black">
                      Note /20
                    </th>
                    <th className="px-3 py-3 font-bold text-center min-w-[130px]">
                      Niveau socle
                    </th>
                    <th className="px-4 py-3 font-bold min-w-[200px]">
                      Appréciation pédagogique
                    </th>
                    {isDemiFond && (
                      <th className="px-3 py-3 font-bold text-center min-w-[130px] bg-amber-50 text-amber-950 border-l border-amber-200">
                        Temps Juste (4x5')
                      </th>
                    )}
                    <th className="px-3 py-3 font-bold text-center w-16">Fiche</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredSummaries.map((summary, index) => {
                    const isAbsent = summary.status === 'absent';
                    const isDispense = summary.status === 'dispense';

                    return (
                      <tr 
                        key={summary.studentId}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isAbsent ? 'bg-red-50/20' : isDispense ? 'bg-amber-50/20' : ''
                        }`}
                      >
                        <td className="px-4 py-2.5 text-center font-bold text-slate-400 font-mono">
                          {index + 1}
                        </td>

                        <td className="px-4 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStudentId(summary.studentId);
                              setActiveTab('student');
                            }}
                            className="hover:text-indigo-600 hover:underline text-left"
                          >
                            {summary.studentName}
                          </button>
                        </td>

                        {/* Statut buttons: P / A / D */}
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                            <button
                              type="button"
                              onClick={() => handleSetStudentStatus(summary.studentId, 'present')}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                                !isAbsent && !isDispense
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'text-slate-500 hover:text-slate-900'
                              }`}
                              title="Présent / Évalué"
                            >
                              P
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetStudentStatus(summary.studentId, 'absent')}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                                isAbsent
                                  ? 'bg-red-600 text-white shadow-xs'
                                  : 'text-slate-500 hover:text-red-600'
                              }`}
                              title="Absent (A)"
                            >
                              A
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetStudentStatus(summary.studentId, 'dispense')}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                                isDispense
                                  ? 'bg-amber-600 text-white shadow-xs'
                                  : 'text-slate-500 hover:text-amber-600'
                              }`}
                              title="Dispensé (D)"
                            >
                              D
                            </button>
                          </div>
                        </td>

                        {/* Criteria Inputs */}
                        {criteria.map(crit => {
                          const val = summary.scores[crit.id];
                          const isSpecial = val === 'A' || val === 'D';
                          const levels = getCriterionLevels(crit);

                          return (
                            <td key={crit.id} className="px-2 py-2 text-center bg-slate-50/40">
                              {isSpecial ? (
                                <span className={`inline-block px-2 py-1 rounded font-bold font-mono text-[11px] ${
                                  val === 'A' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {val}
                                </span>
                              ) : gridDisplayMode === 'observation' ? (
                                <div className="flex flex-col items-center gap-1.5 py-1">
                                  {/* 4 Paliers d'observation : 1 (Insuffisant), 2 (Fragile), 3 (Satisfaisant), 4 (Très bon) */}
                                  <div className="flex items-center gap-1">
                                    {levels.map(lvl => {
                                      const isSelected = typeof val === 'number' && Math.abs(val - lvl.points) < 0.1;
                                      const colorClass = lvl.level === 1 
                                        ? (isSelected ? 'bg-red-600 text-white font-black shadow-xs ring-1 ring-red-400' : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200')
                                        : lvl.level === 2
                                        ? (isSelected ? 'bg-amber-600 text-white font-black shadow-xs ring-1 ring-amber-400' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200')
                                        : lvl.level === 3
                                        ? (isSelected ? 'bg-emerald-600 text-white font-black shadow-xs ring-1 ring-emerald-400' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200')
                                        : (isSelected ? 'bg-indigo-600 text-white font-black shadow-xs ring-1 ring-indigo-400' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200');

                                      return (
                                        <button
                                          key={lvl.level}
                                          type="button"
                                          onClick={() => handleScoreChange(summary.studentId, crit.id, lvl.points)}
                                          title={`Palier ${lvl.level} (${lvl.label})\nCe qui est fait : « ${lvl.descriptor} »\nNote correspondante : ${lvl.points}/${crit.maxScore} pts`}
                                          className={`w-6 h-6 rounded-md text-[11px] font-black transition-all ${colorClass}`}
                                        >
                                          {lvl.level}
                                        </button>
                                      );
                                    })}
                                  </div>

                                  {/* Points calculés et bouton Observer */}
                                  <div className="flex items-center gap-1.5">
                                    <span className={`font-mono font-black text-xs ${typeof val === 'number' ? 'text-slate-900' : 'text-slate-400'}`}>
                                      {typeof val === 'number' ? `${val}` : '—'}
                                    </span>
                                    <span className="text-[10px] text-slate-400">/{crit.maxScore}</span>
                                    <button
                                      type="button"
                                      onClick={() => setObservingModalState({
                                        studentId: summary.studentId,
                                        studentName: summary.studentName,
                                        criterion: crit
                                      })}
                                      className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                                      title="Ouvrir la fiche d'observation détaillée pour ce critère"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center">
                                  <input
                                    type="number"
                                    min={0}
                                    max={crit.maxScore}
                                    step={0.5}
                                    value={val !== undefined ? val : ''}
                                    placeholder={`/${crit.maxScore}`}
                                    onChange={e => {
                                      const raw = e.target.value;
                                      if (raw === '') {
                                        handleScoreChange(summary.studentId, crit.id, '');
                                      } else {
                                        const num = Math.max(0, Math.min(crit.maxScore, parseFloat(raw)));
                                        handleScoreChange(summary.studentId, crit.id, num);
                                      }
                                    }}
                                    className="w-16 h-8 text-center text-xs font-bold font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                                  />
                                </div>
                              )}
                            </td>
                          );
                        })}

                        {/* Total brut */}
                        <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-700 border-l border-indigo-50 bg-indigo-50/20">
                          {isAbsent ? 'A' : isDispense ? 'D' : `${summary.totalWeightedScore} / ${summary.maxWeightedScore}`}
                        </td>

                        {/* Note sur 20 */}
                        <td className="px-3 py-2.5 text-center font-mono font-black text-sm bg-indigo-100/50">
                          {summary.scoreOn20 !== null ? (
                            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded font-black text-sm ${
                              summary.scoreOn20 >= 14 ? 'text-emerald-700 bg-emerald-100/80' :
                              summary.scoreOn20 >= 10 ? 'text-indigo-800 bg-indigo-200/80' :
                              'text-red-700 bg-red-100/80'
                            }`}>
                              {summary.scoreOn20.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Niveau socle */}
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          {summary.scoreOn20 !== null ? (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${summary.competenceLevel.bgClass} ${summary.competenceLevel.colorClass} ${summary.competenceLevel.borderClass}`}>
                              {summary.competenceLevel.label}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Appréciation rapide */}
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={summary.appreciation || ''}
                            onChange={e => handleAppreciationChange(summary.studentId, e.target.value)}
                            placeholder="Appréciation, points forts, progrès..."
                            className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                          />
                        </td>

                        {/* Colonne Temps Juste (4x5') pour Demi-Fond */}
                        {isDemiFond && (
                          <td className="px-3 py-2 text-center whitespace-nowrap bg-amber-50/20 border-l border-amber-100">
                            {(() => {
                              const tjItem = studentsTempsJusteList.find(t => t.student.id === summary.studentId);
                              if (tjItem?.summary && tjItem.summary.completedBlocks > 0) {
                                return (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <span className="font-mono font-bold text-slate-800 text-[11px]">
                                      {tjItem.summary.realSpeedKmH} km/h
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditBlocks(tjItem.student)}
                                      className="p-1 text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded"
                                      title="Modifier les 4 blocs"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                );
                              }
                              return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const st = parentClass.students.find(s => s.id === summary.studentId);
                                    if (st) handleOpenEditBlocks(st);
                                  }}
                                  className="text-[10px] text-amber-700 hover:underline font-bold"
                                >
                                  + Saisir blocs
                                </button>
                              );
                            })()}
                          </td>
                        )}

                        {/* Action Fiche */}
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStudentId(summary.studentId);
                              setActiveTab('student');
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Ouvrir la fiche d'évaluation détaillée"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* TABLE FOOTER : MOYENNES DE CLASSE PAR CRITÈRE */}
                <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-800 text-[11px] sticky bottom-0 z-10 shadow-md">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right uppercase tracking-wider font-black">
                      Moyenne de la classe :
                    </td>
                    {criteria.map(crit => {
                      const avgObj = stats.criteriaAverages[crit.id];
                      return (
                        <td key={crit.id} className="px-2 py-3 text-center font-mono font-black text-indigo-700 bg-indigo-50/50">
                          {avgObj && avgObj.count > 0 ? (
                            <span>{avgObj.avg.toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">/{crit.maxScore}</span></span>
                          ) : '-'}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-center font-mono text-slate-500 bg-indigo-50/50">
                      -
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-black text-sm text-indigo-900 bg-indigo-200/80">
                      {stats.classAverageOn20 !== null ? `${stats.classAverageOn20.toFixed(1)} / 20` : '-'}
                    </td>
                    <td colSpan={isDemiFond ? 4 : 3} className="px-4 py-3 text-xs text-slate-500 font-normal">
                      {stats.evaluatedStudents} élève(s) pris en compte dans la moyenne
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 2: FICHE INDIVIDUELLE (PAS-À-PAS) */}
      {activeTab === 'student' && currentStudentSummary && (
        <div className="space-y-6 print:hidden">
          {/* Student Selector Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                disabled={currentStudentIndex <= 0}
                onClick={() => {
                  if (currentStudentIndex > 0) {
                    setSelectedStudentId(parentClass.students[currentStudentIndex - 1].id);
                  }
                }}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Précédent
              </Button>

              <select
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(e.target.value)}
                className="flex-1 sm:w-64 font-bold text-sm bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
              >
                {parentClass.students.map((st, idx) => {
                  const s = studentsSummaries.find(sm => sm.studentId === st.id);
                  const note = s?.scoreOn20 !== null ? `${s?.scoreOn20} / 20` : 'Non noté';
                  return (
                    <option key={st.id} value={st.id}>
                      {idx + 1}. {st.name} — {note}
                    </option>
                  );
                })}
              </select>

              <Button
                variant="outline"
                size="sm"
                disabled={currentStudentIndex >= parentClass.students.length - 1}
                onClick={() => {
                  if (currentStudentIndex < parentClass.students.length - 1) {
                    setSelectedStudentId(parentClass.students[currentStudentIndex + 1].id);
                  }
                }}
              >
                Suivant <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-medium">Statut :</span>
                <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => handleSetStudentStatus(selectedStudentId, 'present')}
                    className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                      currentStudentSummary.status !== 'absent' && currentStudentSummary.status !== 'dispense'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Présent
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetStudentStatus(selectedStudentId, 'absent')}
                    className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                      currentStudentSummary.status === 'absent'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-red-600'
                    }`}
                  >
                    Absent (A)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetStudentStatus(selectedStudentId, 'dispense')}
                    className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                      currentStudentSummary.status === 'dispense'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-amber-600'
                    }`}
                  >
                    Dispensé (D)
                  </button>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAutoSuggestForStudent(selectedStudentId)}
                className="text-xs text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                Suggérer pour cet élève
              </Button>
            </div>
          </div>

          {/* Student Header Card with Score */}
          <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-indigo-300 text-xs font-bold uppercase tracking-wider">
                  Évaluation individuelle • {parentClass.name}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/20">
                  {currentStudentIndex + 1} / {parentClass.students.length}
                </span>
              </div>
              <h2 className="text-3xl font-black">{currentStudentSummary.studentName}</h2>
              <p className="text-xs text-indigo-200">
                Cycle : {activity.name} ({caInfo.label}) • {currentStudentObs.length} relevé(s) d'observation au cours du cycle
              </p>
            </div>

            {/* Final Grade Widget */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center gap-5 min-w-[240px]">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-indigo-200 font-bold block">
                  Note certificative
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-4xl font-black font-mono text-white">
                    {currentStudentSummary.scoreOn20 !== null ? currentStudentSummary.scoreOn20.toFixed(1) : '-'}
                  </span>
                  <span className="text-sm text-indigo-200 font-bold">/ 20</span>
                </div>
              </div>

              <div className="h-10 w-px bg-white/20" />

              <div>
                <span className="text-[10px] uppercase tracking-wider text-indigo-200 font-bold block">
                  Niveau atteint
                </span>
                <span className={`inline-block mt-1 text-xs font-bold px-2.5 py-1 rounded-full border ${currentStudentSummary.competenceLevel.bgClass} ${currentStudentSummary.competenceLevel.colorClass} ${currentStudentSummary.competenceLevel.borderClass}`}>
                  {currentStudentSummary.competenceLevel.label}
                </span>
              </div>
            </div>
          </div>

          {/* Situation spécifique d'évaluation : Demi-Fond Course au Temps Juste (4 x 5') */}
          {isDemiFond && currentStudent && (
            <DemiFondTempsJusteEvaluationCard
              student={currentStudent}
              summary={currentStudentTempsJuste}
              onApplyScores={(scores, appreciation) => handleApplyTempsJusteScores(currentStudent.id, scores, appreciation)}
              onSaveObservationData={(data) => handleSaveTempsJusteObservation(currentStudent.id, data)}
            />
          )}

          {/* Criteria Evaluation List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                Critères d'évaluation du cycle ({criteria.length})
              </h3>
              <span className="text-xs text-slate-500">
                Pondération totale : {currentStudentSummary.totalWeightedScore} / {currentStudentSummary.maxWeightedScore} pts
              </span>
            </div>

            <div className="grid gap-4">
              {criteria.map((crit, cIdx) => {
                const rawVal = currentStudentSummary.scores[crit.id];
                const currentScore = typeof rawVal === 'number' ? rawVal : (rawVal === '' ? null : rawVal);
                const levels = getCriterionLevels(crit);

                return (
                  <Card key={crit.id} className="border-slate-200 shadow-sm overflow-hidden">
                    <CardContent className="p-5 space-y-4">
                      {/* Criterion Header */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center font-black text-xs shrink-0">
                              {cIdx + 1}
                            </span>
                            <h4 className="font-bold text-base text-slate-900">{crit.label}</h4>
                            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                              Barème : /{crit.maxScore} (coeff {crit.weight})
                            </span>
                          </div>
                          {crit.description && (
                            <p className="text-xs text-slate-500 ml-8">{crit.description}</p>
                          )}
                        </div>

                        {/* Current Score Badge & Manual Fine-tuning */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                            <span className="text-xs font-bold text-slate-500">Note :</span>
                            <span className="text-base font-black font-mono text-indigo-700">
                              {currentScore !== null ? currentScore : '—'}
                            </span>
                            <span className="text-xs text-slate-400">/{crit.maxScore}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              max={crit.maxScore}
                              step={0.5}
                              value={currentScore !== null && currentScore !== undefined ? currentScore : ''}
                              placeholder="Ajuster"
                              onChange={e => {
                                const val = e.target.value;
                                if (val === '') {
                                  handleScoreChange(selectedStudentId, crit.id, '');
                                } else {
                                  handleScoreChange(selectedStudentId, crit.id, Math.max(0, Math.min(crit.maxScore, parseFloat(val))));
                                }
                              }}
                              className="w-16 h-8 text-center font-bold font-mono text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                              title="Ajustement chiffré fin si souhaité"
                            />
                          </div>
                        </div>
                      </div>

                      {/* OBSERVATION GRID : 4 Paliers observables de ce qui est fait */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Observation de ce qui est fait sur le terrain (l'application calcule la note correspondante) :
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {levels.map(lvl => {
                            const isSelected = typeof currentScore === 'number' && Math.abs(currentScore - lvl.points) < 0.1;
                            const badgeColors = lvl.level === 1 
                              ? 'bg-red-100 text-red-800 border-red-300' 
                              : lvl.level === 2 
                              ? 'bg-amber-100 text-amber-800 border-amber-300' 
                              : lvl.level === 3 
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                              : 'bg-indigo-100 text-indigo-800 border-indigo-300';

                            return (
                              <div
                                key={lvl.level}
                                onClick={() => handleScoreChange(selectedStudentId, crit.id, lvl.points)}
                                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group ${
                                  isSelected 
                                    ? 'bg-indigo-50/70 border-indigo-500 shadow-xs ring-2 ring-indigo-500/20' 
                                    : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50/80'
                                }`}
                              >
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${badgeColors}`}>
                                      Palier {lvl.level} • {lvl.label}
                                    </span>
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                                      isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white text-transparent'
                                    }`}>
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    </div>
                                  </div>

                                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                    « {lvl.descriptor} »
                                  </p>
                                </div>

                                <div className="pt-2.5 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                  <span className="text-[10px] uppercase font-bold text-slate-400">Note barème</span>
                                  <span className="font-mono font-black text-indigo-700">
                                    {lvl.points} <span className="text-[10px] font-normal text-slate-400">/{crit.maxScore} pts</span>
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Teacher Appreciation & Feedback Section */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/70 border-b border-slate-200 p-4">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                Appréciation du professeur pour le bulletin / livret scolaire
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <textarea
                rows={3}
                value={currentStudentSummary.appreciation || ''}
                onChange={e => handleAppreciationChange(selectedStudentId, e.target.value)}
                placeholder="Rédigez l'appréciation pédagogique de l'élève (engagement, motricité, sécurité, perspectives)..."
                className="w-full text-sm p-3.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />

              {/* Quick tags */}
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                  Insérer une appréciation type en 1 clic :
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_APPRECIATIONS.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        const current = currentStudentSummary.appreciation || '';
                        const updated = current ? `${current} ${tag}` : tag;
                        handleAppreciationChange(selectedStudentId, updated);
                      }}
                      className="text-xs bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700 transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB : SITUATION ÉPREUVE COURSE AU TEMPS JUSTE (4 X 5') */}
      {activeTab === 'tempsJuste' && (
        <div className="space-y-6 print:hidden">
          {/* Situation Header Banner */}
          <Card className="border-amber-300 bg-gradient-to-br from-amber-500/15 via-white to-amber-50/50 shadow-sm overflow-hidden">
            <CardContent className="p-6 space-y-5">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shrink-0">
                    <Timer className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-slate-900">
                        Situation d'Évaluation Certificative : Course au Temps Juste (4 x 5')
                      </h2>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-300 uppercase tracking-wider">
                        Épreuve Officielle EPS
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
                      L'épreuve se compose de <strong>4 blocs de 5 minutes</strong>. L'élève annonce un contrat de distance pour chaque bloc. 
                      L'élève-observateur chronomètre le <strong>Temps de Course Effectif (TCE)</strong>. Si le <strong>Temps de Marche (TM &gt; 30s)</strong>, une <strong>alerte sur-régime</strong> impose une régulation (maintien ou réduction du contrat au bloc suivant).
                    </p>
                  </div>
                </div>

                {/* Top Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                  <Button
                    size="sm"
                    onClick={handleApplyTempsJusteAllStudents}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-sm"
                    title="Calculer et appliquer les notes /20 et appréciations pour tous les élèves ayant des relevés de course"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-200" />
                    ⚡ Évaluer toute la classe en 1 clic
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSetOfficialTempsJusteCriteria}
                    className="bg-white hover:bg-amber-50 text-amber-900 border-amber-300 text-xs font-bold shadow-2xs"
                  >
                    <Settings className="w-3.5 h-3.5 mr-1 text-amber-600" />
                    Appliquer le barème officiel (4 critères)
                  </Button>
                </div>
              </div>

              {/* 4 Official Criteria Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-amber-200/70">
                <div className="bg-white/80 p-3 rounded-xl border border-amber-200/80 shadow-2xs">
                  <div className="flex justify-between items-center text-xs font-bold text-amber-950">
                    <span className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px] flex items-center justify-center font-bold">1</span>
                      Régularité & Allure
                    </span>
                    <span className="font-mono text-amber-700 font-black">/ 6 pts</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Continuité d'effort sans marcher. TM &lt; 30s = 6 pts, Adaptatif = 5 pts, Décrochage = 2 à 4 pts.
                  </p>
                </div>

                <div className="bg-white/80 p-3 rounded-xl border border-amber-200/80 shadow-2xs">
                  <div className="flex justify-between items-center text-xs font-bold text-amber-950">
                    <span className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px] flex items-center justify-center font-bold">2</span>
                      Performance motrice
                    </span>
                    <span className="font-mono text-amber-700 font-black">/ 8 pts</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Vitesse réelle de course calculée sur le TCE uniquement (&ge;14.5 km/h = 8 pts, barème progressif).
                  </p>
                </div>

                <div className="bg-white/80 p-3 rounded-xl border border-amber-200/80 shadow-2xs">
                  <div className="flex justify-between items-center text-xs font-bold text-amber-950">
                    <span className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px] flex items-center justify-center font-bold">3</span>
                      Lucidité de régulation
                    </span>
                    <span className="font-mono text-amber-700 font-black">/ 4 pts</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Choix tactique d'adaptation du contrat en cas d'alerte sur-régime pour terminer sans marcher.
                  </p>
                </div>

                <div className="bg-white/80 p-3 rounded-xl border border-amber-200/80 shadow-2xs">
                  <div className="flex justify-between items-center text-xs font-bold text-amber-950">
                    <span className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px] flex items-center justify-center font-bold">4</span>
                      Rôle d'observateur
                    </span>
                    <span className="font-mono text-amber-700 font-black">/ 2 pts</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Rigueur du chronométrage TCE, calcul du temps de marche et conseil lucide prodigué au partenaire.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-amber-600" /> Relevés 4x5'
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {tempsJusteStats.evaluatedCount}
                </span>
                <span className="text-xs text-slate-400">/ {tempsJusteStats.total}</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1">Élèves avec données</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Réguliers (TM&lt;30s)
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-black text-emerald-700 font-mono">
                  {tempsJusteStats.regularCount}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1">Continuité exemplaire</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Lucides / Adaptatifs
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-black text-indigo-700 font-mono">
                  {tempsJusteStats.adaptiveCount}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1">Régulation réussie</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Sur-régime / Obstinés
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-black text-red-600 font-mono">
                  {tempsJusteStats.overpacedCount}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1">Marche répétée</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> Vitesse Moyenne
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {tempsJusteStats.avgSpeed > 0 ? tempsJusteStats.avgSpeed.toFixed(1) : '-'}
                </span>
                <span className="text-xs text-slate-400">km/h</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1">Vitesse réelle sur TCE</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Footprints className="w-3.5 h-3.5 text-blue-500" /> TM Moyen
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {tempsJusteStats.avgTm > 0 ? formatSecondsToMMSS(tempsJusteStats.avgTm) : '-'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1">Temps de marche cumulé</span>
            </div>
          </div>

          {/* Full Table of Students for Course au Temps Juste */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-200 p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Timer className="w-4 h-4 text-amber-600" />
                    Tableau d'évaluation de la classe • Course au Temps Juste (4 x 5')
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Visualisez les temps de course (TCE), temps de marche (TM), régulations et calculs automatiques des 4 critères officiels.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleApplyTempsJusteAllStudents}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    Appliquer les notes /20 à tous
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[70vh]">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[11px] sticky top-0 z-10 shadow-xs border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-3 font-bold w-12 text-center">N°</th>
                      <th className="px-4 py-3 font-bold min-w-[150px]">Élève</th>
                      <th className="px-3 py-3 font-bold text-center min-w-[130px]">Profil Course</th>
                      <th className="px-3 py-3 font-bold text-center min-w-[110px]">Contrat vs Réalisé</th>
                      <th className="px-3 py-3 font-bold text-center min-w-[90px]">TCE (Couru)</th>
                      <th className="px-3 py-3 font-bold text-center min-w-[90px]">TM (Marché)</th>
                      <th className="px-3 py-3 font-bold text-center min-w-[85px]">Vitesse Réelle</th>
                      <th className="px-3 py-3 font-bold text-center min-w-[170px]">Détail 4 Blocs</th>
                      <th className="px-3 py-3 font-bold text-center min-w-[120px] bg-amber-50/70 text-amber-950">
                        Barème Calculé
                      </th>
                      <th className="px-3 py-3 font-bold text-center w-24 bg-indigo-100/80 text-indigo-950 font-black">
                        Note /20
                      </th>
                      <th className="px-3 py-3 font-bold text-center min-w-[140px]">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {studentsTempsJusteList.map(item => {
                      const summary = item.summary;
                      const hasData = summary && summary.completedBlocks > 0;
                      const officialGrades = item.officialGrades;
                      const currentNoteOn20 = item.evalSummary.scoreOn20;

                      return (
                        <tr key={item.student.id} className="hover:bg-amber-50/30 transition-colors">
                          <td className="px-3 py-2.5 text-center font-bold text-slate-400 font-mono">
                            {item.index}
                          </td>

                          <td className="px-4 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStudentId(item.student.id);
                                setActiveTab('student');
                              }}
                              className="hover:text-indigo-600 hover:underline text-left"
                            >
                              {item.student.name}
                            </button>
                          </td>

                          {/* Profil Course */}
                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            {hasData ? (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                summary.profile === 'Régulier / Continu' 
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : summary.profile === 'Lucide / Adaptatif'
                                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                  : summary.profile === 'Sur-estimé / Obstiné'
                                  ? 'bg-red-50 text-red-800 border-red-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}>
                                {summary.profile}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                Non renseigné
                              </span>
                            )}
                          </td>

                          {/* Contrat vs Réalisé */}
                          <td className="px-3 py-2.5 text-center whitespace-nowrap font-mono">
                            {hasData ? (
                              <div>
                                <span className="font-bold text-slate-900">{summary.totalActualDistance}m</span>
                                <span className="text-[10px] text-slate-400 block">visé: {summary.totalTargetDistance}m</span>
                              </div>
                            ) : '-'}
                          </td>

                          {/* TCE */}
                          <td className="px-3 py-2.5 text-center whitespace-nowrap font-mono font-bold text-emerald-700">
                            {hasData ? formatSecondsToMMSS(summary.totalTceSeconds) : '-'}
                          </td>

                          {/* TM */}
                          <td className="px-3 py-2.5 text-center whitespace-nowrap font-mono">
                            {hasData ? (
                              <span className={summary.totalTmSeconds > 30 ? 'font-bold text-red-600' : 'text-slate-700'}>
                                {formatSecondsToMMSS(summary.totalTmSeconds)}
                                {summary.overpacedAlertCount > 0 && (
                                  <span className="text-[9px] block text-red-500 font-sans font-bold">
                                    {summary.overpacedAlertCount} alerte(s)
                                  </span>
                                )}
                              </span>
                            ) : '-'}
                          </td>

                          {/* Vitesse Réelle */}
                          <td className="px-3 py-2.5 text-center whitespace-nowrap font-mono font-bold text-indigo-700">
                            {hasData ? `${summary.realSpeedKmH} km/h` : '-'}
                          </td>

                          {/* 4 Blocs mini pill */}
                          <td className="px-3 py-2.5 text-center">
                            {hasData && summary.blocks ? (
                              <div className="flex items-center justify-center gap-1">
                                {summary.blocks.slice(0, 4).map((b: any, bIdx: number) => {
                                  const bTm = Math.max(0, 300 - (b.effectiveRunningTimeSeconds || 0));
                                  const isAlert = bTm > 30;
                                  return (
                                    <div 
                                      key={bIdx}
                                      className={`text-[9px] font-mono px-1 py-0.5 rounded border text-center ${
                                        isAlert ? 'bg-red-50 text-red-700 border-red-200 font-bold' : 'bg-slate-50 text-slate-700 border-slate-200'
                                      }`}
                                      title={`Bloc ${bIdx + 1} : Visé ${b.targetDistance}m, Réalisé ${b.actualDistance || 0}m, TM : ${formatSecondsToMMSS(bTm)}`}
                                    >
                                      B{bIdx + 1}:{b.actualDistance || 0}m
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-300">-</span>
                            )}
                          </td>

                          {/* Barème Calculé */}
                          <td className="px-3 py-2.5 text-center whitespace-nowrap bg-amber-50/40 font-mono text-[10px]">
                            {officialGrades ? (
                              <div className="space-y-0.5">
                                <span title="Régularité (sur 6)">Rég:{officialGrades.scores.regularity}/6</span> •{' '}
                                <span title="Performance (sur 8)">Perf:{officialGrades.scores.performance}/8</span>
                                <div className="text-[9px] text-slate-500">
                                  Luc:{officialGrades.scores.lucidity}/4 • Obs:{officialGrades.scores.observer}/2
                                </div>
                              </div>
                            ) : '-'}
                          </td>

                          {/* Note Finale /20 */}
                          <td className="px-3 py-2.5 text-center whitespace-nowrap bg-indigo-50/60 font-mono font-black text-sm">
                            {currentNoteOn20 !== null ? (
                              <span className="text-indigo-900">{currentNoteOn20.toFixed(1)} / 20</span>
                            ) : officialGrades ? (
                              <span className="text-amber-800" title="Note calculée à partir des 4 blocs">
                                {officialGrades.totalScoreOn20.toFixed(1)} <span className="text-[9px] text-amber-600 font-normal">calc.</span>
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs font-normal">Non noté</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenEditBlocks(item.student)}
                                className="h-7 px-2 text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200"
                                title="Saisir ou modifier les 4 blocs de 5 min pour cet élève"
                              >
                                <Edit3 className="w-3 h-3 mr-1" />
                                {hasData ? 'Modifier blocs' : 'Saisir 4 blocs'}
                              </Button>

                              {officialGrades && (
                                <Button
                                  size="sm"
                                  onClick={() => handleApplyTempsJusteScores(item.student.id, officialGrades.scores, officialGrades.appreciation)}
                                  className="h-7 px-2 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                                  title="Appliquer cette note officielle et appréciation au livret d'évaluation"
                                >
                                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                                  Valider /20
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: STATISTIQUES & ANALYSE DE CLASSE */}
      {activeTab === 'stats' && (
        <div className="space-y-6 print:hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Distribution des notes (Histogramme) */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50/70 border-b border-slate-200 p-4">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                  Répartition des notes sur 20 ({stats.evaluatedStudents} élèves)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                {[
                  { label: '< 8 / 20 (Insuffisant)', count: stats.distribution.under8, color: 'bg-red-500', text: 'text-red-700' },
                  { label: '8 à 9.9 / 20 (Fragile)', count: stats.distribution.from8to10, color: 'bg-amber-500', text: 'text-amber-700' },
                  { label: '10 à 11.9 / 20 (Moyen)', count: stats.distribution.from10to12, color: 'bg-blue-500', text: 'text-blue-700' },
                  { label: '12 à 13.9 / 20 (Satisfaisant)', count: stats.distribution.from12to14, color: 'bg-teal-500', text: 'text-teal-700' },
                  { label: '14 à 15.9 / 20 (Bon)', count: stats.distribution.from14to16, color: 'bg-emerald-500', text: 'text-emerald-700' },
                  { label: '16 à 20 / 20 (Très bon)', count: stats.distribution.above16, color: 'bg-indigo-600', text: 'text-indigo-700' },
                ].map(bracket => {
                  const pct = stats.evaluatedStudents > 0 ? Math.round((bracket.count / stats.evaluatedStudents) * 100) : 0;
                  return (
                    <div key={bracket.label} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-700">{bracket.label}</span>
                        <span className={bracket.text}>{bracket.count} élève(s) ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div 
                          className={`${bracket.color} h-3 rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Niveaux de maîtrise du Socle Commun */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50/70 border-b border-slate-200 p-4">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600" />
                  Niveaux de maîtrise du socle EPS (LSU / DNB)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {[
                  { level: 'Niveau 4', title: 'Très bonne maîtrise', count: stats.competenceCounts.veryGood, badge: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
                  { level: 'Niveau 3', title: 'Maîtrise satisfaisante', count: stats.competenceCounts.satisfactory, badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
                  { level: 'Niveau 2', title: 'Maîtrise fragile', count: stats.competenceCounts.fragile, badge: 'bg-amber-100 text-amber-800 border-amber-200' },
                  { level: 'Niveau 1', title: 'Maîtrise insuffisante', count: stats.competenceCounts.insufficient, badge: 'bg-red-100 text-red-800 border-red-200' },
                ].map(comp => {
                  const pct = stats.evaluatedStudents > 0 ? Math.round((comp.count / stats.evaluatedStudents) * 100) : 0;
                  return (
                    <div key={comp.level} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${comp.badge}`}>
                            {comp.level}
                          </span>
                          <span className="font-bold text-sm text-slate-900">{comp.title}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black font-mono text-slate-900">{comp.count}</span>
                        <span className="text-xs text-slate-400 ml-1">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Comparatif par critère */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/70 border-b border-slate-200 p-4">
              <CardTitle className="text-base font-bold text-slate-800">
                Moyenne de la classe critère par critère
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {criteria.map((crit, i) => {
                  const avgObj = stats.criteriaAverages[crit.id];
                  const avg = avgObj?.avg || 0;
                  const max = crit.maxScore;
                  const ratio = max > 0 ? Math.round((avg / max) * 100) : 0;

                  return (
                    <div key={crit.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                      <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                        Critère {i + 1}
                      </div>
                      <div className="font-bold text-sm text-slate-900 truncate" title={crit.label}>
                        {crit.label}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-indigo-700 font-mono">
                          {avg.toFixed(1)}
                        </span>
                        <span className="text-xs text-slate-400">/ {max} pts ({ratio}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-indigo-600 h-1.5 rounded-full" 
                          style={{ width: `${ratio}%` }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* PRINTABLE OFFICIAL SUMMARY SHEET (VISIBLE ONLY DURING PRINTING) */}
      <div className="hidden print:block font-sans text-black p-4">
        <div className="border-b-2 border-black pb-4 mb-4 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wider">
              Bordereau Officiel d'Évaluation Certificative EPS
            </h1>
            <div className="text-sm font-semibold mt-1">
              Classe : {parentClass.name} | Cycle : {activity.name} ({caInfo.label})
            </div>
            <div className="text-xs text-gray-600">
              Date : {new Date().toLocaleDateString('fr-FR')} | Enseignant d'EPS
            </div>
          </div>
          <div className="text-right text-xs">
            <div>Total élèves : {stats.totalStudents}</div>
            <div>Évalués : {stats.evaluatedStudents} | Absents : {stats.absentStudents} | Dispensés : {stats.dispenseStudents}</div>
            <div className="font-bold text-sm mt-1">Moyenne classe : {stats.classAverageOn20 !== null ? `${stats.classAverageOn20.toFixed(1)} / 20` : '-'}</div>
          </div>
        </div>

        <table className="w-full text-xs border border-collapse border-black">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black px-2 py-1 text-center w-8">N°</th>
              <th className="border border-black px-2 py-1 text-left min-w-[140px]">Nom et Prénom de l'élève</th>
              <th className="border border-black px-2 py-1 text-center w-12">Statut</th>
              {criteria.map(c => (
                <th key={c.id} className="border border-black px-1.5 py-1 text-center">
                  <div className="font-bold truncate max-w-[100px]">{c.label}</div>
                  <div className="text-[9px]">/{c.maxScore} (c{c.weight})</div>
                </th>
              ))}
              <th className="border border-black px-2 py-1 text-center font-bold w-16 bg-gray-200">Note /20</th>
              <th className="border border-black px-2 py-1 text-center w-24">Degré socle</th>
              <th className="border border-black px-2 py-1 text-left min-w-[160px]">Appréciation</th>
            </tr>
          </thead>
          <tbody>
            {studentsSummaries.map((s, idx) => (
              <tr key={s.studentId}>
                <td className="border border-black px-2 py-1 text-center font-mono">{idx + 1}</td>
                <td className="border border-black px-2 py-1 font-bold">{s.studentName}</td>
                <td className="border border-black px-2 py-1 text-center">
                  {s.status === 'absent' ? 'ABS' : s.status === 'dispense' ? 'DISP' : 'P'}
                </td>
                {criteria.map(c => (
                  <td key={c.id} className="border border-black px-1.5 py-1 text-center font-mono">
                    {s.scores[c.id] !== undefined ? s.scores[c.id] : '-'}
                  </td>
                ))}
                <td className="border border-black px-2 py-1 text-center font-black font-mono bg-gray-100">
                  {s.scoreOn20 !== null ? s.scoreOn20.toFixed(1) : '-'}
                </td>
                <td className="border border-black px-2 py-1 text-center text-[10px]">
                  {s.scoreOn20 !== null ? s.competenceLevel.label : '-'}
                </td>
                <td className="border border-black px-2 py-1 text-[10px] italic">
                  {s.appreciation || ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 flex justify-between items-start text-xs pt-4 border-t border-black">
          <div>
            <span className="font-bold">Observations pédagogiques de fin de cycle :</span>
            <div className="mt-2 h-16 w-80 border border-dashed border-gray-400"></div>
          </div>
          <div className="text-right">
            <div>Signature de l'enseignant d'EPS :</div>
            <div className="mt-8 font-bold">Cachet de l'établissement</div>
          </div>
        </div>
      </div>

      {/* AUTO-SUGGEST MODAL */}
      {showAutoSuggestModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Aide au calcul des notes</h3>
                <p className="text-xs text-slate-500">Pré-remplissage basé sur les observations réelles</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Le moteur d'EPS Tracker va analyser les <strong>{actObservations.length} relevés de terrain</strong> de ce cycle (courses au temps juste, chronos, régularité, balises de CO, ratios de réussite) pour vous proposer des scores sur les critères qui ne sont pas encore renseignés.
            </p>

            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-800 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Sécurité des données
              </div>
              <p>Les notes déjà saisies manuellement ne seront pas écrasées.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAutoSuggestModal(false)}>
                Annuler
              </Button>
              <Button onClick={handleAutoSuggestAll} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                Calculer et appliquer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SAISIE / MODIFICATION DES 4 BLOCS POUR UN ÉLÈVE */}
      {editingTempsJusteStudent && editingTempsJusteData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                  <Timer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Saisie Course au Temps Juste (4 x 5') • {editingTempsJusteStudent.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Épreuve certificative EPS : 4 blocs de 5 min, Temps de course effectif (TCE) et Temps de marche (TM).
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setEditingTempsJusteStudent(null);
                  setEditingTempsJusteData(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body with RunningExactTime widget */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <RunningExactTime
                value={editingTempsJusteData}
                onChange={setEditingTempsJusteData}
              />
            </div>

            {/* Modal Footer with Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingTempsJusteStudent(null);
                  setEditingTempsJusteData(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 font-bold"
              >
                Annuler
              </button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSaveModalObservation(false)}
                  className="text-xs text-slate-700 border-slate-300"
                >
                  Enregistrer les blocs sans valider la note
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleSaveModalObservation(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Enregistrer & Valider la note /20
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CRITERIA CONFIGURATION MODAL */}
      <EvaluationConfigDialog 
        activityId={activity.id} 
        isOpen={isCriteriaModalOpen}
        onClose={() => setIsCriteriaModalOpen(false)}
        onSaved={(newCrits) => {
          setCriteria(newCrits);
          handleSaveAll(localGrades, localAppreciations, newCrits);
        }}
      />

      {/* OBSERVE CRITERION MODAL (1 ELEVE x 1 CRITERE) */}
      {observingModalState && (
        <ObserveCriterionModal
          isOpen={!!observingModalState}
          onClose={() => setObservingModalState(null)}
          studentName={observingModalState.studentName}
          criterion={observingModalState.criterion}
          currentScore={localGrades[observingModalState.studentId]?.[observingModalState.criterion.id]}
          onSelectScore={(score) => {
            handleScoreChange(observingModalState.studentId, observingModalState.criterion.id, score);
          }}
          onNextCriterion={() => {
            const currentCritIdx = criteria.findIndex(c => c.id === observingModalState.criterion.id);
            if (currentCritIdx >= 0 && currentCritIdx < criteria.length - 1) {
              setObservingModalState({
                studentId: observingModalState.studentId,
                studentName: observingModalState.studentName,
                criterion: criteria[currentCritIdx + 1]
              });
            } else {
              setObservingModalState(null);
            }
          }}
        />
      )}

      {/* FAST FIELD OBSERVATION MODAL (MODE TERRAIN ELEVE PAR ELEVE) */}
      {isFastObservationModalOpen && (
        <FastFieldObservationModal
          isOpen={isFastObservationModalOpen}
          onClose={() => setIsFastObservationModalOpen(false)}
          activityName={activity.name}
          className={parentClass.name}
          students={parentClass.students || []}
          criteria={criteria}
          grades={localGrades}
          appreciations={localAppreciations}
          observations={actObservations}
          onScoreChange={(stId, critId, score) => handleScoreChange(stId, critId, score)}
          onAppreciationChange={(stId, text) => handleAppreciationChange(stId, text)}
          onStatusChange={(stId, status) => handleSetStudentStatus(stId, status)}
          initialStudentId={selectedStudentId}
        />
      )}
    </div>
  );
}
