import type { ComponentType } from 'react';

export interface User {
  id: string;
  email?: string;
  passionTestCompleted: boolean;
  treeTheme: string;
  backgroundSetting: string;
  createdAt: string;
}

export type TreeSpecies = 'oak' | 'fir' | 'cherry';

export interface CorePurposeRoot {
  id: string;
  userId: string;
  title: string;
  description: string;
  strengthLevel: number;
  createdAt: string;
}

export interface SkillTrunkSegment {
  id: string;
  userId: string;
  title: string;
  description: string;
  proficiencyLevel: number;
  yearsOfExperience: number;
  createdAt: string;
}

export type ProjectBranchStatus = 'active' | 'completed' | 'paused';

export interface ProjectBranch {
  id: string;
  userId: string;
  title: string;
  description: string;
  priorityLevel: number;
  status: ProjectBranchStatus;
  createdAt: string;
  updatedAt: string;
}

export enum LeafStatus {
  Healthy = 'healthy',
  NeedsAttention = 'needs_attention',
  Neglected = 'neglected',
  InProgress = 'in_progress',
  Completed = 'completed',
}

export interface ProjectStageLeaf {
  id: string;
  userId: string;
  projectId: string;
  title: string;
  description: string;
  status: LeafStatus;
  priority: number;
  dueDate?: string;
  createdAt: string;
  lastActivityAt: string;
  completedAt?: string;
}

export interface AchievementData {
  id: string;
  projectId?: string;
  title: string;
  type: 'personal_growth' | 'milestone' | 'opportunity';
  createdAt: string;
}

export interface TreeHealthState {
  value: number;
  lastDecayAt: string;
  lastWateredAt: string | null;
  lastMeaningfulActivityAt: string;
}

export interface DataConsentSettings {
  aiReflectionConsent: boolean;
  acceptedAt: string | null;
}

export interface PrivacySettings {
  localOnlyMode: boolean;
  analyticsEnabled: boolean;
}

export interface TreeNode {
  id: string;
  parentId?: string | null;
  type: 'rootNode' | 'root' | 'trunk' | 'branch' | 'leaf' | 'fruit';
  size?: number;
  color?: string;
  data?: Record<string, unknown> | CorePurposeRoot | SkillTrunkSegment | ProjectBranch | ProjectStageLeaf | AchievementData;
  children?: TreeNode[];
}

export interface PassionTestResult {
  passion_categories: string[];
  root_suggestions: Array<{ title: string; description: string; strength: number }>;
  personalized_insights: string;
}

export type PassionAnalysisStatus = 'queued_manual' | 'running' | 'succeeded' | 'failed_offline' | 'failed_remote';

export interface PassionDraft {
  id: string;
  userId: string;
  answers: string[];
  updatedAt: string;
  consentSnapshot: boolean;
  version: number;
}

export interface PassionAnalysisAttempt {
  id: string;
  draftId: string;
  provider: 'gemini';
  status: PassionAnalysisStatus;
  errorCode?: string;
  errorMessage?: string;
  requestedAt: string;
  finishedAt?: string;
  payloadHash: string;
}

export interface PassionAnalysisResult {
  id: string;
  draftId: string;
  provider: 'gemini';
  result: PassionTestResult;
  createdAt: string;
}

export interface PassionDraftStatus {
  draftId: string | null;
  hasDraft: boolean;
  lastAttemptStatus: PassionAnalysisStatus | null;
  lastError: string | null;
  lastSavedAt: string | null;
}

export interface PassionAnalyzeResponse {
  status: 'succeeded' | 'failed';
  draftId: string;
  result?: PassionTestResult;
  error?: string;
  attemptStatus?: PassionAnalysisStatus;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
}

export interface TreeTheme {
  name: string;
  branchColor: string;
  trunkColor: string;
  rootColor: string;
  leafHealthy: string;
  leafWarning: string;
  leafNeglected: string;
}

export interface BackgroundTheme {
  name: string;
  backgroundGradient: string;
  particles?: ComponentType | null;
  textColor: string;
}

export interface VisualTokens {
  panelSurface: string;
  panelBorder: string;
  panelText: string;
  accent: string;
}

export interface HealthPolicyConfig {
  decayIntervalMinutes: number;
  decayStep: number;
  neglectThresholdHours: number;
  activityBoostStep: number;
  waterBoostStep: number;
}

export interface AppPersistedState {
  schemaVersion: number;
  user: User;
  roots: CorePurposeRoot[];
  trunkSegments: SkillTrunkSegment[];
  projects: ProjectBranch[];
  stages: ProjectStageLeaf[];
  achievements: AchievementData[];
  activeBackground: string;
  activeTreeTheme: string;
  treeSpecies: TreeSpecies;
  treeHealth: TreeHealthState;
  isOnboardingComplete: boolean;
  passionTestResult: PassionTestResult | null;
  consent: DataConsentSettings;
  privacy: PrivacySettings;
}

// Backward compatible aliases for existing components.
export type RootData = CorePurposeRoot;
export type ExperienceArea = SkillTrunkSegment;
export type ProjectData = ProjectBranch;
export type TaskData = ProjectStageLeaf;
