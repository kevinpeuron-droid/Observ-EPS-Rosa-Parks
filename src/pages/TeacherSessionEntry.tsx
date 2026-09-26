import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  ChevronLeft, 
  Save, 
  CheckCircle2, 
  Users, 
  Sparkles, 
  AlertTriangle, 
  Star, 
  Maximize2, 
  Minimize2, 
  Download, 
  Filter, 
  Layers, 
  UserCheck, 
  HelpCircle,
  Clock,
  Plus,
  Minus,
  Check,
  X,
  FileSpreadsheet,
  MonitorPlay,
  Eye,
  Settings2,
  Smartphone,
  ChevronRight
} from 'lucide-react';
import { ObservationField, StudentSessionStatus } from '../types';

export function TeacherSessionEntry() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { 
    sessions, 
    sheets, 
    activities, 
    classes, 
    observations, 
    updateSession, 
    setStudentSessionAttendance,
    setStudentObservationData,
    saveStudentFullObservation,
    createDefaultSheetForActivity
  } = useStore();

  const session = sessions.find(s => s.id === sessionId);
  const activity = activities.find(a => a.id === session?.activityId);
  const cls = classes.find(c => c.id === activity?.classId);
  const sessionSheets = sheets.filter(s => s.activityId === session?.activityId);
  
  // Current active sheet: session.sheetId or the first sheet of the activity
  const [selectedSheetId, setSelectedSheetId] = useState<string>(session?.sheetId || sessionSheets[0]?.id || '');
  const activeSheet = sheets.find(s => s.id === selectedSheetId) || sessionSheets[0];

  const sessionObs = observations.filter(o => o.sessionId === session?.id);

  const [viewMode, setViewMode] = useState<'table' | 'cards'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return 'cards';
    return 'table';
  });
  const [mobileStudentIndex, setMobileStudentIndex] = useState(0);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [bulkColumnValue, setBulkColumnValue] = useState<Record<string, string>>({});
  const [activeCellFocus, setActiveCellFocus] = useState<{ studentId: string; fieldId: string } | null>(null);

  // Sync selectedSheetId if session changes
  useEffect(() => {
    if (session?.sheetId && session.sheetId !== selectedSheetId) {
      setSelectedSheetId(session.sheetId);
    } else if (!selectedSheetId && sessionSheets.length > 0) {
      setSelectedSheetId(sessionSheets[0].id);
    }
  }, [session?.sheetId, sessionSheets.length]);

  if (!session) {
    return (
      <div className="p-12 text-center text-slate-500">
        <p className="text-lg font-bold">Séance introuvable.</p>
        <Link to="/" className="text-indigo-600 hover:underline text-sm mt-2 inline-block">
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  const handleSheetChange = (newSheetId: string) => {
    setSelectedSheetId(newSheetId);
    updateSession(session.id, { sheetId: newSheetId });
  };

  const studentsList = (cls?.students || []).filter(st => 
    st.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Attendance & Gear helpers
  const getStudentStatus = (studentId: string): StudentSessionStatus => {
    const studentObs = sessionObs.filter(o => o.targetId === studentId);
    if (studentObs.length === 0) return 'present';
    const latest = [...studentObs].sort((a, b) => b.timestamp - a.timestamp)[0];
    if (latest.status) return latest.status;
    if (studentObs.every(o => Object.values(o.data).length > 0 && Object.values(o.data).every(v => v === 'A'))) return 'absent';
    if (studentObs.every(o => Object.values(o.data).length > 0 && Object.values(o.data).every(v => v === 'D'))) return 'dispense';
    return 'present';
  };

  const getStudentNoGear = (studentId: string): boolean => {
    const studentObs = sessionObs.filter(o => o.targetId === studentId);
    if (studentObs.length === 0) return false;
    const latest = [...studentObs].sort((a, b) => b.timestamp - a.timestamp)[0];
    return !!latest.noGear;
  };

  const getStudentFieldValue = (studentId: string, fieldId: string): any => {
    const studentObs = sessionObs.filter(o => o.targetId === studentId);
    if (studentObs.length === 0) return '';
    const latest = [...studentObs].sort((a, b) => b.timestamp - a.timestamp)[0];
    const val = latest.data[fieldId];
    return val !== undefined && val !== null ? val : '';
  };

  const getStudentBilan = (studentId: string): string => {
    const studentObs = sessionObs.filter(o => o.targetId === studentId);
    if (studentObs.length === 0) return '';
    const latest = [...studentObs].sort((a, b) => b.timestamp - a.timestamp)[0];
    return latest.bilan || '';
  };

  // Change student attendance status
  const handleStatusChange = async (studentId: string, status: StudentSessionStatus) => {
    const noGear = getStudentNoGear(studentId);
    await setStudentSessionAttendance(session.id, studentId, status, noGear);
    showSavedFeedback();
  };

  // Toggle no gear
  const handleToggleNoGear = async (studentId: string) => {
    const currentStatus = getStudentStatus(studentId);
    const currentNoGear = getStudentNoGear(studentId);
    await setStudentSessionAttendance(session.id, studentId, currentStatus, !currentNoGear);
    showSavedFeedback();
  };

  // Toggle positive / negative
  const handleTogglePositive = (studentId: string) => {
    const currentPositives = session.positiveStudentIds || [];
    const currentNegatives = session.negativeStudentIds || [];
    if (currentPositives.includes(studentId)) {
      updateSession(session.id, {
        positiveStudentIds: currentPositives.filter(id => id !== studentId)
      });
    } else {
      updateSession(session.id, {
        positiveStudentIds: [...currentPositives, studentId],
        negativeStudentIds: currentNegatives.filter(id => id !== studentId)
      });
    }
  };

  const handleToggleNegative = (studentId: string) => {
    const currentPositives = session.positiveStudentIds || [];
    const currentNegatives = session.negativeStudentIds || [];
    if (currentNegatives.includes(studentId)) {
      updateSession(session.id, {
        negativeStudentIds: currentNegatives.filter(id => id !== studentId)
      });
    } else {
      updateSession(session.id, {
        negativeStudentIds: [...currentNegatives, studentId],
        positiveStudentIds: currentPositives.filter(id => id !== studentId)
      });
    }
  };

  const showSavedFeedback = () => {
    setSaveStatus('Modifications enregistrées');
    setTimeout(() => setSaveStatus(null), 1500);
  };

  // Cell data change
  const handleCellChange = async (studentId: string, fieldId: string, value: any) => {
    // Normalization of 'A' and 'D'
    let finalValue = value;
    if (typeof value === 'string') {
      const lower = value.trim().toLowerCase();
      if (lower === 'a' || lower === 'abs') finalValue = 'A';
      else if (lower === 'd' || lower === 'disp') finalValue = 'D';
    }

    await setStudentObservationData(session.id, studentId, fieldId, finalValue);
    showSavedFeedback();
  };

  // Quick mark 'A' or 'D' in cell
  const handleQuickMarkCell = async (studentId: string, fieldId: string, code: 'A' | 'D') => {
    await setStudentObservationData(session.id, studentId, fieldId, code);
    showSavedFeedback();
  };

  // Clear cell
  const handleClearCell = async (studentId: string, fieldId: string) => {
    await setStudentObservationData(session.id, studentId, fieldId, '');
    showSavedFeedback();
  };

  // Increment / decrement counter
  const handleCounterStep = async (studentId: string, fieldId: string, delta: number) => {
    const current = getStudentFieldValue(studentId, fieldId);
    let num = typeof current === 'number' ? current : 0;
    num = Math.max(0, num + delta);
    await setStudentObservationData(session.id, studentId, fieldId, num);
    showSavedFeedback();
  };

  // Toggle boolean
  const handleBooleanToggle = async (studentId: string, fieldId: string) => {
    const current = getStudentFieldValue(studentId, fieldId);
    const next = !current;
    await setStudentObservationData(session.id, studentId, fieldId, next);
    showSavedFeedback();
  };

  // Quick rating 1-5
  const handleRatingClick = async (studentId: string, fieldId: string, rating: number) => {
    await setStudentObservationData(session.id, studentId, fieldId, rating);
    showSavedFeedback();
  };

  // Bilan change
  const handleBilanChange = async (studentId: string, text: string) => {
    const studentObs = sessionObs.filter(o => o.targetId === studentId);
    const existing = [...studentObs].sort((a, b) => b.timestamp - a.timestamp)[0];
    if (existing) {
      await saveStudentFullObservation(session.id, studentId, existing.data, { bilan: text });
    } else {
      await saveStudentFullObservation(session.id, studentId, {}, { bilan: text });
    }
    showSavedFeedback();
  };

  // Bulk fill a column for all present students
  const handleBulkFillColumn = async (fieldId: string, value: any) => {
    if (!cls?.students) return;
    for (const st of cls.students) {
      await setStudentObservationData(session.id, st.id, fieldId, value);
    }
    showSavedFeedback();
  };

  // Mark all present
  const handleMarkAllPresent = async () => {
    if (!cls?.students) return;
    for (const st of cls.students) {
      const noGear = getStudentNoGear(st.id);
      await setStudentSessionAttendance(session.id, st.id, 'present', noGear);
    }
    showSavedFeedback();
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!cls || !activeSheet) return;
    const headers = ['N°', 'Élève', 'Statut', 'Matériel', ...activeSheet.fields.map(f => f.label), 'Bilan'];
    const rows = cls.students.map((st, i) => {
      const status = getStudentStatus(st.id);
      const noGear = getStudentNoGear(st.id) ? 'Sans matériel' : 'OK';
      const fieldValues = activeSheet.fields.map(f => {
        const v = getStudentFieldValue(st.id, f.id);
        return v !== undefined ? `"${String(v).replace(/"/g, '""')}"` : '""';
      });
      const bilan = `"${getStudentBilan(st.id).replace(/"/g, '""')}"`;
      return [i + 1, `"${st.name}"`, status, noGear, ...fieldValues, bilan].join(';');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `saisie_prof_${session.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle fullscreen container
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const presentCount = (cls?.students || []).filter(s => getStudentStatus(s.id) === 'present').length;
  const absentCount = (cls?.students || []).filter(s => getStudentStatus(s.id) === 'absent').length;
  const dispenseCount = (cls?.students || []).filter(s => getStudentStatus(s.id) === 'dispense').length;
  const noGearCount = (cls?.students || []).filter(s => getStudentNoGear(s.id)).length;

  return (
    <div className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-100 p-4 overflow-auto' : 'max-w-[100vw] pb-12'}`}>
      {/* Top Header Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link 
              to={`/session/${session.id}`}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 font-semibold transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Retour séance ({session.name})
            </Link>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Mode Saisie Professeur (Tableau)
            </span>
          </div>

          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{session.name}</h1>
            <span className="text-sm font-semibold text-slate-600">
              Classe : <strong className="text-slate-900">{cls?.name || 'Inconnue'}</strong>
              {activity && <span> • Cycle : <strong>{activity.name}</strong></span>}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {saveStatus && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" /> {saveStatus}
            </span>
          )}

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportCSV} 
            className="text-xs text-slate-700 hover:bg-slate-50 border-slate-200"
            title="Exporter la grille de saisie en format CSV / Excel"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export CSV
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleFullscreen} 
            className="text-xs text-slate-700 hover:bg-slate-50 border-slate-200"
            title="Activer le mode plein écran pour la saisie terrain"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 mr-1" /> : <Maximize2 className="w-3.5 h-3.5 mr-1" />}
            {isFullscreen ? 'Quitter Plein Écran' : 'Plein Écran'}
          </Button>

          {/* View Mode Toggle: Cards (Mobile) vs Table (Desktop) */}
          <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                viewMode === 'cards' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Mode adapté smartphone : fiches élèves avec gros boutons tactiles"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Fiche Mobile</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                viewMode === 'table' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Mode grille tableau : idéal sur grand écran ou PC"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grille Tableau</span>
              <span className="sm:hidden">Tableau</span>
            </button>
          </div>

          <Link to={`/project/${session.id}`}>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
              <MonitorPlay className="w-3.5 h-3.5 mr-1.5" />
              Projection
            </Button>
          </Link>
        </div>
      </div>

      {/* Control bar : Sheet selector, Search, Attendance summary */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Active sheet selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-4 h-4 text-indigo-600" />
            Fiche d'observation :
          </label>
          {sessionSheets.length > 0 ? (
            <select
              value={selectedSheetId}
              onChange={e => handleSheetChange(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              {sessionSheets.map(sh => (
                <option key={sh.id} value={sh.id}>
                  {sh.name} ({sh.fields.length} colonnes)
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                Aucune fiche créée pour ce cycle.
              </span>
              <Button
                size="sm"
                onClick={() => {
                  if (activity) {
                    const newId = createDefaultSheetForActivity(activity.id);
                    setSelectedSheetId(newId);
                    updateSession(session.id, { sheetId: newId });
                  }
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                Créer la situation (1 clic)
              </Button>
            </div>
          )}

          {/* Search student */}
          <div className="relative">
            <input
              type="text"
              placeholder="Filtrer un élève..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="h-9 w-40 sm:w-48 rounded-xl border border-slate-200 bg-slate-50 pl-3 pr-7 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
            {searchTerm && (
              <button 
                type="button" 
                onClick={() => setSearchTerm('')} 
                className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Permanent Quick attendance badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            {presentCount} Présents
          </span>
          {absentCount > 0 && (
            <span className="px-2.5 py-1 rounded-lg font-bold bg-red-100 text-red-800 border border-red-200">
              {absentCount} Absents (A)
            </span>
          )}
          {dispenseCount > 0 && (
            <span className="px-2.5 py-1 rounded-lg font-bold bg-amber-100 text-amber-800 border border-amber-200">
              {dispenseCount} Dispensés (D)
            </span>
          )}
          {noGearCount > 0 && (
            <span className="px-2.5 py-1 rounded-lg font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
              <span>👟</span> {noGearCount} Sans matériel
            </span>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleMarkAllPresent}
            className="text-xs font-semibold hover:bg-slate-100 text-slate-700 h-8"
          >
            Tous présents
          </Button>
        </div>
      </div>

      {/* SPREADSHEET OR MOBILE CARDS VIEW */}
      {viewMode === 'cards' ? (
        <div className="space-y-4">
          {/* Mobile Student Stepper Bar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={mobileStudentIndex === 0}
              onClick={() => setMobileStudentIndex(prev => Math.max(0, prev - 1))}
              className="h-11 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 font-bold text-xs flex items-center gap-1 transition-all active:scale-95 shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Précédent</span>
            </button>

            {/* Direct Student Selector Dropdown */}
            <div className="flex-1 max-w-sm text-center">
              <select
                value={mobileStudentIndex}
                onChange={e => setMobileStudentIndex(Number(e.target.value))}
                className="w-full h-11 px-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-center"
              >
                {studentsList.map((st, idx) => (
                  <option key={st.id} value={idx}>
                    {idx + 1}. {st.name} ({getStudentStatus(st.id) === 'present' ? 'P' : getStudentStatus(st.id) === 'absent' ? 'A' : 'D'})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              disabled={mobileStudentIndex >= studentsList.length - 1}
              onClick={() => setMobileStudentIndex(prev => Math.min(studentsList.length - 1, prev + 1))}
              className="h-11 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 font-bold text-xs flex items-center gap-1 transition-all active:scale-95 shrink-0"
            >
              <span className="hidden sm:inline">Suivant</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Active Student Card */}
          {studentsList.length > 0 && (() => {
            const st = studentsList[mobileStudentIndex] || studentsList[0];
            const status = getStudentStatus(st.id);
            const noGear = getStudentNoGear(st.id);
            const isPositive = session.positiveStudentIds?.includes(st.id);
            const isNegative = session.negativeStudentIds?.includes(st.id);
            const bilan = getStudentBilan(st.id);

            return (
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                {/* Student Card Header */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-extrabold text-sm shrink-0">
                      {mobileStudentIndex + 1}
                    </span>
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900 leading-tight">{st.name}</h2>
                      <Link to={`/student/${st.id}/class/${cls?.id}`} className="text-[11px] text-indigo-600 hover:underline font-semibold">
                        Fiche individuelle élève →
                      </Link>
                    </div>
                  </div>

                  {/* Group Dynamic Star / Warning */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleTogglePositive(st.id)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                        isPositive ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                      title="Élève moteur ⭐"
                    >
                      <Star className={`w-4 h-4 ${isPositive ? 'fill-white' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleNegative(st.id)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                        isNegative ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-700'
                      }`}
                      title="Point de vigilance ⚠️"
                    >
                      <AlertTriangle className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Attendance Buttons: P / A / D / Sans tenue */}
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleStatusChange(st.id, 'present')}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                      status === 'present' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Présent
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(st.id, 'absent')}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                      status === 'absent' ? 'bg-red-600 text-white border-red-600 shadow-xs' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Absent (A)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(st.id, 'dispense')}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                      status === 'dispense' ? 'bg-amber-600 text-white border-amber-600 shadow-xs' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Dispensé (D)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleNoGear(st.id)}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all active:scale-95 ${
                      noGear ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                  >
                    👟 Sans tenue
                  </button>
                </div>

                {/* Criteria of active sheet */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    Critères de la fiche ({activeSheet?.fields.length || 0})
                  </h3>

                  {(activeSheet?.fields || []).map(field => {
                    const val = getStudentFieldValue(st.id, field.id);
                    const isA = val === 'A' || val === 'a';
                    const isD = val === 'D' || val === 'd';

                    return (
                      <div key={field.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-slate-900">{field.label}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleQuickMarkCell(st.id, field.id, 'A')}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-colors ${
                                isA ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-500 border-slate-200'
                              }`}
                            >
                              A
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickMarkCell(st.id, field.id, 'D')}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-colors ${
                                isD ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-500 border-slate-200'
                              }`}
                            >
                              D
                            </button>
                          </div>
                        </div>

                        {/* Input tailored to field type */}
                        {isA ? (
                          <div className="flex items-center justify-between p-2.5 bg-red-100 rounded-xl text-red-800 font-bold text-xs">
                            <span>ABSENT (A) SUR CE CRITÈRE</span>
                            <button type="button" onClick={() => handleClearCell(st.id, field.id)} className="underline text-red-600 text-[11px]">Effacer</button>
                          </div>
                        ) : isD ? (
                          <div className="flex items-center justify-between p-2.5 bg-amber-100 rounded-xl text-amber-800 font-bold text-xs">
                            <span>DISPENSÉ (D) SUR CE CRITÈRE</span>
                            <button type="button" onClick={() => handleClearCell(st.id, field.id)} className="underline text-amber-600 text-[11px]">Effacer</button>
                          </div>
                        ) : field.type === 'counter' ? (
                          <div className="flex items-center justify-between gap-3 bg-white p-2 rounded-xl border border-slate-200">
                            <button
                              type="button"
                              onClick={() => handleCounterStep(st.id, field.id, -1)}
                              className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 font-extrabold text-xl flex items-center justify-center active:scale-95 shrink-0"
                            >
                              <Minus className="w-5 h-5 stroke-[3]" />
                            </button>
                            <span className="text-2xl font-extrabold font-mono text-slate-900">
                              {typeof val === 'number' ? val : 0}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCounterStep(st.id, field.id, 1)}
                              className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-extrabold text-xl flex items-center justify-center active:scale-95 shrink-0 shadow-xs"
                            >
                              <Plus className="w-5 h-5 stroke-[3]" />
                            </button>
                          </div>
                        ) : field.type === 'boolean' ? (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => handleCellChange(st.id, field.id, false)}
                              className={`py-3 rounded-xl text-xs font-bold border transition-all ${
                                val === false ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-600 border-slate-200'
                              }`}
                            >
                              Non validé
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCellChange(st.id, field.id, true)}
                              className={`py-3 rounded-xl text-xs font-bold border transition-all ${
                                val === true ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'
                              }`}
                            >
                              Validé (OUI)
                            </button>
                          </div>
                        ) : field.type === 'rating' ? (
                          <div className="grid grid-cols-5 gap-1.5">
                            {[1, 2, 3, 4, 5].map(starNum => (
                              <button
                                key={starNum}
                                type="button"
                                onClick={() => handleRatingClick(st.id, field.id, starNum)}
                                className={`h-12 rounded-xl border font-bold text-xs flex flex-col items-center justify-center gap-0.5 transition-all ${
                                  Number(val) >= starNum ? 'bg-amber-500 text-white border-amber-500 shadow-xs' : 'bg-white text-slate-400 border-slate-200'
                                }`}
                              >
                                <span>★</span>
                                <span className="text-[10px]">{starNum}</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={val !== undefined ? val : ''}
                              onChange={e => handleCellChange(st.id, field.id, e.target.value)}
                              placeholder="Saisir valeur..."
                              className="w-full h-11 text-center font-bold text-lg rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                            />
                            {field.type === 'speed_30s' && typeof val === 'number' && val > 0 && (
                              <div className="text-center text-xs font-bold text-emerald-600">
                                = {(val * 0.12).toFixed(1)} km/h
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Bilan with suggestions */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">
                    Remarque / Bilan
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {['Très bon engagement', 'Consignes respectées', 'Progrès technique', 'Effort régulier', 'Vigilance sécurité'].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const current = bilan ? `${bilan}. ${tag}` : tag;
                          handleBilanChange(st.id, current);
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 text-[11px] font-semibold border border-slate-200"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={bilan}
                    onChange={e => handleBilanChange(st.id, e.target.value)}
                    placeholder="Conseil ou appréciation..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                {/* Next student action */}
                <div className="pt-2">
                  <Button
                    size="lg"
                    onClick={() => {
                      if (mobileStudentIndex < studentsList.length - 1) {
                        setMobileStudentIndex(prev => prev + 1);
                      }
                    }}
                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                  >
                    <span>{mobileStudentIndex < studentsList.length - 1 ? 'Enregistrer et passer au suivant' : 'Dernier élève atteint'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
      /* SPREADSHEET / GRID TABLE */
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Table scroll container */}
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-250px)]">
          <table className="w-full text-left border-collapse text-xs">
            {/* Header row - sticky top */}
            <thead className="sticky top-0 z-30 bg-slate-100 border-b border-slate-300 shadow-xs">
              <tr>
                {/* COLONNE 1 : LISTE DES ÉLÈVES (Sticky left) */}
                <th className="sticky left-0 z-40 bg-slate-100 px-4 py-3.5 font-bold text-slate-800 min-w-[260px] max-w-[300px] border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                  <div className="flex items-center justify-between">
                    <span className="uppercase tracking-wider text-[11px] text-slate-600 font-extrabold flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-indigo-600" />
                      1. Élèves ({studentsList.length})
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">Appel & Tenue</span>
                  </div>
                </th>

                {/* COLONNES CRITÈRES / CHAMPS DE LA FICHE ACTIVE */}
                {activeSheet?.fields.map((field, colIdx) => (
                  <th 
                    key={field.id} 
                    className="px-3 py-3 font-bold text-slate-800 min-w-[170px] max-w-[220px] border-r border-slate-200 bg-slate-100"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-extrabold text-slate-900 truncate" title={field.label}>
                          {field.label}
                        </span>
                        {field.options?.units && (
                          <span className="text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                            {field.options.units}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-normal">
                        <span className="capitalize">{field.type.replace('_', ' ')}</span>
                        {/* Quick fill button dropdown / trigger */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleBulkFillColumn(field.id, 'A')}
                            className="px-1 py-0.5 rounded text-[9px] font-bold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                            title="Remplir toute la colonne avec 'A' (Absent)"
                          >
                            Tous A
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBulkFillColumn(field.id, 'D')}
                            className="px-1 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                            title="Remplir toute la colonne avec 'D' (Dispensé)"
                          >
                            Tous D
                          </button>
                        </div>
                      </div>
                    </div>
                  </th>
                ))}

                {/* COLONNE DYNAMIQUE DE GROUPE */}
                <th className="px-3 py-3 font-bold text-slate-800 min-w-[140px] max-w-[160px] border-r border-slate-200 bg-slate-100 text-center">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                    Dynamique
                  </div>
                  <div className="text-[10px] text-slate-400 font-normal">Moteur / Vigilance</div>
                </th>

                {/* COLONNE BILAN INDIVIDUEL */}
                <th className="px-3 py-3 font-bold text-slate-800 min-w-[200px] bg-slate-100">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                    Bilan / Remarque élève
                  </div>
                  <div className="text-[10px] text-slate-400 font-normal">Commentaire ou conseil</div>
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-200">
              {studentsList.map((st, rowIndex) => {
                const status = getStudentStatus(st.id);
                const noGear = getStudentNoGear(st.id);
                const isPositive = session.positiveStudentIds?.includes(st.id);
                const isNegative = session.negativeStudentIds?.includes(st.id);
                const bilan = getStudentBilan(st.id);

                return (
                  <tr 
                    key={st.id} 
                    className={`transition-colors ${
                      status === 'absent' 
                        ? 'bg-red-50/40 hover:bg-red-50/60' 
                        : status === 'dispense' 
                          ? 'bg-amber-50/40 hover:bg-amber-50/60' 
                          : noGear 
                            ? 'bg-rose-50/30 hover:bg-rose-50/50' 
                            : rowIndex % 2 === 0 
                              ? 'bg-white hover:bg-indigo-50/20' 
                              : 'bg-slate-50/50 hover:bg-indigo-50/20'
                    }`}
                  >
                    {/* COLONNE 1 : ÉLÈVE (STICKY LEFT) */}
                    <td className={`sticky left-0 z-20 px-4 py-2.5 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] ${
                      status === 'absent' 
                        ? 'bg-red-50' 
                        : status === 'dispense' 
                          ? 'bg-amber-50' 
                          : noGear 
                            ? 'bg-rose-50' 
                            : rowIndex % 2 === 0 
                              ? 'bg-white' 
                              : 'bg-slate-50'
                    }`}>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                              {rowIndex + 1}
                            </span>
                            <span className="font-bold text-slate-900 text-sm truncate max-w-[150px]">
                              {st.name}
                            </span>
                          </div>

                          {/* Quick Presence Toggle P/A/D */}
                          <div className="inline-flex rounded-lg p-0.5 bg-slate-200 text-[10px] font-bold shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStatusChange(st.id, 'present')}
                              className={`px-1.5 py-0.5 rounded transition-all ${
                                status === 'present' 
                                  ? 'bg-emerald-600 text-white shadow-xs' 
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                              title="Présent"
                            >
                              P
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(st.id, 'absent')}
                              className={`px-1.5 py-0.5 rounded transition-all ${
                                status === 'absent' 
                                  ? 'bg-red-600 text-white shadow-xs' 
                                  : 'text-slate-600 hover:text-red-700'
                              }`}
                              title="Absent (A)"
                            >
                              A
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(st.id, 'dispense')}
                              className={`px-1.5 py-0.5 rounded transition-all ${
                                status === 'dispense' 
                                  ? 'bg-amber-600 text-white shadow-xs' 
                                  : 'text-slate-600 hover:text-amber-700'
                              }`}
                              title="Dispensé (D)"
                            >
                              D
                            </button>
                          </div>
                        </div>

                        {/* Subline: Matériel check & Quick badges */}
                        <div className="flex items-center justify-between gap-1 text-[11px]">
                          <label 
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border cursor-pointer font-semibold transition-colors select-none text-[10px] ${
                              noGear 
                                ? 'bg-rose-100 text-rose-800 border-rose-300' 
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                            title="Cocher si sans matériel / tenue"
                          >
                            <input
                              type="checkbox"
                              checked={noGear}
                              onChange={() => handleToggleNoGear(st.id)}
                              className="rounded text-rose-600 focus:ring-rose-500 w-3 h-3 cursor-pointer"
                            />
                            <span>👟 Sans matériel</span>
                          </label>

                          <Link 
                            to={`/student/${st.id}/class/${cls?.id}`}
                            className="text-indigo-600 hover:underline text-[10px] font-medium"
                          >
                            Fiche &gt;
                          </Link>
                        </div>
                      </div>
                    </td>

                    {/* COLONNES DES CRITÈRES (CHAMPS DE LA FICHE) */}
                    {activeSheet?.fields.map((field) => {
                      const val = getStudentFieldValue(st.id, field.id);
                      const isAbsentOrDisp = val === 'A' || val === 'a' || val === 'D' || val === 'd';
                      const isCellFocused = activeCellFocus?.studentId === st.id && activeCellFocus?.fieldId === field.id;

                      return (
                        <td 
                          key={field.id} 
                          className="px-2.5 py-2 border-r border-slate-200 relative group"
                        >
                          {/* Case 'A' (Absent) or 'D' (Dispensé) explicit tag in cell */}
                          {val === 'A' || val === 'a' ? (
                            <div className="flex items-center justify-between bg-red-100 border border-red-300 text-red-800 px-2 py-1.5 rounded-lg font-bold">
                              <span>ABSENT (A)</span>
                              <button 
                                type="button" 
                                onClick={() => handleClearCell(st.id, field.id)}
                                className="text-red-500 hover:text-red-800 ml-1 p-0.5 rounded hover:bg-red-200"
                                title="Effacer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : val === 'D' || val === 'd' ? (
                            <div className="flex items-center justify-between bg-amber-100 border border-amber-300 text-amber-800 px-2 py-1.5 rounded-lg font-bold">
                              <span>DISPENSÉ (D)</span>
                              <button 
                                type="button" 
                                onClick={() => handleClearCell(st.id, field.id)}
                                className="text-amber-500 hover:text-amber-800 ml-1 p-0.5 rounded hover:bg-amber-200"
                                title="Effacer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            /* Normal value input tailored to field type */
                            <div className="space-y-1">
                              {/* Field Type 1: COUNTER */}
                              {field.type === 'counter' ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleCounterStep(st.id, field.id, -1)}
                                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center shrink-0"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <input
                                    type="text"
                                    value={val !== undefined ? val : ''}
                                    onChange={e => handleCellChange(st.id, field.id, e.target.value)}
                                    placeholder="0"
                                    className="w-full text-center font-bold font-mono text-slate-900 bg-white border border-slate-200 rounded-lg h-7 px-1 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleCounterStep(st.id, field.id, 1)}
                                    className="w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center shrink-0"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : field.type === 'boolean' ? (
                                /* Field Type 2: BOOLEAN */
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleBooleanToggle(st.id, field.id)}
                                    className={`w-full py-1 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 border transition-all ${
                                      val === true
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                        : val === false
                                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    {val === true ? (
                                      <>
                                        <Check className="w-3 h-3" />
                                        <span>Validé (OUI)</span>
                                      </>
                                    ) : val === false ? (
                                      <>
                                        <X className="w-3 h-3" />
                                        <span>Non validé</span>
                                      </>
                                    ) : (
                                      <span>À valider</span>
                                    )}
                                  </button>
                                </div>
                              ) : field.type === 'rating' ? (
                                /* Field Type 3: RATING (1 to 5) */
                                <div className="flex items-center justify-center gap-1 py-1 bg-white border border-slate-200 rounded-lg">
                                  {[1, 2, 3, 4, 5].map(starNum => (
                                    <button
                                      key={starNum}
                                      type="button"
                                      onClick={() => handleRatingClick(st.id, field.id, starNum)}
                                      className={`p-0.5 text-xs transition-colors ${
                                        Number(val) >= starNum 
                                          ? 'text-amber-500 font-bold' 
                                          : 'text-slate-300 hover:text-amber-400'
                                      }`}
                                    >
                                      ★
                                    </button>
                                  ))}
                                  {val && (
                                    <span className="font-bold text-slate-700 text-[11px] ml-1">
                                      {val}/5
                                    </span>
                                  )}
                                </div>
                              ) : (
                                /* Default: NUMBER, SPEED_30S, TIME, TARGET, TEXT */
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={val !== undefined ? val : ''}
                                    placeholder={field.type === 'speed_30s' ? 'ex: 120m' : field.type.includes('time') ? 'ex: 01:45' : 'Valeur ou A/D...'}
                                    onChange={e => handleCellChange(st.id, field.id, e.target.value)}
                                    onFocus={() => setActiveCellFocus({ studentId: st.id, fieldId: field.id })}
                                    onBlur={() => setTimeout(() => setActiveCellFocus(null), 200)}
                                    className="w-full text-center font-bold font-mono text-slate-900 bg-white border border-slate-200 rounded-lg h-7 px-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 text-xs"
                                  />
                                  {/* Speed calculation preview if speed_30s */}
                                  {field.type === 'speed_30s' && typeof val === 'number' && val > 0 && (
                                    <div className="text-[10px] text-center font-bold text-emerald-600 mt-0.5">
                                      = {(val * 0.12).toFixed(1)} km/h
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Quick 'A' and 'D' small floating trigger buttons on hover */}
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => handleQuickMarkCell(st.id, field.id, 'A')}
                                  className="text-[9px] font-bold px-1 rounded bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                                  title="Marquer ce critère comme Absent (A)"
                                >
                                  +A
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickMarkCell(st.id, field.id, 'D')}
                                  className="text-[9px] font-bold px-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                                  title="Marquer ce critère comme Dispensé (D)"
                                >
                                  +D
                                </button>
                                {val !== '' && val !== undefined && (
                                  <button
                                    type="button"
                                    onClick={() => handleClearCell(st.id, field.id)}
                                    className="text-[9px] text-slate-400 hover:text-slate-600"
                                    title="Effacer"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* COLONNE DYNAMIQUE DE GROUPE (⭐ / ⚠️) */}
                    <td className="px-2.5 py-2 border-r border-slate-200 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleTogglePositive(st.id)}
                          className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center transition-all ${
                            isPositive
                              ? 'bg-emerald-600 text-white shadow-xs scale-110'
                              : 'bg-slate-100 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50'
                          }`}
                          title="Marquer comme élève très positif pour le groupe ⭐"
                        >
                          <Star className={`w-3.5 h-3.5 ${isPositive ? 'fill-white' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleNegative(st.id)}
                          className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center transition-all ${
                            isNegative
                              ? 'bg-rose-600 text-white shadow-xs scale-110'
                              : 'bg-slate-100 text-slate-400 hover:text-rose-700 hover:bg-rose-50'
                          }`}
                          title="Marquer comme point de vigilance collective ⚠️"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* COLONNE BILAN INDIVIDUEL */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        placeholder="Conseil / remarque..."
                        value={bilan}
                        onChange={e => handleBilanChange(st.id, e.target.value)}
                        className="w-full text-xs p-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {studentsList.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              Aucun élève trouvé correspondant à votre recherche.
            </div>
          )}
        </div>

        {/* Table Footer: tips & shortcut guide */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold text-slate-700">Raccourcis & Astuces :</span>
            <span>Tapez <strong>A</strong> ou <strong>D</strong> dans n'importe quelle cellule pour absence/dispense.</span>
            <span>• <strong>Tab</strong> pour passer à la colonne suivante.</span>
            <span>• Sauvegarde instantanée en temps réel.</span>
          </div>

          <div className="flex items-center gap-2">
            <Link to={`/observe/${session.id}`} target="_blank">
              <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50 text-xs h-7">
                <Eye className="w-3.5 h-3.5 mr-1" />
                Vue Élèves (Tablette)
              </Button>
            </Link>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
