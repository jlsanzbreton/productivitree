import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { localDb, resetLocalDbForTests } from '../../services/localDb.js';
import { createBackupJson, parseBackup, restoreBackup } from '../../services/backupService.js';

const store = new Map();
globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
};

const state = {
  schemaVersion: 2,
  user: { id: 'u1' },
  roots: [],
  trunkSegments: [],
  projects: [{ id: 'p1', title: 'Cascade Risk Review' }],
  stages: [],
  achievements: [],
};

test('a downloaded backup restores app state and passion drafts', async () => {
  await resetLocalDbForTests();
  await localDb.passionDrafts.put({ id: 'd1', userId: 'u1', answers: ['a'], updatedAt: '2026-11-26' });
  const json = await createBackupJson(state);

  await localDb.passionDrafts.clear();
  await localDb.passionDrafts.put({ id: 'd2', userId: 'u1', answers: ['other'], updatedAt: '2026-11-27' });
  store.clear();

  await restoreBackup(parseBackup(json), 3);

  const saved = JSON.parse(store.get('productivitree-state'));
  assert.equal(saved.projects[0].title, 'Cascade Risk Review');
  assert.equal(saved.schemaVersion, 3);
  const drafts = await localDb.passionDrafts.toArray();
  assert.deepEqual(drafts.map((draft) => draft.id), ['d1']);
});
