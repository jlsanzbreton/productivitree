// Pure helpers for building and validating Productivitree backup files.

export const BACKUP_FORMAT = 'productivitree-backup';
export const BACKUP_FORMAT_VERSION = 1;

const ARRAY_FIELDS = ['roots', 'trunkSegments', 'projects', 'stages', 'achievements'];
const LOCAL_DB_TABLES = ['passionDrafts', 'passionAnalysisAttempts', 'passionAnalysisResults'];

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const buildBackupPayload = (state, localDbTables = {}, now = new Date()) => ({
  format: BACKUP_FORMAT,
  formatVersion: BACKUP_FORMAT_VERSION,
  exportedAt: now.toISOString(),
  data: state,
  localDb: LOCAL_DB_TABLES.reduce((acc, table) => {
    acc[table] = Array.isArray(localDbTables[table]) ? localDbTables[table] : [];
    return acc;
  }, {}),
});

export const backupFileName = (now = new Date()) => {
  const pad = (value) => String(value).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `productivitree-backup-${stamp}.json`;
};

/**
 * Parses a backup file's text. Accepts the current format and the older
 * clipboard export ({ exportedAt, data }). Throws an Error with a readable
 * message when the file is not a usable backup.
 */
export const parseBackup = (text) => {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (_error) {
    throw new Error('The file is not valid JSON.');
  }

  if (!isPlainObject(parsed) || !isPlainObject(parsed.data)) {
    throw new Error('The file does not look like a Productivitree backup.');
  }
  if (parsed.format !== undefined && parsed.format !== BACKUP_FORMAT) {
    throw new Error('The file does not look like a Productivitree backup.');
  }
  if (typeof parsed.formatVersion === 'number' && parsed.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new Error('This backup was made by a newer version of Productivitree.');
  }

  const { data } = parsed;
  const missing = ARRAY_FIELDS.filter((field) => !Array.isArray(data[field]));
  if (missing.length > 0) {
    throw new Error(`The backup is missing data: ${missing.join(', ')}.`);
  }
  if (!isPlainObject(data.user)) {
    throw new Error('The backup is missing data: user.');
  }

  const localDb = LOCAL_DB_TABLES.reduce((acc, table) => {
    const rows = isPlainObject(parsed.localDb) ? parsed.localDb[table] : undefined;
    acc[table] = Array.isArray(rows) ? rows.filter(isPlainObject) : [];
    return acc;
  }, {});

  return {
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : null,
    data,
    localDb,
    hasLocalDb: isPlainObject(parsed.localDb),
  };
};

export const summarizeBackup = (backup) => ({
  exportedAt: backup.exportedAt,
  projects: backup.data.projects.length,
  stages: backup.data.stages.length,
  roots: backup.data.roots.length,
});
