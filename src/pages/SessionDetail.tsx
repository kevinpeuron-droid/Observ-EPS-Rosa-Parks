import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../store';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { QrCode, MonitorPlay, Save, CheckCircle2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export function SessionDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { sessions, sheets, updateSession } = useStore();
  
  const session = sessions.find(s => s.id === sessionId);
  const sessionSheets = sheets.filter(s => s.activityId === session?.activityId);

  const [feedback, setFeedback] = useState(session?.feedback || '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (session) {
      setFeedback(session.feedback);
    }
  }, [session]);

  if (!session) return <div className="p-8 text-center">Séance introuvable.</div>;

  const handleSaveFeedback = () => {
    updateSession(session.id, { feedback });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSheetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSession(session.id, { sheetId: e.target.value });
  };

  const observeUrl = `${window.location.origin}/#/observe/${session.id}`;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 ease-out">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{session.name}</h1>
          <p className="text-slate-500 mt-1">Gérez le déroulement et le bilan de la séance.</p>
        </div>
        <Link to={`/project/${session.id}`}>
          <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg w-full sm:w-auto">
            <MonitorPlay className="w-5 h-5 mr-2" />
            Lancer la Projection
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* QR Code et Fiche */}
        <div className="space-y-6">
          <Card className="h-full border-blue-100 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <QrCode className="w-5 h-5" />
                Partage Terrain (Élèves)
              </CardTitle>
              <CardDescription>
                Flashez ce QR Code avec une tablette pour permettre aux élèves de saisir des observations.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="mb-6 w-full">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Fiche d'observation active :
                </label>
                <select 
                  className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  value={session.sheetId || ''}
                  onChange={handleSheetChange}
                >
                  <option value="" disabled>-- Sélectionner une fiche --</option>
                  {sessionSheets.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {!session.sheetId && (
                  <p className="text-xs text-amber-600 mt-2">
                    ⚠️ Veuillez sélectionner une fiche pour que la saisie élève fonctionne.
                  </p>
                )}
              </div>

              {session.sheetId && (
                <div className="p-4 bg-white border-4 border-slate-900 rounded-xl">
                  <QRCodeSVG value={observeUrl} size={200} level="H" />
                </div>
              )}
              {session.sheetId && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-slate-500 mb-2">Ou utilisez ce lien :</p>
                  <a href={observeUrl} target="_blank" rel="noreferrer" className="text-blue-600 font-medium text-sm hover:underline break-all">
                    {observeUrl}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bilan de séance */}
        <div className="space-y-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Bilan Qualitatif</CardTitle>
              <CardDescription>
                Notes pédagogiques, réussites, et ajustements pour la prochaine séance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full min-h-[300px] p-4 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                placeholder="Rédigez le bilan de votre séance ici..."
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
              />
            </CardContent>
            <CardFooter className="flex justify-end gap-4 border-t border-slate-100 pt-6">
              {saved && <span className="text-emerald-600 flex items-center gap-1 text-sm"><CheckCircle2 className="w-4 h-4" /> Enregistré</span>}
              <Button onClick={handleSaveFeedback}>
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder le bilan
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
