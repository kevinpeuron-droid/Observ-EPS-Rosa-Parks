import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Student, EvaluationCriterion } from '../types';
import { 
  getCriterionLevels, 
  computeScoreFromObservedValue, 
  getMatchingScaleInterval, 
  stepObservedValue,
  calculateStudentEvaluation
} from '../lib/evaluationHelpers';
import { Button } from './ui/Button';
import { 
  X, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Zap, 
  Keyboard, 
  Sparkles, 
  UserCheck, 
  UserX, 
  ShieldAlert,
  ArrowRight,
  RotateCcw
} from 'lucide-react';

interface ExpressRafaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  className: string;
  activityName: string;
  students: Student[];
  criteria: EvaluationCriterion[];
  initialCriterionId?: string;
  grades: Record<string, Record<string, number | string>>;
  rawObservations: Record<string, Record<string, number | string>>;
  onScoreChange: (studentId: string, criterionId: string, score: number | string) => void;
  onRawObservationChange: (studentId: string, criterionId: string, rawVal: number | string) => void;
  onStatusChange: (studentId: string, status: 'present' | 'absent' | 'dispense') => void;
}

export function ExpressRafaleModal({
  isOpen,
  onClose,
  className,
  activityName,
  students,
  criteria,
  initialCriterionId,
  grades,
  rawObservations,
  onScoreChange,
  onRawObservationChange,
  onStatusChange
}: ExpressRafaleModalProps) {
  const [selectedCriterionId, setSelectedCriterionId] = useState<string>(() => {
    return initialCriterionId || (criteria[0]?.id ?? '');
  });
  const [studentIndex, setStudentIndex] = useState<number>(0);
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState<boolean>(false);
  const [manualInputValue, setManualInputValue] = useState<string>('');

  useEffect(() => {
    if (initialCriterionId && criteria.some(c => c.id === initialCriterionId)) {
      setSelectedCriterionId(initialCriterionId);
    }
  }, [initialCriterionId, criteria]);

  const activeCriterion = criteria.find(c => c.id === selectedCriterionId) || criteria[0];
  const currentStudent = students[studentIndex] || students[0];

  const currentGrade = currentStudent && activeCriterion ? grades[currentStudent.id]?.[activeCriterion.id] : undefined;
  const currentRaw = currentStudent && activeCriterion ? rawObservations[currentStudent.id]?.[activeCriterion.id] : undefined;

  // Sync manual input with current raw value or score
  useEffect(() => {
    if (currentRaw !== undefined && currentRaw !== null && currentRaw !== '') {
      setManualInputValue(String(currentRaw));
    } else if (typeof currentGrade === 'number') {
      setManualInputValue(String(currentGrade));
    } else {
      setManualInputValue('');
    }
  }, [currentStudent?.id, activeCriterion?.id, currentRaw, currentGrade]);

  const levels = useMemo(() => {
    return activeCriterion ? getCriterionLevels(activeCriterion) : [];
  }, [activeCriterion]);

  const studentSummary = useMemo(() => {
    if (!currentStudent) return null;
    return calculateStudentEvaluation(
      currentStudent.id,
      currentStudent.name,
      criteria,
      grades[currentStudent.id] || {}
    );
  }, [currentStudent, criteria, grades]);

  const unit = activeCriterion?.unit || (
    activeCriterion?.measurementType === 'number' ? 'unités' :
    activeCriterion?.measurementType === 'time_seconds' ? 's' :
    activeCriterion?.measurementType === 'time_mm_ss' ? 'min:s' :
    activeCriterion?.measurementType === 'speed' ? 'km/h' :
    activeCriterion?.measurementType === 'distance' ? 'm' : ''
  );

  const isQuantitative = activeCriterion?.measurementType && activeCriterion.measurementType !== 'qualitative';

  const goToNextStudent = useCallback(() => {
    if (studentIndex < students.length - 1) {
      setStudentIndex(prev => prev + 1);
    }
  }, [studentIndex, students.length]);

  const goToPrevStudent = useCallback(() => {
    if (studentIndex > 0) {
      setStudentIndex(prev => prev - 1);
    }
  }, [studentIndex]);

  const handleSelectLevel = useCallback((lvl: { level: 1 | 2 | 3 | 4; points: number }) => {
    if (!currentStudent || !activeCriterion) return;
    
    // If scale intervals exist, pick representative value for this level
    if (activeCriterion.scaleIntervals && activeCriterion.scaleIntervals.length > 0) {
      const match = activeCriterion.scaleIntervals.find(si => si.level === lvl.level || si.points === lvl.points);
      const repVal = match?.min !== undefined ? match.min : (match?.max !== undefined ? match.max : lvl.points);
      onRawObservationChange(currentStudent.id, activeCriterion.id, repVal);
    } else {
      onRawObservationChange(currentStudent.id, activeCriterion.id, lvl.level);
    }

    onScoreChange(currentStudent.id, activeCriterion.id, lvl.points);

    if (autoAdvance) {
      goToNextStudent();
    }
  }, [currentStudent, activeCriterion, onRawObservationChange, onScoreChange, autoAdvance, goToNextStudent]);

  const handleApplyRawValue = useCallback((val: string | number) => {
    if (!currentStudent || !activeCriterion) return;
    onRawObservationChange(currentStudent.id, activeCriterion.id, val);
    const computed = computeScoreFromObservedValue(activeCriterion, val);
    if (computed !== null) {
      onScoreChange(currentStudent.id, activeCriterion.id, computed);
    }
    if (autoAdvance) {
      goToNextStudent();
    }
  }, [currentStudent, activeCriterion, onRawObservationChange, onScoreChange, autoAdvance, goToNextStudent]);

  const handleStep = (delta: number) => {
    if (!currentStudent || !activeCriterion) return;
    const nextVal = stepObservedValue(activeCriterion, currentRaw ?? 0, delta);
    onRawObservationChange(currentStudent.id, activeCriterion.id, nextVal);
    const computed = computeScoreFromObservedValue(activeCriterion, nextVal);
    if (computed !== null) {
      onScoreChange(currentStudent.id, activeCriterion.id, computed);
    }
  };

  // Quick Preset values for rapid tap
  const quickPresets = useMemo(() => {
    if (!activeCriterion) return [];
    if (activeCriterion.scaleIntervals && activeCriterion.scaleIntervals.length > 0) {
      return activeCriterion.scaleIntervals.map(si => {
        const val = si.min !== undefined && si.min !== null ? si.min : (si.max ?? 0);
        return {
          value: val,
          points: si.points,
          descriptor: si.descriptor || `${val} ${unit}`
        };
      });
    }
    // Generic quantitative presets
    if (activeCriterion.measurementType === 'number') {
      return [
        { value: 5, points: activeCriterion.maxScore * 0.4, descriptor: '5 passes' },
        { value: 10, points: activeCriterion.maxScore * 0.7, descriptor: '10 passes' },
        { value: 15, points: activeCriterion.maxScore, descriptor: '15+ passes' }
      ];
    }
    return [];
  }, [activeCriterion, unit]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in a text input (except for Enter)
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNextStudent();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevStudent();
        return;
      }
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (!isInput) {
        if (e.key === '1') {
          e.preventDefault();
          const lvl = levels.find(l => l.level === 1);
          if (lvl) handleSelectLevel(lvl);
        } else if (e.key === '2') {
          e.preventDefault();
          const lvl = levels.find(l => l.level === 2);
          if (lvl) handleSelectLevel(lvl);
        } else if (e.key === '3') {
          e.preventDefault();
          const lvl = levels.find(l => l.level === 3);
          if (lvl) handleSelectLevel(lvl);
        } else if (e.key === '4') {
          e.preventDefault();
          const lvl = levels.find(l => l.level === 4);
          if (lvl) handleSelectLevel(lvl);
        } else if (e.key.toLowerCase() === 'a' && currentStudent) {
          e.preventDefault();
          onStatusChange(currentStudent.id, 'absent');
          if (autoAdvance) goToNextStudent();
        } else if (e.key.toLowerCase() === 'd' && currentStudent) {
          e.preventDefault();
          onStatusChange(currentStudent.id, 'dispense');
          if (autoAdvance) goToNextStudent();
        } else if (e.key.toLowerCase() === 'p' && currentStudent) {
          e.preventDefault();
          onStatusChange(currentStudent.id, 'present');
        } else if (e.key === 'Enter') {
          e.preventDefault();
          goToNextStudent();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleApplyRawValue(manualInputValue);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen, 
    levels, 
    handleSelectLevel, 
    goToNextStudent, 
    goToPrevStudent, 
    onClose, 
    currentStudent, 
    onStatusChange, 
    autoAdvance, 
    manualInputValue, 
    handleApplyRawValue
  ]);

  if (!isOpen || !activeCriterion || !currentStudent) return null;

  // Evaluated students count for this criterion
  const evaluatedForThisCriterionCount = students.filter(s => {
    const score = grades[s.id]?.[activeCriterion.id];
    return score !== undefined && score !== '';
  }).length;

  const isAbsent = studentSummary?.status === 'absent';
  const isDispense = studentSummary?.status === 'dispense';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[96vh] animate-in zoom-in-95 duration-150">
        
        {/* HEADER COCKPIT */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-4 sm:p-5 shrink-0 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-sm">
                <Zap className="w-4 h-4 fill-current" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black truncate">
                    Mode Saisie Rafale • 1 Clic / Élève
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full text-indigo-100 hidden sm:inline-block">
                    {className}
                  </span>
                </div>
                <p className="text-xs text-indigo-200 truncate">
                  {activityName} • Évaluez la classe en continu avec les touches 1, 2, 3, 4 ou par clic direct
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowKeyboardHelp(v => !v)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-indigo-200 hover:text-white transition-colors"
                title="Raccourcis clavier"
              >
                <Keyboard className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-indigo-200 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* CRITERION SELECTOR PILLS */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
            {criteria.map((c, idx) => {
              const isSelected = c.id === activeCriterion.id;
              const evalCount = students.filter(s => grades[s.id]?.[c.id] !== undefined && grades[s.id]?.[c.id] !== '').length;
              const isComplete = evalCount === students.length;

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedCriterionId(c.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 shadow-md font-black scale-102'
                      : 'bg-white/10 text-indigo-100 hover:bg-white/20'
                  }`}
                >
                  <span className="opacity-70">#{idx + 1}</span>
                  <span className="max-w-[140px] truncate">{c.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    isSelected ? 'bg-amber-500/40 text-slate-950' : 'bg-black/20 text-indigo-200'
                  }`}>
                    {evalCount}/{students.length}
                  </span>
                  {isComplete && <Check className="w-3 h-3 text-emerald-400" />}
                </button>
              );
            })}
          </div>

          {/* PROGRESS BAR */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-indigo-200">
              <span>Critère : <strong className="text-white">{activeCriterion.label}</strong> (/{activeCriterion.maxScore} pts)</span>
              <span>Progression : <strong className="text-amber-300 font-mono font-bold">{evaluatedForThisCriterionCount} / {students.length}</strong> élèves</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-amber-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${(evaluatedForThisCriterionCount / students.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* KEYBOARD SHORTCUTS BANNER */}
        {showKeyboardHelp && (
          <div className="p-3 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-bold flex items-center gap-1">
                <Keyboard className="w-4 h-4 text-amber-600" />
                Raccourcis :
              </span>
              <span className="bg-white px-2 py-0.5 rounded border border-amber-200 font-mono">1, 2, 3, 4</span> = Paliers 1 à 4
              <span className="bg-white px-2 py-0.5 rounded border border-amber-200 font-mono">← / →</span> = Élève précédent / suivant
              <span className="bg-white px-2 py-0.5 rounded border border-amber-200 font-mono">A</span> = Absent
              <span className="bg-white px-2 py-0.5 rounded border border-amber-200 font-mono">D</span> = Dispensé
              <span className="bg-white px-2 py-0.5 rounded border border-amber-200 font-mono">P</span> = Présent
            </div>
            <button
              type="button"
              onClick={() => setShowKeyboardHelp(false)}
              className="text-amber-700 hover:text-amber-900 font-bold"
            >
              Fermer
            </button>
          </div>
        )}

        {/* BODY : CURRENT STUDENT CARD */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50">
          
          {/* STUDENT HERO STRIP */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-800">
                  Élève {studentIndex + 1} / {students.length}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => onStatusChange(currentStudent.id, 'present')}
                    className={`px-2 py-0.5 rounded transition-all ${
                      !isAbsent && !isDispense ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Présent (P)
                  </button>
                  <button
                    type="button"
                    onClick={() => onStatusChange(currentStudent.id, 'absent')}
                    className={`px-2 py-0.5 rounded transition-all ${
                      isAbsent ? 'bg-red-600 text-white shadow-xs' : 'text-slate-500 hover:text-red-600'
                    }`}
                  >
                    Absent (A)
                  </button>
                  <button
                    type="button"
                    onClick={() => onStatusChange(currentStudent.id, 'dispense')}
                    className={`px-2 py-0.5 rounded transition-all ${
                      isDispense ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-500 hover:text-amber-600'
                    }`}
                  >
                    Dispensé (D)
                  </button>
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {currentStudent.name}
              </h2>
            </div>

            {/* LIVE SCORE BADGES */}
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 shrink-0 self-start sm:self-auto">
              <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Note critère
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-indigo-700">
                    {currentGrade !== undefined && currentGrade !== '' ? currentGrade : '—'}
                  </span>
                  <span className="text-xs font-bold text-slate-400">/{activeCriterion.maxScore}</span>
                </div>
              </div>

              <div className="h-8 w-px bg-slate-200" />

              <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Total élève /20
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-slate-900">
                  {studentSummary?.scoreOn20 !== null && studentSummary?.scoreOn20 !== undefined ? studentSummary.scoreOn20.toFixed(1) : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* QUANTITATIVE FAST-ENTRY DECK (If criterion has measurement) */}
          {isQuantitative && (
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-indigo-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Saisie rapide de la valeur observée :
                </span>
                <span className="text-xs font-bold text-slate-500">
                  Unité : <span className="text-indigo-700 font-mono">{unit || 'valeur'}</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Steppers [-5] [-1] */}
                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
                  <button
                    type="button"
                    onClick={() => handleStep(-5)}
                    className="px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-white rounded-lg"
                    title="Diminuer de 5"
                  >
                    -5
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStep(-1)}
                    className="px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-white rounded-lg"
                    title="Diminuer de 1"
                  >
                    -1
                  </button>
                </div>

                {/* Input direct */}
                <div className="flex items-center bg-white border-2 border-indigo-500 rounded-xl px-3 py-1 shadow-sm">
                  <input
                    type="text"
                    value={manualInputValue}
                    onChange={e => setManualInputValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyRawValue(manualInputValue);
                      }
                    }}
                    placeholder="0"
                    className="w-20 text-center font-black font-mono text-lg text-slate-900 focus:outline-none"
                    autoFocus
                  />
                  <span className="text-xs font-black text-indigo-600 pl-1">
                    {unit}
                  </span>
                </div>

                {/* Steppers [+1] [+5] */}
                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
                  <button
                    type="button"
                    onClick={() => handleStep(1)}
                    className="px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-white rounded-lg"
                    title="Augmenter de 1"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStep(5)}
                    className="px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-white rounded-lg"
                    title="Augmenter de 5"
                  >
                    +5
                  </button>
                </div>

                <Button
                  size="sm"
                  onClick={() => handleApplyRawValue(manualInputValue)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                >
                  Valider (Entrée)
                </Button>
              </div>

              {/* Quick Preset Buttons (1 tap) */}
              {quickPresets.length > 0 && (
                <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-400 font-bold uppercase mr-1">
                    Palettes rapides :
                  </span>
                  {quickPresets.map(preset => (
                    <button
                      key={String(preset.value)}
                      type="button"
                      onClick={() => handleApplyRawValue(preset.value)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 transition-colors"
                      title={preset.descriptor}
                    >
                      {preset.value} {unit} ➔ <span className="font-mono text-indigo-600">{preset.points} pts</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4 OBSERVABLE LEVEL CARDS (P1 À P4) - 1 TAP / 1 TOUCHE */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-500">
              <span>Attribuer en 1 clic ou via les touches [1] [2] [3] [4] :</span>
              <span className="text-indigo-600 font-normal">
                {autoAdvance ? '⚡ Avance automatique activée' : 'Avance manuelle'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {levels.map(lvl => {
                const isSelected = typeof currentGrade === 'number' && Math.abs(currentGrade - lvl.points) < 0.1;
                
                const cardStyle = lvl.level === 1
                  ? (isSelected 
                      ? 'bg-red-500 text-white border-red-600 shadow-md ring-2 ring-red-400' 
                      : 'bg-white hover:bg-red-50/70 border-slate-200 hover:border-red-300 text-slate-800')
                  : lvl.level === 2
                  ? (isSelected 
                      ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-400' 
                      : 'bg-white hover:bg-amber-50/70 border-slate-200 hover:border-amber-300 text-slate-800')
                  : lvl.level === 3
                  ? (isSelected 
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400' 
                      : 'bg-white hover:bg-emerald-50/70 border-slate-200 hover:border-emerald-300 text-slate-800')
                  : (isSelected 
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-400' 
                      : 'bg-white hover:bg-indigo-50/70 border-slate-200 hover:border-indigo-300 text-slate-800');

                const keyBadgeColor = isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700';

                return (
                  <button
                    key={lvl.level}
                    type="button"
                    onClick={() => handleSelectLevel(lvl)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 group relative ${cardStyle}`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center font-mono ${keyBadgeColor}`}>
                            {lvl.level}
                          </span>
                          <span className="font-black text-sm uppercase tracking-wide">
                            {lvl.label}
                          </span>
                        </div>
                        <span className={`font-mono font-black text-sm px-2 py-0.5 rounded-lg ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-800'
                        }`}>
                          {lvl.points} pts
                        </span>
                      </div>

                      <p className={`text-xs leading-relaxed ${isSelected ? 'text-white/90' : 'text-slate-600 font-medium'}`}>
                        « {lvl.descriptor} »
                      </p>
                    </div>

                    <div className={`flex items-center justify-between text-[11px] pt-2 border-t ${
                      isSelected ? 'border-white/20 text-white/80' : 'border-slate-100 text-slate-400'
                    }`}>
                      <span>Touche clavier : [{lvl.level}]</span>
                      <span className="flex items-center gap-1 font-bold">
                        {isSelected ? 'Sélectionné ✓' : 'Cliquer pour appliquer ➔'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* FOOTER CONTROLS */}
        <div className="p-4 bg-white border-t border-slate-200 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <button
              type="button"
              onClick={() => setAutoAdvance(v => !v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                autoAdvance
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${autoAdvance ? 'text-amber-600 fill-amber-600' : 'text-slate-400'}`} />
              <span>Avance auto {autoAdvance ? 'ACTIVÉE' : 'DÉSACTIVÉE'}</span>
            </button>

            {/* Quick jump to student */}
            <select
              value={studentIndex}
              onChange={e => setStudentIndex(parseInt(e.target.value, 10))}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 font-bold text-slate-700 focus:outline-none"
            >
              {students.map((st, i) => (
                <option key={st.id} value={i}>
                  {i + 1}. {st.name} {grades[st.id]?.[activeCriterion.id] !== undefined ? '✓' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevStudent}
              disabled={studentIndex === 0}
              className="text-xs font-bold"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Précédent (←)
            </Button>

            <Button
              size="sm"
              onClick={goToNextStudent}
              disabled={studentIndex === students.length - 1}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
            >
              Suivant (→)
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-xs font-bold text-slate-500 hover:text-slate-900"
            >
              Terminer
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
