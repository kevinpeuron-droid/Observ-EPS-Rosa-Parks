import React, { useState, useMemo } from 'react';
import { Student, EvaluationCriterion, ObservationRecord } from '../types';
import { 
  getCriterionLevels, 
  calculateStudentEvaluation, 
  getCompetenceLevel,
  computeScoreFromObservedValue,
  getMatchingScaleInterval,
  formatObservedValue
} from '../lib/evaluationHelpers';
import { Button } from './ui/Button';
import { 
  X, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Award, 
  Eye, 
  Sparkles, 
  UserCheck, 
  UserX, 
  ShieldAlert, 
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Timer
} from 'lucide-react';

interface FastFieldObservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  activityName: string;
  className: string;
  students: Student[];
  criteria: EvaluationCriterion[];
  grades: Record<string, Record<string, number | string>>;
  rawObservations?: Record<string, Record<string, number | string>>;
  appreciations: Record<string, string>;
  observations: ObservationRecord[];
  onScoreChange: (studentId: string, criterionId: string, score: number | string) => void;
  onRawObservationChange?: (studentId: string, criterionId: string, val: number | string) => void;
  onAppreciationChange: (studentId: string, text: string) => void;
  onStatusChange: (studentId: string, status: 'present' | 'absent' | 'dispense') => void;
  initialStudentId?: string;
}

export function FastFieldObservationModal({
  isOpen,
  onClose,
  activityName,
  className,
  students,
  criteria,
  grades,
  rawObservations = {},
  appreciations,
  observations,
  onScoreChange,
  onRawObservationChange,
  onAppreciationChange,
  onStatusChange,
  initialStudentId
}: FastFieldObservationModalProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    return initialStudentId || (students[0]?.id ?? '');
  });
  const [studentSearch, setStudentSearch] = useState('');

  if (!isOpen) return null;

  const currentStudent = students.find(s => s.id === selectedStudentId) || students[0];
  const currentIndex = students.findIndex(s => s.id === (currentStudent?.id ?? ''));

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    return students.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()));
  }, [students, studentSearch]);

  const currentStudentGrades = currentStudent ? (grades[currentStudent.id] || {}) : {};
  const currentStudentRaw = currentStudent ? (rawObservations[currentStudent.id] || {}) : {};
  const currentStudentAppreciation = currentStudent ? (appreciations[currentStudent.id] || '') : '';

  // Student summary
  const studentSummary = currentStudent 
    ? calculateStudentEvaluation(currentStudent.id, currentStudent.name, criteria, currentStudentGrades, currentStudentAppreciation)
    : null;

  // Student cycle observations count
  const studentCycleObservations = useMemo(() => {
    if (!currentStudent) return [];
    return observations.filter(o => o.targetId === currentStudent.id);
  }, [observations, currentStudent]);

  const handleNextStudent = () => {
    if (currentIndex < students.length - 1) {
      setSelectedStudentId(students[currentIndex + 1].id);
    }
  };

  const handlePrevStudent = () => {
    if (currentIndex > 0) {
      setSelectedStudentId(students[currentIndex - 1].id);
    }
  };

  const handleUpdateRawValue = (studentId: string, criterionId: string, val: string | number) => {
    if (onRawObservationChange) {
      onRawObservationChange(studentId, criterionId, val);
    }
    const crit = criteria.find(c => c.id === criterionId);
    if (crit) {
      const computedScore = computeScoreFromObservedValue(crit, val);
      if (computedScore !== null) {
        onScoreChange(studentId, criterionId, computedScore);
      }
    }
  };

  const handleStepValue = (studentId: string, crit: EvaluationCriterion, delta: number) => {
    const rawVal = currentStudentRaw[crit.id];
    const currentNum = parseFloat(String(rawVal || 0).replace(',', '.')) || 0;
    const nextNum = Math.max(0, currentNum + delta);
    handleUpdateRawValue(studentId, crit.id, nextNum);
  };

  // Completion stats
  const evaluatedCount = students.filter(s => {
    const g = grades[s.id] || {};
    const filled = criteria.filter(c => g[c.id] !== undefined && g[c.id] !== '');
    return filled.length > 0;
  }).length;

  const quickAppreciations = [
    'Régularité remarquable et engagement exemplaire.',
    'Contrat parfaitement respecté, allure lucide et continue.',
    'Bonne maîtrise technique, effort constant.',
    'Progrès constants au fil du cycle.',
    'Effort discontinu, décrochage en fin d\'effort.',
    'Rôle d\'observateur et de co-pilote sérieux et rigoureux.'
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full h-[95vh] flex flex-col overflow-hidden border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-black tracking-wider text-amber-300">
                  Mode Observateur de Terrain
                </span>
                <span className="text-indigo-300">•</span>
                <span className="text-xs text-indigo-200 font-bold">
                  {className}
                </span>
              </div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>{activityName}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-indigo-200 font-normal">
                  Saisie des valeurs observées (temps, passes...) ➔ Note calculée automatiquement
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
              <Users className="w-4 h-4 text-amber-300" />
              <span>Avancement : <strong>{evaluatedCount} / {students.length}</strong> notés</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-indigo-200 hover:text-white hover:bg-white/10 transition-colors"
              title="Fermer le mode observateur"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Student Carousel Bar */}
        <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevStudent}
              disabled={currentIndex <= 0}
              className="h-8 px-2 text-xs font-bold bg-white text-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-bold text-slate-600 font-mono px-1">
              {currentIndex + 1} / {students.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextStudent}
              disabled={currentIndex >= students.length - 1}
              className="h-8 px-2 text-xs font-bold bg-white text-slate-700"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Quick student selector list */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 flex-1 max-w-full">
            {students.map((st, idx) => {
              const isSelected = st.id === selectedStudentId;
              const g = grades[st.id] || {};
              const isSpecial = Object.values(g).some(v => v === 'A' || v === 'D');
              const isDone = criteria.every(c => g[c.id] !== undefined && g[c.id] !== '');
              const hasSome = Object.values(g).some(v => v !== undefined && v !== '');

              const badgeColor = isSelected
                ? 'bg-indigo-600 text-white shadow-xs font-black'
                : isSpecial
                ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
                : isDone
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold'
                : hasSome
                ? 'bg-blue-100 text-blue-900 border border-blue-300'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50';

              return (
                <button
                  key={st.id}
                  onClick={() => setSelectedStudentId(st.id)}
                  className={`text-xs px-2.5 py-1 rounded-lg shrink-0 transition-all flex items-center gap-1.5 ${badgeColor}`}
                >
                  <span className="font-mono text-[10px] opacity-70">{idx + 1}.</span>
                  <span className="truncate max-w-[120px]">{st.name}</span>
                  {isDone && <Check className="w-3 h-3 text-emerald-700 stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        {currentStudent && studentSummary && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50">
            {/* Active Student Card */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-900 font-black text-xs flex items-center justify-center font-mono">
                    N° {currentIndex + 1}
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    {currentStudent.name}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>Classe : {className}</span>
                  <span>•</span>
                  <span>{studentCycleObservations.length} relevé(s) d'observation enregistrés</span>
                </div>
              </div>

              {/* Status Buttons + Note /20 Widget */}
              <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                {/* Statut P / A / D */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => onStatusChange(currentStudent.id, 'present')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      studentSummary.status !== 'absent' && studentSummary.status !== 'dispense'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Présent
                  </button>
                  <button
                    type="button"
                    onClick={() => onStatusChange(currentStudent.id, 'absent')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      studentSummary.status === 'absent'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-red-600'
                    }`}
                  >
                    Absent (A)
                  </button>
                  <button
                    type="button"
                    onClick={() => onStatusChange(currentStudent.id, 'dispense')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      studentSummary.status === 'dispense'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-amber-600'
                    }`}
                  >
                    Dispensé (D)
                  </button>
                </div>

                {/* Score Widget */}
                <div className="flex items-center gap-4 bg-gradient-to-r from-indigo-50 to-amber-50 p-3 rounded-2xl border border-indigo-100">
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider block">
                      Note transformée /20
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black font-mono text-indigo-950">
                        {studentSummary.scoreOn20 !== null ? studentSummary.scoreOn20.toFixed(1) : '—'}
                      </span>
                      <span className="text-xs font-bold text-indigo-400">/ 20</span>
                    </div>
                  </div>

                  <div className="h-9 w-px bg-indigo-200/60" />

                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                      Niveau socle
                    </span>
                    <span className={`inline-block mt-0.5 text-xs font-bold px-2.5 py-0.5 rounded-full border ${studentSummary.competenceLevel.bgClass} ${studentSummary.competenceLevel.colorClass} ${studentSummary.competenceLevel.borderClass}`}>
                      {studentSummary.competenceLevel.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Instruction banner */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
              <span className="font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                Saisissez la valeur observée (temps, passes, km/h, etc.) ou cliquez directement sur le palier correspondant : l'application calcule la note exacte du barème.
              </span>
              <span className="text-[11px] font-mono text-amber-800 bg-white px-2 py-0.5 rounded border border-amber-300">
                Pondération totale : {studentSummary.totalWeightedScore} / {studentSummary.maxWeightedScore} pts
              </span>
            </div>

            {/* Observation Criteria Cards */}
            <div className="space-y-5">
              {criteria.map((crit, cIdx) => {
                const currentScore = currentStudentGrades[crit.id];
                const currentRaw = currentStudentRaw[crit.id];
                const levels = getCriterionLevels(crit);
                const matchedInterval = currentRaw !== undefined && currentRaw !== '' ? getMatchingScaleInterval(crit, currentRaw) : null;
                const unit = crit.unit || (
                  crit.measurementType === 'number' ? 'passes' :
                  crit.measurementType === 'time_seconds' ? 's' :
                  crit.measurementType === 'time_mm_ss' ? 'min:s' :
                  crit.measurementType === 'speed' ? 'km/h' :
                  crit.measurementType === 'distance' ? 'm' : ''
                );

                return (
                  <div 
                    key={crit.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-4 sm:p-5 space-y-4"
                  >
                    {/* Criterion Title and points */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {cIdx + 1}
                        </span>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm sm:text-base">
                            {crit.label}
                          </h4>
                          {crit.description && (
                            <p className="text-xs text-slate-500">{crit.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <span className="text-xs text-slate-500 font-medium">
                          Barème : /{crit.maxScore} (coeff {crit.weight})
                        </span>
                        <span className="text-slate-300">•</span>
                        <div className="flex items-center gap-1.5 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                          <span className="text-xs font-bold text-indigo-700">Note barème :</span>
                          <span className="font-mono font-black text-sm text-indigo-950">
                            {currentScore !== undefined && currentScore !== '' ? currentScore : '—'}
                          </span>
                          <span className="text-xs text-indigo-400">/{crit.maxScore}</span>
                        </div>
                      </div>
                    </div>

                    {/* ZONE DE SAISIE DE LA VALEUR OBSERVÉE (Temps, passes, km/h, etc.) */}
                    <div className="p-3 bg-gradient-to-r from-indigo-50/50 via-slate-50 to-amber-50/40 rounded-xl border border-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          Valeur observée sur le terrain :
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Steppers [-5] [-1] */}
                        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleStepValue(currentStudent.id, crit, -5)}
                            className="px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded"
                            title="Diminuer de 5"
                          >
                            -5
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStepValue(currentStudent.id, crit, -1)}
                            className="px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded"
                            title="Diminuer de 1"
                          >
                            -1
                          </button>
                        </div>

                        {/* Input direct */}
                        <div className="flex items-center bg-white border border-slate-300 rounded-xl px-2 py-1 shadow-2xs">
                          <input
                            type="text"
                            value={currentRaw !== undefined ? currentRaw : ''}
                            onChange={e => handleUpdateRawValue(currentStudent.id, crit.id, e.target.value)}
                            placeholder="0"
                            className="w-16 text-center font-black font-mono text-sm text-slate-900 focus:outline-none"
                          />
                          <span className="text-xs font-bold text-slate-500 pl-1 pr-1">
                            {unit}
                          </span>
                        </div>

                        {/* Steppers [+1] [+5] */}
                        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleStepValue(currentStudent.id, crit, 1)}
                            className="px-2 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 rounded"
                            title="Augmenter de 1"
                          >
                            +1
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStepValue(currentStudent.id, crit, 5)}
                            className="px-2 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 rounded"
                            title="Augmenter de 5"
                          >
                            +5
                          </button>
                        </div>

                        {/* Conversion feedback badge */}
                        {currentScore !== undefined && currentScore !== '' && (
                          <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-xs">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="font-bold text-emerald-900">
                              Note calculée : <strong>{currentScore} / {crit.maxScore} pts</strong>
                            </span>
                            {matchedInterval && (
                              <span className="text-[10px] text-emerald-700 font-medium pl-1 border-l border-emerald-200">
                                {matchedInterval.descriptor || `Palier ${matchedInterval.level}`}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 4 OBSERVABLE DESCRIPTORS ("Ce qui est fait") */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                      {levels.map(lvl => {
                        const isSelected = typeof currentScore === 'number' && Math.abs(currentScore - lvl.points) < 0.1;
                        
                        const levelThemes = {
                          1: {
                            badge: 'bg-red-100 text-red-800 border-red-300',
                            bgSelected: 'bg-red-50/80 border-red-500 ring-2 ring-red-500/20 shadow-xs',
                            hover: 'hover:border-red-300 hover:bg-red-50/30',
                            text: 'text-red-950',
                            btnActive: 'bg-red-600 text-white'
                          },
                          2: {
                            badge: 'bg-amber-100 text-amber-800 border-amber-300',
                            bgSelected: 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 shadow-xs',
                            hover: 'hover:border-amber-300 hover:bg-amber-50/30',
                            text: 'text-amber-950',
                            btnActive: 'bg-amber-600 text-white'
                          },
                          3: {
                            badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                            bgSelected: 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs',
                            hover: 'hover:border-emerald-300 hover:bg-emerald-50/30',
                            text: 'text-emerald-950',
                            btnActive: 'bg-emerald-600 text-white'
                          },
                          4: {
                            badge: 'bg-indigo-100 text-indigo-800 border-indigo-300',
                            bgSelected: 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs',
                            hover: 'hover:border-indigo-300 hover:bg-indigo-50/30',
                            text: 'text-indigo-950',
                            btnActive: 'bg-indigo-600 text-white'
                          }
                        }[lvl.level];

                        // Find if interval exists for this level
                        const matchingInterval = crit.scaleIntervals?.find(si => si.points === lvl.points || si.level === lvl.level);

                        return (
                          <div
                            key={lvl.level}
                            onClick={() => {
                              onScoreChange(currentStudent.id, crit.id, lvl.points);
                              // Sync representative raw value if exists
                              if (matchingInterval && onRawObservationChange) {
                                const repVal = matchingInterval.min !== undefined ? matchingInterval.min : (matchingInterval.max !== undefined ? matchingInterval.max : lvl.points);
                                onRawObservationChange(currentStudent.id, crit.id, repVal);
                              }
                            }}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group ${
                              isSelected 
                                ? levelThemes.bgSelected 
                                : `bg-white border-slate-200 ${levelThemes.hover}`
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${levelThemes.badge}`}>
                                  Palier {lvl.level} • {lvl.label}
                                </span>
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                                  isSelected ? `${levelThemes.btnActive} border-transparent` : 'border-slate-300 bg-white text-transparent'
                                }`}>
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </div>
                              </div>

                              <div className="space-y-1">
                                {matchingInterval && (
                                  <div className="text-[10px] font-black text-indigo-700 bg-indigo-50/80 px-1.5 py-0.5 rounded inline-block">
                                    {matchingInterval.min !== undefined && matchingInterval.max !== undefined
                                      ? `${matchingInterval.min} à ${matchingInterval.max} ${unit}`
                                      : matchingInterval.min !== undefined
                                      ? `≥ ${matchingInterval.min} ${unit}`
                                      : `≤ ${matchingInterval.max} ${unit}`}
                                  </div>
                                )}
                                <p className={`text-xs font-semibold leading-relaxed ${isSelected ? levelThemes.text : 'text-slate-800'}`}>
                                  « {lvl.descriptor} »
                                </p>
                              </div>
                            </div>

                            <div className="pt-2.5 mt-3 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[10px] uppercase font-bold text-slate-400">Note transformée</span>
                              <span className="font-mono font-black text-sm text-indigo-700 bg-indigo-50/60 px-2 py-0.5 rounded border border-indigo-100">
                                {lvl.points} <span className="text-[10px] font-normal text-slate-500">/{crit.maxScore} pts</span>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Appreciations */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                Appréciation pour {currentStudent.name}
              </label>

              <div className="flex flex-wrap gap-1.5">
                {quickAppreciations.map((tag, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      const next = currentStudentAppreciation 
                        ? `${currentStudentAppreciation} ${tag}`
                        : tag;
                      onAppreciationChange(currentStudent.id, next);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-800 border border-slate-200 transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                value={currentStudentAppreciation}
                onChange={e => onAppreciationChange(currentStudent.id, e.target.value)}
                placeholder="Saisissez une appréciation personnalisée..."
                className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>
        )}

        {/* Footer Navigation Bar */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0 shadow-xs">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevStudent}
            disabled={currentIndex <= 0}
            className="text-xs font-bold text-slate-700"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Élève précédent
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 hidden sm:inline">
              Progression : {evaluatedCount}/{students.length} élèves évalués
            </span>
            <Button
              onClick={onClose}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4"
            >
              Terminer et voir la grille complète
            </Button>
            <Button
              onClick={handleNextStudent}
              disabled={currentIndex >= students.length - 1}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-4 shadow-sm"
            >
              Élève suivant
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
