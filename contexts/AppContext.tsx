import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AchievementData,
  ActivityEntry,
  AppConnection,
  AppPersistedState,
  HistoryAction,
  HistoryEntry,
  HistoryKind,
  CorePurposeRoot,
  DataConsentSettings,
  LeafStatus,
  PassionTestResult,
  PassionAnalyzeResponse,
  PassionAnalysisStatus,
  PassionDraft,
  PassionDraftStatus,
  PrivacySettings,
  ProjectBranch,
  ProjectStageLeaf,
  RootData,
  SkillTrunkSegment,
  TaskData,
  TreeHealthState,
  TreeNode,
  TreeSpecies,
  User,
} from '../types';
import {
  APP_SCHEMA_VERSION,
  DEFAULT_USER_ID,
  backgroundThemes,
  defaultHealthState,
  defaultUser,
  healthPolicy,
  treeSpeciesOptions,
  treeThemes,
} from '../constants';
import {
  buildDefaultPersistedState,
  clearPersistedData,
  exportPersistedState,
  loadPersistedState,
  savePersistedState,
} from '../utils/persistence';
import { applyActivityBoost, applyHealthDecay, applyWaterBoost, deriveStageStatusFromNeglect } from '../utils/healthEngine';
import { buildTreeData } from '../utils/treeBuilder';
import { addActivityEntry, applyActivity } from '../utils/activityLink';
import {
  createBackupJson,
  getLastBackupAt,
  markBackupDone,
  parseBackup,
  requestPersistentStorage,
  restoreBackup,
} from '../services/backupService';
import { backupFileName, summarizeBackup } from '../utils/backup';
import { analyzeDraftNow, getAttemptHistory, getLatestResult, loadLatestDraft, saveDraft } from '../services/passionService';

export interface AppContextType {
  currentUser: User;
  setCurrentUser: React.Dispatch<React.SetStateAction<User>>;
  roots: CorePurposeRoot[];
  setRoots: React.Dispatch<React.SetStateAction<RootData[]>>;
  trunkSegments: SkillTrunkSegment[];
  setTrunkSegments: React.Dispatch<React.SetStateAction<SkillTrunkSegment[]>>;
  projects: ProjectBranch[];
  setProjects: React.Dispatch<React.SetStateAction<ProjectBranch[]>>;
  currentTasks: ProjectStageLeaf[];
  setCurrentTasks: React.Dispatch<React.SetStateAction<TaskData[]>>;
  achievements: AchievementData[];
  setAchievements: React.Dispatch<React.SetStateAction<AchievementData[]>>;
  treeData: TreeNode;
  setTreeData: React.Dispatch<React.SetStateAction<TreeNode>>;
  activeBackground: string;
  setActiveBackground: React.Dispatch<React.SetStateAction<string>>;
  activeTreeTheme: string;
  setActiveTreeTheme: React.Dispatch<React.SetStateAction<string>>;
  treeSpecies: TreeSpecies;
  setTreeSpecies: React.Dispatch<React.SetStateAction<TreeSpecies>>;
  treeHealth: number;
  treeHealthState: TreeHealthState;
  waterTree: () => void;
  decayTreeHealth: () => void;
  recordMeaningfulActivity: () => void;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  showPassionTest: boolean;
  setShowPassionTest: React.Dispatch<React.SetStateAction<boolean>>;
  passionTestResult: PassionTestResult | null;
  setPassionTestResult: React.Dispatch<React.SetStateAction<PassionTestResult | null>>;
  runPassionTest: (userInputs: string[]) => Promise<PassionAnalyzeResponse>;
  passionDraftStatus: PassionDraftStatus;
  savePassionDraft: (answers: string[]) => Promise<string>;
  analyzePassionDraft: (draftId: string) => Promise<PassionAnalyzeResponse>;
  loadLocalPassionDraft: () => Promise<PassionDraft | null>;
  markPassionStepCompleted: () => void;
  isOnboardingComplete: boolean;
  setIsOnboardingComplete: React.Dispatch<React.SetStateAction<boolean>>;
  addTask: (task: Omit<ProjectStageLeaf, 'id' | 'userId' | 'createdAt' | 'lastActivityAt'>) => void;
  updateTask: (task: ProjectStageLeaf) => void;
  deleteTask: (taskId: string) => void;
  completeTask: (taskId: string) => void;
  addCoreRoot: (root: Omit<CorePurposeRoot, 'id' | 'userId' | 'createdAt'>) => string;
  updateCoreRoot: (root: CorePurposeRoot) => void;
  deleteCoreRoot: (rootId: string) => void;
  addTrunkSegment: (segment: Omit<SkillTrunkSegment, 'id' | 'userId' | 'createdAt'>) => string;
  updateTrunkSegment: (segment: SkillTrunkSegment) => void;
  deleteTrunkSegment: (segmentId: string) => void;
  addProjectBranch: (project: Omit<ProjectBranch, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => string;
  updateProjectBranch: (project: ProjectBranch) => void;
  deleteProjectBranch: (projectId: string) => void;
  showTaskModal: boolean;
  setShowTaskModal: React.Dispatch<React.SetStateAction<boolean>>;
  editingTask: ProjectStageLeaf | null;
  setEditingTask: React.Dispatch<React.SetStateAction<ProjectStageLeaf | null>>;
  consent: DataConsentSettings;
  setAiReflectionConsent: (enabled: boolean) => void;
  privacySettings: PrivacySettings;
  setPrivacySettings: React.Dispatch<React.SetStateAction<PrivacySettings>>;
  exportAllData: () => string;
  downloadBackup: () => Promise<void>;
  previewBackup: (text: string) => BackupSummary;
  restoreFromBackup: (text: string) => Promise<void>;
  lastBackupAt: string | null;
  storagePersisted: boolean | null;
  resetDemoData: () => void;
  deleteAllData: () => void;
  schemaVersion: number;
  migrateToLatestSchema: () => void;
  // Living tree
  purpose: string;
  setPurpose: (purpose: string) => void;
  connections: AppConnection[];
  saveConnection: (connection: Omit<AppConnection, 'id' | 'createdAt'> & { id?: string }) => string;
  removeConnection: (connectionId: string) => void;
  removeExampleParts: (parts: { purpose: boolean; rootIds: string[]; trunkIds: string[]; branchIds: string[]; appIds: string[] }) => void;
  history: HistoryEntry[];
  /** Everything, including archived (deleted) items. */
  archive: { projects: ProjectBranch[]; stages: ProjectStageLeaf[]; achievements: AchievementData[] };
  sproutBranch: (input: SproutBranchInput) => string;
  sproutLeaf: (projectId: string, input: { title: string; link?: string; notes?: string }) => string;
  sproutFruit: (projectId: string, input: { title: string; fromTaskId?: string; harvested?: boolean; link?: string }) => string;
  setFruitHarvested: (fruitId: string, harvested: boolean) => void;
  updateFruit: (fruitId: string, patch: Partial<Pick<AchievementData, 'title' | 'link' | 'description'>>) => void;
  setBranchStatus: (projectId: string, status: ProjectBranch['status']) => void;
  setTaskDone: (taskId: string, done: boolean) => void;
  patchTask: (taskId: string, patch: Partial<Pick<ProjectStageLeaf, 'notes' | 'link' | 'title' | 'description'>>) => void;
  logTaskWork: (taskId: string, text?: string) => void;
  archiveItem: (kind: HistoryKind, id: string) => void;
  restoreItem: (kind: HistoryKind, id: string) => void;
  purgeItem: (kind: HistoryKind, id: string) => void;
  recordExternalActivity: (activity: ExternalActivity) => { ok: boolean; message: string; projectId?: string; taskId?: string };
  importTree: (data: ImportedTree, options?: { quiet?: boolean }) => void;
}

export interface SproutBranchInput {
  title: string;
  description?: string;
  priorityLevel?: number;
  appId?: string;
  rootId?: string;
  sproutedFrom?: string;
}

export interface ExternalActivity {
  branch: string;
  task?: string;
  app?: string;
  note?: string;
  url?: string;
}

export interface ImportedTree {
  purpose: string;
  roots: CorePurposeRoot[];
  trunkSegments: SkillTrunkSegment[];
  projects: ProjectBranch[];
  stages: ProjectStageLeaf[];
  achievements: AchievementData[];
  connections: AppConnection[];
}

export interface BackupSummary {
  exportedAt: string | null;
  projects: number;
  stages: number;
  roots: number;
}

const newId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
const MAX_HISTORY = 500;
const toAttemptStatus = (value: unknown): PassionAnalysisStatus => {
  const allowed: PassionAnalysisStatus[] = [
    'queued_manual',
    'running',
    'succeeded',
    'failed_offline',
    'failed_remote',
  ];
  return allowed.includes(value as PassionAnalysisStatus) ? (value as PassionAnalysisStatus) : 'failed_remote';
};

const buildDefaults = (): AppPersistedState => {
  const user = defaultUser();
  return buildDefaultPersistedState({
    schemaVersion: APP_SCHEMA_VERSION,
    user,
    roots: [],
    trunkSegments: [],
    projects: [],
    stages: [],
    achievements: [],
    activeBackground: user.backgroundSetting,
    activeTreeTheme: user.treeTheme,
    treeSpecies: 'oak',
    treeHealth: defaultHealthState(),
    isOnboardingComplete: false,
    passionTestResult: null,
    consent: {
      aiReflectionConsent: false,
      acceptedAt: null,
    },
    privacy: {
      localOnlyMode: true,
      analyticsEnabled: false,
    },
    connections: [],
    history: [],
  });
};

export const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const defaults = useMemo(() => buildDefaults(), []);
  const initial = useMemo(() => loadPersistedState(defaults), [defaults]);
  const normalizedUser: User = {
    ...defaults.user,
    ...initial.user,
    createdAt: initial.user?.createdAt || defaults.user.createdAt,
  };

  const [currentUser, setCurrentUser] = useState<User>(normalizedUser);
  const [roots, setRoots] = useState<CorePurposeRoot[]>(initial.roots);
  const [trunkSegments, setTrunkSegments] = useState<SkillTrunkSegment[]>(initial.trunkSegments);
  const [projects, setProjects] = useState<ProjectBranch[]>(initial.projects);
  const [currentTasks, setCurrentTasks] = useState<ProjectStageLeaf[]>(initial.stages);
  const [achievements, setAchievements] = useState<AchievementData[]>(initial.achievements);
  const [activeBackground, setActiveBackground] = useState(initial.activeBackground);
  const [activeTreeTheme, setActiveTreeTheme] = useState(initial.activeTreeTheme);
  const [treeSpecies, setTreeSpecies] = useState<TreeSpecies>(initial.treeSpecies || 'oak');
  const [treeHealthState, setTreeHealthState] = useState<TreeHealthState>(initial.treeHealth);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassionTest, setShowPassionTest] = useState(false);
  const [passionTestResult, setPassionTestResult] = useState<PassionTestResult | null>(initial.passionTestResult);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(initial.isOnboardingComplete);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectStageLeaf | null>(null);
  const [consent, setConsent] = useState<DataConsentSettings>(initial.consent);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(initial.privacy);
  const [connections, setConnections] = useState<AppConnection[]>(initial.connections || []);
  const [history, setHistory] = useState<HistoryEntry[]>(initial.history || []);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(() => getLastBackupAt());
  const [storagePersisted, setStoragePersisted] = useState<boolean | null>(null);
  const [passionDraftStatus, setPassionDraftStatus] = useState<PassionDraftStatus>({
    draftId: null,
    hasDraft: false,
    lastAttemptStatus: null,
    lastError: null,
    lastSavedAt: null,
  });

  // Archived (deleted) items stay in state for the archive but are hidden everywhere else.
  const liveProjects = useMemo(() => projects.filter((item) => !item.deletedAt), [projects]);
  const liveTasks = useMemo(() => {
    const live = new Set(liveProjects.map((item) => item.id));
    return currentTasks.filter((item) => !item.deletedAt && (live.has(item.projectId) || !projects.some((p) => p.id === item.projectId)));
  }, [currentTasks, liveProjects, projects]);
  const liveAchievements = useMemo(() => {
    const live = new Set(liveProjects.map((item) => item.id));
    return achievements.filter((item) => !item.deletedAt && (!item.projectId || live.has(item.projectId)));
  }, [achievements, liveProjects]);

  const treeData = useMemo(
    () =>
      buildTreeData({
        roots,
        trunkSegments,
        projects: liveProjects,
        stages: liveTasks,
        achievements: liveAchievements,
      }) as TreeNode,
    [roots, trunkSegments, liveProjects, liveTasks, liveAchievements]
  );
  const [treeDataState, setTreeData] = useState<TreeNode>(treeData);

  useEffect(() => {
    setTreeData(treeData);
  }, [treeData]);

  useEffect(() => {
    if (!backgroundThemes[activeBackground]) {
      setActiveBackground(Object.keys(backgroundThemes)[0]);
    }
    if (!treeThemes[activeTreeTheme]) {
      setActiveTreeTheme(Object.keys(treeThemes)[0]);
    }
    if (!treeSpeciesOptions.some((species) => species.key === treeSpecies)) {
      setTreeSpecies('oak');
    }
  }, [activeBackground, activeTreeTheme, treeSpecies]);

  const persistedState = useMemo<AppPersistedState>(
    () => ({
      schemaVersion: APP_SCHEMA_VERSION,
      user: currentUser,
      roots,
      trunkSegments,
      projects,
      stages: currentTasks,
      achievements,
      activeBackground,
      activeTreeTheme,
      treeSpecies,
      treeHealth: treeHealthState,
      isOnboardingComplete,
      passionTestResult,
      consent,
      privacy: privacySettings,
      connections,
      history,
    }),
    [
      currentUser,
      roots,
      trunkSegments,
      projects,
      currentTasks,
      achievements,
      activeBackground,
      activeTreeTheme,
      treeSpecies,
      treeHealthState,
      isOnboardingComplete,
      passionTestResult,
      consent,
      privacySettings,
      connections,
      history,
    ]
  );

  const persistState = useCallback(() => {
    savePersistedState(persistedState);
  }, [persistedState]);

  useEffect(() => {
    persistState();
  }, [persistState]);

  useEffect(() => {
    let cancelled = false;
    requestPersistentStorage().then((granted) => {
      if (!cancelled) setStoragePersisted(granted);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const recordMeaningfulActivity = useCallback(() => {
    const nowIso = new Date().toISOString();
    setTreeHealthState((prev) => applyActivityBoost(prev, nowIso, healthPolicy));
  }, []);

  const decayTreeHealth = useCallback(() => {
    const nowIso = new Date().toISOString();
    setTreeHealthState((prev) => applyHealthDecay(prev, nowIso, healthPolicy));
    setCurrentTasks((prev) =>
      prev.map((stage) => ({
        ...stage,
        status: deriveStageStatusFromNeglect(stage, nowIso, healthPolicy) as LeafStatus,
      }))
    );
  }, []);

  useEffect(() => {
    decayTreeHealth();
    const decayTimer = setInterval(() => decayTreeHealth(), 60 * 1000);
    return () => clearInterval(decayTimer);
  }, [decayTreeHealth]);

  const waterTree = useCallback(() => {
    const nowIso = new Date().toISOString();
    setTreeHealthState((prev) => applyWaterBoost(prev, nowIso, healthPolicy));
  }, []);

  const addCoreRoot = useCallback(
    (root: Omit<CorePurposeRoot, 'id' | 'userId' | 'createdAt'>) => {
      const id = newId('root');
      setRoots((prev) => [
        ...prev,
        {
          ...root,
          id,
          userId: currentUser.id,
          createdAt: new Date().toISOString(),
        },
      ]);
      recordMeaningfulActivity();
      return id;
    },
    [currentUser.id, recordMeaningfulActivity]
  );

  const updateCoreRoot = useCallback(
    (root: CorePurposeRoot) => {
      setRoots((prev) => prev.map((item) => (item.id === root.id ? root : item)));
      recordMeaningfulActivity();
    },
    [recordMeaningfulActivity]
  );

  const deleteCoreRoot = useCallback((rootId: string) => {
    setRoots((prev) => prev.filter((item) => item.id !== rootId));
  }, []);

  const addTrunkSegment = useCallback(
    (segment: Omit<SkillTrunkSegment, 'id' | 'userId' | 'createdAt'>) => {
      const id = newId('trunk');
      setTrunkSegments((prev) => [
        ...prev,
        {
          ...segment,
          id,
          userId: currentUser.id,
          createdAt: new Date().toISOString(),
        },
      ]);
      recordMeaningfulActivity();
      return id;
    },
    [currentUser.id, recordMeaningfulActivity]
  );

  const updateTrunkSegment = useCallback(
    (segment: SkillTrunkSegment) => {
      setTrunkSegments((prev) => prev.map((item) => (item.id === segment.id ? segment : item)));
      recordMeaningfulActivity();
    },
    [recordMeaningfulActivity]
  );

  const deleteTrunkSegment = useCallback((segmentId: string) => {
    setTrunkSegments((prev) => prev.filter((item) => item.id !== segmentId));
  }, []);

  const addProjectBranch = useCallback(
    (project: Omit<ProjectBranch, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const branchId = newId('project');
      setProjects((prev) => [
        ...prev,
        {
          ...project,
          id: branchId,
          userId: currentUser.id,
          createdAt: now,
          updatedAt: now,
        },
      ]);
      recordMeaningfulActivity();
      return branchId;
    },
    [currentUser.id, recordMeaningfulActivity]
  );

  const updateProjectBranch = useCallback(
    (project: ProjectBranch) => {
      setProjects((prev) =>
        prev.map((item) => (item.id === project.id ? { ...project, updatedAt: new Date().toISOString() } : item))
      );
      recordMeaningfulActivity();
    },
    [recordMeaningfulActivity]
  );

  const logEvent = useCallback((kind: HistoryKind, entityId: string, title: string, action: HistoryAction, detail?: string) => {
    const entry: HistoryEntry = { id: newId('log'), at: new Date().toISOString(), kind, entityId, title, action, ...(detail ? { detail } : {}) };
    setHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY));
  }, []);

  // Deleting sends a branch to the archive; its leaves and fruits go with it and come back on restore.
  const deleteProjectBranch = useCallback(
    (projectId: string) => {
      const now = new Date().toISOString();
      const project = projects.find((item) => item.id === projectId);
      setProjects((prev) => prev.map((item) => (item.id === projectId ? { ...item, deletedAt: now } : item)));
      if (project) logEvent('branch', projectId, project.title, 'deleted');
    },
    [logEvent, projects]
  );

  const addTask = useCallback(
    (task: Omit<ProjectStageLeaf, 'id' | 'userId' | 'createdAt' | 'lastActivityAt'>) => {
      const now = new Date().toISOString();
      setCurrentTasks((prev) => [
        ...prev,
        {
          ...task,
          id: newId('stage'),
          userId: currentUser.id,
          createdAt: now,
          lastActivityAt: now,
          status: task.status || LeafStatus.Healthy,
        },
      ]);
      recordMeaningfulActivity();
    },
    [currentUser.id, recordMeaningfulActivity]
  );

  const updateTask = useCallback(
    (task: ProjectStageLeaf) => {
      const now = new Date().toISOString();
      setCurrentTasks((prev) =>
        prev.map((item) =>
          item.id === task.id
            ? {
                ...task,
                lastActivityAt: now,
                status: task.status === LeafStatus.Completed ? LeafStatus.Completed : LeafStatus.InProgress,
              }
            : item
        )
      );
      recordMeaningfulActivity();
    },
    [recordMeaningfulActivity]
  );

  const deleteTask = useCallback(
    (taskId: string) => {
      const now = new Date().toISOString();
      const task = currentTasks.find((item) => item.id === taskId);
      setCurrentTasks((prev) => prev.map((item) => (item.id === taskId ? { ...item, deletedAt: now } : item)));
      if (task) logEvent('leaf', taskId, task.title, 'deleted');
    },
    [currentTasks, logEvent]
  );

  const completeTask = useCallback(
    (taskId: string) => {
      const now = new Date().toISOString();
      setCurrentTasks((prev) =>
        prev.map((item) =>
          item.id === taskId
            ? {
                ...item,
                status: LeafStatus.Completed,
                completedAt: now,
                lastActivityAt: now,
              }
            : item
        )
      );
      const task = currentTasks.find((item) => item.id === taskId);
      if (task) logEvent('leaf', taskId, task.title, 'completed');
      recordMeaningfulActivity();
    },
    [currentTasks, logEvent, recordMeaningfulActivity]
  );

  const setPurpose = useCallback((purpose: string) => {
    setCurrentUser((prev) => ({ ...prev, purpose }));
  }, []);

  const saveConnection = useCallback((connection: Omit<AppConnection, 'id' | 'createdAt'> & { id?: string }) => {
    const id = connection.id || newId('app');
    setConnections((prev) => {
      const existing = prev.find((item) => item.id === id);
      const next: AppConnection = { ...connection, id, createdAt: existing?.createdAt || new Date().toISOString() };
      return existing ? prev.map((item) => (item.id === id ? next : item)) : [...prev, next];
    });
    return id;
  }, []);

  const removeConnection = useCallback((connectionId: string) => {
    setConnections((prev) => prev.filter((item) => item.id !== connectionId));
    setProjects((prev) => prev.map((item) => (item.appId === connectionId ? { ...item, appId: undefined } : item)));
  }, []);

  // Quietly removes the untouched parts of the first-run example tree (not logged: they were never the person's).
  const removeExampleParts = useCallback(
    (parts: { purpose: boolean; rootIds: string[]; trunkIds: string[]; branchIds: string[]; appIds: string[] }) => {
      const drop = (ids: string[]) => (item: { id: string }) => !ids.includes(item.id);
      if (parts.purpose) setCurrentUser((prev) => ({ ...prev, purpose: '' }));
      setRoots((prev) => prev.filter(drop(parts.rootIds)));
      setTrunkSegments((prev) => prev.filter(drop(parts.trunkIds)));
      setProjects((prev) => prev.filter(drop(parts.branchIds)));
      setCurrentTasks((prev) => prev.filter((item) => !parts.branchIds.includes(item.projectId)));
      setAchievements((prev) => prev.filter((item) => !item.projectId || !parts.branchIds.includes(item.projectId)));
      setConnections((prev) => prev.filter(drop(parts.appIds)));
    },
    []
  );

  const sproutBranch = useCallback(
    (input: SproutBranchInput) => {
      const id = addProjectBranch({
        title: input.title,
        description: input.description || '',
        priorityLevel: input.priorityLevel || 3,
        status: 'active',
        ...(input.appId ? { appId: input.appId } : {}),
        ...(input.rootId ? { rootId: input.rootId } : {}),
        ...(input.sproutedFrom ? { sproutedFrom: input.sproutedFrom } : {}),
      });
      logEvent('branch', id, input.title, input.sproutedFrom ? 'sprouted' : 'created', input.sproutedFrom ? `del fruto ${input.sproutedFrom}` : undefined);
      return id;
    },
    [addProjectBranch, logEvent]
  );

  const sproutLeaf = useCallback(
    (projectId: string, input: { title: string; link?: string; notes?: string }) => {
      const now = new Date().toISOString();
      const id = newId('stage');
      setCurrentTasks((prev) => [
        ...prev,
        {
          id,
          userId: currentUser.id,
          projectId,
          title: input.title,
          description: '',
          status: LeafStatus.Healthy,
          priority: 3,
          createdAt: now,
          lastActivityAt: now,
          ...(input.link ? { link: input.link } : {}),
          ...(input.notes ? { notes: input.notes } : {}),
        },
      ]);
      const project = projects.find((item) => item.id === projectId);
      logEvent('leaf', id, input.title, 'created', project ? `en ${project.title}` : undefined);
      recordMeaningfulActivity();
      return id;
    },
    [currentUser.id, logEvent, projects, recordMeaningfulActivity]
  );

  const sproutFruit = useCallback(
    (projectId: string, input: { title: string; fromTaskId?: string; harvested?: boolean; link?: string }) => {
      const now = new Date().toISOString();
      const id = newId('fruit');
      const harvested = Boolean(input.harvested);
      setAchievements((prev) => [
        ...prev,
        {
          id,
          projectId,
          title: input.title,
          type: 'milestone',
          createdAt: now,
          harvested,
          ...(harvested ? { harvestedAt: now } : {}),
          ...(input.fromTaskId ? { fromTaskId: input.fromTaskId } : {}),
          ...(input.link ? { link: input.link } : {}),
        },
      ]);
      const task = input.fromTaskId ? currentTasks.find((item) => item.id === input.fromTaskId) : undefined;
      logEvent('fruit', id, input.title, harvested ? 'harvested' : 'created', task ? `de la hoja ${task.title}` : undefined);
      recordMeaningfulActivity();
      return id;
    },
    [currentTasks, logEvent, recordMeaningfulActivity]
  );

  const setFruitHarvested = useCallback(
    (fruitId: string, harvested: boolean) => {
      const now = new Date().toISOString();
      const fruit = achievements.find((item) => item.id === fruitId);
      setAchievements((prev) =>
        prev.map((item) => (item.id === fruitId ? { ...item, harvested, harvestedAt: harvested ? now : undefined } : item))
      );
      if (fruit) logEvent('fruit', fruitId, fruit.title, harvested ? 'harvested' : 'reopened');
    },
    [achievements, logEvent]
  );

  const updateFruit = useCallback((fruitId: string, patch: Partial<Pick<AchievementData, 'title' | 'link' | 'description'>>) => {
    setAchievements((prev) => prev.map((item) => (item.id === fruitId ? { ...item, ...patch } : item)));
  }, []);

  const setBranchStatus = useCallback(
    (projectId: string, status: ProjectBranch['status']) => {
      const project = projects.find((item) => item.id === projectId);
      if (!project || project.status === status) return;
      setProjects((prev) =>
        prev.map((item) => (item.id === projectId ? { ...item, status, updatedAt: new Date().toISOString() } : item))
      );
      const action: HistoryAction =
        status === 'paused' ? 'paused' : status === 'completed' ? 'completed' : project.status === 'paused' ? 'resumed' : 'reopened';
      logEvent('branch', projectId, project.title, action);
    },
    [logEvent, projects]
  );

  const setTaskDone = useCallback(
    (taskId: string, done: boolean) => {
      if (done) {
        completeTask(taskId);
        return;
      }
      const now = new Date().toISOString();
      const task = currentTasks.find((item) => item.id === taskId);
      setCurrentTasks((prev) =>
        prev.map((item) =>
          item.id === taskId ? { ...item, status: LeafStatus.InProgress, completedAt: undefined, lastActivityAt: now } : item
        )
      );
      if (task) logEvent('leaf', taskId, task.title, 'reopened');
    },
    [completeTask, currentTasks, logEvent]
  );

  const patchTask = useCallback(
    (taskId: string, patch: Partial<Pick<ProjectStageLeaf, 'notes' | 'link' | 'title' | 'description'>>) => {
      setCurrentTasks((prev) => prev.map((item) => (item.id === taskId ? { ...item, ...patch } : item)));
    },
    []
  );

  const logTaskWork = useCallback(
    (taskId: string, text?: string) => {
      const now = new Date().toISOString();
      const entry: ActivityEntry = { id: newId('act'), at: now, source: 'Productivitree', text: text || 'Avance anotado a mano' };
      setCurrentTasks((prev) =>
        prev.map((item) =>
          item.id === taskId
            ? {
                ...addActivityEntry(item, entry),
                lastActivityAt: now,
                status: item.status === LeafStatus.Completed ? LeafStatus.Completed : LeafStatus.InProgress,
              }
            : item
        )
      );
      const task = currentTasks.find((item) => item.id === taskId);
      if (task) {
        setProjects((prev) => prev.map((item) => (item.id === task.projectId && item.status === 'paused' ? { ...item, status: 'active' } : item)));
      }
      recordMeaningfulActivity();
    },
    [currentTasks, recordMeaningfulActivity]
  );

  const archiveItem = useCallback(
    (kind: HistoryKind, id: string) => {
      if (kind === 'branch') deleteProjectBranch(id);
      else if (kind === 'leaf') deleteTask(id);
      else {
        const now = new Date().toISOString();
        const fruit = achievements.find((item) => item.id === id);
        setAchievements((prev) => prev.map((item) => (item.id === id ? { ...item, deletedAt: now } : item)));
        if (fruit) logEvent('fruit', id, fruit.title, 'deleted');
      }
    },
    [achievements, deleteProjectBranch, deleteTask, logEvent]
  );

  const restoreItem = useCallback(
    (kind: HistoryKind, id: string) => {
      const strip = <T extends { id: string; deletedAt?: string }>(list: T[]) =>
        list.map((item) => {
          if (item.id !== id) return item;
          const { deletedAt: _deletedAt, ...rest } = item;
          return rest as T;
        });
      const title =
        kind === 'branch'
          ? projects.find((item) => item.id === id)?.title
          : kind === 'leaf'
            ? currentTasks.find((item) => item.id === id)?.title
            : achievements.find((item) => item.id === id)?.title;
      if (kind === 'branch') setProjects((prev) => strip(prev));
      else if (kind === 'leaf') setCurrentTasks((prev) => strip(prev));
      else setAchievements((prev) => strip(prev));
      if (title) logEvent(kind, id, title, 'restored');
    },
    [achievements, currentTasks, logEvent, projects]
  );

  const purgeItem = useCallback(
    (kind: HistoryKind, id: string) => {
      const title =
        kind === 'branch'
          ? projects.find((item) => item.id === id)?.title
          : kind === 'leaf'
            ? currentTasks.find((item) => item.id === id)?.title
            : achievements.find((item) => item.id === id)?.title;
      if (kind === 'branch') {
        setProjects((prev) => prev.filter((item) => item.id !== id));
        setCurrentTasks((prev) => prev.filter((item) => item.projectId !== id));
        setAchievements((prev) => prev.filter((item) => item.projectId !== id));
      } else if (kind === 'leaf') setCurrentTasks((prev) => prev.filter((item) => item.id !== id));
      else setAchievements((prev) => prev.filter((item) => item.id !== id));
      if (title) logEvent(kind, id, title, 'purged');
    },
    [achievements, currentTasks, logEvent, projects]
  );

  const recordExternalActivity = useCallback(
    (activity: ExternalActivity) => {
      const result = applyActivity(
        {
          projects: projects.filter((item) => !item.deletedAt),
          stages: currentTasks,
          userId: currentUser.id,
          newId,
        },
        { task: '', app: '', note: '', url: '', ...activity }
      );
      if (!result.ok || !result.stages) return { ok: false, message: result.error || 'No se pudo anotar la actividad.' };
      setCurrentTasks(result.stages as ProjectStageLeaf[]);
      if (result.created && result.taskId) logEvent('leaf', result.taskId, activity.task || '', 'created', 'desde un enlace de actividad');
      recordMeaningfulActivity();
      return { ok: true, message: result.message || 'Actividad anotada.', projectId: result.projectId, taskId: result.taskId };
    },
    [currentTasks, currentUser.id, logEvent, projects, recordMeaningfulActivity]
  );

  const importTree = useCallback(
    (data: ImportedTree, options?: { quiet?: boolean }) => {
      setCurrentUser((prev) => ({ ...prev, purpose: data.purpose || prev.purpose }));
      setRoots(data.roots);
      setTrunkSegments(data.trunkSegments);
      setProjects(data.projects);
      setCurrentTasks(data.stages);
      setAchievements(data.achievements);
      setConnections(data.connections);
      setIsOnboardingComplete(true);
      if (options?.quiet) return;
      logEvent('branch', 'import', `${data.projects.length} ramas`, 'imported', 'árbol importado desde JSON');
    },
    [logEvent]
  );

  const setAiReflectionConsent = useCallback((enabled: boolean) => {
    setConsent({
      aiReflectionConsent: enabled,
      acceptedAt: enabled ? new Date().toISOString() : null,
    });
  }, []);

  const savePassionDraft = useCallback(
    async (answers: string[]) => {
      const normalizedAnswers = answers.map((answer) => (answer.trim() === '' ? 'Not answered' : answer.trim()));
      const draftId = await saveDraft(currentUser.id || DEFAULT_USER_ID, normalizedAnswers, consent.aiReflectionConsent);
      const draft = await loadLatestDraft(currentUser.id || DEFAULT_USER_ID);
      setPassionDraftStatus((prev) => ({
        ...prev,
        draftId,
        hasDraft: true,
        lastSavedAt: draft?.updatedAt || new Date().toISOString(),
      }));
      return draftId;
    },
    [consent.aiReflectionConsent, currentUser.id]
  );

  const applyPassionResult = useCallback(
    (result: PassionTestResult) => {
      setPassionTestResult(result);
      if (result.root_suggestions?.length > 0 && roots.length === 0) {
        const now = new Date().toISOString();
        setRoots(
          result.root_suggestions.map((suggestion) => ({
            id: newId('root'),
            userId: currentUser.id,
            title: suggestion.title,
            description: suggestion.description,
            strengthLevel: suggestion.strength,
            createdAt: now,
          }))
        );
      }
    },
    [currentUser.id, roots.length]
  );

  const analyzePassionDraft = useCallback(
    async (draftId: string): Promise<PassionAnalyzeResponse> => {
      setIsLoading(true);
      setError(null);
      const analysis = await analyzeDraftNow(draftId);
      const typedAttemptStatus = analysis.attemptStatus ? toAttemptStatus(analysis.attemptStatus) : undefined;

      if (analysis.status === 'succeeded' && analysis.result) {
        applyPassionResult(analysis.result);
        const history = await getAttemptHistory(draftId);
        setPassionDraftStatus((prev) => ({
          ...prev,
          draftId,
          hasDraft: true,
          lastAttemptStatus: history[0]?.status ? toAttemptStatus(history[0].status) : 'succeeded',
          lastError: null,
        }));
        recordMeaningfulActivity();
        setIsLoading(false);
        return {
          status: 'succeeded',
          draftId,
          result: analysis.result as PassionTestResult,
          attemptStatus: typedAttemptStatus || 'succeeded',
        };
      }

      const failureMessage =
        typedAttemptStatus === 'failed_offline'
          ? 'IA no disponible ahora. El borrador quedó guardado en local para reintentar manualmente.'
          : analysis.error || 'No se pudo analizar el borrador ahora.';

      setError(failureMessage);
      setPassionDraftStatus((prev) => ({
        ...prev,
        draftId,
        hasDraft: true,
        lastAttemptStatus: typedAttemptStatus || 'failed_remote',
        lastError: failureMessage,
      }));
      setIsLoading(false);
      return {
        status: 'failed',
        draftId,
        error: failureMessage,
        attemptStatus: typedAttemptStatus || 'failed_remote',
      };
    },
    [applyPassionResult, recordMeaningfulActivity]
  );

  const loadLocalPassionDraft = useCallback(async (): Promise<PassionDraft | null> => {
    const draft = await loadLatestDraft(currentUser.id || DEFAULT_USER_ID);
    if (!draft) return null;

    const history = await getAttemptHistory(draft.id);
    const latestResult = await getLatestResult(draft.id);
    if (latestResult) {
      setPassionTestResult(latestResult);
    }
    setPassionDraftStatus({
      draftId: draft.id,
      hasDraft: true,
      lastAttemptStatus: (history[0]?.status as PassionAnalysisStatus | undefined) || null,
      lastError: history[0]?.errorMessage || null,
      lastSavedAt: draft.updatedAt,
    });
    return draft;
  }, [currentUser.id]);

  const markPassionStepCompleted = useCallback(() => {
    setCurrentUser((prev) => ({ ...prev, passionTestCompleted: true }));
  }, []);

  useEffect(() => {
    loadLocalPassionDraft().catch((_error) => {
      // Offline-first load should never block app startup.
    });
  }, [loadLocalPassionDraft]);

  const runPassionTest = useCallback(
    async (userInputs: string[]): Promise<PassionAnalyzeResponse> => {
      if (!consent.aiReflectionConsent) {
        const draftId = await savePassionDraft(userInputs);
        const message = 'Borrador guardado localmente. Activa consentimiento para analizar con IA cuando quieras.';
        setPassionDraftStatus((prev) => ({
          ...prev,
          draftId,
          hasDraft: true,
          lastError: message,
          lastAttemptStatus: 'queued_manual',
        }));
        setError(message);
        return { status: 'failed', draftId, error: message, attemptStatus: 'queued_manual' };
      }

      const draftId = await savePassionDraft(userInputs);
      return analyzePassionDraft(draftId);
    },
    [analyzePassionDraft, consent.aiReflectionConsent, savePassionDraft]
  );

  const exportAllData = useCallback(() => exportPersistedState(persistedState), [persistedState]);

  const downloadBackup = useCallback(async () => {
    const now = new Date();
    const json = await createBackupJson(persistedState, now);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = backupFileName(now);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setLastBackupAt(markBackupDone(now));
  }, [persistedState]);

  const previewBackup = useCallback((text: string): BackupSummary => summarizeBackup(parseBackup(text)), []);

  const restoreFromBackup = useCallback(async (text: string) => {
    const backup = parseBackup(text);
    await restoreBackup(backup, APP_SCHEMA_VERSION);
    window.location.reload();
  }, []);

  const resetDemoData = useCallback(() => {
    const nextDefaults = buildDefaults();
    setRoots(nextDefaults.roots);
    setTrunkSegments(nextDefaults.trunkSegments);
    setProjects(nextDefaults.projects);
    setCurrentTasks(nextDefaults.stages);
    setAchievements(nextDefaults.achievements);
    setTreeHealthState(nextDefaults.treeHealth);
    setTreeSpecies(nextDefaults.treeSpecies);
    setPassionTestResult(nextDefaults.passionTestResult);
    setIsOnboardingComplete(false);
    setConsent(nextDefaults.consent);
    setPrivacySettings(nextDefaults.privacy);
    setConnections([]);
    setHistory([]);
    setCurrentUser({ ...nextDefaults.user, id: currentUser.id });
  }, [currentUser.id]);

  const deleteAllData = useCallback(() => {
    clearPersistedData();
    const nextDefaults = buildDefaults();
    setCurrentUser(nextDefaults.user);
    setRoots(nextDefaults.roots);
    setTrunkSegments(nextDefaults.trunkSegments);
    setProjects(nextDefaults.projects);
    setCurrentTasks(nextDefaults.stages);
    setAchievements(nextDefaults.achievements);
    setTreeHealthState(nextDefaults.treeHealth);
    setActiveBackground(nextDefaults.activeBackground);
    setActiveTreeTheme(nextDefaults.activeTreeTheme);
    setTreeSpecies(nextDefaults.treeSpecies);
    setPassionTestResult(nextDefaults.passionTestResult);
    setIsOnboardingComplete(nextDefaults.isOnboardingComplete);
    setConsent(nextDefaults.consent);
    setPrivacySettings(nextDefaults.privacy);
    setConnections([]);
    setHistory([]);
  }, []);

  const migrateToLatestSchema = useCallback(() => {
    persistState();
  }, [persistState]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        roots,
        setRoots,
        trunkSegments,
        setTrunkSegments,
        projects: liveProjects,
        setProjects,
        currentTasks: liveTasks,
        setCurrentTasks,
        achievements: liveAchievements,
        setAchievements,
        archive: { projects, stages: currentTasks, achievements },
        treeData: treeDataState,
        setTreeData,
        activeBackground,
        setActiveBackground,
        activeTreeTheme,
        setActiveTreeTheme,
        treeSpecies,
        setTreeSpecies,
        treeHealth: treeHealthState.value,
        treeHealthState,
        waterTree,
        decayTreeHealth,
        recordMeaningfulActivity,
        isLoading,
        setIsLoading,
        error,
        setError,
        showPassionTest,
        setShowPassionTest,
        passionTestResult,
        setPassionTestResult,
        runPassionTest,
        passionDraftStatus,
        savePassionDraft,
        analyzePassionDraft,
        loadLocalPassionDraft,
        markPassionStepCompleted,
        isOnboardingComplete,
        setIsOnboardingComplete,
        addTask,
        updateTask,
        deleteTask,
        completeTask,
        addCoreRoot,
        updateCoreRoot,
        deleteCoreRoot,
        addTrunkSegment,
        updateTrunkSegment,
        deleteTrunkSegment,
        addProjectBranch,
        updateProjectBranch,
        deleteProjectBranch,
        showTaskModal,
        setShowTaskModal,
        editingTask,
        setEditingTask,
        consent,
        setAiReflectionConsent,
        privacySettings,
        setPrivacySettings,
        exportAllData,
        downloadBackup,
        previewBackup,
        restoreFromBackup,
        lastBackupAt,
        storagePersisted,
        resetDemoData,
        deleteAllData,
        schemaVersion: APP_SCHEMA_VERSION,
        migrateToLatestSchema,
        purpose: currentUser.purpose || '',
        setPurpose,
        connections,
        saveConnection,
        removeConnection,
        removeExampleParts,
        history,
        sproutBranch,
        sproutLeaf,
        sproutFruit,
        setFruitHarvested,
        updateFruit,
        setBranchStatus,
        setTaskDone,
        patchTask,
        logTaskWork,
        archiveItem,
        restoreItem,
        purgeItem,
        recordExternalActivity,
        importTree,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
