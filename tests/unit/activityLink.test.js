import test from 'node:test';
import assert from 'node:assert/strict';
import { applyActivity, buildActivityLink, fillUrlTemplate, isSafeOpenUrl, parseActivityParams } from '../../utils/activityLink.js';

let n = 0;
const newId = (p) => `${p}-${++n}`;
const now = new Date('2026-11-27T10:00:00Z');
const projects = [{ id: 'p1', title: 'Storytelling' }];
const stages = [
  { id: 's1', projectId: 'p1', title: 'Cuento 7', status: 'healthy', lastActivityAt: '2026-11-20T00:00:00Z' },
  { id: 's2', projectId: 'p1', title: 'Cuento 4', status: 'completed', lastActivityAt: '2026-11-01T00:00:00Z' },
];

test('parses activity links', () => {
  assert.equal(parseActivityParams('?foo=1'), null);
  assert.ok(parseActivityParams('?actividad=1').error);
  assert.deepEqual(parseActivityParams('?actividad=1&rama=Storytelling&tarea=Cuento%207&app=WL'), {
    branch: 'Storytelling',
    task: 'Cuento 7',
    app: 'WL',
    note: '',
    url: '',
  });
});

test('records activity on an existing task, matching names loosely', () => {
  const result = applyActivity({ projects, stages, userId: 'u', now, newId }, { branch: 'storytelling', task: 'cuento 7', app: 'WL', note: '', url: '' });
  assert.equal(result.ok, true);
  assert.equal(result.created, false);
  const s1 = result.stages.find((s) => s.id === 's1');
  assert.equal(s1.lastActivityAt, now.toISOString());
  assert.equal(s1.activity[0].source, 'WL');
});

test('creates the task when the branch exists but the task does not', () => {
  const result = applyActivity({ projects, stages, userId: 'u', now, newId }, { branch: 'Storytelling', task: 'Cuento 8', app: '', note: '', url: '' });
  assert.equal(result.created, true);
  assert.equal(result.stages.length, 3);
});

test('refuses unknown branches', () => {
  const result = applyActivity({ projects, stages, userId: 'u', now, newId }, { branch: 'Nope', task: '', app: '', note: '', url: '' });
  assert.equal(result.ok, false);
});

test('builds links and fills URL templates safely', () => {
  assert.equal(buildActivityLink('https://app.test/', { app: 'WL' }), 'https://app.test/?actividad=1&rama={rama}&tarea={tarea}&app=WL');
  assert.equal(fillUrlTemplate('bear://x-callback-url/search?tag={etiqueta}', { branch: 'Report writing' }), 'bear://x-callback-url/search?tag=report-writing');
  assert.equal(isSafeOpenUrl('javascript:alert(1)'), false);
  assert.equal(isSafeOpenUrl('bear://x'), true);
  assert.equal(isSafeOpenUrl('https://a.b'), true);
});
