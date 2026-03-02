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

export const goldenPalette = {
  obsidian: '#0B0C0E',
  carbon: '#101113',
  charcoal: '#141517',
  oldGold: '#B8842A',
  mediumGold: '#D97A00',
  brightGold: '#FEEA96',
  luminousGold: '#FEE688',
  champagne: '#FEEDA0',
} as const;

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
  [LeafStatus.Healthy]: { fill: '#FEEA96', glow: 'rgba(254, 234, 150, 0.62)' },
  [LeafStatus.NeedsAttention]: { fill: '#E6A218', glow: 'rgba(230, 162, 24, 0.5)' },
  [LeafStatus.Neglected]: { fill: '#A59765', glow: 'rgba(165, 151, 101, 0.32)' },
  [LeafStatus.InProgress]: { fill: '#F9D967', glow: 'rgba(249, 217, 103, 0.55)' },
  [LeafStatus.Completed]: { fill: '#FEEDA0', glow: 'rgba(254, 237, 160, 0.68)' },
};

export const treeThemes: Record<string, TreeTheme> = {
  spring: {
    name: 'Aurum Prime',
    branchColor: '#DFA42F',
    trunkColor: '#D97A00',
    rootColor: '#C06E00',
    leafHealthy: '#FEEA96',
    leafWarning: '#E6A218',
    leafNeglected: '#A59765',
  },
  cedar: {
    name: 'Old Gold',
    branchColor: '#CF9528',
    trunkColor: '#B8842A',
    rootColor: '#9A650F',
    leafHealthy: '#F9D967',
    leafWarning: '#DD7F00',
    leafNeglected: '#8A7649',
  },
  dawn: {
    name: 'Champagne Glow',
    branchColor: '#E6A218',
    trunkColor: '#D87A00',
    rootColor: '#AF6A10',
    leafHealthy: '#FEEDA0',
    leafWarning: '#E98500',
    leafNeglected: '#A59765',
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
    name: 'Obsidian Gold',
    backgroundGradient: 'radial-gradient(circle at 50% 0%, #1A1B1F 0%, #101113 42%, #0B0C0E 100%)',
    textColor: 'text-amber-50',
  },
  horizon_mist: {
    name: 'Carbon Silk',
    backgroundGradient: 'linear-gradient(180deg, #17181B 0%, #111214 38%, #090A0C 100%)',
    textColor: 'text-amber-50',
  },
  sandstone_evening: {
    name: 'Noir Alloy',
    backgroundGradient: 'linear-gradient(180deg, #1C1A16 0%, #12110F 45%, #070707 100%)',
    textColor: 'text-amber-50',
  },
};

export const visualTokens: VisualTokens = {
  panelSurface: 'rgba(16, 17, 19, 0.82)',
  panelBorder: 'rgba(184, 132, 42, 0.36)',
  panelText: '#FCEFC6',
  accent: '#F9D967',
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
