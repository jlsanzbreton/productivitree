import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { resetLocalDbForTests } from '../../services/localDb.js';
import {
  analyzeDraftNow,
  getAttemptHistory,
  getLatestResult,
  loadLatestDraft,
  saveDraft,
} from '../../services/passionService.js';

test.beforeEach(async () => {
  await resetLocalDbForTests();
});

test('saveDraft and loadLatestDraft persist local answers', async () => {
  const draftId = await saveDraft('u1', ['a1', 'a2'], true);
  const draft = await loadLatestDraft('u1');
  assert.equal(draft.id, draftId);
  assert.deepEqual(draft.answers, ['a1', 'a2']);
});

test('analyzeDraftNow stores failed_offline when endpoint returns 404', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 404 });

  const draftId = await saveDraft('u1', ['x'], true);
  const response = await analyzeDraftNow(draftId);
  const history = await getAttemptHistory(draftId);

  assert.equal(response.status, 'failed');
  assert.equal(response.attemptStatus, 'failed_offline');
  assert.equal(history[0].status, 'failed_offline');

  globalThis.fetch = originalFetch;
});

test('analyzeDraftNow stores result on success', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      passion_categories: ['Creative Work'],
      root_suggestions: [{ title: 'Impact', description: 'Create value', strength: 8 }],
      personalized_insights: 'Keep building.',
    }),
  });

  const draftId = await saveDraft('u1', ['x'], true);
  const response = await analyzeDraftNow(draftId);
  const latestResult = await getLatestResult(draftId);
  const history = await getAttemptHistory(draftId);

  assert.equal(response.status, 'succeeded');
  assert.equal(history[0].status, 'succeeded');
  assert.equal(latestResult.passion_categories[0], 'Creative Work');

  globalThis.fetch = originalFetch;
});
