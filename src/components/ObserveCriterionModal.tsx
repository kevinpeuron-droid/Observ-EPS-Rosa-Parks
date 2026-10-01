import React, { useState, useEffect } from 'react';
import { EvaluationCriterion, CriterionLevel, ScaleInterval } from '../types';
import { getCriterionLevels, computeScoreFromObservedValue, getMatchingScaleInterval, formatObservedValue } from '../lib/evaluationHelpers';
import { Button } from './ui/Button';
import { X, Check, Award, Eye, UserX, ShieldAlert, Sparkles, Plus, Minus, Timer } from 'lucide-react';

interface ObserveCriterionModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  criterion: EvaluationCriterion;
  currentScore: number | string | undefined;
  rawObservation?: number | string | undefined;
  onSelectScore: (score: number | string) => void;
  onSelectRawObservation?: (rawVal: number | string, computedScore: number) => void;
  onNextCriterion?: () => void;
}

export function ObserveCriterionModal({
  isOpen,
  onClose,
  studentName,
  criterion,
  currentScore,
  rawObservation,
  onSelectScore,
  onSelectRawObservation,
  onNextCriterion
}: ObserveCriterionModalProps) {
  const [inputValue, setInputValue] = useState<string>(() => {
    if (rawObservation !== undefined && rawObservation !== null && rawObservation !== '') {
      return String(rawObservation);
    }
    return '';
  });

  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);

  useEffect(() => {
    if (rawObservation !== undefined && rawObservation !== null && rawObservation !== '') {
      setInputValue(String(rawObservation));
    } else {
      setInputValue('');
    }
  }, [rawObservation, criterion.id]);

  useEffect(() => {
    let timer: any;
    if (isStopwatchRunning) {
      timer = setInterval(() => {
        setStopwatchSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isStopwatchRunning]);

  if (!isOpen) return null;

  const levels = getCriterionLevels(criterion);
  const hasMeasurementType = !!criterion.measurementType && criterion.measurementType !== 'qualitative';
  const unit = criterion.unit || (
    criterion.measurementType === 'number' ? 'unités' :
    criterion.measurementType === 'time_seconds' ? 's' :
    criterion.measurementType === 'time_mm_ss' ? 'min:s' :
    criterion.measurementType === 'speed' ? 'km/h' :
    criterion.measurementType === 'distance' ? 'm' : ''
  );

  // Live score calculated from current input value
  const computedLiveScore = inputValue !== '' ? computeScoreFromObservedValue(criterion, inputValue) : null;
  const matchedScaleInterval = inputValue !== '' ? getMatchingScaleInterval(criterion, inputValue) : null;

  const levelColors: Record<number, { bg: string; border: string; text: string; badge: string; ring: string }> = {
    1: {
      bg: 'bg-red-50/70 hover:bg-red-50',
      border: 'border-red-200 hover:border-red-400',
      text: 'text-red-900',
      badge: 'bg-red-100 text-red-800 border-red-300',
      ring: 'ring-2 ring-red-500'
    },
    2: {
      bg: 'bg-amber-50/70 hover:bg-amber-50',
      border: 'border-amber-200 hover:border-amber-400',
      text: 'text-amber-900',
      badge: 'bg-amber-100 text-amber-800 border-amber-300',
      ring: 'ring-2 ring-amber-500'
    },
    3: {
      bg: 'bg-emerald-50/70 hover:bg-emerald-50',
      border: 'border-emerald-200 hover:border-emerald-400',
      text: 'text-emerald-900',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      ring: 'ring-2 ring-emerald-500'
    },
    4: {
      bg: 'bg-indigo-50/70 hover:bg-indigo-50',
      border: 'border-indigo-200 hover:border-indigo-400',
      text: 'text-indigo-900',
      badge: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      ring: 'ring-2 ring-indigo-500'
    }
  };

  const handleApplyObservedValue = (valToApply: string) => {
    const score = computeScoreFromObservedValue(criterion, valToApply);
    if (score !== null) {
      if (onSelectRawObservation) {
        onSelectRawObservation(valToApply, score);
      } else {
        onSelectScore(score);
      }
      if (onNextCriterion) onNextCriterion();
      else onClose();
    }
  };

  const handleSelectLevel = (lvl: CriterionLevel) => {
    // If criterion has scale intervals, pick representative value
    if (criterion.scaleIntervals && criterion.scaleIntervals.length > 0) {
      const match = criterion.scaleIntervals.find(si => si.points === lvl.points || si.level === lvl.level);
      const repVal = match?.min !== undefined ? match.min : (match?.max !== undefined ? match.max : lvl.points);
      if (onSelectRawObservation) {
        onSelectRawObservation(repVal, lvl.points);
      } else {
        onSelectScore(lvl.points);
      }
    } else {
      if (onSelectRawObservation) {
        onSelectRawObservation(lvl.level, lvl.points);
      } else {
        onSelectScore(lvl.points);
      }
    }
    if (onNextCriterion) {
      onNextCriterion();
    } else {
      onClose();
    }
  };

  const handleStepValue = (delta: number) => {
    const currentNum = parseFloat(inputValue.replace(',', '.')) || 0;
    const nextNum = Math.max(0, currentNum + delta);
    setInputValue(String(nextNum));
    const score = computeScoreFromObservedValue(criterion, nextNum);
    if (score !== null && onSelectRawObservation) {
      onSelectRawObservation(nextNum, score);
    } else if (score !== null) {
      onSelectScore(score);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden border border-slate-200 max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/60 via-white to-amber-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-indigo-700 tracking-wider">
                  Grille d'observation
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-bold text-slate-600">
                  {studentName}
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight mt-0.5">
                {criterion.label}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
              Barème : /{criterion.maxScore} pts
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* SAISIE DIRECTE DE LA VALEUR OBSERVÉE (Temps, passes, km/h, etc.) */}
          <div className="p-4 bg-gradient-to-r from-amber-50/60 via-indigo-50/40 to-slate-50 rounded-2xl border border-indigo-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Saisie de la valeur observée {unit ? `(${unit})` : ''} :
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                Transformation automatique en note selon le barème
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-1.5 flex-1 bg-white p-1 rounded-xl border border-slate-300 shadow-2xs">
                {/* Stepper buttons if number or speed */}
                <button
                  type="button"
                  onClick={() => handleStepValue(-1)}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs"
                  title="Diminuer de 1"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <input
                  type="text"
                  value={inputValue}
                  onChange={e => {
                    const val = e.target.value;
                    setInputValue(val);
                    const score = computeScoreFromObservedValue(criterion, val);
                    if (score !== null && onSelectRawObservation) {
                      onSelectRawObservation(val, score);
                    } else if (score !== null) {
                      onSelectScore(score);
                    }
                  }}
                  placeholder={
                    criterion.measurementType === 'time_seconds' ? 'Ex: 25 ou 45' :
                    criterion.measurementType === 'time_mm_ss' ? 'Ex: 01:25' :
                    criterion.measurementType === 'speed' ? 'Ex: 11.5' :
                    criterion.measurementType === 'distance' ? 'Ex: 4.80' :
                    'Ex: 14'
                  }
                  className="flex-1 text-center font-black font-mono text-base text-slate-900 bg-transparent focus:outline-none"
                />

                <span className="text-xs font-bold text-slate-500 pr-2">
                  {unit}
                </span>

                <button
                  type="button"
                  onClick={() => handleStepValue(1)}
                  className="w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs"
                  title="Augmenter de 1"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quick Stepper +5 */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleStepValue(5)}
                  className="px-2.5 h-10 rounded-xl bg-white hover:bg-indigo-50 border border-slate-200 text-indigo-700 font-black text-xs transition-colors"
                >
                  +5
                </button>

                <Button
                  onClick={() => handleApplyObservedValue(inputValue)}
                  disabled={!inputValue.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 text-xs px-4 shadow-sm"
                >
                  Appliquer note
                </Button>
              </div>
            </div>

            {/* Live conversion banner */}
            {computedLiveScore !== null && (
              <div className="p-2.5 bg-white rounded-xl border border-indigo-200 flex items-center justify-between text-xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Valeur :</span>
                  <span className="font-mono font-black text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    {inputValue} {unit}
                  </span>
                  <span>➔</span>
                  <span className="font-bold text-slate-700">Note transformée :</span>
                  <span className="font-mono font-black text-sm text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                    {computedLiveScore} / {criterion.maxScore} pts
                  </span>
                </div>

                {matchedScaleInterval && (
                  <span className="text-[10px] font-bold text-slate-500 truncate max-w-[200px]">
                    {matchedScaleInterval.descriptor || `Palier ${matchedScaleInterval.level || ''}`}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Ou sélectionnez directement le comportement / palier du barème :
            </p>
            {currentScore !== undefined && currentScore !== '' && (
              <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                Note enregistrée : {currentScore} / {criterion.maxScore} pts
              </span>
            )}
          </div>

          {/* PALIER TILES */}
          <div className="grid grid-cols-1 gap-3">
            {levels.map(lvl => {
              const colors = levelColors[lvl.level] || levelColors[1];
              const isSelected = typeof currentScore === 'number' && Math.abs(currentScore - lvl.points) < 0.1;

              return (
                <div
                  key={lvl.level}
                  onClick={() => handleSelectLevel(lvl)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${colors.bg} ${colors.border} ${
                    isSelected ? colors.ring + ' bg-white shadow-sm' : ''
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${colors.badge}`}>
                        Palier {lvl.level} • {lvl.label}
                      </span>
                    </div>

                    <p className={`text-xs font-medium ${colors.text} leading-relaxed`}>
                      « {lvl.descriptor} »
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Note barème</span>
                      <span className="font-mono font-black text-sm text-slate-900">
                        {lvl.points} <span className="text-[11px] font-normal text-slate-500">/{criterion.maxScore} pts</span>
                      </span>
                    </div>

                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                      isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white text-transparent'
                    }`}>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Absent or Dispense buttons */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">Statut particulier :</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onSelectScore('A');
                  onClose();
                }}
                className={`text-xs font-bold text-red-700 border-red-200 hover:bg-red-50 h-8 ${
                  currentScore === 'A' ? 'bg-red-100 ring-2 ring-red-400' : ''
                }`}
              >
                <UserX className="w-3.5 h-3.5 mr-1 text-red-500" />
                Absent (A)
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onSelectScore('D');
                  onClose();
                }}
                className={`text-xs font-bold text-amber-700 border-amber-200 hover:bg-amber-50 h-8 ${
                  currentScore === 'D' ? 'bg-amber-100 ring-2 ring-amber-400' : ''
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 mr-1 text-amber-500" />
                Dispensé (D)
              </Button>

              {currentScore !== undefined && currentScore !== '' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onSelectScore('');
                    if (onSelectRawObservation) onSelectRawObservation('', 0);
                    onClose();
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 h-8"
                >
                  Effacer
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs font-bold text-slate-600"
          >
            Fermer
          </Button>

          {onNextCriterion && (
            <Button
              size="sm"
              onClick={onNextCriterion}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 h-8 shadow-xs"
            >
              Critère suivant
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
