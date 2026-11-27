import { localDb } from './localDb.js';
import { buildBackupPayload, parseBackup } from '../utils/backup.js';
import { savePersistedState, suspendPersistence } from '../utils/persistence.js';

const LAST_BACKUP_KEY = 'productivitree-last-backup-at';

const readLocalDbTables = async () => ({
  passionDrafts: await localDb.passionDrafts.toArray(),
  passionAnalysisAttempts: await localDb.passionAnalysisAttempts.toArray(),
  passionAnalysisResults: await localDb.passionAnalysisResults.toArray(),
});

export const createBackupJson = async (state, now = new Date()) => {
  const tables = await readLocalDbTables();
  return JSON.stringify(buildBackupPayload(state, tables, now), null, 2);
};

export const getLastBackupAt = () => {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY);
  } catch (_error) {
    return null;
  }
};

export const markBackupDone = (now = new Date()) => {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, now.toISOString());
  } catch (_error) {
    // Storage unavailable: the backup file itself is what matters.
  }
  return now.toISOString();
};

/**
 * Replaces all local data with the backup's contents. The caller should
 * reload the page afterwards so the app starts from the restored state.
 */
export const restoreBackup = async (backup, schemaVersion) => {
  suspendPersistence();
  await localDb.transaction(
    'rw',
    localDb.passionDrafts,
    localDb.passionAnalysisAttempts,
    localDb.passionAnalysisResults,
    async () => {
      if (backup.hasLocalDb) {
        await localDb.passionDrafts.clear();
        await localDb.passionAnalysisAttempts.clear();
        await localDb.passionAnalysisResults.clear();
        await localDb.passionDrafts.bulkPut(backup.localDb.passionDrafts);
        await localDb.passionAnalysisAttempts.bulkPut(backup.localDb.passionAnalysisAttempts);
        await localDb.passionAnalysisResults.bulkPut(backup.localDb.passionAnalysisResults);
      }
    }
  );
  savePersistedState({ ...backup.data, schemaVersion }, { force: true });
};

export { parseBackup };

/**
 * Asks the browser not to evict local data under storage pressure or
 * inactivity. Returns true, false, or null when the API is unavailable.
 */
export const requestPersistentStorage = async () => {
  if (typeof navigator === 'undefined' || !navigator.storage || typeof navigator.storage.persist !== 'function') {
    return null;
  }
  try {
    if (typeof navigator.storage.persisted === 'function' && (await navigator.storage.persisted())) {
      return true;
    }
    return await navigator.storage.persist();
  } catch (_error) {
    return null;
  }
};
