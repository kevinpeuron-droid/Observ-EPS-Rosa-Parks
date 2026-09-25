import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Activity, ClassGroup, ObservationRecord, ObservationSheet, Session, TemplateActivity, TemplateSheet, ObservationField, AppSettings, ObservationFieldType, StudentSessionStatus } from './types';
import { db } from './lib/firebase';
import { doc, collection, onSnapshot, setDoc, addDoc, getDocs, writeBatch, deleteDoc, updateDoc } from 'firebase/firestore';
import { generateEpsReferenceDatabase } from './lib/epsDatabase';

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
  1: ['counter', 'rating', 'boolean', 'number', 'speed_30s', 'distance_speed', 'time_mm_ss', 'time_duration', 'project_target', 'performance_log'],
  2: ['counter', 'rating', 'boolean', 'number', 'time_mm_ss', 'time_duration', 'orienteering_star', 'orienteering_log'],
  3: ['counter', 'rating', 'boolean', 'number', 'time_duration', 'sequence_planner', 'artistic_rating'],
  4: ['counter', 'rating', 'boolean', 'number', 'time_duration', 'ratio_action', 'match_stats'],
  5: ['counter', 'rating', 'boolean', 'number', 'time_duration', 'training_log', 'health_fitness_log']
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
  deleteActivity: (id: string) => Promise<void>;
  createCustomActivity: (classId: string, name: string, ca?: 1 | 2 | 3 | 4 | 5) => void;
  addActivityFromTemplate: (classId: string, templateId: string) => void;
  syncActivityFromTemplate: (activityId: string, templateId: string, mode: 'merge_missing' | 'replace') => void;
  
  addSession: (session: Omit<Session, 'id'>) => void;
  updateSession: (id: string, session: Partial<Session>) => void;
  deleteSession: (id: string) => void;
  
  addSheet: (sheet: Omit<ObservationSheet, 'id'>) => void;
  updateSheet: (id: string, sheet: Partial<ObservationSheet>) => void;
  deleteSheet: (id: string) => void;
  addFieldToSheet: (sheetId: string, field: Omit<ObservationField, 'id'>) => void;
  removeFieldFromSheet: (sheetId: string, fieldId: string) => void;
  updateFieldInSheet: (sheetId: string, fieldId: string, updates: Partial<ObservationField>) => void;
  
  addObservation: (obs: Omit<ObservationRecord, 'id'>) => void;
  updateObservation: (id: string, updates: Partial<ObservationRecord>) => Promise<void>;
  setStudentSessionAttendance: (sessionId: string, targetId: string, status: StudentSessionStatus, noGear?: boolean) => Promise<void>;
  clearObservations: (sessionId: string) => void;
  
  addTemplateActivity: (name: string, ca?: 1 | 2 | 3 | 4 | 5) => void;
  updateTemplateActivity: (id: string, updates: Partial<TemplateActivity>) => void;
  deleteTemplateActivity: (id: string) => void;
  addTemplateSheet: (templateActivityId: string, name: string, isMultiStudent?: boolean) => void;
  updateTemplateSheet: (id: string, updates: Partial<TemplateSheet>) => void;
  deleteTemplateSheet: (id: string) => void;
  addFieldToTemplateSheet: (sheetId: string, field: Omit<ObservationField, 'id'>) => void;
  removeFieldFromTemplateSheet: (sheetId: string, fieldId: string) => void;
  updateFieldInTemplateSheet: (sheetId: string, fieldId: string, updates: Partial<ObservationField>) => void;
  
  loadOfficialEpsDatabase: (mode: 'merge' | 'reset') => void;
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
          // Initialize with rich EPS reference database
          const { templateActivities, templateSheets } = generateEpsReferenceDatabase();
          
          initialData = {
            classes: [],
            activities: [],
            sessions: [],
            sheets: [],
            templateActivities,
            templateSheets
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

  // Activity management
  const addActivity = (act: Omit<Activity, 'id'>) => updateWorkspace(s => ({ activities: [...s.activities, { ...act, id: generateId() }] }));
  
  const updateActivity = (id: string, act: Partial<Activity>) => updateWorkspace(s => ({
    activities: s.activities.map(a => (a.id === id ? { ...a, ...act } : a))
  }));

  const deleteActivity = async (id: string) => {
    const sessionsToDelete = state.sessions.filter(s => s.activityId === id);
    const sessionIds = sessionsToDelete.map(s => s.id);

    // Update workspace state
    updateWorkspace(s => ({
      activities: s.activities.filter(a => a.id !== id),
      sheets: s.sheets.filter(sh => sh.activityId !== id),
      sessions: s.sessions.filter(ss => ss.activityId !== id)
    }));

    // Clean up observation documents for these sessions
    if (sessionIds.length > 0) {
      try {
        const observationsRef = collection(db, 'workspaces', 'default', 'observations');
        const snapshot = await getDocs(observationsRef);
        const batch = writeBatch(db);
        let count = 0;
        snapshot.docs.forEach(d => {
          if (sessionIds.includes(d.data().sessionId)) {
            batch.delete(d.ref);
            count++;
          }
        });
        if (count > 0) {
          await batch.commit();
        }
      } catch (err) {
        console.error("Erreur suppression observations lors du deleteActivity:", err);
      }
    }
  };

  const createCustomActivity = (classId: string, name: string, ca?: 1 | 2 | 3 | 4 | 5) => {
    updateWorkspace(s => ({
      activities: [...(s.activities || []), {
        id: generateId(),
        classId,
        name,
        ca: ca || 1
      }]
    }));
  };

  const addActivityFromTemplate = (classId: string, templateId: string) => {
    updateWorkspace(s => {
      const template = s.templateActivities.find(t => t.id === templateId);
      if (!template) return {};

      const newActivityId = generateId();
      const newActivity: Activity = { 
        id: newActivityId, 
        classId, 
        name: template.name,
        ca: template.ca,
        templateId: template.id,
        evaluationCriteria: template.evaluationCriteria ? JSON.parse(JSON.stringify(template.evaluationCriteria)) : []
      };
      
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

  const syncActivityFromTemplate = (activityId: string, templateId: string, mode: 'merge_missing' | 'replace') => {
    updateWorkspace(s => {
      const act = s.activities.find(a => a.id === activityId);
      const template = s.templateActivities.find(t => t.id === templateId);
      if (!act || !template) return {};

      const templateSheetsForAct = s.templateSheets.filter(ts => ts.templateActivityId === templateId);

      let updatedSheets = [...s.sheets];
      if (mode === 'replace') {
        // Remove existing sheets for this activity
        updatedSheets = updatedSheets.filter(sh => sh.activityId !== activityId);
        // Add all template sheets
        const newSheets = templateSheetsForAct.map(ts => ({
          id: generateId(),
          activityId,
          name: ts.name,
          isMultiStudent: ts.isMultiStudent || false,
          fields: (ts.fields || []).map(f => ({ ...f, id: generateId() }))
        }));
        updatedSheets.push(...newSheets);
      } else {
        // merge_missing: only add sheets not yet present by name
        const existingNames = new Set(s.sheets.filter(sh => sh.activityId === activityId).map(sh => sh.name.toLowerCase().trim()));
        const missingSheets = templateSheetsForAct.filter(ts => !existingNames.has(ts.name.toLowerCase().trim()));
        const newSheets = missingSheets.map(ts => ({
          id: generateId(),
          activityId,
          name: ts.name,
          isMultiStudent: ts.isMultiStudent || false,
          fields: (ts.fields || []).map(f => ({ ...f, id: generateId() }))
        }));
        updatedSheets.push(...newSheets);
      }

      const updatedActivities = s.activities.map(a => {
        if (a.id === activityId) {
          return {
            ...a,
            ca: template.ca || a.ca,
            templateId: template.id,
            evaluationCriteria: (a.evaluationCriteria && a.evaluationCriteria.length > 0)
              ? a.evaluationCriteria
              : (template.evaluationCriteria ? JSON.parse(JSON.stringify(template.evaluationCriteria)) : [])
          };
        }
        return a;
      });

      return {
        activities: updatedActivities,
        sheets: updatedSheets
      };
    });
  };

  // Sessions
  const addSession = (session: Omit<Session, 'id'>) => updateWorkspace(s => ({ sessions: [...s.sessions, { ...session, id: generateId() }] }));
  const updateSession = (id: string, session: Partial<Session>) => updateWorkspace(s => ({ sessions: s.sessions.map(ss => (ss.id === id ? { ...ss, ...session } : ss)) }));
  const deleteSession = (id: string) => updateWorkspace(s => ({ sessions: s.sessions.filter(ss => ss.id !== id) }));

  // Observation sheets for active activities
  const addSheet = (sheet: Omit<ObservationSheet, 'id'>) => updateWorkspace(s => ({ sheets: [...s.sheets, { ...sheet, id: generateId() }] }));
  const updateSheet = (id: string, sheet: Partial<ObservationSheet>) => updateWorkspace(s => ({ sheets: s.sheets.map(sh => (sh.id === id ? { ...sh, ...sheet } : sh)) }));
  const deleteSheet = (id: string) => updateWorkspace(s => ({ sheets: s.sheets.filter(sh => sh.id !== id) }));
  
  const addFieldToSheet = (sheetId: string, field: Omit<ObservationField, 'id'>) => {
    updateWorkspace(s => ({
      sheets: s.sheets.map(sh => {
        if (sh.id === sheetId) {
          return { ...sh, fields: [...(sh.fields || []), { ...field, id: generateId() }] };
        }
        return sh;
      })
    }));
  };

  const removeFieldFromSheet = (sheetId: string, fieldId: string) => {
    updateWorkspace(s => ({
      sheets: s.sheets.map(sh => {
        if (sh.id === sheetId) {
          return { ...sh, fields: (sh.fields || []).filter(f => f.id !== fieldId) };
        }
        return sh;
      })
    }));
  };

  const updateFieldInSheet = (sheetId: string, fieldId: string, updates: Partial<ObservationField>) => {
    updateWorkspace(s => ({
      sheets: s.sheets.map(sh => {
        if (sh.id === sheetId) {
          return {
            ...sh,
            fields: (sh.fields || []).map(f => f.id === fieldId ? { ...f, ...updates } : f)
          };
        }
        return sh;
      })
    }));
  };

  // Observations
  const addObservation = async (obs: Omit<ObservationRecord, 'id'>) => {
    const observationsRef = collection(db, 'workspaces', 'default', 'observations');
    await addDoc(observationsRef, obs).catch(err => {
      console.error("Erreur addObservation (Permissions ?) :", err);
    });
  };

  const updateObservation = async (id: string, updates: Partial<ObservationRecord>) => {
    const obsRef = doc(db, 'workspaces', 'default', 'observations', id);
    await updateDoc(obsRef, updates).catch(err => {
      console.error("Erreur updateObservation :", err);
    });
  };

  const setStudentSessionAttendance = async (
    sessionId: string, 
    targetId: string, 
    status: StudentSessionStatus, 
    noGear?: boolean
  ) => {
    const existing = state.observations.find(o => o.sessionId === sessionId && o.targetId === targetId);
    if (existing) {
      const updates: Partial<ObservationRecord> = { status };
      if (noGear !== undefined) updates.noGear = noGear;
      await updateObservation(existing.id, updates);
    } else {
      await addObservation({
        sessionId,
        targetId,
        data: {},
        status,
        noGear: !!noGear,
        timestamp: Date.now()
      });
    }
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

  // Templates
  const addTemplateActivity = (name: string, ca: 1 | 2 | 3 | 4 | 5 = 1) => {
    updateWorkspace(s => ({ templateActivities: [...s.templateActivities, { id: generateId(), name, ca }] }));
  };

  const updateTemplateActivity = (id: string, updates: Partial<TemplateActivity>) => {
    updateWorkspace(s => ({
      templateActivities: s.templateActivities.map(t => t.id === id ? { ...t, ...updates } : t)
    }));
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

  const updateTemplateSheet = (id: string, updates: Partial<TemplateSheet>) => {
    updateWorkspace(s => ({
      templateSheets: s.templateSheets.map(ts => ts.id === id ? { ...ts, ...updates } : ts)
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

  const updateFieldInTemplateSheet = (sheetId: string, fieldId: string, updates: Partial<ObservationField>) => {
    updateWorkspace(s => ({
      templateSheets: s.templateSheets.map(ts => {
        if (ts.id === sheetId) {
          return {
            ...ts,
            fields: (ts.fields || []).map(f => f.id === fieldId ? { ...f, ...updates } : f)
          };
        }
        return ts;
      })
    }));
  };

  // Official Reference Database management
  const loadOfficialEpsDatabase = (mode: 'merge' | 'reset') => {
    const { templateActivities: refActivities, templateSheets: refSheets } = generateEpsReferenceDatabase();

    updateWorkspace(s => {
      if (mode === 'reset') {
        return {
          templateActivities: refActivities,
          templateSheets: refSheets
        };
      }

      // Merge: keep all existing, add new reference activities if name doesn't exist
      const existingNames = new Set(s.templateActivities.map(t => t.name.toLowerCase().trim()));
      const newTemplatesToAdd: TemplateActivity[] = [];
      const newSheetsToAdd: TemplateSheet[] = [];

      refActivities.forEach(refAct => {
        if (!existingNames.has(refAct.name.toLowerCase().trim())) {
          const newActId = generateId();
          newTemplatesToAdd.push({
            ...refAct,
            id: newActId
          });
          const matchingRefSheets = refSheets.filter(rs => rs.templateActivityId === refAct.id);
          matchingRefSheets.forEach(rs => {
            newSheetsToAdd.push({
              ...rs,
              id: generateId(),
              templateActivityId: newActId,
              fields: rs.fields.map(f => ({ ...f, id: generateId() }))
            });
          });
        }
      });

      return {
        templateActivities: [...s.templateActivities, ...newTemplatesToAdd],
        templateSheets: [...s.templateSheets, ...newSheetsToAdd]
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
    addActivity, updateActivity, deleteActivity, createCustomActivity,
    addActivityFromTemplate, syncActivityFromTemplate,
    addSession, updateSession, deleteSession,
    addSheet, updateSheet, deleteSheet, addFieldToSheet, removeFieldFromSheet, updateFieldInSheet,
    addObservation, updateObservation, setStudentSessionAttendance, clearObservations,
    addTemplateActivity, updateTemplateActivity, deleteTemplateActivity,
    addTemplateSheet, updateTemplateSheet, deleteTemplateSheet,
    addFieldToTemplateSheet, removeFieldFromTemplateSheet, updateFieldInTemplateSheet,
    loadOfficialEpsDatabase
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) throw new Error('useStore must be used within a StoreProvider');
  return context;
}
