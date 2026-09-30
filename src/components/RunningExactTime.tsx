import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Timer, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  RotateCcw, 
  Play, 
  Pause, 
  Footprints, 
  Zap, 
  Target, 
  Sparkles, 
  Award, 
  ChevronRight, 
  ChevronLeft, 
  Sliders, 
  Check, 
  X, 
  Info,
  ShieldAlert,
  Flame,
  Activity
} from 'lucide-react';
import { Button } from './ui/Button';

// ==========================================
// TYPES & DATA STRUCTURES
// ==========================================

export interface RunningBlockRecord {
  blockIndex: number; // 1, 2, 3, 4...
  targetDistance: number; // en mètres (Contrat visé)
  actualDistance?: number; // en mètres (Distance réalisée)
  effectiveRunningTimeSeconds?: number; // TCE en secondes (Temps de Course Effectif)
  decisionNextBlock?: 'maintain' | 'reduce'; // Décision obligatoire si alerte sur-régime
  suggestedReducedDistance?: number; // Distance suggérée en cas de réduction
}

export interface RunningExactTimeConfig {
  blockCount: number; // Défaut: 4 blocs
  blockDurationSeconds: number; // Défaut: 300s (05:00)
  presetsDistances?: number[]; // Presets de distances suggérées
}

export interface RunningExactTimeData {
  config?: RunningExactTimeConfig;
  blocks: RunningBlockRecord[];
  activeBlockIndex?: number;
  finalBilan?: string;
}

export interface RunningExactTimeProps {
  value?: RunningExactTimeData | any;
  options?: Record<string, any>;
  onChange: (value: RunningExactTimeData) => void;
  readOnly?: boolean;
}

// ==========================================
// PURE CALCULATION & REGULATION LOGIC
// ==========================================

export const DEFAULT_CONFIG: RunningExactTimeConfig = {
  blockCount: 4,
  blockDurationSeconds: 300, // 05:00
  presetsDistances: [700, 750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200]
};

/** Formate des secondes en MM:SS */
export function formatSecondsToMMSS(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00';
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/** Parse une chaîne MM:SS ou SS en secondes */
export function parseMMSSToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim();
  if (clean.includes(':')) {
    const parts = clean.split(':');
    const mins = parseInt(parts[0], 10) || 0;
    const secs = parseInt(parts[1], 10) || 0;
    return mins * 60 + secs;
  }
  return parseInt(clean, 10) || 0;
}

/** Calcule le Temps de Marche (TM) d'un bloc en secondes */
export function calculateWalkingTimeSeconds(blockDurationSeconds: number, tceSeconds?: number): number {
  if (tceSeconds === undefined || isNaN(tceSeconds)) return 0;
  return Math.max(0, blockDurationSeconds - tceSeconds);
}

/** Calcule la Vitesse Réelle de Course en km/h (basée uniquement sur distance réalisée et TCE) */
export function calculateRunningSpeedKmH(actualDistance?: number, tceSeconds?: number): number {
  if (!actualDistance || !tceSeconds || tceSeconds <= 0) return 0;
  const speed = (actualDistance / tceSeconds) * 3.6;
  return Math.round(speed * 10) / 10;
}

/** Calcule la vitesse théorique visée par le contrat en km/h */
export function calculateContractSpeedKmH(targetDistance: number, blockDurationSeconds: number): number {
  if (!targetDistance || blockDurationSeconds <= 0) return 0;
  const speed = (targetDistance / blockDurationSeconds) * 3.6;
  return Math.round(speed * 10) / 10;
}

/** Vérifie si l'alerte sur-régime (décrochage) est déclenchée : TM > 30 secondes (soit TCE < Durée - 30s) */
export function isOverpacingAlert(blockDurationSeconds: number, tceSeconds?: number): boolean {
  if (tceSeconds === undefined) return false;
  const walkingTime = calculateWalkingTimeSeconds(blockDurationSeconds, tceSeconds);
  return walkingTime > 30; // Règle stricte : TM > 30s
}

/** Calcule une distance réduite réaliste suggérée en cas de sur-régime */
export function computeSuggestedReducedDistance(actualDistance: number, tceSeconds: number, blockDurationSeconds: number): number {
  if (!actualDistance || !tceSeconds || tceSeconds <= 0) return actualDistance || 800;
  // Calcul basé sur l'allure courue sans marcher reportée sur le temps complet
  const speedMetersPerSec = actualDistance / tceSeconds;
  // On suggère 90% de cette vitesse pour garantir la continuité de course
  const suggested = Math.round((speedMetersPerSec * blockDurationSeconds * 0.92) / 25) * 25;
  return Math.max(500, Math.min(suggested, actualDistance - 50));
}

export interface StudentProfileResult {
  profile: 'Régulier / Continu' | 'Lucide / Adaptatif' | 'Sur-estimé / Obstiné' | 'Prudent / En réserve' | 'En cours d\'évaluation';
  tag: string;
  description: string;
  badgeClass: string;
  icon: string;
  advice: string;
}

/** Qualification automatique du profil de l'élève en fin d'effort */
export function qualifyStudentProfile(
  blocks: RunningBlockRecord[], 
  blockDurationSeconds: number
): StudentProfileResult {
  const completedBlocks = blocks.filter(b => 
    b.actualDistance !== undefined && 
    b.effectiveRunningTimeSeconds !== undefined
  );

  if (completedBlocks.length === 0) {
    return {
      profile: 'En cours d\'évaluation',
      tag: 'Évaluation non débutée',
      description: 'Aucun bloc de course n\'a encore été validé.',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
      icon: '⏳',
      advice: 'Complétez au moins le premier bloc pour obtenir un diagnostic.'
    };
  }

  // Calcul du cumul TM (Temps de Marche)
  const totalTM = completedBlocks.reduce((sum, b) => {
    return sum + calculateWalkingTimeSeconds(blockDurationSeconds, b.effectiveRunningTimeSeconds);
  }, 0);

  // Blocs avec décrochage (TM > 30s)
  const overpacedBlocks = completedBlocks.filter(b => 
    isOverpacingAlert(blockDurationSeconds, b.effectiveRunningTimeSeconds)
  );

  // RÈGLE 1 : "Régulier / Continu" -> TM total < 30 secondes
  if (totalTM < 30) {
    // Vérifier si prudent/en réserve (réalise largement plus sans marcher)
    const isUnderestimated = completedBlocks.every(b => 
      (b.actualDistance || 0) >= b.targetDistance + 75
    );

    if (isUnderestimated && completedBlocks.length >= 2) {
      return {
        profile: 'Prudent / En réserve',
        tag: 'Contrat sous-estimé',
        description: 'L\'élève a couru en continu sans marcher (TM = 0s) mais dépasse très largement ses contrats visés.',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
        icon: '🎯',
        advice: 'Augmenter le contrat visé de +50m à +100m pour solliciter le plein potentiel aérobie.'
      };
    }

    return {
      profile: 'Régulier / Continu',
      tag: 'Allure maîtrisée & Régulière',
      description: 'L\'élève court en continu avec un temps de marche total inférieur à 30 secondes sur l\'ensemble des blocs.',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: '🏆',
      advice: 'Excellente gestion de l\'effort. L\'élève est parfaitement calé sur son allure cible.'
    };
  }

  // RÈGLE 2 : "Lucide / Adaptatif" -> TM initial > 30s suivi d'une réduction de contrat et TM = 0s
  const hadEarlyOverpace = completedBlocks.some((b, idx) => 
    idx < completedBlocks.length - 1 && 
    isOverpacingAlert(blockDurationSeconds, b.effectiveRunningTimeSeconds) &&
    b.decisionNextBlock === 'reduce'
  );

  const finalBlock = completedBlocks[completedBlocks.length - 1];
  const finalBlockTM = calculateWalkingTimeSeconds(blockDurationSeconds, finalBlock.effectiveRunningTimeSeconds);

  if (hadEarlyOverpace && finalBlockTM === 0) {
    return {
      profile: 'Lucide / Adaptatif',
      tag: 'Régulation intelligente',
      description: 'Après un décrochage initial (TM > 30s), l\'élève a su réduire son contrat pour terminer en course continue (TM = 0s).',
      badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      icon: '🧠',
      advice: 'Bravo pour la lucidité tactique ! L\'adaptation du contrat a permis de restaurer l\'efficacité motrice.'
    };
  }

  // RÈGLE 3 : "Sur-estimé / Obstiné" -> TM > 30s répété sans adaptation du contrat ou maintien déraisonnable
  const repeatedOverpace = overpacedBlocks.length >= 2;
  const maintainedDespiteOverpace = completedBlocks.some(b => 
    isOverpacingAlert(blockDurationSeconds, b.effectiveRunningTimeSeconds) && 
    b.decisionNextBlock === 'maintain'
  );

  if (repeatedOverpace || maintainedDespiteOverpace) {
    return {
      profile: 'Sur-estimé / Obstiné',
      tag: 'Sur-régime non régulé',
      description: 'L\'élève a subi des décrochages répétés (TM > 30s) ou a maintenu un contrat trop élevé sans réguler son allure.',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
      icon: '⚠️',
      advice: 'Nécessité de revoir les allures cibles à la baisse (-100m à -150m) pour privilégier la continuité de course.'
    };
  }

  // Profil intermédiaire par défaut si TM global élevé
  return {
    profile: 'Sur-estimé / Obstiné',
    tag: 'Décrochage en fin de cycle',
    description: 'Le temps de marche cumulé dépasse le seuil de tolérance (TM total > 30s).',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    icon: '⚡',
    advice: 'Sensibiliser l\'élève à la régularité et au respect des repères d\'allure intermédiaire.'
  };
}

// ==========================================
// COMPOSANT PRINCIPAL D'ACQUISITION
// ==========================================

export function RunningExactTime({ value, options = {}, onChange, readOnly = false }: RunningExactTimeProps) {
  // Configuration fusionnée
  const config: RunningExactTimeConfig = useMemo(() => {
    return {
      blockCount: options.blockCount || value?.config?.blockCount || DEFAULT_CONFIG.blockCount,
      blockDurationSeconds: options.blockDurationSeconds || value?.config?.blockDurationSeconds || DEFAULT_CONFIG.blockDurationSeconds,
      presetsDistances: options.presetsDistances || value?.config?.presetsDistances || DEFAULT_CONFIG.presetsDistances
    };
  }, [options, value?.config]);

  // Initialisation des blocs
  const currentBlocks: RunningBlockRecord[] = useMemo(() => {
    const existing = value?.blocks || [];
    const list: RunningBlockRecord[] = [];
    for (let i = 1; i <= config.blockCount; i++) {
      const found = existing.find((b: RunningBlockRecord) => b.blockIndex === i);
      if (found) {
        list.push(found);
      } else {
        list.push({
          blockIndex: i,
          targetDistance: i === 1 ? 900 : (list[i - 2]?.targetDistance || 900)
        });
      }
    }
    return list;
  }, [value?.blocks, config.blockCount]);

  const [activeTab, setActiveTab] = useState<number>(() => {
    if (value?.activeBlockIndex !== undefined && value.activeBlockIndex < config.blockCount) {
      return value.activeBlockIndex;
    }
    // Trouver le premier bloc incomplet
    const firstIncomplete = currentBlocks.findIndex(b => b.actualDistance === undefined || b.effectiveRunningTimeSeconds === undefined);
    return firstIncomplete !== -1 ? firstIncomplete : 0;
  });

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showSummaryView, setShowSummaryView] = useState(false);

  // État du chronomètre de terrain intégré pour l'élève-observateur
  const [stopwatchState, setStopwatchState] = useState<{
    isRunning: boolean;
    currentMode: 'running' | 'walking'; // Mode en cours
    elapsedSeconds: number; // Temps total écoulé sur le bloc
    runningSeconds: number; // TCE accumulé
  }>({
    isRunning: false,
    currentMode: 'running',
    elapsedSeconds: 0,
    runningSeconds: 0
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Bloc actif
  const currentBlock = currentBlocks[activeTab] || currentBlocks[0];

  // Gestion du chronomètre de terrain
  useEffect(() => {
    if (stopwatchState.isRunning) {
      timerRef.current = setInterval(() => {
        setStopwatchState(prev => {
          if (prev.elapsedSeconds >= config.blockDurationSeconds) {
            // Fin automatique du bloc
            return { ...prev, isRunning: false };
          }
          const nextElapsed = prev.elapsedSeconds + 1;
          const nextRunning = prev.currentMode === 'running' ? prev.runningSeconds + 1 : prev.runningSeconds;
          return {
            ...prev,
            elapsedSeconds: nextElapsed,
            runningSeconds: nextRunning
          };
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stopwatchState.isRunning, config.blockDurationSeconds]);

  // Synchronisation du chronomètre de terrain vers le TCE du bloc
  const applyStopwatchToBlock = () => {
    updateBlockField(activeTab, 'effectiveRunningTimeSeconds', stopwatchState.runningSeconds);
    setStopwatchState(prev => ({ ...prev, isRunning: false }));
  };

  // Mise à jour d'un champ d'un bloc
  const updateBlockField = (index: number, field: keyof RunningBlockRecord, val: any) => {
    if (readOnly) return;
    const updatedBlocks = [...currentBlocks];
    const targetBlock = { ...updatedBlocks[index], [field]: val };

    // Si on met à jour le TCE et qu'un sur-régime est détecté, calculer la suggestion de réduction
    if (field === 'effectiveRunningTimeSeconds') {
      const isAlert = isOverpacingAlert(config.blockDurationSeconds, val);
      if (isAlert && targetBlock.actualDistance) {
        targetBlock.suggestedReducedDistance = computeSuggestedReducedDistance(
          targetBlock.actualDistance,
          val,
          config.blockDurationSeconds
        );
      }
    }

    // Si on met à jour la décision vers "reduce" et qu'un bloc suivant existe, proposer la distance réduite
    if (field === 'decisionNextBlock' && val === 'reduce' && index + 1 < updatedBlocks.length) {
      const suggested = targetBlock.suggestedReducedDistance || Math.max(500, targetBlock.targetDistance - 100);
      updatedBlocks[index + 1] = {
        ...updatedBlocks[index + 1],
        targetDistance: suggested
      };
    }

    updatedBlocks[index] = targetBlock;

    onChange({
      config,
      blocks: updatedBlocks,
      activeBlockIndex: activeTab
    });
  };

  // Calculs cumulés en temps réel
  const cumuls = useMemo(() => {
    let totalTargetDistance = 0;
    let totalActualDistance = 0;
    let totalTCESeconds = 0;
    let totalTMSeconds = 0;
    let completedCount = 0;

    currentBlocks.forEach(b => {
      totalTargetDistance += (b.targetDistance || 0);
      if (b.actualDistance !== undefined && b.effectiveRunningTimeSeconds !== undefined) {
        completedCount++;
        totalActualDistance += b.actualDistance;
        totalTCESeconds += b.effectiveRunningTimeSeconds;
        totalTMSeconds += calculateWalkingTimeSeconds(config.blockDurationSeconds, b.effectiveRunningTimeSeconds);
      }
    });

    const averageRealSpeed = totalTCESeconds > 0 ? (totalActualDistance / totalTCESeconds) * 3.6 : 0;
    const totalDurationSeconds = completedCount * config.blockDurationSeconds;
    const runningRatioPercent = totalDurationSeconds > 0 
      ? Math.round((totalTCESeconds / totalDurationSeconds) * 100) 
      : 0;
    const walkingRatioPercent = Math.max(0, 100 - runningRatioPercent);

    return {
      totalTargetDistance,
      totalActualDistance,
      totalTCESeconds,
      totalTMSeconds,
      completedCount,
      averageRealSpeed: Math.round(averageRealSpeed * 10) / 10,
      runningRatioPercent,
      walkingRatioPercent
    };
  }, [currentBlocks, config.blockDurationSeconds]);

  // Variables du bloc actif
  const currentTCE = currentBlock.effectiveRunningTimeSeconds;
  const currentActualDist = currentBlock.actualDistance;
  const currentTM = calculateWalkingTimeSeconds(config.blockDurationSeconds, currentTCE);
  const currentRealSpeed = calculateRunningSpeedKmH(currentActualDist, currentTCE);
  const targetSpeed = calculateContractSpeedKmH(currentBlock.targetDistance, config.blockDurationSeconds);
  const distanceGap = currentActualDist !== undefined ? currentActualDist - currentBlock.targetDistance : null;
  const hasAlert = isOverpacingAlert(config.blockDurationSeconds, currentTCE);

  // Qualification du profil de l'élève
  const studentProfile = useMemo(() => {
    return qualifyStudentProfile(currentBlocks, config.blockDurationSeconds);
  }, [currentBlocks, config.blockDurationSeconds]);

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col space-y-4">
      {/* 1. EN-TÊTE DU MODULE AVEC RÉGLAGES & MODES */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/90 text-white flex items-center justify-center font-bold shadow-md shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                  Demi-Fond • Course au Temps Juste
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  {config.blockCount} × {formatSecondsToMMSS(config.blockDurationSeconds)}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Contrats visés, Temps de Course Effectif (TCE) et moteur de régulation en direct.
              </p>
            </div>
          </div>

          {/* Boutons d'en-tête */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setShowSummaryView(!showSummaryView)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                showSummaryView 
                  ? 'bg-white text-indigo-950 border-white shadow-xs' 
                  : 'bg-indigo-900/60 hover:bg-indigo-800 text-indigo-100 border-indigo-700/60'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>{showSummaryView ? 'Retour saisie' : 'Bilan & Profil'}</span>
            </button>

            {!readOnly && (
              <button
                type="button"
                onClick={() => setShowConfigModal(!showConfigModal)}
                className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors border border-slate-700"
                title="Configurer le nombre de blocs et la durée"
              >
                <Sliders className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Modal de configuration rapide (ex: passer de 4x5' à 3x5' ou 6x4') */}
        {showConfigModal && (
          <div className="mt-4 p-4 rounded-2xl bg-slate-800/90 border border-slate-700 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-bold text-slate-200">
              <span>Configuration du protocole de course</span>
              <button type="button" onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-300 font-semibold block mb-1">Nombre de blocs :</label>
                <div className="flex gap-1.5">
                  {[3, 4, 5, 6].map(count => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => {
                        onChange({
                          ...value,
                          config: { ...config, blockCount: count }
                        });
                      }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${
                        config.blockCount === count 
                          ? 'bg-indigo-600 text-white border-indigo-500' 
                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-semibold block mb-1">Durée par bloc :</label>
                <div className="flex gap-1.5">
                  {[
                    { label: "3'00", secs: 180 },
                    { label: "4'00", secs: 240 },
                    { label: "5'00", secs: 300 },
                    { label: "6'00", secs: 360 }
                  ].map(d => (
                    <button
                      key={d.secs}
                      type="button"
                      onClick={() => {
                        onChange({
                          ...value,
                          config: { ...config, blockDurationSeconds: d.secs }
                        });
                      }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${
                        config.blockDurationSeconds === d.secs 
                          ? 'bg-indigo-600 text-white border-indigo-500' 
                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BANDEAU DES CUMULS EN TEMPS RÉEL (TOUJOURS VISIBLE) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              🏃
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Cumul TCE (Couru)</span>
              <span className="text-sm font-black text-emerald-300 font-mono">
                {formatSecondsToMMSS(cumuls.totalTCESeconds)}
              </span>
            </div>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
              cumuls.totalTMSeconds > 30 ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-700/40 text-slate-300'
            }`}>
              🚶
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Cumul TM (Marché)</span>
              <span className={`text-sm font-black font-mono ${
                cumuls.totalTMSeconds > 30 ? 'text-rose-300' : 'text-slate-200'
              }`}>
                {formatSecondsToMMSS(cumuls.totalTMSeconds)}
              </span>
            </div>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              🎯
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Distance totale</span>
              <span className="text-sm font-black text-white font-mono">
                {cumuls.totalActualDistance} m
              </span>
            </div>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              ⚡
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Vitesse Réelle Course</span>
              <span className="text-sm font-black text-amber-300 font-mono">
                {cumuls.averageRealSpeed > 0 ? `${cumuls.averageRealSpeed} km/h` : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MODE BILAN POST-EFFORT & SYNTHÈSE GLOBALE */}
      {showSummaryView ? (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Diagnostic de profil de course */}
          <div className="p-5 rounded-2xl border bg-slate-50 border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                Qualification Automatique du Profil
              </span>
              <span className="text-xs font-semibold text-slate-400">
                Basé sur la régularité et la lucidité de contrat
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="text-4xl shrink-0 p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
                {studentProfile.icon}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-black text-slate-900">{studentProfile.profile}</h4>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${studentProfile.badgeClass}`}>
                    {studentProfile.tag}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {studentProfile.description}
                </p>
                <div className="pt-1 text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>Conseil d'entraînement : {studentProfile.advice}</span>
                </div>
              </div>
            </div>
          </div>

          {/* JAUGE GRAPHIQUE TEMPS COURU (TCE) VS TEMPS MARCHÉ (TM) */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <h4 className="text-sm font-bold text-slate-900">
                  Proportion Visuelle : Temps Couru (TCE) vs Temps Marché (TM)
                </h4>
              </div>
              <span className="text-xs font-bold text-slate-500">
                Total : {formatSecondsToMMSS(cumuls.totalTCESeconds + cumuls.totalTMSeconds)}
              </span>
            </div>

            {/* Barre empilée */}
            <div className="w-full h-8 bg-slate-100 rounded-xl overflow-hidden flex shadow-inner">
              <div 
                className="bg-emerald-500 h-full flex items-center justify-center text-white text-xs font-black transition-all duration-500"
                style={{ width: `${cumuls.runningRatioPercent}%` }}
                title={`Temps Couru : ${formatSecondsToMMSS(cumuls.totalTCESeconds)} (${cumuls.runningRatioPercent}%)`}
              >
                {cumuls.runningRatioPercent >= 15 && `${cumuls.runningRatioPercent}% Course`}
              </div>
              <div 
                className="bg-rose-500 h-full flex items-center justify-center text-white text-xs font-black transition-all duration-500"
                style={{ width: `${cumuls.walkingRatioPercent}%` }}
                title={`Temps Marché : ${formatSecondsToMMSS(cumuls.totalTMSeconds)} (${cumuls.walkingRatioPercent}%)`}
              >
                {cumuls.walkingRatioPercent >= 15 && `${cumuls.walkingRatioPercent}% Marche`}
              </div>
            </div>

            {/* Légende détaillée sous la barre */}
            <div className="grid grid-cols-2 gap-4 pt-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-slate-600 font-semibold">Temps Couru Effectif :</span>
                <span className="font-mono font-bold text-emerald-700">
                  {formatSecondsToMMSS(cumuls.totalTCESeconds)} ({cumuls.runningRatioPercent}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="text-slate-600 font-semibold">Temps Marché :</span>
                <span className="font-mono font-bold text-rose-700">
                  {formatSecondsToMMSS(cumuls.totalTMSeconds)} ({cumuls.walkingRatioPercent}%)
                </span>
              </div>
            </div>
          </div>

          {/* TABLEAU SYNTHÉTIQUE DES 4 BLOCS */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="bg-slate-100/80 px-4 py-3 border-b border-slate-200 font-bold text-xs text-slate-700 uppercase tracking-wide">
              Synthèse bloc par bloc
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Bloc</th>
                    <th className="p-3">Contrat Visé</th>
                    <th className="p-3">Réalisé</th>
                    <th className="p-3">Écart</th>
                    <th className="p-3">TCE (Couru)</th>
                    <th className="p-3">TM (Marché)</th>
                    <th className="p-3">Vitesse Réelle</th>
                    <th className="p-3">Régulation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentBlocks.map(b => {
                    const tce = b.effectiveRunningTimeSeconds;
                    const tm = calculateWalkingTimeSeconds(config.blockDurationSeconds, tce);
                    const speed = calculateRunningSpeedKmH(b.actualDistance, tce);
                    const gap = b.actualDistance !== undefined ? b.actualDistance - b.targetDistance : null;
                    const alert = isOverpacingAlert(config.blockDurationSeconds, tce);

                    return (
                      <tr key={b.blockIndex} className={`hover:bg-slate-50 ${alert ? 'bg-rose-50/40' : ''}`}>
                        <td className="p-3 font-bold text-slate-900">Bloc {b.blockIndex}</td>
                        <td className="p-3 font-mono font-bold">{b.targetDistance} m</td>
                        <td className="p-3 font-mono">{b.actualDistance !== undefined ? `${b.actualDistance} m` : '-'}</td>
                        <td className="p-3 font-mono">
                          {gap !== null ? (
                            <span className={gap >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                              {gap > 0 ? `+${gap}m` : `${gap}m`}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-700">
                          {tce !== undefined ? formatSecondsToMMSS(tce) : '-'}
                        </td>
                        <td className="p-3 font-mono font-bold">
                          {tce !== undefined ? (
                            <span className={alert ? 'text-rose-600 font-black' : 'text-slate-600'}>
                              {formatSecondsToMMSS(tm)}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="p-3 font-mono font-bold text-indigo-700">
                          {speed > 0 ? `${speed} km/h` : '-'}
                        </td>
                        <td className="p-3">
                          {b.decisionNextBlock === 'reduce' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                              Réduction 💡
                            </span>
                          ) : b.decisionNextBlock === 'maintain' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              Maintien 🛑
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => setShowSummaryView(false)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
            >
              Retour à la saisie de terrain
            </Button>
          </div>
        </div>
      ) : (
        /* 3. SAISIE PAS À PAS PAR BLOC (POUR L'ÉLÈVE-OBSERVATEUR SUR LE TERRAIN) */
        <div className="p-4 sm:p-5 space-y-4">
          {/* ONGLETS DES BLOCS (BLOC 1, BLOC 2, BLOC 3, BLOC 4) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {currentBlocks.map((b, idx) => {
              const isSelected = idx === activeTab;
              const isFilled = b.actualDistance !== undefined && b.effectiveRunningTimeSeconds !== undefined;
              const hasBlockAlert = isOverpacingAlert(config.blockDurationSeconds, b.effectiveRunningTimeSeconds);

              return (
                <button
                  key={b.blockIndex}
                  type="button"
                  onClick={() => setActiveTab(idx)}
                  className={`flex-1 min-w-[90px] py-2.5 px-3 rounded-2xl font-bold text-xs transition-all flex flex-col items-center justify-center gap-1 border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-300'
                      : isFilled
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span>Bloc {b.blockIndex}</span>
                    {hasBlockAlert && <AlertTriangle className="w-3.5 h-3.5 text-rose-500 fill-rose-100" />}
                    {isFilled && !hasBlockAlert && <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />}
                  </div>
                  <span className={`text-[10px] font-mono ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {b.targetDistance}m • {formatSecondsToMMSS(config.blockDurationSeconds)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* FICHE DE SAISIE DU BLOC ACTIF */}
          <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-5">
            {/* EN-TÊTE DU BLOC ACTIF */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                  {currentBlock.blockIndex}
                </span>
                <div>
                  <h4 className="text-sm font-black text-slate-900 leading-tight">
                    Bloc {currentBlock.blockIndex} / {config.blockCount} ({formatSecondsToMMSS(config.blockDurationSeconds)})
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Allure théorique visée : <strong>{targetSpeed} km/h</strong>
                  </span>
                </div>
              </div>

              {/* Bouton passer au bloc suivant/précédent */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={activeTab === 0}
                  onClick={() => setActiveTab(prev => Math.max(0, prev - 1))}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 flex items-center justify-center text-slate-700"
                  title="Bloc précédent"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={activeTab >= currentBlocks.length - 1}
                  onClick={() => setActiveTab(prev => Math.min(currentBlocks.length - 1, prev + 1))}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 flex items-center justify-center text-slate-700"
                  title="Bloc suivant"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ÉTAPE 1 : CONTRAT VISÉ AVANT LE DÉPART */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-700">
                  <Target className="w-4 h-4 text-indigo-600" />
                  <span>1. Contrat visé avant le départ (mètres)</span>
                </div>
                <span className="text-xs font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                  {currentBlock.targetDistance} m
                </span>
              </div>

              {/* Sélecteur rapide avec presets */}
              <div className="flex flex-wrap gap-1.5">
                {(config.presetsDistances || DEFAULT_CONFIG.presetsDistances!).map(dist => (
                  <button
                    key={dist}
                    type="button"
                    disabled={readOnly}
                    onClick={() => updateBlockField(activeTab, 'targetDistance', dist)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 border ${
                      currentBlock.targetDistance === dist
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700'
                    }`}
                  >
                    {dist}m
                  </button>
                ))}
              </div>

              {/* Boutons d'ajustement +/- 50m */}
              {!readOnly && (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => updateBlockField(activeTab, 'targetDistance', Math.max(300, currentBlock.targetDistance - 50))}
                    className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors active:scale-95"
                  >
                    - 50 m
                  </button>
                  <button
                    type="button"
                    onClick={() => updateBlockField(activeTab, 'targetDistance', currentBlock.targetDistance + 50)}
                    className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors active:scale-95"
                  >
                    + 50 m
                  </button>
                </div>
              )}
            </div>

            {/* ÉTAPE 2 : PENDANT & FIN DE COURSE (TCE & DISTANCE RÉALISÉE) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SAISIE DU TEMPS DE COURSE EFFECTIF (TCE) */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-700">
                    <Timer className="w-4 h-4 text-emerald-600" />
                    <span>2. Temps de Course (TCE)</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                    {currentTCE !== undefined ? formatSecondsToMMSS(currentTCE) : 'Non saisi'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500">
                  Temps où l'élève a réellement <strong>couru sans marcher</strong> (sur {formatSecondsToMMSS(config.blockDurationSeconds)}).
                </p>

                {/* Bouton rapide "A couru tout le bloc" */}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => updateBlockField(activeTab, 'effectiveRunningTimeSeconds', config.blockDurationSeconds)}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border active:scale-98 ${
                      currentTCE === config.blockDurationSeconds
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    <span>🏃 A couru tout le bloc ({formatSecondsToMMSS(config.blockDurationSeconds)})</span>
                    {currentTCE === config.blockDurationSeconds && <Check className="w-4 h-4 stroke-[3]" />}
                  </button>
                )}

                {/* Saisie directe Minutes et Secondes */}
                <div className="flex items-center justify-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                  <div className="flex flex-col items-center">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Min</label>
                    <select
                      disabled={readOnly}
                      value={currentTCE !== undefined ? Math.floor(currentTCE / 60) : 4}
                      onChange={(e) => {
                        const mins = parseInt(e.target.value, 10);
                        const secs = currentTCE !== undefined ? currentTCE % 60 : 0;
                        updateBlockField(activeTab, 'effectiveRunningTimeSeconds', Math.min(config.blockDurationSeconds, mins * 60 + secs));
                      }}
                      className="bg-white border border-slate-300 font-mono font-bold text-base rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-center"
                    >
                      {Array.from({ length: Math.floor(config.blockDurationSeconds / 60) + 1 }, (_, i) => (
                        <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                      ))}
                    </select>
                  </div>

                  <span className="text-xl font-bold font-mono text-slate-400 mt-3">:</span>

                  <div className="flex flex-col items-center">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Sec</label>
                    <select
                      disabled={readOnly}
                      value={currentTCE !== undefined ? currentTCE % 60 : 0}
                      onChange={(e) => {
                        const mins = currentTCE !== undefined ? Math.floor(currentTCE / 60) : 0;
                        const secs = parseInt(e.target.value, 10);
                        updateBlockField(activeTab, 'effectiveRunningTimeSeconds', Math.min(config.blockDurationSeconds, mins * 60 + secs));
                      }}
                      className="bg-white border border-slate-300 font-mono font-bold text-base rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-center"
                    >
                      {Array.from({ length: 60 }, (_, i) => (
                        <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Raccourcis de décrémentation rapide */}
                {!readOnly && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Raccourcis :</span>
                    {[-10, -20, -30, -60].map(delta => (
                      <button
                        key={delta}
                        type="button"
                        onClick={() => {
                          const base = currentTCE !== undefined ? currentTCE : config.blockDurationSeconds;
                          updateBlockField(activeTab, 'effectiveRunningTimeSeconds', Math.max(0, base + delta));
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all active:scale-95"
                      >
                        {delta}s
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* SAISIE DE LA DISTANCE RÉALISÉE */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-700">
                    <Footprints className="w-4 h-4 text-indigo-600" />
                    <span>3. Distance Réalisée (mètres)</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                    {currentActualDist !== undefined ? `${currentActualDist} m` : 'Non saisie'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500">
                  Mesurée en fin de bloc de 5 minutes (balises, plots ou estimation terrain).
                </p>

                {/* Champ input principal */}
                <div className="relative">
                  <input
                    type="number"
                    disabled={readOnly}
                    placeholder="Ex: 920..."
                    value={currentActualDist !== undefined ? currentActualDist : ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      updateBlockField(activeTab, 'actualDistance', isNaN(val) ? undefined : val);
                    }}
                    className="w-full text-center text-2xl font-black font-mono h-14 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 pr-10"
                  />
                  <span className="absolute right-4 top-4 font-bold text-slate-400 text-sm">m</span>
                </div>

                {/* Boutons d'ajustement rapide par rapport au contrat */}
                {!readOnly && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => updateBlockField(activeTab, 'actualDistance', currentBlock.targetDistance)}
                      className="px-2.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-all active:scale-95 border border-indigo-200"
                    >
                      = Contrat ({currentBlock.targetDistance}m)
                    </button>
                    {[-50, -25, +25, +50].map(delta => (
                      <button
                        key={delta}
                        type="button"
                        onClick={() => {
                          const base = currentActualDist !== undefined ? currentActualDist : currentBlock.targetDistance;
                          updateBlockField(activeTab, 'actualDistance', Math.max(0, base + delta));
                        }}
                        className="px-2 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all active:scale-95"
                      >
                        {delta > 0 ? `+${delta}m` : `${delta}m`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ÉTAPE 3 : CALCULS AUTOMATIQUES EN TEMPS RÉEL DU BLOC */}
            {currentTCE !== undefined && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                  Indicateurs calculés pour le Bloc {currentBlock.blockIndex}
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Temps de Marche (TM = 05:00 - TCE) */}
                  <div className={`p-3 rounded-xl border ${
                    hasAlert 
                      ? 'bg-rose-50 border-rose-200 text-rose-900' 
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                      Temps Marché (TM)
                    </span>
                    <span className={`text-xl font-black font-mono block mt-0.5 ${hasAlert ? 'text-rose-600' : ''}`}>
                      {formatSecondsToMMSS(currentTM)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {hasAlert ? '⚠️ Seuil > 30s dépassé' : '✓ Moins de 30s de marche'}
                    </span>
                  </div>

                  {/* Vitesse Réelle de Course (calculée sur TCE et Distance) */}
                  <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-indigo-950">
                    <span className="text-[10px] font-bold uppercase tracking-wider block text-indigo-700">
                      Vitesse Réelle Course
                    </span>
                    <span className="text-xl font-black font-mono text-indigo-900 block mt-0.5">
                      {currentRealSpeed > 0 ? `${currentRealSpeed} km/h` : '-'}
                    </span>
                    <span className="text-[10px] text-indigo-600 font-medium">
                      Calculée sur temps couru
                    </span>
                  </div>

                  {/* Écart au contrat visé */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-500">
                      Écart au contrat
                    </span>
                    <span className="text-xl font-black font-mono block mt-0.5">
                      {distanceGap !== null ? (
                        <span className={distanceGap >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {distanceGap > 0 ? `+${distanceGap} m` : `${distanceGap} m`}
                        </span>
                      ) : '-'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {distanceGap !== null && Math.abs(distanceGap) <= 25 ? '🎯 Contrat respecté' : 'Écart à réguler'}
                    </span>
                  </div>

                  {/* Vitesse Cible du Contrat */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-500">
                      Allure Cible Visée
                    </span>
                    <span className="text-xl font-black font-mono text-slate-700 block mt-0.5">
                      {targetSpeed} km/h
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Pour {currentBlock.targetDistance}m en {formatSecondsToMMSS(config.blockDurationSeconds)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 4. MOTEUR D'ALERTE & RÈGLE DE RÉGULATION (LUCIDITÉ) */}
            {hasAlert && (
              <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
                    <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h5 className="text-sm font-black uppercase tracking-tight text-rose-900 flex items-center gap-2">
                      <span>Alerte Sur-régime : Décrochage détecté !</span>
                    </h5>
                    <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                      L'élève a marché pendant <strong>{formatSecondsToMMSS(currentTM)}</strong> (plus de 30 secondes). Le rythme engagé était trop élevé pour maintenir l'effort aérobie continu.
                    </p>
                  </div>
                </div>

                {/* CHAMP DE DÉCISION OBLIGATOIRE POUR LE BLOC SUIVANT */}
                {activeTab < config.blockCount - 1 && (
                  <div className="bg-white/90 p-4 rounded-xl border border-rose-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-rose-900 uppercase tracking-wider">
                        Décision obligatoire pour le Bloc {currentBlock.blockIndex + 1} :
                      </label>
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">
                        Régulation nécessaire
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Option A : Maintien du contrat */}
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => updateBlockField(activeTab, 'decisionNextBlock', 'maintain')}
                        className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all active:scale-98 ${
                          currentBlock.decisionNextBlock === 'maintain'
                            ? 'bg-slate-800 text-white border-slate-900 shadow-md ring-2 ring-slate-400'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="w-5 h-5 rounded-full border border-current flex items-center justify-center shrink-0 mt-0.5">
                          {currentBlock.decisionNextBlock === 'maintain' && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <span className="text-xs font-black block">Option A : Maintien du contrat</span>
                          <span className={`text-[11px] block mt-0.5 ${currentBlock.decisionNextBlock === 'maintain' ? 'text-slate-300' : 'text-slate-500'}`}>
                            Conserver le même objectif de distance ({currentBlock.targetDistance}m).
                          </span>
                        </div>
                      </button>

                      {/* Option B : Réduction du contrat (Recommandé) */}
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => updateBlockField(activeTab, 'decisionNextBlock', 'reduce')}
                        className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all active:scale-98 ${
                          currentBlock.decisionNextBlock === 'reduce'
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-300'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50/70 hover:border-indigo-300'
                        }`}
                      >
                        <div className="w-5 h-5 rounded-full border border-current flex items-center justify-center shrink-0 mt-0.5">
                          {currentBlock.decisionNextBlock === 'reduce' && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black block">Option B : Réduction du contrat</span>
                            <span className="px-1.5 py-0.2 rounded-md bg-amber-400 text-amber-950 font-black text-[9px] uppercase">
                              Recommandé
                            </span>
                          </div>
                          <span className={`text-[11px] block mt-0.5 ${currentBlock.decisionNextBlock === 'reduce' ? 'text-indigo-200' : 'text-slate-500'}`}>
                            Abaisser le contrat visé pour retrouver une course continue sans marcher.
                          </span>
                        </div>
                      </button>
                    </div>

                    {/* Suggérer la distance adaptée si Option B sélectionnée */}
                    {currentBlock.decisionNextBlock === 'reduce' && (
                      <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center justify-between animate-in fade-in">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>
                            Contrat suggéré pour le Bloc {currentBlock.blockIndex + 1} : <strong>{currentBlock.suggestedReducedDistance || currentBlock.targetDistance - 100} m</strong>
                          </span>
                        </div>
                        <span className="text-[11px] text-indigo-700 font-bold">
                          Allure réaliste soutenue
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* NAVIGATION BLOC SUIVANT / TERMINER */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-bold text-slate-500">
                Bloc {currentBlock.blockIndex} sur {config.blockCount}
              </span>

              {activeTab < config.blockCount - 1 ? (
                <Button
                  onClick={() => setActiveTab(prev => prev + 1)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <span>Passer au Bloc {currentBlock.blockIndex + 1}</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => setShowSummaryView(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Award className="w-4 h-4" />
                  <span>Afficher le Bilan & Profil</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
