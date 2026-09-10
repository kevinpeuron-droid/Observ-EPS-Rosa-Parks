import React from 'react';

const CRITERIA = [
  { id: 'execution', label: 'Réalisation / Exécution technique' },
  { id: 'fluidity', label: 'Fluidité et Liaisons' },
  { id: 'originality', label: 'Originalité de la composition' },
  { id: 'space', label: 'Utilisation de l\'espace' }
];

const LEVELS = [
  { value: 1, label: 'Insuffisant', color: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200', activeColor: 'bg-red-500 text-white border-red-600' },
  { value: 2, label: 'Fragile', color: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200', activeColor: 'bg-amber-500 text-white border-amber-600' },
  { value: 3, label: 'Satisfaisant', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200', activeColor: 'bg-emerald-500 text-white border-emerald-600' },
  { value: 4, label: 'Expert', color: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200 hover:bg-fuchsia-200', activeColor: 'bg-fuchsia-600 text-white border-fuchsia-700' }
];

export interface ArtisticRatingData {
  scores: Record<string, number>;
}

interface ArtisticRatingProps {
  value: ArtisticRatingData;
  onChange: (value: ArtisticRatingData) => void;
}

export function ArtisticRating({ value, onChange }: ArtisticRatingProps) {
  const data = value || { scores: {} };

  const updateScore = (criteriaId: string, score: number) => {
    onChange({
      ...data,
      scores: {
        ...data.scores,
        [criteriaId]: score
      }
    });
  };

  const totalScore = Object.values(data.scores).reduce((a, b) => a + b, 0);
  const maxScore = CRITERIA.length * 4;

  return (
    <div className="space-y-4 w-full">
      <div className="flex justify-between items-center bg-fuchsia-50 p-3 rounded-xl border border-fuchsia-200 mb-2">
         <div className="text-sm text-fuchsia-800 font-bold uppercase tracking-wider">Score Global</div>
         <div className="text-xl font-bold font-mono text-fuchsia-700">
           {totalScore > 0 ? `${totalScore} / ${maxScore}` : '-'}
         </div>
      </div>

      {CRITERIA.map(c => (
        <div key={c.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="text-sm font-bold text-slate-700 mb-2">{c.label}</div>
          <div className="grid grid-cols-4 gap-2">
            {LEVELS.map(l => {
              const isSelected = data.scores[c.id] === l.value;
              return (
                <button
                  key={l.value}
                  onClick={() => updateScore(c.id, l.value)}
                  className={`py-2 px-1 text-[10px] sm:text-xs font-bold rounded-lg border transition-all ${
                    isSelected ? l.activeColor + ' shadow-sm scale-105' : l.color
                  }`}
                >
                  {l.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
