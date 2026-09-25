import React, { useState } from 'react';
import { Activity } from '../types';
import { useStore } from '../store';
import { Button } from './ui/Button';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DeleteActivityModalProps {
  activity: Activity;
  isOpen: boolean;
  onClose: () => void;
  redirectPath?: string;
}

export function DeleteActivityModal({
  activity,
  isOpen,
  onClose,
  redirectPath
}: DeleteActivityModalProps) {
  const { sessions, sheets, observations, deleteActivity } = useStore();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const activitySessions = sessions.filter(s => s.activityId === activity.id);
  const sessionIds = new Set(activitySessions.map(s => s.id));
  const activitySheets = sheets.filter(s => s.activityId === activity.id);
  const activityObservations = observations.filter(o => sessionIds.has(o.sessionId));

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteActivity(activity.id);
      onClose();
      if (redirectPath) {
        navigate(redirectPath);
      }
    } catch (e) {
      console.error(e);
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-red-100">
        <div className="p-6 text-center space-y-4">
          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-red-50">
            <Trash2 className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-slate-900">Supprimer cette activité ?</h3>
            <p className="text-sm text-slate-600 mt-1">
              Vous êtes sur le point de supprimer définitivement le cycle <span className="font-bold text-slate-900">« {activity.name} »</span>.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-left text-xs text-amber-800 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              Éléments qui seront supprimés :
            </div>
            <ul className="list-disc pl-4 space-y-0.5">
              <li><span className="font-semibold">{activitySessions.length}</span> séance(s) d'évaluation</li>
              <li><span className="font-semibold">{activitySheets.length}</span> situation(s) d'observation</li>
              <li><span className="font-semibold">{activityObservations.length}</span> fiche(s) d'observation élèves</li>
            </ul>
          </div>

          <p className="text-xs text-red-500 font-medium">Cette action est immédiate et irréversible.</p>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isDeleting}>
            Annuler
          </Button>
          <Button
            className="flex-1 bg-red-600 hover:bg-red-700 text-white shadow-sm"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
          </Button>
        </div>
      </div>
    </div>
  );
}
