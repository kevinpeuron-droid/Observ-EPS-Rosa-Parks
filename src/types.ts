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

export type EvaluationCriterion = {
  id: string;
  label: string;
  maxScore: number;
  weight: number;
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

export type ObservationFieldType = 'counter' | 'rating' | 'boolean' | 'number' | 'speed_30s' | 'time_mm_ss' | 'time_duration' | 'distance_speed' | 'orienteering_star' | 'training_log' | 'project_target' | 'ratio_action' | 'sequence_planner' | 'performance_log' | 'orienteering_log' | 'artistic_rating' | 'match_stats' | 'health_fitness_log' | 'calculated_target';

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
};

export type Activity = {
  id: string;
  classId: string;
  name: string;
  ca?: 1 | 2 | 3 | 4 | 5;
  templateId?: string;
  evaluationCriteria?: EvaluationCriterion[];
  grades?: Record<string, Record<string, number | string>>; // studentId -> criterionId -> score (or 'A', 'D')
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
