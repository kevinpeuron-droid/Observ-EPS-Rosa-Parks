import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Activity, ClassGroup, ObservationRecord, ObservationSheet, Session, TemplateActivity, TemplateSheet, ObservationField } from './types';

interface StoreState {
  classes: ClassGroup[];
  activities: Activity[];
  sessions: Session[];
  sheets: ObservationSheet[];
  observations: ObservationRecord[];
  templateActivities: TemplateActivity[];
  templateSheets: TemplateSheet[];
}

const initialState: StoreState = {
  classes: [],
  activities: [],
  sessions: [],
  sheets: [],
  observations: [],
  templateActivities: [],
  templateSheets: []
};

interface StoreContextType extends StoreState {
  addClass: (cls: Omit<ClassGroup, 'id'>) => void;
  updateClass: (id: string, cls: Partial<ClassGroup>) => void;
  deleteClass: (id: string) => void;
  bulkImportClasses: (importData: { className: string, students: { name: string }[] }[]) => void;

  addActivity: (act: Omit<Activity, 'id'>) => void;
  updateActivity: (id: string, act: Partial<Activity>) => void;
  deleteActivity: (id: string) => void;

  addSession: (session: Omit<Session, 'id'>) => void;
  updateSession: (id: string, session: Partial<Session>) => void;
  deleteSession: (id: string) => void;

  addSheet: (sheet: Omit<ObservationSheet, 'id'>) => void;
  updateSheet: (id: string, sheet: Partial<ObservationSheet>) => void;
  deleteSheet: (id: string) => void;

  addObservation: (obs: Omit<ObservationRecord, 'id'>) => void;
  clearObservations: (sessionId: string) => void;

  // Templates
  addTemplateActivity: (name: string, ca?: 1 | 2 | 3 | 4 | 5) => void;
  deleteTemplateActivity: (id: string) => void;
  addTemplateSheet: (templateActivityId: string, name: string, isMultiStudent?: boolean) => void;
  deleteTemplateSheet: (id: string) => void;
  addFieldToTemplateSheet: (sheetId: string, field: Omit<ObservationField, 'id'>) => void;
  removeFieldFromTemplateSheet: (sheetId: string, fieldId: string) => void;
  
  addActivityFromTemplate: (classId: string, templateId: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const generateId = () => Math.random().toString(36).substr(2, 9);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(() => {
    const saved = localStorage.getItem('eps-tracker-data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...initialState,
          ...parsed,
          templateActivities: parsed.templateActivities || [],
          templateSheets: parsed.templateSheets || []
        };
      } catch (e) {
        console.error('Failed to parse local storage data');
      }
    }
    return initialState;
  });

  useEffect(() => {
    localStorage.setItem('eps-tracker-data', JSON.stringify(state));
  }, [state]);

  const addClass = (cls: Omit<ClassGroup, 'id'>) => setState(s => ({ ...s, classes: [...s.classes, { ...cls, id: generateId() }] }));
  const updateClass = (id: string, cls: Partial<ClassGroup>) => setState(s => ({ ...s, classes: s.classes.map(c => (c.id === id ? { ...c, ...cls } : c)) }));
  const deleteClass = (id: string) => setState(s => ({ ...s, classes: s.classes.filter(c => c.id !== id) }));
  
  const bulkImportClasses = (importData: { className: string, students: { name: string }[] }[]) => {
    setState(s => {
      const newClasses = [...s.classes];
      importData.forEach(group => {
        let cls = newClasses.find(c => c.name.toLowerCase() === group.className.toLowerCase());
        if (!cls) {
          cls = { id: generateId(), name: group.className, students: [] };
          newClasses.push(cls);
        } else {
          const clsIndex = newClasses.findIndex(c => c.id === cls!.id);
          cls = { ...cls };
          newClasses[clsIndex] = cls;
        }
        const newStudents = group.students.map(st => ({ id: generateId(), name: st.name }));
        cls.students = [...cls.students, ...newStudents];
      });
      return { ...s, classes: newClasses };
    });
  };

  const addActivity = (act: Omit<Activity, 'id'>) => setState(s => ({ ...s, activities: [...s.activities, { ...act, id: generateId() }] }));
  const updateActivity = (id: string, act: Partial<Activity>) => setState(s => ({ ...s, activities: s.activities.map(a => (a.id === id ? { ...a, ...act } : a)) }));
  const deleteActivity = (id: string) => setState(s => ({ ...s, activities: s.activities.filter(a => a.id !== id) }));

  const addSession = (session: Omit<Session, 'id'>) => setState(s => ({ ...s, sessions: [...s.sessions, { ...session, id: generateId() }] }));
  const updateSession = (id: string, session: Partial<Session>) => setState(s => ({ ...s, sessions: s.sessions.map(ss => (ss.id === id ? { ...ss, ...session } : ss)) }));
  const deleteSession = (id: string) => setState(s => ({ ...s, sessions: s.sessions.filter(ss => ss.id !== id) }));

  const addSheet = (sheet: Omit<ObservationSheet, 'id'>) => setState(s => ({ ...s, sheets: [...s.sheets, { ...sheet, id: generateId() }] }));
  const updateSheet = (id: string, sheet: Partial<ObservationSheet>) => setState(s => ({ ...s, sheets: s.sheets.map(sh => (sh.id === id ? { ...sh, ...sheet } : sh)) }));
  const deleteSheet = (id: string) => setState(s => ({ ...s, sheets: s.sheets.filter(sh => sh.id !== id) }));

  const addObservation = (obs: Omit<ObservationRecord, 'id'>) => setState(s => ({ ...s, observations: [...s.observations, { ...obs, id: generateId() }] }));
  const clearObservations = (sessionId: string) => setState(s => ({ ...s, observations: s.observations.filter(o => o.sessionId !== sessionId) }));

  // Templates implementation
  const addTemplateActivity = (name: string, ca: 1 | 2 | 3 | 4 | 5 = 1) => {
    setState(s => ({ ...s, templateActivities: [...s.templateActivities, { id: generateId(), name, ca }] }));
  };

  const deleteTemplateActivity = (id: string) => {
    setState(s => ({
      ...s,
      templateActivities: s.templateActivities.filter(t => t.id !== id),
      templateSheets: s.templateSheets.filter(ts => ts.templateActivityId !== id)
    }));
  };

  const addTemplateSheet = (templateActivityId: string, name: string, isMultiStudent = false) => {
    setState(s => ({
      ...s,
      templateSheets: [...s.templateSheets, { id: generateId(), templateActivityId, name, fields: [], isMultiStudent }]
    }));
  };

  const deleteTemplateSheet = (id: string) => {
    setState(s => ({ ...s, templateSheets: s.templateSheets.filter(ts => ts.id !== id) }));
  };

  const addFieldToTemplateSheet = (sheetId: string, field: Omit<ObservationField, 'id'>) => {
    setState(s => ({
      ...s,
      templateSheets: s.templateSheets.map(ts => {
        if (ts.id === sheetId) {
          return { ...ts, fields: [...ts.fields, { ...field, id: generateId() }] };
        }
        return ts;
      })
    }));
  };

  const removeFieldFromTemplateSheet = (sheetId: string, fieldId: string) => {
    setState(s => ({
      ...s,
      templateSheets: s.templateSheets.map(ts => {
        if (ts.id === sheetId) {
          return { ...ts, fields: ts.fields.filter(f => f.id !== fieldId) };
        }
        return ts;
      })
    }));
  };

  const addActivityFromTemplate = (classId: string, templateId: string) => {
    setState(s => {
      const template = s.templateActivities.find(t => t.id === templateId);
      if (!template) return s;

      const newActivityId = generateId();
      const newActivity = { id: newActivityId, classId, name: template.name };
      
      const sheetsToCopy = s.templateSheets.filter(ts => ts.templateActivityId === templateId);
      const newSheets = sheetsToCopy.map(ts => ({
        id: generateId(),
        activityId: newActivityId,
        name: ts.name,
        isMultiStudent: ts.isMultiStudent,
        fields: ts.fields.map(f => ({ ...f, id: generateId() })) // deep copy fields to avoid ref issues
      }));

      return {
        ...s,
        activities: [...s.activities, newActivity],
        sheets: [...s.sheets, ...newSheets]
      };
    });
  };

  // Seed default templates if empty
  useEffect(() => {
    if (state.templateActivities.length === 0) {
      const demiFondId = generateId();
      const badId = generateId();
      
      setState(s => ({
        ...s,
        templateActivities: [
          { id: demiFondId, name: '1/2 Fond' },
          { id: badId, name: 'Badminton' }
        ],
        templateSheets: [
          {
            id: generateId(),
            templateActivityId: demiFondId,
            name: '30"/30" (Vitesse et FC)',
            fields: [
              { id: generateId(), label: 'FC Avant Échauffement', type: 'number' },
              { id: generateId(), label: 'FC Après Échauffement', type: 'number' },
              { id: generateId(), label: 'Distance sur 30" (m)', type: 'speed_30s' },
              { id: generateId(), label: 'FC Fin de séance', type: 'number' }
            ]
          },
          {
            id: generateId(),
            templateActivityId: badId,
            name: 'Match Standard',
            fields: [
              { id: generateId(), label: 'Points marqués', type: 'counter' },
              { id: generateId(), label: 'Fautes', type: 'counter' },
              { id: generateId(), label: 'Match gagné', type: 'boolean' }
            ]
          }
        ]
      }));
    }
  }, []);

  const value = {
    ...state,
    addClass, updateClass, deleteClass, bulkImportClasses,
    addActivity, updateActivity, deleteActivity,
    addSession, updateSession, deleteSession,
    addSheet, updateSheet, deleteSheet,
    addObservation, clearObservations,
    addTemplateActivity, deleteTemplateActivity, addTemplateSheet, deleteTemplateSheet,
    addFieldToTemplateSheet, removeFieldFromTemplateSheet, addActivityFromTemplate
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) throw new Error('useStore must be used within a StoreProvider');
  return context;
}
