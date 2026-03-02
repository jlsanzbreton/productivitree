import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AchievementData,
  AppPersistedState,
  CorePurposeRoot,
  DataConsentSettings,
  LeafStatus,
  PassionTestResult,
  PrivacySettings,
  ProjectBranch,
  ProjectStageLeaf,
  RootData,
  SkillTrunkSegment,
  TaskData,
  TreeHealthState,
  TreeNode,
  User,
} from '../types';
import {
  APP_SCHEMA_VERSION,
  DEFAULT_USER_ID,
  backgroundThemes,
  defaultHealthState,
  defaultUser,
  healthPolicy,
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
  runPassionTest: (userInputs: string[]) => Promise<void>;
  isOnboardingComplete: boolean;
  setIsOnboardingComplete: React.Dispatch<React.SetStateAction<boolean>>;
  addTask: (task: Omit<ProjectStageLeaf, 'id' | 'userId' | 'createdAt' | 'lastActivityAt'>) => void;
  updateTask: (task: ProjectStageLeaf) => void;
  deleteTask: (taskId: string) => void;
  completeTask: (taskId: string) => void;
  addCoreRoot: (root: Omit<CorePurposeRoot, 'id' | 'userId' | 'createdAt'>) => void;
  updateCoreRoot: (root: CorePurposeRoot) => void;
  deleteCoreRoot: (rootId: string) => void;
  addTrunkSegment: (segment: Omit<SkillTrunkSegment, 'id' | 'userId' | 'createdAt'>) => void;
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
  resetDemoData: () => void;
  deleteAllData: () => void;
  schemaVersion: number;
  migrateToLatestSchema: () => void;
}

const newId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

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

  const treeData = useMemo(
    () =>
      buildTreeData({
        roots,
        trunkSegments,
        projects,
        stages: currentTasks,
        achievements,
      }) as TreeNode,
    [roots, trunkSegments, projects, currentTasks, achievements]
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
  }, [activeBackground, activeTreeTheme]);

  const persistState = useCallback(() => {
    const payload: AppPersistedState = {
      schemaVersion: APP_SCHEMA_VERSION,
      user: currentUser,
      roots,
      trunkSegments,
      projects,
      stages: currentTasks,
      achievements,
      activeBackground,
      activeTreeTheme,
      treeHealth: treeHealthState,
      isOnboardingComplete,
      passionTestResult,
      consent,
      privacy: privacySettings,
    };
    savePersistedState(payload);
  }, [
    currentUser,
    roots,
    trunkSegments,
    projects,
    currentTasks,
    achievements,
    activeBackground,
    activeTreeTheme,
    treeHealthState,
    isOnboardingComplete,
    passionTestResult,
    consent,
    privacySettings,
  ]);

  useEffect(() => {
    persistState();
  }, [persistState]);

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
      setRoots((prev) => [
        ...prev,
        {
          ...root,
          id: newId('root'),
          userId: currentUser.id,
          createdAt: new Date().toISOString(),
        },
      ]);
      recordMeaningfulActivity();
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
      setTrunkSegments((prev) => [
        ...prev,
        {
          ...segment,
          id: newId('trunk'),
          userId: currentUser.id,
          createdAt: new Date().toISOString(),
        },
      ]);
      recordMeaningfulActivity();
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

  const deleteProjectBranch = useCallback((projectId: string) => {
    setProjects((prev) => prev.filter((item) => item.id !== projectId));
    setCurrentTasks((prev) => prev.filter((item) => item.projectId !== projectId));
  }, []);

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

  const deleteTask = useCallback((taskId: string) => {
    setCurrentTasks((prev) => prev.filter((item) => item.id !== taskId));
  }, []);

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
      setAchievements((prev) => [
        ...prev,
        {
          id: newId('achievement'),
          projectId: currentTasks.find((task) => task.id === taskId)?.projectId,
          title: 'Milestone reached',
          type: 'milestone',
          createdAt: now,
        },
      ]);
      recordMeaningfulActivity();
    },
    [currentTasks, recordMeaningfulActivity]
  );

  const setAiReflectionConsent = useCallback((enabled: boolean) => {
    setConsent({
      aiReflectionConsent: enabled,
      acceptedAt: enabled ? new Date().toISOString() : null,
    });
  }, []);

  const runPassionTest = useCallback(
    async (userInputs: string[]) => {
      if (!consent.aiReflectionConsent) {
        setError('Please enable AI reflection consent before running the passion test.');
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/.netlify/functions/passion-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            answers: userInputs,
            userId: currentUser.id || DEFAULT_USER_ID,
          }),
        });

        if (!response.ok) {
          throw new Error(`Passion test request failed with status ${response.status}`);
        }

        const result = (await response.json()) as PassionTestResult;
        setPassionTestResult(result);
        setCurrentUser((prev) => ({ ...prev, passionTestCompleted: true }));
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
        recordMeaningfulActivity();
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : 'Unknown error';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [consent.aiReflectionConsent, currentUser.id, recordMeaningfulActivity, roots.length]
  );

  const exportAllData = useCallback(
    () =>
      exportPersistedState({
        schemaVersion: APP_SCHEMA_VERSION,
        user: currentUser,
        roots,
        trunkSegments,
        projects,
        stages: currentTasks,
        achievements,
        activeBackground,
        activeTreeTheme,
        treeHealth: treeHealthState,
        isOnboardingComplete,
        passionTestResult,
        consent,
        privacy: privacySettings,
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
      treeHealthState,
      isOnboardingComplete,
      passionTestResult,
      consent,
      privacySettings,
    ]
  );

  const resetDemoData = useCallback(() => {
    const nextDefaults = buildDefaults();
    setRoots(nextDefaults.roots);
    setTrunkSegments(nextDefaults.trunkSegments);
    setProjects(nextDefaults.projects);
    setCurrentTasks(nextDefaults.stages);
    setAchievements(nextDefaults.achievements);
    setTreeHealthState(nextDefaults.treeHealth);
    setPassionTestResult(nextDefaults.passionTestResult);
    setIsOnboardingComplete(false);
    setConsent(nextDefaults.consent);
    setPrivacySettings(nextDefaults.privacy);
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
    setPassionTestResult(nextDefaults.passionTestResult);
    setIsOnboardingComplete(nextDefaults.isOnboardingComplete);
    setConsent(nextDefaults.consent);
    setPrivacySettings(nextDefaults.privacy);
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
        projects,
        setProjects,
        currentTasks,
        setCurrentTasks,
        achievements,
        setAchievements,
        treeData: treeDataState,
        setTreeData,
        activeBackground,
        setActiveBackground,
        activeTreeTheme,
        setActiveTreeTheme,
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
        resetDemoData,
        deleteAllData,
        schemaVersion: APP_SCHEMA_VERSION,
        migrateToLatestSchema,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
