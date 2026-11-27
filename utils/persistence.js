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
};

const parseJSON = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
};

const hasWindow = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const buildDefaultPersistedState = (defaults) => ({
  schemaVersion: defaults.schemaVersion,
  user: defaults.user,
  roots: defaults.roots,
  trunkSegments: defaults.trunkSegments,
  projects: defaults.projects,
  stages: defaults.stages,
  achievements: defaults.achievements,
  activeBackground: defaults.activeBackground,
  activeTreeTheme: defaults.activeTreeTheme,
  treeSpecies: defaults.treeSpecies || 'oak',
  treeHealth: defaults.treeHealth,
  isOnboardingComplete: defaults.isOnboardingComplete,
  passionTestResult: defaults.passionTestResult,
  consent: defaults.consent,
  privacy: defaults.privacy,
  connections: defaults.connections || [],
  history: defaults.history || [],
});

export const migrateLegacyStorage = (defaults) => {
  if (!hasWindow()) {
    return buildDefaultPersistedState(defaults);
  }

  const legacyUser = parseJSON(localStorage.getItem(STORAGE_KEYS.legacyUser), null);
  const legacyRoots = parseJSON(localStorage.getItem(STORAGE_KEYS.legacyRoots), []);
  const legacyTasks = parseJSON(localStorage.getItem(STORAGE_KEYS.legacyTasks), []);
  const legacyBackground = localStorage.getItem(STORAGE_KEYS.legacyBackground);
  const legacyTreeTheme = localStorage.getItem(STORAGE_KEYS.legacyTreeTheme);
  const legacyHealth = Number(localStorage.getItem(STORAGE_KEYS.legacyTreeHealth));
  const legacyOnboarding = localStorage.getItem(STORAGE_KEYS.legacyOnboarding) === 'true';

  const migrated = {
    ...buildDefaultPersistedState(defaults),
    user: legacyUser || defaults.user,
    roots: Array.isArray(legacyRoots) ? legacyRoots : defaults.roots,
    stages: Array.isArray(legacyTasks)
      ? legacyTasks.map((task) => ({
          ...task,
          projectId: task.projectId || 'general-project',
          userId: task.userId || defaults.user.id,
        }))
      : defaults.stages,
    activeBackground: legacyBackground || defaults.activeBackground,
    activeTreeTheme: legacyTreeTheme || defaults.activeTreeTheme,
    isOnboardingComplete: legacyOnboarding || defaults.isOnboardingComplete,
    treeHealth: Number.isFinite(legacyHealth)
      ? { ...defaults.treeHealth, value: legacyHealth }
      : defaults.treeHealth,
  };

  if (migrated.stages.length > 0 && migrated.projects.length === 0) {
    migrated.projects = [
      {
        id: 'general-project',
        userId: defaults.user.id,
        title: 'General Work',
        description: 'Migrated tasks from legacy Productivitree data.',
        priorityLevel: 3,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  return migrated;
};

export const loadPersistedState = (defaults) => {
  if (!hasWindow()) {
    return buildDefaultPersistedState(defaults);
  }

  const rawConsolidated = localStorage.getItem(STORAGE_KEYS.consolidatedState);
  const parsedConsolidated = parseJSON(rawConsolidated, null);
  if (parsedConsolidated && typeof parsedConsolidated === 'object') {
    return {
      ...buildDefaultPersistedState(defaults),
      ...parsedConsolidated,
      schemaVersion: defaults.schemaVersion,
    };
  }

  return migrateLegacyStorage(defaults);
};

let persistenceSuspended = false;
let persistenceMirror = null;

/**
 * Extra place to keep every save, besides localStorage. The Mac app uses it to write
 * the tree to a file. `mirror(json)` is called after each save; `mirror.flush()`, when
 * present, resolves once pending writes are done.
 */
export const setPersistenceMirror = (mirror) => {
  persistenceMirror = mirror;
};

/** Waits until the mirror (if any) has written the latest save. */
export const flushPersistence = async () => {
  if (persistenceMirror && typeof persistenceMirror.flush === 'function') await persistenceMirror.flush();
};

// Stops regular autosaves, e.g. while a backup restore is about to reload the page.
export const suspendPersistence = () => {
  persistenceSuspended = true;
};

export const savePersistedState = (state, options = {}) => {
  if (!hasWindow()) return;
  if (persistenceSuspended && !options.force) return;
  localStorage.setItem(STORAGE_KEYS.schemaVersion, String(state.schemaVersion));
  const json = JSON.stringify(state);
  localStorage.setItem(STORAGE_KEYS.consolidatedState, json);
  if (persistenceMirror) persistenceMirror(json);
};

export const clearPersistedData = () => {
  if (!hasWindow()) return;
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
};

export const exportPersistedState = (state) =>
  JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      data: state,
    },
    null,
    2
  );
