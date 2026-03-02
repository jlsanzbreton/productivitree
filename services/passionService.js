import { localDb } from './localDb.js';

const createId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const buildPayloadHash = (answers) => {
  const input = answers.join('|');
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return String(hash);
};

const isOfflineError = (status, error) => {
  if (status === 404) return true;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  if (error instanceof TypeError) return true;
  return false;
};

export const saveDraft = async (userId, answers, consent) => {
  const now = new Date().toISOString();
  const existing = await localDb.passionDrafts.where('userId').equals(userId).reverse().first();
  if (existing) {
    await localDb.passionDrafts.update(existing.id, {
      answers,
      updatedAt: now,
      consentSnapshot: consent,
      version: (existing.version || 0) + 1,
    });
    return existing.id;
  }

  const draftId = createId('draft');
  await localDb.passionDrafts.put({
    id: draftId,
    userId,
    answers,
    updatedAt: now,
    consentSnapshot: consent,
    version: 1,
  });
  return draftId;
};

export const loadLatestDraft = async (userId) => {
  const drafts = await localDb.passionDrafts.where('userId').equals(userId).toArray();
  if (drafts.length === 0) return null;
  return drafts.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0];
};

export const getAttemptHistory = async (draftId) => {
  const attempts = await localDb.passionAnalysisAttempts.where('draftId').equals(draftId).toArray();
  return attempts.sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1));
};

export const getLatestResult = async (draftId) => {
  const results = await localDb.passionAnalysisResults.where('draftId').equals(draftId).toArray();
  if (results.length === 0) return null;
  return results.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0].result;
};

const updateAttempt = async (attemptId, patch) => {
  await localDb.passionAnalysisAttempts.update(attemptId, patch);
};

export const analyzeDraftNow = async (draftId) => {
  const draft = await localDb.passionDrafts.get(draftId);
  if (!draft) {
    return { status: 'failed', draftId, error: 'Draft not found', attemptStatus: 'failed_remote' };
  }

  const requestedAt = new Date().toISOString();
  const attemptId = createId('attempt');
  await localDb.passionAnalysisAttempts.put({
    id: attemptId,
    draftId,
    provider: 'gemini',
    status: 'running',
    requestedAt,
    payloadHash: buildPayloadHash(draft.answers),
  });

  try {
    const response = await fetch('/.netlify/functions/passion-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: draft.answers,
        userId: draft.userId,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const message = `Passion test request failed with status ${status}`;
      const failureStatus = isOfflineError(status) ? 'failed_offline' : 'failed_remote';
      await updateAttempt(attemptId, {
        status: failureStatus,
        errorCode: String(status),
        errorMessage: message,
        finishedAt: new Date().toISOString(),
      });
      return { status: 'failed', draftId, error: message, attemptStatus: failureStatus };
    }

    const result = await response.json();
    await localDb.passionAnalysisResults.put({
      id: createId('result'),
      draftId,
      provider: 'gemini',
      result,
      createdAt: new Date().toISOString(),
    });
    await updateAttempt(attemptId, {
      status: 'succeeded',
      finishedAt: new Date().toISOString(),
    });
    return { status: 'succeeded', draftId, result, attemptStatus: 'succeeded' };
  } catch (error) {
    const failureStatus = isOfflineError(undefined, error) ? 'failed_offline' : 'failed_remote';
    const message = error instanceof Error ? error.message : 'Unknown analysis error';
    await updateAttempt(attemptId, {
      status: failureStatus,
      errorCode: 'network',
      errorMessage: message,
      finishedAt: new Date().toISOString(),
    });
    return { status: 'failed', draftId, error: message, attemptStatus: failureStatus };
  }
};
