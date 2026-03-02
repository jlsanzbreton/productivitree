import {
  BackgroundTheme,
  HealthPolicyConfig,
  LeafStatus,
  OnboardingStep,
  TreeSpecies,
  TreeHealthState,
  TreeTheme,
  User,
  VisualTokens,
} from './types';

export const APP_SCHEMA_VERSION = 2;
export const DEFAULT_USER_ID = 'default-user';
export const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';

export const STORAGE_KEYS = {
  consolidatedState: 'productivitree-state',
  schemaVersion: 'productivitree-schema-version',
  legacyUser: 'productivitree-user',
  legacyRoots: 'productivitree-roots',
  legacyTasks: 'productivitree-tasks',
  legacyBackground: 'productivitree-background',
  legacyTreeTheme: 'productivitree-treeTheme',
  legacyTreeHealth: 'productivitree-health',
  legacyOnboarding: 'productivitree-onboardingComplete',
} as const;

export const healthPolicy: HealthPolicyConfig = {
  decayIntervalMinutes: 60,
  decayStep: 2,
  neglectThresholdHours: 48,
  activityBoostStep: 4,
  waterBoostStep: 10,
};

export const defaultHealthState = (): TreeHealthState => {
  const now = new Date().toISOString();
  return {
    value: 72,
    lastDecayAt: now,
    lastWateredAt: null,
    lastMeaningfulActivityAt: now,
  };
};

export const defaultUser = (): User => ({
  id: DEFAULT_USER_ID,
  passionTestCompleted: false,
  treeTheme: 'spring',
  backgroundSetting: 'forest_glow',
  createdAt: new Date().toISOString(),
});

export const leafColors: Record<LeafStatus, { fill: string; glow: string }> = {
  [LeafStatus.Healthy]: { fill: '#36b37e', glow: 'rgba(54,179,126,0.35)' },
  [LeafStatus.NeedsAttention]: { fill: '#f4b740', glow: 'rgba(244,183,64,0.35)' },
  [LeafStatus.Neglected]: { fill: '#d2b55b', glow: 'rgba(210,181,91,0.25)' },
  [LeafStatus.InProgress]: { fill: '#4ea4ff', glow: 'rgba(78,164,255,0.35)' },
  [LeafStatus.Completed]: { fill: '#8e98a7', glow: 'rgba(142,152,167,0.25)' },
};

export const treeThemes: Record<string, TreeTheme> = {
  spring: {
    name: 'Spring Pulse',
    branchColor: '#8B5E3C',
    trunkColor: '#6B4423',
    rootColor: '#7A2A2A',
    leafHealthy: '#36b37e',
    leafWarning: '#f4b740',
    leafNeglected: '#d2b55b',
  },
  cedar: {
    name: 'Cedar Focus',
    branchColor: '#7B5A3D',
    trunkColor: '#5A3F2A',
    rootColor: '#5E2626',
    leafHealthy: '#2d9b68',
    leafWarning: '#e8a822',
    leafNeglected: '#c9ad52',
  },
  dawn: {
    name: 'Dawn Orchard',
    branchColor: '#7A5138',
    trunkColor: '#5D3C29',
    rootColor: '#6C2D2D',
    leafHealthy: '#4abf89',
    leafWarning: '#f2c057',
    leafNeglected: '#d8bf71',
  },
};

export const treeSpeciesOptions: Array<{ key: TreeSpecies; name: string; description: string }> = [
  {
    key: 'oak',
    name: 'Oak',
    description: 'Robust canopy with dense clustered leaves.',
  },
  {
    key: 'fir',
    name: 'Fir',
    description: 'Straight trunk, layered branches, neon needles.',
  },
  {
    key: 'cherry',
    name: 'Cherry',
    description: 'Angular wide branches with vivid blossom leaves.',
  },
];

export const backgroundThemes: Record<string, BackgroundTheme> = {
  forest_glow: {
    name: 'Forest Glow',
    backgroundGradient: 'radial-gradient(circle at 20% 10%, #2f7f6f 0%, #152734 35%, #0f141c 100%)',
    textColor: 'text-emerald-100',
  },
  horizon_mist: {
    name: 'Horizon Mist',
    backgroundGradient: 'linear-gradient(180deg, #1f3454 0%, #1c2336 35%, #111827 100%)',
    textColor: 'text-sky-100',
  },
  sandstone_evening: {
    name: 'Sandstone Evening',
    backgroundGradient: 'linear-gradient(180deg, #53393c 0%, #2f2834 45%, #181924 100%)',
    textColor: 'text-rose-100',
  },
};

export const visualTokens: VisualTokens = {
  panelSurface: 'rgba(16, 22, 32, 0.74)',
  panelBorder: 'rgba(142, 183, 146, 0.35)',
  panelText: '#e6eef7',
  accent: '#8bdca6',
};

export const ONBOARDING_STEPS_CONFIG: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Productivitree',
    description: 'Your work map grows from purpose to execution. Let us set your foundations.',
  },
  {
    id: 'passion_test',
    title: 'Discover Core Motivations',
    description: 'Optional AI-guided reflection. You control if answers are sent for analysis.',
  },
  {
    id: 'define_roots',
    title: 'Define Roots',
    description: 'Capture the core values and purposes that anchor your work.',
  },
  {
    id: 'trunk_setup',
    title: 'Shape Your Trunk',
    description: 'Capture education, skills, and expertise that support every project.',
  },
  {
    id: 'first_projects',
    title: 'Create Branches',
    description: 'Add your current projects as branches with priority and status.',
  },
  {
    id: 'tree_customization',
    title: 'Select Your Visual Direction',
    description: 'Pick background and tree style tuned for focus and calm execution.',
  },
  {
    id: 'done',
    title: 'Grow',
    description: 'Your tree is ready. Keep leaves healthy with steady attention.',
  },
];

export const TESTER_FEEDBACK_URL =
  'https://github.com/jlsanzbreton/productivitree/issues/new?title=Beta%20Feedback%20for%20Productivitree&body=What%20worked%3F%0A%0AWhat%20blocked%20you%3F%0A%0AAny%20visual%20or%20flow%20issues%3F';
