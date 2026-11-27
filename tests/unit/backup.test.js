import test from 'node:test';
import assert from 'node:assert/strict';
import { BACKUP_FORMAT, backupFileName, buildBackupPayload, parseBackup, summarizeBackup } from '../../utils/backup.js';

const sampleState = () => ({
  schemaVersion: 2,
  user: { id: 'u1', name: 'Jose' },
  roots: [{ id: 'r1' }],
  trunkSegments: [],
  projects: [{ id: 'p1' }, { id: 'p2' }],
  stages: [{ id: 's1' }],
  achievements: [],
});

test('buildBackupPayload and parseBackup round-trip state and local tables', () => {
  const now = new Date('2026-11-26T21:00:00Z');
  const payload = buildBackupPayload(sampleState(), { passionDrafts: [{ id: 'd1', userId: 'u1' }] }, now);
  assert.equal(payload.format, BACKUP_FORMAT);
  const parsed = parseBackup(JSON.stringify(payload));
  assert.equal(parsed.exportedAt, now.toISOString());
  assert.deepEqual(parsed.data, sampleState());
  assert.deepEqual(parsed.localDb.passionDrafts, [{ id: 'd1', userId: 'u1' }]);
  assert.deepEqual(parsed.localDb.passionAnalysisResults, []);
  assert.equal(parsed.hasLocalDb, true);
  assert.deepEqual(summarizeBackup(parsed), { exportedAt: now.toISOString(), projects: 2, stages: 1, roots: 1 });
});

test('parseBackup accepts the older clipboard export without local tables', () => {
  const parsed = parseBackup(JSON.stringify({ exportedAt: '2026-01-01T00:00:00Z', data: sampleState() }));
  assert.equal(parsed.hasLocalDb, false);
  assert.equal(parsed.data.projects.length, 2);
});

test('parseBackup rejects invalid or foreign files with a readable message', () => {
  assert.throws(() => parseBackup('not json'), /not valid JSON/);
  assert.throws(() => parseBackup(JSON.stringify({ hello: 'world' })), /does not look like/);
  assert.throws(() => parseBackup(JSON.stringify({ format: 'other', data: sampleState() })), /does not look like/);
  assert.throws(
    () => parseBackup(JSON.stringify({ format: BACKUP_FORMAT, formatVersion: 99, data: sampleState() })),
    /newer version/
  );
  const { projects: _projects, ...withoutProjects } = sampleState();
  assert.throws(() => parseBackup(JSON.stringify({ data: withoutProjects })), /missing data: projects/);
});

test('backupFileName uses a sortable local timestamp', () => {
  assert.equal(backupFileName(new Date(2026, 10, 26, 9, 5)), 'productivitree-backup-2026-11-26_0905.json');
});
