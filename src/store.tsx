import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Activity, ClassGroup, ObservationRecord, ObservationSheet, Session, TemplateActivity, TemplateSheet, ObservationField, AppSettings, ObservationFieldType } from './types';
import { db } from './lib/firebase';
import { doc, collection, onSnapshot, setDoc, addDoc, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';

interface StoreState {
  classes: ClassGroup[];
  activities: Activity[];
  sessions: Session[];
  sheets: ObservationSheet[];
  observations: ObservationRecord[];
  templateActivities: TemplateActivity[];
  templateSheets: TemplateSheet[];
  settings?: AppSettings;
}

const DEFAULT_CA_MAPPING: Record<number, ObservationFieldType[]> = {
  1: ['counter', 'rating', 'boolean', 'number', 'speed_30s', 'distance_speed', 'time_mm_ss', 'project_target', 'performance_log'],
  2: ['counter', 'rating', 'boolean', 'number', 'time_mm_ss', 'orienteering_star', 'orienteering_log'],
  3: ['counter', 'rating', 'boolean', 'number', 'sequence_planner', 'artistic_rating'],
  4: ['counter', 'rating', 'boolean', 'number', 'ratio_action', 'match_stats'],
  5: ['counter', 'rating', 'boolean', 'number', 'training_log', 'health_fitness_log']
};

const initialState: StoreState = {
  classes: [],
  activities: [],
  sessions: [],
  sheets: [],
  observations: [],
  templateActivities: [],
  templateSheets: [],
  settings: { caFieldMapping: DEFAULT_CA_MAPPING }
};

interface StoreContextType extends StoreState {
  addClass: (cls: Omit<ClassGroup, 'id'>) => void;
  updateClass: (id: string, cls: Partial<ClassGroup>) => void;
  deleteClass: (id: string) => void;
  bulkImportClasses: (importData: { className: string, students: { name: string }[] }[]) => void;
  mergeClasses: (targetId: string, sourceId: string) => void;

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
  
  addTemplateActivity: (name: string, ca?: 1 | 2 | 3 | 4 | 5) => void;
  deleteTemplateActivity: (id: string) => void;
  addTemplateSheet: (templateActivityId: string, name: string, isMultiStudent?: boolean) => void;
  deleteTemplateSheet: (id: string) => void;
  addFieldToTemplateSheet: (sheetId: string, field: Omit<ObservationField, 'id'>) => void;
  removeFieldFromTemplateSheet: (sheetId: string, fieldId: string) => void;
  
  addActivityFromTemplate: (classId: string, templateId: string) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const generateId = () => Math.random().toString(36).substr(2, 9);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(initialState);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const workspaceRef = doc(db, 'workspaces', 'default');
    
    const unsubscribeWorkspace = onSnapshot(workspaceRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setState(s => ({
          ...s,
          classes: data.classes || [],
          activities: data.activities || [],
          sessions: data.sessions || [],
          sheets: data.sheets || [],
          templateActivities: data.templateActivities || [],
          templateSheets: data.templateSheets || [],
        }));
      } else {
        // Check if we have local storage data to migrate
        const saved = localStorage.getItem('eps-tracker-data');
        let initialData = null;
        
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            initialData = {
              classes: parsed.classes || [],
              activities: parsed.activities || [],
              sessions: parsed.sessions || [],
              sheets: parsed.sheets || [],
              templateActivities: parsed.templateActivities || [],
              templateSheets: parsed.templateSheets || []
            };
            
            // Migrate observations
            if (parsed.observations && parsed.observations.length > 0) {
              const obsRef = collection(db, 'workspaces', 'default', 'observations');
              const batch = writeBatch(db);
              parsed.observations.forEach((obs: any) => {
                const newDocRef = doc(obsRef, obs.id);
                batch.set(newDocRef, obs);
              });
              batch.commit().catch(console.error);
            }
          } catch(e) {
            console.error('Failed to parse local storage for migration');
          }
        }
        
        if (!initialData) {
          // Initialize default templates if empty
          const demiFondId = generateId();
          const badId = generateId();
          
          initialData = {
            classes: [],
            activities: [],
            sessions: [],
            sheets: [],
            templateActivities: [
              { id: demiFondId, name: '1/2 Fond', ca: 1 },
              { id: badId, name: 'Badminton', ca: 4 }
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
          };
        }
        
        setDoc(workspaceRef, initialData).catch(err => {
           console.error("Erreur lors de la création du workspace :", err);
        });
      }
      setLoaded(true);
    }, (error) => {
      console.error("Erreur de permission Workspace (onSnapshot) :", error);
    });

    const observationsRef = collection(db, 'workspaces', 'default', 'observations');
    const unsubscribeObservations = onSnapshot(observationsRef, (snapshot) => {
      const obs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as ObservationRecord));
      setState(s => ({ ...s, observations: obs }));
    }, (error) => {
      console.error("Erreur de permission Observations (onSnapshot) :", error);
    });

    return () => {
      unsubscribeWorkspace();
      unsubscribeObservations();
    };
  }, []);

  const updateWorkspace = async (updater: (s: StoreState) => Partial<StoreState>) => {
    const workspaceRef = doc(db, 'workspaces', 'default');
    
    // We compute the changes using the current state in the closure. 
    // This is safe because updateWorkspace is recreated on every render with the freshest state.
    const changes = updater(state);
    
    // Update local state immediately
    setState(s => ({ ...s, ...changes }));
    
    // Sync with Firestore
    setDoc(workspaceRef, changes, { merge: true }).catch(err => {
      console.error("Erreur lors de la mise à jour (Permissions ?) :", err);
    });
  };

  const addClass = (cls: Omit<ClassGroup, 'id'>) => updateWorkspace(s => ({ classes: [...s.classes, { ...cls, id: generateId() }] }));
  const updateClass = (id: string, cls: Partial<ClassGroup>) => updateWorkspace(s => ({ classes: s.classes.map(c => (c.id === id ? { ...c, ...cls } : c)) }));
  const deleteClass = (id: string) => updateWorkspace(s => ({ classes: s.classes.filter(c => c.id !== id) }));
  
  const bulkImportClasses = (importData: { className: string, students: { name: string }[] }[]) => {
    updateWorkspace(s => {
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
      return { classes: newClasses };
    });
  };

  const mergeClasses = (targetId: string, sourceId: string) => {
    updateWorkspace(s => {
      const targetClass = s.classes.find(c => c.id === targetId);
      const sourceClass = s.classes.find(c => c.id === sourceId);
      if (!targetClass || !sourceClass) return s;

      const mergedStudents = [...targetClass.students, ...sourceClass.students];
      const mergedTeams = [...(targetClass.teams || []), ...(sourceClass.teams || [])];

      const newClasses = s.classes
        .map(c => c.id === targetId ? { ...c, students: mergedStudents, teams: mergedTeams } : c)
        .filter(c => c.id !== sourceId);

      const newActivities = s.activities.map(a => a.classId === sourceId ? { ...a, classId: targetId } : a);

      return {
        ...s,
        classes: newClasses,
        activities: newActivities
      };
    });
  };

  const addActivity = (act: Omit<Activity, 'id'>) => updateWorkspace(s => ({ activities: [...s.activities, { ...act, id: generateId() }] }));
  const updateActivity = (id: string, act: Partial<Activity>) => updateWorkspace(s => ({ activities: s.activities.map(a => (a.id === id ? { ...a, ...act } : a)) }));
  const deleteActivity = (id: string) => updateWorkspace(s => ({ activities: s.activities.filter(a => a.id !== id) }));

  const addSession = (session: Omit<Session, 'id'>) => updateWorkspace(s => ({ sessions: [...s.sessions, { ...session, id: generateId() }] }));
  const updateSession = (id: string, session: Partial<Session>) => updateWorkspace(s => ({ sessions: s.sessions.map(ss => (ss.id === id ? { ...ss, ...session } : ss)) }));
  const deleteSession = (id: string) => updateWorkspace(s => ({ sessions: s.sessions.filter(ss => ss.id !== id) }));

  const addSheet = (sheet: Omit<ObservationSheet, 'id'>) => updateWorkspace(s => ({ sheets: [...s.sheets, { ...sheet, id: generateId() }] }));
  const updateSheet = (id: string, sheet: Partial<ObservationSheet>) => updateWorkspace(s => ({ sheets: s.sheets.map(sh => (sh.id === id ? { ...sh, ...sheet } : sh)) }));
  const deleteSheet = (id: string) => updateWorkspace(s => ({ sheets: s.sheets.filter(sh => sh.id !== id) }));

  const addObservation = async (obs: Omit<ObservationRecord, 'id'>) => {
    const observationsRef = collection(db, 'workspaces', 'default', 'observations');
    await addDoc(observationsRef, obs).catch(err => {
      console.error("Erreur addObservation (Permissions ?) :", err);
    });
  };

  const clearObservations = async (sessionId: string) => {
    const observationsRef = collection(db, 'workspaces', 'default', 'observations');
    const snapshot = await getDocs(observationsRef);
    const batch = writeBatch(db);
    snapshot.docs.forEach(d => {
      if (d.data().sessionId === sessionId) {
        batch.delete(d.ref);
      }
    });
    await batch.commit().catch(err => {
      console.error("Erreur clearObservations :", err);
    });
  };

  const addTemplateActivity = (name: string, ca: 1 | 2 | 3 | 4 | 5 = 1) => {
    updateWorkspace(s => ({ templateActivities: [...s.templateActivities, { id: generateId(), name, ca }] }));
  };

  const deleteTemplateActivity = (id: string) => {
    updateWorkspace(s => ({
      templateActivities: s.templateActivities.filter(t => t.id !== id),
      templateSheets: s.templateSheets.filter(ts => ts.templateActivityId !== id)
    }));
  };

  const addTemplateSheet = (templateActivityId: string, name: string, isMultiStudent = false) => {
    updateWorkspace(s => ({
      templateSheets: [...s.templateSheets, { id: generateId(), templateActivityId, name, fields: [], isMultiStudent }]
    }));
  };

  const deleteTemplateSheet = (id: string) => {
    updateWorkspace(s => ({ templateSheets: s.templateSheets.filter(ts => ts.id !== id) }));
  };

  const addFieldToTemplateSheet = (sheetId: string, field: Omit<ObservationField, 'id'>) => {
    updateWorkspace(s => ({
      templateSheets: s.templateSheets.map(ts => {
        if (ts.id === sheetId) {
          return { ...ts, fields: [...(ts.fields || []), { ...field, id: generateId() }] };
        }
        return ts;
      })
    }));
  };

  const removeFieldFromTemplateSheet = (sheetId: string, fieldId: string) => {
    updateWorkspace(s => ({
      templateSheets: s.templateSheets.map(ts => {
        if (ts.id === sheetId) {
          return { ...ts, fields: (ts.fields || []).filter(f => f.id !== fieldId) };
        }
        return ts;
      })
    }));
  };

  const addActivityFromTemplate = (classId: string, templateId: string) => {
    updateWorkspace(s => {
      const template = s.templateActivities.find(t => t.id === templateId);
      if (!template) return {};

      const newActivityId = generateId();
      const newActivity = { id: newActivityId, classId, name: template.name };
      
      const sheetsToCopy = s.templateSheets.filter(ts => ts.templateActivityId === templateId);
      const newSheets = sheetsToCopy.map(ts => ({
        id: generateId(),
        activityId: newActivityId,
        name: ts.name,
        isMultiStudent: ts.isMultiStudent || false,
        fields: (ts.fields || []).map(f => ({ ...f, id: generateId() }))
      }));

      return {
        activities: [...(s.activities || []), newActivity],
        sheets: [...(s.sheets || []), ...newSheets]
      };
    });
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    updateWorkspace(s => ({
      settings: { ...s.settings, ...newSettings } as AppSettings
    }));
  };

  if (!loaded) {
    return <div className="h-screen w-full flex items-center justify-center text-slate-500 font-medium">Chargement des données en temps réel...</div>;
  }

  const value = {
    ...state,
    updateSettings,
    addClass, updateClass, deleteClass, bulkImportClasses, mergeClasses,
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
