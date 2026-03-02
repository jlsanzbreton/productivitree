import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDefaultPersistedState, loadPersistedState } from '../../utils/persistence.js';

test('loadPersistedState returns defaults when localStorage is unavailable', () => {
  const defaults = buildDefaultPersistedState({
    schemaVersion: 2,
    user: { id: 'u1' },
    roots: [],
    trunkSegments: [],
    projects: [],
    stages: [],
    achievements: [],
    activeBackground: 'forest_glow',
    activeTreeTheme: 'spring',
    treeHealth: { value: 70, lastDecayAt: '', lastWateredAt: null, lastMeaningfulActivityAt: '' },
    isOnboardingComplete: false,
    passionTestResult: null,
    consent: { aiReflectionConsent: false, acceptedAt: null },
    privacy: { localOnlyMode: true, analyticsEnabled: false },
  });
  const loaded = loadPersistedState(defaults);
  assert.equal(loaded.schemaVersion, 2);
  assert.equal(loaded.activeTreeTheme, 'spring');
});
