import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Plus, Trash2, CheckSquare, Square } from 'lucide-react';

interface SequenceItem {
  id: string;
  name: string;
  validated: boolean;
}

interface SequencePlannerProps {
  value: SequenceItem[];
  onChange: (value: SequenceItem[]) => void;
}

export function SequencePlanner({ value, onChange }: SequencePlannerProps) {
  const data = value || [];
  const [newItemName, setNewItemName] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    onChange([
      ...data, 
      { id: Math.random().toString(36).substr(2, 9), name: newItemName.trim(), validated: false }
    ]);
    setNewItemName('');
  };

  const handleToggle = (id: string) => {
    onChange(data.map(item => item.id === id ? { ...item, validated: !item.validated } : item));
  };

  const handleRemove = (id: string) => {
    onChange(data.filter(item => item.id !== id));
  };

  const validatedCount = data.filter(i => i.validated).length;

  return (
    <div className="flex flex-col gap-4 w-full">
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input 
          placeholder="Nouvel élément (ex: Basic step, Tour complet...)"
          value={newItemName}
          onChange={e => setNewItemName(e.target.value)}
          className="bg-white"
        />
        <Button type="submit" disabled={!newItemName.trim()} variant="secondary">
          <Plus className="w-4 h-4" />
        </Button>
      </form>

      {data.length > 0 && (
        <div className="flex justify-between items-center text-sm font-bold text-slate-500 px-1">
          <span>Validation :</span>
          <span className={validatedCount === data.length ? 'text-emerald-600' : 'text-slate-600'}>
            {validatedCount} / {data.length}
          </span>
        </div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {data.map((item, index) => (
          <div 
            key={item.id} 
            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${item.validated ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}
          >
            <button 
              className="flex-1 flex items-center gap-3 text-left"
              onClick={() => handleToggle(item.id)}
            >
              {item.validated ? (
                <CheckSquare className="w-5 h-5 text-emerald-500 shrink-0" />
              ) : (
                <Square className="w-5 h-5 text-slate-400 shrink-0" />
              )}
              <span className={`font-medium ${item.validated ? 'text-emerald-800 line-through opacity-70' : 'text-slate-700'}`}>
                {index + 1}. {item.name}
              </span>
            </button>
            <button 
              onClick={() => handleRemove(item.id)}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {data.length === 0 && (
          <div className="text-center p-4 text-sm text-slate-400 italic">
            Aucun élément dans l'enchaînement.
          </div>
        )}
      </div>
    </div>
  );
}
