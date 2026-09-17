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

export type ObservationFieldType = 'counter' | 'rating' | 'boolean' | 'number' | 'speed_30s' | 'time_mm_ss' | 'distance_speed' | 'orienteering_star' | 'training_log' | 'project_target' | 'ratio_action' | 'sequence_planner' | 'performance_log' | 'orienteering_log' | 'artistic_rating' | 'match_stats' | 'health_fitness_log' | 'calculated_target';

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
};

export type Activity = {
  id: string;
  classId: string;
  name: string;
  evaluationCriteria?: EvaluationCriterion[];
  grades?: Record<string, Record<string, number>>; // studentId -> criterionId -> score
};

export type ObservationRecord = {
  id: string;
  sessionId: string;
  observerId?: string;
  targetId: string; // Student id or Team id
  data: Record<string, any>; // fieldId -> value
  bilan?: string;
  perspectives?: string;
  timestamp: number;
};

export type AppSettings = {
  caFieldMapping: Record<number, ObservationFieldType[]>;
};
