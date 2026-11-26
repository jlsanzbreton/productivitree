import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProjectSummaries, countByStatus, summarizeProject } from '../../utils/projectSummary.js';

const project = (id, overrides = {}) => ({
  id,
  userId: 'u1',
  title: `Project ${id}`,
  description: '',
  priorityLevel: 3,
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const stage = (id, projectId, status, lastActivityAt = '2026-01-02T00:00:00.000Z') => ({
  id,
  userId: 'u1',
  projectId,
  title: `Stage ${id}`,
  description: '',
  status,
  priority: 3,
  createdAt: '2026-01-01T00:00:00.000Z',
  lastActivityAt,
});

test('summarizeProject computes progress, attention and worst health', () => {
  const summary = summarizeProject(project('p1'), [
    stage('s1', 'p1', 'completed'),
    stage('s2', 'p1', 'needs_attention', '2026-02-01T00:00:00.000Z'),
    stage('s3', 'p1', 'neglected'),
    stage('s4', 'p1', 'healthy'),
    stage('x', 'other', 'neglected'),
  ]);
  assert.equal(summary.totalStages, 4);
  assert.equal(summary.completedStages, 1);
  assert.equal(summary.attentionStages, 2);
  assert.equal(summary.progress, 25);
  assert.equal(summary.health, 'neglected');
  assert.equal(summary.lastActivityAt, '2026-02-01T00:00:00.000Z');
});

test('summarizeProject marks projects without stages as empty', () => {
  const summary = summarizeProject(project('p1'), []);
  assert.equal(summary.health, 'empty');
  assert.equal(summary.progress, 0);
});

test('a neglected stage that is completed does not flag the project', () => {
  const summary = summarizeProject(project('p1'), [stage('s1', 'p1', 'completed')]);
  assert.equal(summary.health, 'healthy');
  assert.equal(summary.progress, 100);
});

test('countByStatus and buildProjectSummaries filter and sort by priority', () => {
  const projects = [
    project('a', { priorityLevel: 1 }),
    project('b', { priorityLevel: 5, status: 'paused' }),
    project('c', { priorityLevel: 4 }),
    project('d', { status: 'completed' }),
  ];
  assert.deepEqual(countByStatus(projects), { all: 4, active: 2, paused: 1, completed: 1 });
  assert.deepEqual(
    buildProjectSummaries(projects, [], 'all').map((s) => s.project.id),
    ['b', 'c', 'd', 'a'],
  );
  assert.deepEqual(
    buildProjectSummaries(projects, [], 'active').map((s) => s.project.id),
    ['c', 'a'],
  );
});
