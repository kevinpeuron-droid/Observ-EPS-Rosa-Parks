import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store';
import { 
  Users, 
  CheckCircle2, 
  BarChart3, 
  Download, 
  Printer, 
  Search, 
  Sparkles, 
  Star, 
  AlertTriangle, 
  FileSpreadsheet, 
  Eye, 
  Check, 
  X, 
  ArrowUpDown,
  TrendingUp,
  MessageSquareQuote,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/Card';
import { Button } from './ui/Button';
import { StudentSessionStatus, ObservationField } from '../types';

interface ClassSessionOverviewProps {
  sessionId: string;
  onClose?: () => void;
  isModal?: boolean;
}

export function ClassSessionOverview({ sessionId, onClose, isModal = false }: ClassSessionOverviewProps) {
  const { sessions, sheets, activities, classes, observations, updateSession } = useStore();

  const session = sessions.find(s => s.id === sessionId);
  const activity = activities.find(a => a.id === session?.activityId);
  const cls = classes.find(c => c.id === activity?.classId);
  const sessionSheets = sheets.filter(s => s.activityId === session?.activityId);

  const [selectedSheetId, setSelectedSheetId] = useState<string>(session?.sheetId || sessionSheets[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'complete' | 'incomplete' | 'absent' | 'motors'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'progress' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const sheet = sheets.find(s => s.id === selectedSheetId) || sessionSheets[0];
  const sessionObs = useMemo(() => observations.filter(o => o.sessionId === sessionId), [observations, sessionId]);

  if (!session || !cls || !activity) {
    return (
      <div className="p-8 text-center text-slate-500">
        Données de séance introuvables.
      </div>
    );
  }

  // Pre-calculate data per student
  const studentsList = cls.students || [];
  const fields = sheet?.fields || [];
  const totalFields = fields.length;

  const positiveStudentIds = session.positiveStudentIds || [];
  const negativeStudentIds = session.negativeStudentIds || [];
  const studentImpactNotes = session.studentImpactNotes || {};

  const studentsData = useMemo(() => {
    return studentsList.map((st, index) => {
      const studentObs = sessionObs.filter(o => o.targetId === st.id);
      const latestObs = studentObs.length > 0 
        ? [...studentObs].sort((a, b) => b.timestamp - a.timestamp)[0] 
        : null;

      // Status
      let status: StudentSessionStatus = 'present';
      if (latestObs?.status) status = latestObs.status;
      else if (studentObs.every(o => Object.values(o.data).length > 0 && Object.values(o.data).every(v => v === 'A'))) status = 'absent';
      else if (studentObs.every(o => Object.values(o.data).length > 0 && Object.values(o.data).every(v => v === 'D'))) status = 'dispense';

      const noGear = !!latestObs?.noGear;
      const isMotor = positiveStudentIds.includes(st.id);
      const isVigilance = negativeStudentIds.includes(st.id);
      const impactNote = studentImpactNotes[st.id] || '';

      // Fields values
      const values: Record<string, any> = {};
      let answeredCount = 0;

      fields.forEach(f => {
        let val: any = undefined;
        if (latestObs && latestObs.data && latestObs.data[f.id] !== undefined) {
          val = latestObs.data[f.id];
        } else {
          // Check all obs
          for (const obs of studentObs) {
            if (obs.data && obs.data[f.id] !== undefined && obs.data[f.id] !== '') {
              val = obs.data[f.id];
              break;
            }
          }
        }

        values[f.id] = val;
        if (val !== undefined && val !== '' && val !== null) {
          answeredCount++;
        }
      });

      const isComplete = totalFields > 0 && answeredCount >= totalFields;
      const completionPct = totalFields > 0 ? Math.round((answeredCount / totalFields) * 100) : 0;
      const bilan = latestObs?.bilan || '';
      const perspectives = latestObs?.perspectives || '';

      return {
        id: st.id,
        index: index + 1,
        name: st.name,
        status,
        noGear,
        isMotor,
        isVigilance,
        impactNote,
        values,
        answeredCount,
        isComplete,
        completionPct,
        bilan,
        perspectives,
        hasObs: studentObs.length > 0
      };
    });
  }, [studentsList, sessionObs, fields, totalFields, positiveStudentIds, negativeStudentIds, studentImpactNotes]);

  // Aggregate stats
  const presentCount = studentsData.filter(s => s.status === 'present').length;
  const absentCount = studentsData.filter(s => s.status === 'absent').length;
  const dispenseCount = studentsData.filter(s => s.status === 'dispense').length;
  const noGearCount = studentsData.filter(s => s.noGear).length;
  const completedCount = studentsData.filter(s => s.isComplete && s.status === 'present').length;
  const incompleteCount = studentsData.filter(s => !s.isComplete && s.status === 'present' && s.answeredCount > 0).length;
  const unstartedCount = studentsData.filter(s => s.status === 'present' && s.answeredCount === 0).length;

  const classCompletionPct = studentsData.length > 0 
    ? Math.round((completedCount / (studentsData.length - absentCount - dispenseCount || 1)) * 100) 
    : 0;

  // Filter and sort students
  const filteredStudents = useMemo(() => {
    return studentsData.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;

      if (filterStatus === 'complete') return s.isComplete && s.status === 'present';
      if (filterStatus === 'incomplete') return (!s.isComplete || s.answeredCount === 0) && s.status === 'present';
      if (filterStatus === 'absent') return s.status === 'absent' || s.status === 'dispense';
      if (filterStatus === 'motors') return s.isMotor || s.isVigilance;
      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'progress') {
        comparison = a.completionPct - b.completionPct;
      } else if (sortBy === 'status') {
        comparison = a.status.localeCompare(b.status);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [studentsData, searchTerm, filterStatus, sortBy, sortOrder]);

  // Field stats (class averages, totals)
  const fieldStats = useMemo(() => {
    const stats: Record<string, { avg?: number; total?: number; validPct?: number; count: number; text?: string }> = {};

    fields.forEach(f => {
      const validValues = studentsData
        .map(s => s.values[f.id])
        .filter(v => v !== undefined && v !== '' && v !== null && v !== 'A' && v !== 'D');

      if (f.type === 'rating' || f.type === 'number' || f.type === 'distance_speed') {
        const nums = validValues.map(v => typeof v === 'number' ? v : parseFloat(v)).filter(v => !isNaN(v));
        if (nums.length > 0) {
          const sum = nums.reduce((acc, curr) => acc + curr, 0);
          stats[f.id] = {
            avg: Math.round((sum / nums.length) * 10) / 10,
            count: nums.length
          };
        }
      } else if (f.type === 'speed_30s') {
        const nums = validValues.map(v => typeof v === 'number' ? v : parseFloat(v)).filter(v => !isNaN(v));
        if (nums.length > 0) {
          const sum = nums.reduce((acc, curr) => acc + curr, 0);
          const avgDistance = sum / nums.length;
          const avgSpeed = avgDistance * 0.12;
          stats[f.id] = {
            avg: Math.round(avgSpeed * 10) / 10,
            total: Math.round(avgDistance),
            count: nums.length
          };
        }
      } else if (f.type === 'counter') {
        const nums = validValues.map(v => typeof v === 'number' ? v : parseFloat(v)).filter(v => !isNaN(v));
        if (nums.length > 0) {
          const sum = nums.reduce((acc, curr) => acc + curr, 0);
          stats[f.id] = {
            total: sum,
            avg: Math.round((sum / nums.length) * 10) / 10,
            count: nums.length
          };
        }
      } else if (f.type === 'boolean') {
        const booleans = validValues.map(v => v === true || v === 'true');
        if (booleans.length > 0) {
          const trueCount = booleans.filter(Boolean).length;
          stats[f.id] = {
            validPct: Math.round((trueCount / booleans.length) * 100),
            count: booleans.length
          };
        }
      }
    });

    return stats;
  }, [fields, studentsData]);

  // Export CSV function
  const handleExportCSV = () => {
    const headers = [
      'Nom élève',
      'Statut présence',
      'Matériel',
      'Dynamique',
      'Remarque dynamique',
      ...fields.map(f => f.label),
      'Complétion (%)',
      'Bilan élève'
    ];

    const rows = studentsData.map(s => [
      `"${s.name}"`,
      `"${s.status === 'present' ? 'Présent' : s.status === 'absent' ? 'Absent (A)' : 'Dispensé (D)'}"`,
      s.noGear ? 'Sans matériel' : 'Correct',
      s.isMotor ? 'Moteur ⭐' : s.isVigilance ? 'Vigilance ⚠️' : 'Neutre',
      `"${(s.impactNote || '').replace(/"/g, '""')}"`,
      ...fields.map(f => {
        const val = s.values[f.id];
        if (val === undefined || val === null) return '""';
        if (f.type === 'speed_30s' && typeof val === 'number') {
          return `"${val}m (${(val * 0.12).toFixed(1)} km/h)"`;
        }
        if (f.type === 'boolean') {
          return val ? '"Validé"' : '"Non validé"';
        }
        return `"${val}"`;
      }),
      `"${s.completionPct}%"`,
      `"${(s.bilan || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Synthese_Seance_${cls.name}_${session.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper to render field cell value cleanly
  const renderCellValue = (field: ObservationField, val: any) => {
    if (val === undefined || val === null || val === '') {
      return <span className="text-slate-300 font-mono">-</span>;
    }
    if (val === 'A' || val === 'a') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
          A
        </span>
      );
    }
    if (val === 'D' || val === 'd') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
          D
        </span>
      );
    }

    if (field.type === 'rating') {
      const num = Number(val);
      return (
        <div className="flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/80 w-fit">
          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
          <span>{num}/5</span>
        </div>
      );
    }

    if (field.type === 'speed_30s' && typeof val === 'number') {
      return (
        <div className="flex flex-col text-xs leading-tight">
          <span className="font-extrabold text-indigo-700">{(val * 0.12).toFixed(1)} km/h</span>
          <span className="text-[10px] text-slate-400 font-mono">{val} m</span>
        </div>
      );
    }

    if (field.type === 'boolean') {
      return val ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <Check className="w-3.5 h-3.5 stroke-[3]" /> Validé
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
          <X className="w-3.5 h-3.5" /> Non
        </span>
      );
    }

    if (field.type === 'counter') {
      return (
        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg text-xs">
          {val} {field.options?.units || ''}
        </span>
      );
    }

    if (typeof val === 'number') {
      return (
        <span className="font-mono font-semibold text-slate-800 text-xs">
          {val} {field.options?.units || ''}
        </span>
      );
    }

    return <span className="text-xs text-slate-800 truncate max-w-[120px] block">{String(val)}</span>;
  };

  return (
    <div className={`space-y-6 animate-in fade-in duration-300 ${isModal ? 'p-4 sm:p-6 bg-slate-50 min-h-screen' : ''}`}>
      {/* Top Banner / Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Synthèse & Vue d'ensemble de la séance</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {cls.name} • {session.name}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Activité : <strong className="text-slate-700">{activity.name}</strong> • Situation : <strong className="text-slate-700">{sheet?.name || 'Standard'}</strong>
          </p>
        </div>

        {/* Action Buttons & Sheet Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {sessionSheets.length > 1 && (
            <select
              value={sheet?.id}
              onChange={e => setSelectedSheetId(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-600"
            >
              {sessionSheets.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.fields.length} critères)
                </option>
              ))}
            </select>
          )}

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportCSV}
            className="text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
            title="Télécharger les résultats au format Excel / CSV"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            <span>Export CSV</span>
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrint}
            className="text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
            title="Imprimer ou enregistrer en PDF"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Imprimer</span>
          </Button>

          <Link to={`/session/${session.id}/entry`}>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Saisie Rapide</span>
            </Button>
          </Link>

          {onClose && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onClose}
              className="text-xs font-bold border-slate-300"
            >
              Fermer
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Completion */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Taux de complétion</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {completedCount} <span className="text-xs font-medium text-slate-400">/ {studentsData.length - absentCount - dispenseCount} élèves</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${classCompletionPct}%` }}
              />
            </div>
            <div className="text-[11px] font-bold text-emerald-700 mt-1">
              {classCompletionPct}% de la classe validée
            </div>
          </div>
        </div>

        {/* Card 2: Presence */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Présents / Absents</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-indigo-900">
              {presentCount} <span className="text-xs font-medium text-slate-400">/ {studentsData.length}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-bold">
              {absentCount > 0 && <span className="text-red-600">{absentCount} absents</span>}
              {dispenseCount > 0 && <span className="text-amber-600">• {dispenseCount} dispensés</span>}
              {absentCount === 0 && dispenseCount === 0 && <span className="text-emerald-600">Classe au complet</span>}
            </div>
            {noGearCount > 0 && (
              <span className="text-[10px] text-rose-700 font-bold block mt-0.5">
                👟 {noGearCount} sans matériel
              </span>
            )}
          </div>
        </div>

        {/* Card 3: In Progress / Unstarted */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>À observer / En cours</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-amber-700">
              {incompleteCount + unstartedCount}
            </div>
            <div className="text-[11px] font-bold text-slate-600 mt-2 flex items-center gap-1.5">
              <span>{incompleteCount} en cours</span>
              <span>•</span>
              <span>{unstartedCount} non débutés</span>
            </div>
          </div>
        </div>

        {/* Card 4: Group Dynamics */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Dynamique de groupe</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
              <span className="text-emerald-700">{positiveStudentIds.length}⭐</span>
              <span className="text-rose-700 text-xl font-bold">{negativeStudentIds.length > 0 ? `${negativeStudentIds.length}⚠️` : ''}</span>
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-2">
              {positiveStudentIds.length} moteur(s) identifié(s)
            </div>
          </div>
        </div>
      </div>

      {/* Collective Criteria Performance Cards */}
      {fields.length > 0 && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Indicateurs collectifs par critère</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">Moyennes et réussites de la classe</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {fields.map(field => {
              const stat = fieldStats[field.id];
              return (
                <div key={field.id} className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col justify-between">
                  <div className="text-xs font-bold text-slate-800 line-clamp-1" title={field.label}>
                    {field.label}
                  </div>
                  
                  <div className="mt-2 flex items-baseline justify-between">
                    {field.type === 'rating' && (
                      <div className="text-lg font-black text-amber-700 flex items-center gap-1">
                        <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                        <span>{stat?.avg !== undefined ? `${stat.avg} / 5` : '-'}</span>
                      </div>
                    )}
                    {field.type === 'speed_30s' && (
                      <div className="text-lg font-black text-indigo-700">
                        {stat?.avg !== undefined ? `${stat.avg} km/h` : '-'}
                        {stat?.total !== undefined && (
                          <span className="text-xs font-medium text-slate-400 ml-1 font-mono">({stat.total}m)</span>
                        )}
                      </div>
                    )}
                    {field.type === 'boolean' && (
                      <div className="text-lg font-black text-emerald-700">
                        {stat?.validPct !== undefined ? `${stat.validPct}% validé` : '-'}
                      </div>
                    )}
                    {field.type === 'counter' && (
                      <div className="text-lg font-black text-slate-900">
                        {stat?.avg !== undefined ? `${stat.avg} moy.` : '-'}
                        {stat?.total !== undefined && (
                          <span className="text-xs font-medium text-slate-400 ml-1 font-mono">({stat.total} tot.)</span>
                        )}
                      </div>
                    )}
                    {(field.type === 'number' || field.type === 'distance_speed') && (
                      <div className="text-lg font-black text-slate-900">
                        {stat?.avg !== undefined ? `${stat.avg} ${field.options?.units || ''}` : '-'}
                      </div>
                    )}
                    {!['rating', 'speed_30s', 'boolean', 'counter', 'number', 'distance_speed'].includes(field.type) && (
                      <div className="text-sm font-bold text-slate-600">
                        {stat?.count ? `${stat.count} saisis` : '-'}
                      </div>
                    )}

                    <span className="text-[10px] font-semibold text-slate-400">
                      {stat?.count || 0}/{presentCount} notés
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Student Results Table Card */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-200/80 p-4 sm:p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>Tableau des résultats élèves ({filteredStudents.length}/{studentsList.length})</span>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Vue synoptique de tous les critères, statuts et remarques individuelles.
              </CardDescription>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrer élève..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600 w-44"
                />
              </div>

              <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    filterStatus === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tous ({studentsData.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('complete')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    filterStatus === 'complete' ? 'bg-emerald-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-emerald-700'
                  }`}
                >
                  Complets ({completedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('incomplete')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    filterStatus === 'incomplete' ? 'bg-amber-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-amber-700'
                  }`}
                >
                  En cours ({incompleteCount + unstartedCount})
                </button>
                {absentCount + dispenseCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterStatus('absent')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      filterStatus === 'absent' ? 'bg-red-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-red-700'
                    }`}
                  >
                    Absents ({absentCount + dispenseCount})
                  </button>
                )}
                {positiveStudentIds.length + negativeStudentIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterStatus('motors')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      filterStatus === 'motors' ? 'bg-indigo-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-indigo-700'
                    }`}
                  >
                    Dynamique ({positiveStudentIds.length + negativeStudentIds.length})
                  </button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3 min-w-[160px]">
                    <button 
                      type="button"
                      onClick={() => {
                        if (sortBy === 'name') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        else { setSortBy('name'); setSortOrder('asc'); }
                      }}
                      className="flex items-center gap-1 hover:text-indigo-600"
                    >
                      <span>Élève</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="p-3 min-w-[110px] text-center">Présence / Tenue</th>
                  <th className="p-3 min-w-[110px] text-center">
                    <button 
                      type="button"
                      onClick={() => {
                        if (sortBy === 'progress') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        else { setSortBy('progress'); setSortOrder('desc'); }
                      }}
                      className="flex items-center gap-1 justify-center hover:text-indigo-600 mx-auto"
                    >
                      <span>Complétion</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>

                  {/* Criteria Columns */}
                  {fields.map(f => (
                    <th key={f.id} className="p-3 min-w-[130px] font-semibold text-slate-800 border-l border-slate-200/60">
                      <div className="line-clamp-2" title={f.label}>{f.label}</div>
                      {f.options?.units && (
                        <span className="text-[10px] font-mono text-slate-400 font-normal">({f.options.units})</span>
                      )}
                    </th>
                  ))}

                  <th className="p-3 min-w-[200px] border-l border-slate-200/60">Remarque / Bilan</th>
                  <th className="p-3 w-16 text-center border-l border-slate-200/60">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map(student => {
                  return (
                    <tr 
                      key={student.id} 
                      className={`hover:bg-indigo-50/30 transition-colors ${
                        student.status === 'absent' 
                          ? 'bg-red-50/30 opacity-75' 
                          : student.status === 'dispense' 
                          ? 'bg-amber-50/30 opacity-80' 
                          : student.isComplete 
                          ? 'bg-emerald-50/15' 
                          : ''
                      }`}
                    >
                      <td className="p-3 text-center text-slate-400 font-mono text-[11px]">
                        {student.index}
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            student.status === 'absent' 
                              ? 'bg-red-100 text-red-700' 
                              : student.status === 'dispense' 
                              ? 'bg-amber-100 text-amber-700' 
                              : student.isComplete 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{student.name}</span>
                              {student.isMotor && <span title="Élève moteur ⭐">⭐</span>}
                              {student.isVigilance && <span title="Point de vigilance ⚠️">⚠️</span>}
                            </div>
                            {student.impactNote && (
                              <div className="text-[10px] text-slate-500 font-medium">
                                {student.impactNote}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          {student.status === 'present' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Présent
                            </span>
                          ) : student.status === 'absent' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                              Absent (A)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              Dispensé (D)
                            </span>
                          )}

                          {student.noGear && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              Sans tenue
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            student.status !== 'present' 
                              ? 'bg-slate-100 text-slate-400' 
                              : student.isComplete 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : student.answeredCount > 0 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {student.status !== 'present' 
                              ? '-' 
                              : `${student.answeredCount}/${totalFields} (${student.completionPct}%)`}
                          </span>

                          {student.status === 'present' && totalFields > 0 && (
                            <div className="w-14 bg-slate-200 h-1 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${student.isComplete ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                style={{ width: `${student.completionPct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Criteria Values */}
                      {fields.map(field => (
                        <td key={field.id} className="p-3 border-l border-slate-100">
                          {renderCellValue(field, student.values[field.id])}
                        </td>
                      ))}

                      {/* Bilan */}
                      <td className="p-3 border-l border-slate-100 text-slate-600">
                        {student.bilan ? (
                          <div className="flex items-start gap-1 text-[11px] leading-snug font-medium bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                            <MessageSquareQuote className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{student.bilan}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300 font-mono text-[10px]">-</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="p-3 text-center border-l border-slate-100">
                        <Link 
                          to={`/observe/${session.id}`}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                          title="Observer / Modifier cet élève"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={5 + fields.length} className="p-8 text-center text-slate-400 text-xs">
                      Aucun élève trouvé avec les filtres sélectionnés.
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Summary Bottom Row */}
              {filteredStudents.length > 0 && fields.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-200 text-slate-800">
                    <td colSpan={4} className="p-3 text-right text-xs uppercase tracking-wider text-slate-600">
                      Moyennes & Totaux classe :
                    </td>
                    {fields.map(field => {
                      const stat = fieldStats[field.id];
                      return (
                        <td key={field.id} className="p-3 border-l border-slate-200 text-xs font-black text-indigo-900">
                          {stat?.avg !== undefined && field.type === 'rating' && (
                            <span>★ {stat.avg}</span>
                          )}
                          {stat?.avg !== undefined && field.type === 'speed_30s' && (
                            <span>{stat.avg} km/h</span>
                          )}
                          {stat?.validPct !== undefined && field.type === 'boolean' && (
                            <span>{stat.validPct}%</span>
                          )}
                          {stat?.avg !== undefined && field.type === 'counter' && (
                            <span>{stat.avg} (tot: {stat.total})</span>
                          )}
                          {stat?.avg !== undefined && (field.type === 'number' || field.type === 'distance_speed') && (
                            <span>{stat.avg}</span>
                          )}
                          {!['rating', 'speed_30s', 'boolean', 'counter', 'number', 'distance_speed'].includes(field.type) && (
                            <span className="text-slate-400 font-normal">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td colSpan={2} className="p-3 border-l border-slate-200 text-right text-xs text-slate-500 font-normal">
                      {completedCount} élèves terminés
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
