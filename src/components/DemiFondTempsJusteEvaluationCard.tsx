import React, { useState } from 'react';
import { 
  Award, 
  Timer, 
  Footprints, 
  Zap, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Sliders, 
  Edit3, 
  Flame,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from './ui/Button';
import { 
  DemiFondTempsJusteSummary, 
  formatSecondsToMMSS,
  calculateWalkingTimeSeconds,
  calculateRunningSpeedKmH,
  computeTempsJusteOfficialGrades
} from '../lib/evaluationHelpers';
import { RunningExactTime, RunningExactTimeData } from './RunningExactTime';
import { ObservationRecord, Student } from '../types';

export interface DemiFondTempsJusteEvaluationCardProps {
  student: Student;
  summary: DemiFondTempsJusteSummary | null;
  onApplyScores: (scores: Record<string, number>, appreciation: string) => void;
  onSaveObservationData?: (data: RunningExactTimeData) => void;
  isEvaluating?: boolean;
}

export function DemiFondTempsJusteEvaluationCard({
  student,
  summary,
  onApplyScores,
  onSaveObservationData,
  isEvaluating = true
}: DemiFondTempsJusteEvaluationCardProps) {
  const [isEditingBlocks, setIsEditingBlocks] = useState(false);
  const [showBlockDetails, setShowBlockDetails] = useState(true);

  const handleApply = () => {
    if (!summary) return;
    const { scores, appreciation } = computeTempsJusteOfficialGrades(summary);
    onApplyScores(scores, appreciation);
  };

  // Profile styling helpers
  const getProfileBadge = (profile: string) => {
    switch (profile) {
      case 'Régulier / Continu':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
          desc: 'Temps de marche total < 30s. Continuité de course remarquable.'
        };
      case 'Lucide / Adaptatif':
        return {
          bg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          dot: 'bg-indigo-500',
          desc: 'Alerte sur-régime suivie d\'une réduction de contrat efficace (TM = 0s ensuite).'
        };
      case 'Sur-estimé / Obstiné':
        return {
          bg: 'bg-red-50 text-red-800 border-red-200',
          dot: 'bg-red-500',
          desc: 'Temps de marche répété (TM > 30s) sans adaptation suffisante du contrat.'
        };
      case 'Prudent / En réserve':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
          desc: 'Course continue sans marcher mais contrats très sous-estimés.'
        };
      default:
        return {
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
          desc: 'Évaluation en cours de réalisation.'
        };
    }
  };

  if (!summary || !summary.hasData) {
    return (
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-slate-50 p-5 rounded-2xl border border-amber-200 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-base text-slate-900">
                Course au Temps Juste (4 x 5') • {student.name}
              </h4>
              <p className="text-xs text-slate-500">
                Aucune donnée de course au temps juste enregistrée pour cet élève sur ce cycle.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => setIsEditingBlocks(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs shrink-0"
          >
            <Timer className="w-3.5 h-3.5 mr-1.5" />
            Saisir les 4 blocs pour cet élève
          </Button>
        </div>

        {isEditingBlocks && (
          <div className="mt-4 pt-4 border-t border-amber-200/60 bg-white p-4 rounded-xl shadow-xs animate-in fade-in">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-slate-700 uppercase">
                Saisie directe de l'évaluation Course au Temps Juste
              </span>
              <button 
                onClick={() => setIsEditingBlocks(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Fermer
              </button>
            </div>

            <RunningExactTime
              value={{
                config: { blockCount: 4, blockDurationSeconds: 300 },
                blocks: [
                  { blockIndex: 1, targetDistance: 800 },
                  { blockIndex: 2, targetDistance: 800 },
                  { blockIndex: 3, targetDistance: 800 },
                  { blockIndex: 4, targetDistance: 800 }
                ]
              }}
              onChange={(data) => {
                if (onSaveObservationData) {
                  onSaveObservationData(data);
                }
              }}
            />
          </div>
        )}
      </div>
    );
  }

  const profileInfo = getProfileBadge(summary.profile);
  const totalDuration = (summary.config?.blockDurationSeconds || 300) * summary.totalBlocks;
  const runRatio = totalDuration > 0 ? Math.round((summary.totalTceSeconds / totalDuration) * 100) : 0;
  const walkRatio = Math.max(0, 100 - runRatio);

  return (
    <div className="bg-gradient-to-br from-amber-50/80 via-white to-slate-50 rounded-2xl border border-amber-200/90 p-5 shadow-sm space-y-5">
      {/* Top Banner with Profile & Action */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-amber-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <Timer className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 block">
                Épreuve Certificative EPS • Demi-Fond
              </span>
              <h4 className="font-black text-lg text-slate-900">
                Course au Temps Juste (4 x 5') : {student.name}
              </h4>
            </div>
          </div>
        </div>

        {/* Profile Pill & Auto Grade Button */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${profileInfo.bg}`}>
            <span className={`w-2 h-2 rounded-full ${profileInfo.dot}`} />
            <span>Profil : {summary.profile}</span>
          </div>

          <Button
            size="sm"
            onClick={handleApply}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-sm"
            title="Appliquer automatiquement les notes calculées à partir des 4 blocs sur la grille d'évaluation"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-200" />
            Appliquer le barème Temps Juste
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditingBlocks(!isEditingBlocks)}
            className="text-xs text-slate-700 border-slate-300 hover:bg-slate-100"
          >
            <Edit3 className="w-3.5 h-3.5 mr-1" />
            {isEditingBlocks ? 'Masquer saisie' : 'Modifier les 4 blocs'}
          </Button>
        </div>
      </div>

      {/* 4 Computed Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            ⏱️ Temps Couru (TCE)
          </span>
          <div className="text-xl font-black font-mono text-emerald-700 mt-1">
            {formatSecondsToMMSS(summary.totalTceSeconds)}
          </div>
          <span className="text-[10px] text-slate-400">
            sur {formatSecondsToMMSS(totalDuration)} ({runRatio}%)
          </span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            🚶 Temps Marché (TM)
          </span>
          <div className={`text-xl font-black font-mono mt-1 ${summary.totalTmSeconds > 30 ? 'text-red-600' : 'text-slate-800'}`}>
            {formatSecondsToMMSS(summary.totalTmSeconds)}
          </div>
          <span className="text-[10px] text-slate-400">
            {summary.totalTmSeconds < 30 ? 'Continuité validée (< 30s)' : `${summary.overpacedAlertCount} alerte(s) sur-régime`}
          </span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            ⚡ Vitesse Réelle Course
          </span>
          <div className="text-xl font-black font-mono text-indigo-700 mt-1">
            {summary.realSpeedKmH} <span className="text-xs text-slate-400 font-normal">km/h</span>
          </div>
          <span className="text-[10px] text-slate-400">
            Calculée sur le TCE uniquement
          </span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            📏 Distance Totale
          </span>
          <div className="text-xl font-black font-mono text-slate-900 mt-1">
            {summary.totalActualDistance} <span className="text-xs text-slate-400 font-normal">m</span>
          </div>
          <span className="text-[10px] text-slate-400">
            Contrat cumulé : {summary.totalTargetDistance}m
          </span>
        </div>
      </div>

      {/* Visual Bar: Temps Couru vs Temps Marché */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-bold">
          <span className="text-emerald-700 flex items-center gap-1">
            <Footprints className="w-3.5 h-3.5" /> Temps de course effectif ({runRatio}%)
          </span>
          <span className="text-red-600">
            Temps de marche ({walkRatio}%)
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
          <div 
            className="bg-emerald-500 h-2.5 transition-all duration-500" 
            style={{ width: `${runRatio}%` }}
            title={`Couru : ${runRatio}%`}
          />
          <div 
            className="bg-red-400 h-2.5 transition-all duration-500" 
            style={{ width: `${walkRatio}%` }}
            title={`Marché : ${walkRatio}%`}
          />
        </div>
      </div>

      {/* Table of the 4 Blocks */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            Détail des 4 blocs de 5 minutes ({summary.completedBlocks} / {summary.totalBlocks} réalisés)
          </span>
          <button 
            type="button"
            onClick={() => setShowBlockDetails(!showBlockDetails)}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
          >
            {showBlockDetails ? 'Réduire' : 'Déplier'}
            {showBlockDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showBlockDetails && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="px-3 py-2 text-center w-12">Bloc</th>
                  <th className="px-3 py-2">Contrat visé</th>
                  <th className="px-3 py-2">Réalisé</th>
                  <th className="px-3 py-2 text-center">TCE (Couru)</th>
                  <th className="px-3 py-2 text-center">TM (Marché)</th>
                  <th className="px-3 py-2 text-center">Vitesse réelle</th>
                  <th className="px-3 py-2 text-center">Alerte sur-régime</th>
                  <th className="px-3 py-2 text-center">Décision bloc suivant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {summary.blocks.map((block: any, idx: number) => {
                  const tce = block.effectiveRunningTimeSeconds;
                  const blockDuration = summary.config?.blockDurationSeconds || 300;
                  const tm = tce !== undefined ? Math.max(0, blockDuration - tce) : undefined;
                  const isOverpacing = tm !== undefined && tm > 30;
                  const speed = calculateRunningSpeedKmH(block.actualDistance, tce);

                  return (
                    <tr key={idx} className={isOverpacing ? 'bg-red-50/30' : ''}>
                      <td className="px-3 py-2 font-black text-center font-sans text-slate-800">
                        Bloc {block.blockIndex || idx + 1}
                      </td>
                      <td className="px-3 py-2 font-bold text-slate-700 font-sans">
                        {block.targetDistance} m
                      </td>
                      <td className="px-3 py-2 font-bold text-slate-900 font-sans">
                        {block.actualDistance !== undefined ? `${block.actualDistance} m` : '-'}
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-emerald-700">
                        {tce !== undefined ? formatSecondsToMMSS(tce) : '-'}
                      </td>
                      <td className={`px-3 py-2 text-center font-bold ${isOverpacing ? 'text-red-600' : 'text-slate-600'}`}>
                        {tm !== undefined ? formatSecondsToMMSS(tm) : '-'}
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-indigo-700">
                        {speed > 0 ? `${speed} km/h` : '-'}
                      </td>
                      <td className="px-3 py-2 text-center font-sans">
                        {isOverpacing ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                            <AlertTriangle className="w-3 h-3" /> TM &gt; 30s
                          </span>
                        ) : tm !== undefined ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Régulier
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center font-sans">
                        {block.decisionNextBlock === 'reduce' ? (
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-200">
                            Réduction du contrat (Recommandé)
                          </span>
                        ) : block.decisionNextBlock === 'maintain' ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                            Maintien du contrat
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Direct Interactive Editor Modal / Expandable */}
      {isEditingBlocks && (
        <div className="pt-4 border-t border-amber-200/80 bg-white p-5 rounded-xl border border-slate-200 shadow-sm animate-in fade-in space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-amber-600" />
              Saisie et modification en direct des 4 blocs de 5'
            </span>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setIsEditingBlocks(false)}
            >
              Terminer la saisie
            </Button>
          </div>

          <RunningExactTime
            value={{
              config: summary.config || { blockCount: 4, blockDurationSeconds: 300 },
              blocks: summary.blocks
            }}
            onChange={(data) => {
              if (onSaveObservationData) {
                onSaveObservationData(data);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
