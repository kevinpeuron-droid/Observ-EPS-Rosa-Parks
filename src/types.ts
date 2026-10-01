export type Student = {
  id: string;
  name: string;
};

export type Team = {
  id: string;
  name: string;
  studentIds: string[];
};

export type ClassGroup = {
  id: string;
  name: string;
  students: Student[];
  teams?: Team[];
};

export type CriterionLevel = {
  level: 1 | 2 | 3 | 4;
  label: string; // 'Maîtrise insuffisante' | 'Maîtrise fragile' | 'Maîtrise satisfaisante' | 'Très bonne maîtrise'
  descriptor: string; // Ce qui est fait / Comportement observable
  points: number; // Note correspondante calculée selon le barème
};

export type ValueMeasurementType = 
  | 'qualitative'   // Paliers qualitatifs (1 à 4)
  | 'number'        // Nombre / Compteur (passes, répétitions, points marqués, balises...)
  | 'time_seconds'  // Temps en secondes (chronomètre, temps de marche...)
  | 'time_mm_ss'    // Temps en minutes:secondes (chrono course, natation...)
  | 'distance'      // Distance en mètres (saut, lancer, course...)
  | 'speed'         // Vitesse en km/h
  | 'percentage';   // Pourcentage / Ratio (0 à 100%)

export type ScaleInterval = {
  id?: string;
  min?: number; // Seuil minimum (inclusif)
  max?: number; // Seuil maximum (inclusif)
  points: number; // Note correspondante selon le barème
  descriptor?: string; // Comportement / indication observable
  level?: 1 | 2 | 3 | 4; // Degré socle associé (optionnel)
};

export type EvaluationCriterion = {
  id: string;
  label: string;
  maxScore: number;
  weight: number;
  description?: string;
  levels?: CriterionLevel[];
  
  // Saisie quantitative de l'observation et barème automatique
  measurementType?: ValueMeasurementType;
  unit?: string; // ex: 'passes', 's', 'min:s', 'km/h', 'm', 'rép', '%'
  scaleIntervals?: ScaleInterval[]; // Table de correspondance : valeur observée -> note
  reverseScale?: boolean; // Vrai si un temps plus court est meilleur (ex: chronomètre)
};

export type TemplateActivity = {
  id: string;
  name: string;
  ca?: 1 | 2 | 3 | 4 | 5;
  evaluationCriteria?: EvaluationCriterion[];
};

export type TemplateSheet = {
  id: string;
  templateActivityId: string;
  name: string;
  fields: ObservationField[];
  isMultiStudent?: boolean;
};

export type ObservationFieldType = 'counter' | 'rating' | 'boolean' | 'number' | 'speed_30s' | 'time_mm_ss' | 'time_duration' | 'distance_speed' | 'orienteering_star' | 'training_log' | 'project_target' | 'ratio_action' | 'sequence_planner' | 'performance_log' | 'orienteering_log' | 'artistic_rating' | 'match_stats' | 'health_fitness_log' | 'calculated_target' | 'running_exact_time' | 'demi_fond_temps_juste';

export type ObservationField = {
  id: string;
  label: string;
  type: ObservationFieldType;
  options?: Record<string, any>;
};

export type ObservationSheet = {
  id: string;
  name: string;
  activityId: string;
  fields: ObservationField[];
  isMultiStudent?: boolean;
};

export type Session = {
  id: string;
  activityId: string;
  date: string;
  name: string;
  feedback: string;
  sheetId?: string; // The active observation sheet for this session
  positiveStudentIds?: string[]; // Élèves très positifs pour le groupe
  negativeStudentIds?: string[]; // Élèves très négatifs pour le groupe
  studentImpactNotes?: Record<string, string>; // studentId -> note / tag explicatif
  isEvaluationSession?: boolean; // Séance d'évaluation sommative
};

export type Activity = {
  id: string;
  classId: string;
  name: string;
  ca?: 1 | 2 | 3 | 4 | 5;
  templateId?: string;
  evaluationCriteria?: EvaluationCriterion[];
  grades?: Record<string, Record<string, number | string>>; // studentId -> criterionId -> score (or 'A', 'D')
  rawObservations?: Record<string, Record<string, number | string>>; // studentId -> criterionId -> raw value entered by observer (ex: 14 passes, 01:25 chrono, 11.5 km/h)
  studentAppreciations?: Record<string, string>; // studentId -> appréciation individualisée
  isEvaluationCompleted?: boolean;
  evaluationDate?: string;
};

export type StudentSessionStatus = 'present' | 'absent' | 'dispense';

export type ObservationRecord = {
  id: string;
  sessionId: string;
  sheetId?: string;
  observerId?: string;
  targetId: string; // Student id or Team id
  data: Record<string, any>; // fieldId -> value (can also be 'A' or 'D' for absent / dispensé)
  status?: StudentSessionStatus; // 'present' | 'absent' | 'dispense'
  noGear?: boolean; // Élève sans matériel / oubli de tenue
  bilan?: string;
  perspectives?: string;
  timestamp: number;
};

export type AppSettings = {
  caFieldMapping: Record<number, ObservationFieldType[]>;
};
