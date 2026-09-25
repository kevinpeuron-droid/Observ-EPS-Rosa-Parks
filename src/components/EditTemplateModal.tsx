import React, { useState, useEffect } from 'react';
import { TemplateActivity } from '../types';
import { useStore } from '../store';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { X, Edit3, Save } from 'lucide-react';

interface EditTemplateModalProps {
  template: TemplateActivity;
  isOpen: boolean;
  onClose: () => void;
}

export function EditTemplateModal({ template, isOpen, onClose }: EditTemplateModalProps) {
  const { updateTemplateActivity } = useStore();
  const [name, setName] = useState(template.name);
  const [ca, setCa] = useState<number>(template.ca || 1);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setCa(template.ca || 1);
    }
  }, [template]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    updateTemplateActivity(template.id, {
      name: name.trim(),
      ca: ca as 1 | 2 | 3 | 4 | 5
    });
    onClose();
  };

  const caNames: Record<number, string> = {
    1: 'CA 1 (Performance mesurée - Athlétisme, Natation, Demi-Fond)',
    2: 'CA 2 (Adaptation en milieu variable - Escalade, Orientation)',
    3: 'CA 3 (Prestation artistique / acrobatique - Acrosport, Gym, Danse)',
    4: 'CA 4 (Affrontement interindividuel / collectif - Badminton, Sports Co)',
    5: 'CA 5 (Entretien et développement de soi - Musculation, Cardio)'
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Modifier le modèle d'activité</h2>
              <p className="text-xs text-slate-500">Banque de modèles</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Nom du modèle
            </label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Badminton, Demi-Fond..."
              required
              className="h-11 text-base font-medium"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Champ d'Apprentissage (CA)
            </label>
            <select
              value={ca}
              onChange={e => setCa(parseInt(e.target.value))}
              className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
            >
              {[1, 2, 3, 4, 5].map(val => (
                <option key={val} value={val}>
                  {caNames[val]}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={!name.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Save className="w-4 h-4 mr-2" />
              Enregistrer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
