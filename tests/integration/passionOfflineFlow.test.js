import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { resetLocalDbForTests } from '../../services/localDb.js';
import { analyzeDraftNow, getAttemptHistory, loadLatestDraft, saveDraft } from '../../services/passionService.js';

test.beforeEach(async () => {
  await resetLocalDbForTests();
});

test('offline analysis failure keeps draft reusable for manual retry', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 404 });

  const initialAnswers = ['answer 1', 'answer 2'];
  const draftId = await saveDraft('u1', initialAnswers, true);
  const analysis = await analyzeDraftNow(draftId);
  const draftAfterFailure = await loadLatestDraft('u1');
  const history = await getAttemptHistory(draftId);

  assert.equal(analysis.status, 'failed');
  assert.equal(analysis.attemptStatus, 'failed_offline');
  assert.equal(history.length, 1);
  assert.equal(history[0].status, 'failed_offline');
  assert.deepEqual(draftAfterFailure.answers.slice(0, 2), initialAnswers);

  globalThis.fetch = originalFetch;
});
