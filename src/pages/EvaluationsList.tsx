import React, { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  Award, 
  ChevronRight, 
  Users, 
  BarChart3, 
  Download, 
  Sparkles, 
  Activity as ActivityIcon, 
  Layers, 
  Filter,
  CheckCircle2,
  Clock,
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Search,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  FolderKanban,
  FileSpreadsheet,
  Check,
  BookmarkPlus,
  HelpCircle
} from 'lucide-react';
import { 
  calculateStudentEvaluation, 
  calculateClassEvaluationStatistics, 
  exportEvaluationToCsv, 
  getDefaultCriteriaForCa 
} from '../lib/evaluationHelpers';
import { EvaluationTemplateModal } from '../components/EvaluationTemplateModal';
import { CreateEvaluationForClassModal } from '../components/CreateEvaluationForClassModal';
import { ApplyTemplateToClassModal } from '../components/ApplyTemplateToClassModal';
import { TemplateActivity, EvaluationCriterion } from '../types';

export function EvaluationsList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { 
    classes, 
    activities, 
    templateActivities,
    addTemplateActivity,
    updateTemplateActivity,
    deleteTemplateActivity,
    duplicateTemplateActivity,
    saveActivityAsTemplate,
    deleteActivity,
    loadOfficialEpsDatabase
  } = useStore();

  // Primary navigation tabs: 'evaluate' (Évaluer une classe) vs 'bank' (Banque d'évaluations)
  const initialTab = searchParams.get('tab') === 'bank' ? 'bank' : 'evaluate';
  const [mainTab, setMainTab] = useState<'evaluate' | 'bank'>(initialTab);

  // Selected class in evaluate mode
  const initialClassId = searchParams.get('classId') || '';
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [classSearchQuery, setClassSearchQuery] = useState('');

  // Modals state
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateActivity | null>(null);

  const [isCreateEvalModalOpen, setIsCreateEvalModalOpen] = useState(false);

  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [templateToApply, setTemplateToApply] = useState<TemplateActivity | null>(null);

  // Bank search and filter
  const [bankCaFilter, setBankCaFilter] = useState<number | 'all'>('all');
  const [bankSearchQuery, setBankSearchQuery] = useState('');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const activeClass = useMemo(() => {
    return classes.find(c => c.id === selectedClassId) || null;
  }, [classes, selectedClassId]);

  // When tab changes, update query param
  const handleTabChange = (tab: 'evaluate' | 'bank') => {
    setMainTab(tab);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (tab === 'bank') {
        next.set('tab', 'bank');
      } else {
        next.delete('tab');
      }
      return next;
    });
  };

  const handleSelectClass = (clsId: string) => {
    setSelectedClassId(clsId);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (clsId) {
        next.set('classId', clsId);
      } else {
        next.delete('classId');
      }
      return next;
    });
  };

  // Evaluations belonging to the active class
  const classActivities = useMemo(() => {
    if (!selectedClassId) return [];
    return activities.filter(a => a.classId === selectedClassId);
  }, [activities, selectedClassId]);

  // Pre-calculate evaluation summaries and stats for each activity
  const classActivitiesWithStats = useMemo(() => {
    if (!activeClass) return [];
    const students = activeClass.students || [];

    return classActivities.map(activity => {
      const criteria = activity.evaluationCriteria && activity.evaluationCriteria.length > 0 
        ? activity.evaluationCriteria 
        : getDefaultCriteriaForCa(activity.ca, activity.name);

      const summaries = students.map(st => {
        const studentGrades = activity.grades?.[st.id];
        const appreciation = activity.studentAppreciations?.[st.id];
        return calculateStudentEvaluation(st.id, st.name, criteria, studentGrades, appreciation);
      });

      const stats = calculateClassEvaluationStatistics(summaries, criteria);

      return {
        activity,
        studentsCount: students.length,
        criteriaCount: criteria.length,
        stats,
        summaries,
        criteria
      };
    });
  }, [classActivities, activeClass]);

  // Classes with activity counts and average calculations for the class selection view
  const classesWithOverview = useMemo(() => {
    return classes.map(cls => {
      const clsActivities = activities.filter(a => a.classId === cls.id);
      const studentCount = cls.students?.length || 0;

      // Calculate global average note across all activities in this class
      let totalNotes = 0;
      let countNotes = 0;
      let completedEvals = 0;

      clsActivities.forEach(act => {
        const crits = act.evaluationCriteria && act.evaluationCriteria.length > 0
          ? act.evaluationCriteria
          : getDefaultCriteriaForCa(act.ca, act.name);

        const summaries = cls.students.map(st => {
          return calculateStudentEvaluation(st.id, st.name, crits, act.grades?.[st.id]);
        });
        const stats = calculateClassEvaluationStatistics(summaries, crits);
        if (stats.classAverageOn20 !== null) {
          totalNotes += stats.classAverageOn20;
          countNotes++;
        }
        if (studentCount > 0 && stats.evaluatedStudents >= studentCount) {
          completedEvals++;
        }
      });

      const avgNote = countNotes > 0 ? (totalNotes / countNotes).toFixed(1) : null;

      return {
        classGroup: cls,
        studentCount,
        activitiesCount: clsActivities.length,
        completedEvals,
        avgNote
      };
    });
  }, [classes, activities]);

  const filteredClasses = useMemo(() => {
    if (!classSearchQuery.trim()) return classesWithOverview;
    return classesWithOverview.filter(item => 
      item.classGroup.name.toLowerCase().includes(classSearchQuery.toLowerCase())
    );
  }, [classesWithOverview, classSearchQuery]);

  // Bank templates filtered by CA and search query
  const filteredBankTemplates = useMemo(() => {
    return templateActivities.filter(t => {
      if (bankCaFilter !== 'all' && t.ca !== bankCaFilter) return false;
      if (bankSearchQuery.trim() && !t.name.toLowerCase().includes(bankSearchQuery.toLowerCase())) return false;
      return true;
    });
  }, [templateActivities, bankCaFilter, bankSearchQuery]);

  const getCaBadge = (ca?: number) => {
    switch (ca) {
      case 1: return { label: 'CA 1 • Performance', color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 2: return { label: 'CA 2 • Adaptation', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 3: return { label: 'CA 3 • Artistique', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 4: return { label: 'CA 4 • Affrontement', color: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 5: return { label: 'CA 5 • Entretien', color: 'bg-rose-100 text-rose-800 border-rose-200' };
      default: return { label: 'Cycle EPS', color: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  const handleSaveToBank = (activityId: string, activityName: string) => {
    const newId = saveActivityAsTemplate(activityId);
    setSaveSuccessMessage(`« ${activityName} » a été enregistrée avec succès dans votre Banque d'évaluations !`);
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  const handleDeleteActivity = async (activityId: string, activityName: string) => {
    if (window.confirm(`Supprimer l'évaluation « ${activityName} » et toutes ses notes associées pour cette classe ?`)) {
      await deleteActivity(activityId);
    }
  };

  const handleDuplicateTemplate = (templateId: string, name: string) => {
    duplicateTemplateActivity(templateId);
    setSaveSuccessMessage(`Modèle « ${name} » dupliqué dans la banque.`);
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  const handleDeleteTemplate = (templateId: string, name: string) => {
    if (window.confirm(`Supprimer définitivement le modèle d'évaluation « ${name} » de votre banque ?`)) {
      deleteTemplateActivity(templateId);
    }
  };

  const handleSaveTemplateModal = (data: { name: string; ca: 1 | 2 | 3 | 4 | 5; criteria: EvaluationCriterion[] }) => {
    if (editingTemplate) {
      updateTemplateActivity(editingTemplate.id, {
        name: data.name,
        ca: data.ca,
        evaluationCriteria: data.criteria
      });
      setSaveSuccessMessage(`Modèle « ${data.name} » mis à jour.`);
    } else {
      addTemplateActivity(data.name, data.ca, data.criteria);
      setSaveSuccessMessage(`Nouveau modèle « ${data.name} » ajouté à votre banque d'évaluation.`);
    }
    setEditingTemplate(null);
    setIsTemplateModalOpen(false);
    setTimeout(() => setSaveSuccessMessage(null), 3500);
  };

  const handleResetOfficialDatabase = () => {
    if (window.confirm("Voulez-vous fusionner et recharger les barèmes officiels EPS de référence (Course au Temps Juste 4x5', Relais-Vitesse, Badminton, etc.) ? Vos modèles existants seront préservés.")) {
      loadOfficialEpsDatabase('merge');
      setSaveSuccessMessage("Base de données d'évaluations synchronisée avec les barèmes officiels.");
      setTimeout(() => setSaveSuccessMessage(null), 3500);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16 max-w-7xl mx-auto">
      {/* Success alert */}
      {saveSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs sm:text-sm font-bold text-emerald-800 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
          <button 
            onClick={() => setSaveSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold ml-4"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Main Top Header */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shrink-0">
            <Award className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              Pôle Évaluation EPS
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Évaluez vos classes et construisez votre banque de barèmes certificatifs sur 20 points.
            </p>
          </div>
        </div>

        {/* Top Switcher: Évaluer une classe / Banque d'évaluations */}
        <div className="flex items-center p-1.5 bg-slate-100 rounded-2xl border border-slate-200 w-full md:w-auto">
          <button
            onClick={() => handleTabChange('evaluate')}
            className={`flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 ${
              mainTab === 'evaluate'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderKanban className="w-4 h-4 text-amber-500" />
            Évaluer une classe
          </button>

          <button
            onClick={() => handleTabChange('bank')}
            className={`flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 ${
              mainTab === 'bank'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4 text-indigo-600" />
            🏛️ Banque d'évaluations ({templateActivities.length})
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODE 1: ÉVALUER UNE CLASSE (Workflow: Classe -> Évaluation) */}
      {/* ========================================================= */}
      {mainTab === 'evaluate' && (
        <div className="space-y-6">
          {/* Stepper Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider">
                <span className={`px-2.5 py-1 rounded-lg ${!selectedClassId ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                  Étape 1 : Choisir la classe
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
                <span className={`px-2.5 py-1 rounded-lg ${selectedClassId ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                  Étape 2 : Évaluation
                </span>
              </div>
            </div>

            {/* If class is selected, show quick change button and dropdown */}
            {activeClass && (
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <button
                  onClick={() => handleSelectClass('')}
                  className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Changer de classe
                </button>

                <select
                  value={selectedClassId}
                  onChange={e => handleSelectClass(e.target.value)}
                  className="text-xs font-bold bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.students?.length || 0} él.)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* ------------------------------------------------------- */}
          {/* STEP 1: PICK CLASS (If no class is active)              */}
          {/* ------------------------------------------------------- */}
          {!selectedClassId ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Users className="w-5 h-5 text-amber-500" />
                    Choisissez la classe à évaluer
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sélectionnez une classe pour afficher ses évaluations existantes ou en démarrer une nouvelle.
                  </p>
                </div>

                {classes.length > 3 && (
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Filtrer les classes..."
                      value={classSearchQuery}
                      onChange={e => setClassSearchQuery(e.target.value)}
                      className="pl-9 h-10 text-xs font-bold bg-white"
                    />
                  </div>
                )}
              </div>

              {classes.length === 0 ? (
                <Card className="border-dashed p-12 text-center bg-slate-50/50 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg text-slate-800">Aucune classe disponible</h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">
                      Créez d'abord une classe avec vos élèves sur le tableau de bord ou importez un fichier CSV.
                    </p>
                  </div>
                  <Link to="/">
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold">
                      Aller créer une classe
                    </Button>
                  </Link>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredClasses.map(({ classGroup: cls, studentCount, activitiesCount, completedEvals, avgNote }) => (
                    <div
                      key={cls.id}
                      onClick={() => handleSelectClass(cls.id)}
                      className="p-6 bg-white rounded-2xl border-2 border-slate-200 hover:border-amber-500 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-black text-base border border-amber-200 group-hover:bg-amber-500 group-hover:text-white transition-colors shadow-xs">
                            {cls.name.substring(0, 3).toUpperCase()}
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                              {studentCount} élève(s)
                            </span>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xl font-black text-slate-900 group-hover:text-amber-600 transition-colors">
                            {cls.name}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {activitiesCount === 0 ? 'Aucune évaluation configurée' : `${activitiesCount} évaluation(s) active(s)`}
                          </p>
                        </div>

                        {/* Quick KPI in card */}
                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Moyenne</span>
                            <span className="font-mono font-black text-sm text-indigo-700">
                              {avgNote ? `${avgNote}/20` : '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Clôturées</span>
                            <span className="font-mono font-black text-sm text-slate-700">
                              {completedEvals} / {activitiesCount}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-600 group-hover:translate-x-1 transition-transform">
                        <span>Sélectionner cette classe</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ------------------------------------------------------- */
            /* STEP 2: EVALUATIONS FOR ACTIVE CLASS                    */
            /* ------------------------------------------------------- */
            <div className="space-y-6">
              {/* Active class summary banner */}
              <div className="bg-amber-50/70 border border-amber-200 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-lg shadow-sm">
                    {activeClass.name.substring(0, 3).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                        Classe {activeClass.name}
                      </h2>
                      <span className="text-xs bg-white font-bold text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-300">
                        {activeClass.students?.length || 0} élèves
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Gérez les épreuves de cette classe ou lancez le mode évaluation pour saisir les notes en direct.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                  <Link to={`/class/${activeClass.id}/synthesis`}>
                    <Button variant="outline" size="sm" className="bg-white border-amber-300 text-amber-900 hover:bg-amber-100/50 text-xs font-bold">
                      <BarChart3 className="w-4 h-4 mr-1.5 text-amber-600" />
                      Synthèse & Bulletins
                    </Button>
                  </Link>

                  <Button
                    onClick={() => setIsCreateEvalModalOpen(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Nouvelle évaluation pour la classe
                  </Button>
                </div>
              </div>

              {/* Evaluations list for this class */}
              {classActivitiesWithStats.length === 0 ? (
                <Card className="border-dashed p-10 text-center bg-slate-50/50 space-y-4">
                  <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                    <Award className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg text-slate-800">Aucune évaluation pour la classe {activeClass.name}</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Sélectionnez un barème prêt à l'emploi dans votre <strong>Banque d'évaluations</strong> (ex: Course au Temps Juste 4x5', Relais-Vitesse, Badminton...) ou créez une évaluation personnalisée.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <Button
                      onClick={() => setIsCreateEvalModalOpen(true)}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                    >
                      <BookOpen className="w-4 h-4 mr-1.5" />
                      Choisir dans ma Banque d'évaluations
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {classActivitiesWithStats.map(({ activity, studentsCount, criteriaCount, stats, summaries, criteria }) => {
                    const caBadge = getCaBadge(activity.ca);
                    const isCompleted = studentsCount > 0 && stats.evaluatedStudents + stats.absentStudents + stats.dispenseStudents >= studentsCount;
                    const progressPct = studentsCount > 0 ? Math.round(((stats.evaluatedStudents + stats.absentStudents + stats.dispenseStudents) / studentsCount) * 100) : 0;
                    const isDemiFond = activity.name.toLowerCase().includes('demi') || activity.name.toLowerCase().includes('fond') || activity.name.toLowerCase().includes('temps juste');

                    return (
                      <Card 
                        key={activity.id} 
                        className="hover:shadow-md hover:border-amber-400 transition-all flex flex-col justify-between overflow-hidden group cursor-pointer border-slate-200"
                        onClick={() => navigate(`/evaluation/${activity.id}`)}
                      >
                        <div>
                          <CardHeader className="p-5 pb-3">
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${caBadge.color}`}>
                                  {caBadge.label}
                                </span>
                                {isDemiFond && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300 flex items-center gap-1">
                                    ⏱️ Temps Juste (4x5')
                                  </span>
                                )}
                              </div>

                              {isCompleted ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Clôturée
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold border border-slate-200 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> En cours
                                </span>
                              )}
                            </div>

                            <CardTitle className="text-xl font-bold text-slate-900 group-hover:text-amber-600 transition-colors mt-2">
                              {activity.name}
                            </CardTitle>
                            <p className="text-xs text-slate-500 font-medium">
                              Classe : {activeClass.name} • {studentsCount} élèves
                            </p>
                          </CardHeader>

                          <CardContent className="p-5 pt-2 space-y-4">
                            {/* Stats Widget */}
                            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  Moyenne classe
                                </span>
                                <div className="text-xl font-black font-mono text-indigo-700 mt-0.5">
                                  {stats.classAverageOn20 !== null ? `${stats.classAverageOn20.toFixed(1)}/20` : '—'}
                                </div>
                              </div>

                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  Notés / Total
                                </span>
                                <div className="text-xl font-black font-mono text-slate-800 mt-0.5">
                                  {stats.evaluatedStudents} <span className="text-xs text-slate-400 font-normal">/ {studentsCount}</span>
                                </div>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] font-bold">
                                <span className="text-slate-500">Progression de notation</span>
                                <span className="text-indigo-600">{progressPct}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div 
                                  className="bg-amber-500 h-2 rounded-full transition-all duration-500" 
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </div>

                        {/* Card Footer Actions */}
                        <div className="p-3.5 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs text-slate-500 font-medium">
                            {criteriaCount} critère(s)
                          </span>

                          <div className="flex items-center gap-1.5">
                            {/* Save to bank button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveToBank(activity.id, activity.name);
                              }}
                              className="text-slate-500 hover:text-indigo-700 text-xs px-2 h-8"
                              title="Sauvegarder ce barème dans ma Banque d'évaluations"
                            >
                              <BookmarkPlus className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                              Banque
                            </Button>

                            {/* Mode Évaluation primary button */}
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/evaluation/${activity.id}`);
                              }}
                              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold h-8 px-3 shadow-xs"
                            >
                              <Award className="w-3.5 h-3.5 mr-1" />
                              Évaluer
                            </Button>

                            {/* Delete button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteActivity(activity.id, activity.name);
                              }}
                              className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                              title="Supprimer cette évaluation"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 2: BANQUE D'ÉVALUATIONS (Construire sa banque)      */}
      {/* ========================================================= */}
      {mainTab === 'bank' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Bank Top Bar */}
          <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                <BookOpen className="w-7 h-7 text-amber-400" />
                Banque d'évaluations (Modèles & Barèmes EPS)
              </h2>
              <p className="text-xs text-indigo-200 mt-1 max-w-2xl">
                Créez, personnalisez et réutilisez vos barèmes sommatifs sur 20 points par Champ d'Apprentissage. Vous pouvez les appliquer en 1 clic à n'importe quelle classe.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetOfficialDatabase}
                className="bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs font-bold h-10"
                title="Recharger les barèmes officiels EPS"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Synchroniser barèmes officiels
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setEditingTemplate(null);
                  setIsTemplateModalOpen(true);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black h-10 px-4 shadow-sm"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Créer un modèle d'évaluation
              </Button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={bankSearchQuery}
                onChange={e => setBankSearchQuery(e.target.value)}
                placeholder="Rechercher dans la banque (Demi-Fond, Badminton...)"
                className="pl-9 h-10 text-xs font-bold bg-slate-50 border-slate-200"
              />
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <button
                onClick={() => setBankCaFilter('all')}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all shrink-0 ${
                  bankCaFilter === 'all'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Tous les CA ({templateActivities.length})
              </button>
              {[1, 2, 3, 4, 5].map(ca => {
                const count = templateActivities.filter(t => t.ca === ca).length;
                return (
                  <button
                    key={ca}
                    onClick={() => setBankCaFilter(ca)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all shrink-0 ${
                      bankCaFilter === ca
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    CA {ca} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bank Templates Grid */}
          {filteredBankTemplates.length === 0 ? (
            <Card className="border-dashed p-12 text-center bg-slate-50/50 space-y-4">
              <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
              <div className="space-y-1">
                <h3 className="font-bold text-lg text-slate-800">Aucun modèle d'évaluation trouvé</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Créez un nouveau barème ou réinitialisez les barèmes officiels EPS.
                </p>
              </div>
              <Button
                onClick={() => {
                  setEditingTemplate(null);
                  setIsTemplateModalOpen(true);
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Créer un modèle
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBankTemplates.map(template => {
                const caBadge = getCaBadge(template.ca);
                const crits = template.evaluationCriteria || getDefaultCriteriaForCa(template.ca, template.name);
                const totalPts = crits.reduce((sum, c) => sum + (Number(c.maxScore) || 0), 0);
                const isExact20 = Math.abs(totalPts - 20) < 0.01;
                const isDemiFond = template.name.toLowerCase().includes('demi') || template.name.toLowerCase().includes('fond') || template.name.toLowerCase().includes('temps juste');

                return (
                  <div
                    key={template.id}
                    className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all flex flex-col justify-between group space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border ${caBadge.color}`}>
                          {caBadge.label}
                        </span>

                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-black border flex items-center gap-1 ${
                          isExact20 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}>
                          {totalPts} / 20 pts
                        </span>
                      </div>

                      <div>
                        <h3 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {template.name}
                        </h3>
                        {isDemiFond && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md mt-1 border border-amber-200">
                            ⏱️ Course au Temps Juste (4 x 5')
                          </span>
                        )}
                      </div>

                      {/* Criteria details */}
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                          <span>Critères d'évaluation ({crits.length})</span>
                          <span>Note max</span>
                        </div>
                        <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          {crits.map((c, i) => (
                            <div key={c.id || i} className="text-xs text-slate-700 flex items-start justify-between gap-2">
                              <span className="truncate">• {c.label}</span>
                              <span className="font-bold text-indigo-700 shrink-0 font-mono text-[11px]">{c.maxScore} pts</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        {/* Edit criteria button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingTemplate(template);
                            setIsTemplateModalOpen(true);
                          }}
                          className="text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 text-xs font-bold px-2.5 h-8"
                          title="Modifier le barème et les critères"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" />
                          Modifier
                        </Button>

                        {/* Duplicate button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDuplicateTemplate(template.id, template.name)}
                          className="text-slate-400 hover:text-slate-700 h-8 w-8"
                          title="Dupliquer ce modèle"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>

                        {/* Delete button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTemplate(template.id, template.name)}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                          title="Supprimer ce modèle"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      {/* Apply to a class button */}
                      <Button
                        size="sm"
                        onClick={() => {
                          setTemplateToApply(template);
                          setIsApplyModalOpen(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-8 px-3 shadow-xs"
                      >
                        Appliquer à une classe...
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Edit or Create Evaluation Template Modal (for the Bank) */}
      {isTemplateModalOpen && (
        <EvaluationTemplateModal
          isOpen={isTemplateModalOpen}
          onClose={() => {
            setIsTemplateModalOpen(false);
            setEditingTemplate(null);
          }}
          template={editingTemplate}
          onSave={handleSaveTemplateModal}
        />
      )}

      {/* Create Evaluation for Active Class Modal */}
      {isCreateEvalModalOpen && activeClass && (
        <CreateEvaluationForClassModal
          isOpen={isCreateEvalModalOpen}
          onClose={() => setIsCreateEvalModalOpen(false)}
          selectedClass={activeClass}
          onEvaluationCreated={(newActId) => {
            navigate(`/evaluation/${newActId}`);
          }}
        />
      )}

      {/* Apply Template from Bank to a chosen Class Modal */}
      {isApplyModalOpen && templateToApply && (
        <ApplyTemplateToClassModal
          isOpen={isApplyModalOpen}
          onClose={() => {
            setIsApplyModalOpen(false);
            setTemplateToApply(null);
          }}
          template={templateToApply}
        />
      )}
    </div>
  );
}
