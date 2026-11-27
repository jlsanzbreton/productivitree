import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTreeJson } from '../../utils/treeJson.js';
import { guideProgress, leftoverExample, snapshotExample } from '../../utils/exampleGuide.js';

const example = {
  purpose: 'Vivir de lo que escribo',
  passions: ['Naturaleza', 'Contar historias'],
  experience: ['Ingeniería'],
  apps: [{ id: 'notas', name: 'Bear', kind: 'bear', openUrl: 'bear://x', tracking: 'manual' }],
  branches: [
    { name: 'Novela', app: 'notas', leaves: [{ name: 'Capítulo 3', lastActivity: 1 }] },
    { name: 'Web', leaves: [{ name: 'Inicio', lastActivity: 2 }] },
  ],
};
const plant = () => {
  const { data } = parseTreeJson(JSON.stringify(example), { userId: 'u', now: new Date('2026-11-27T10:00:00Z') });
  return { state: { ...data }, snap: snapshotExample(data) };
};

test('an untouched example shows no progress and is all leftover', () => {
  const { state, snap } = plant();
  assert.deepEqual(guideProgress(snap, state), { sun: false, roots: false, trunk: false, branch: false });
  const left = leftoverExample(snap, state);
  assert.equal(left.purpose, true);
  assert.equal(left.rootIds.length, 2);
  assert.equal(left.branchIds.length, 2);
  assert.equal(left.appIds.length, 1);
  assert.equal(left.count, 7);
});

test('renamed or new parts count as progress and are kept', () => {
  const { state, snap } = plant();
  const novela = state.projects.find((p) => p.title === 'Novela');
  const next = {
    ...state,
    purpose: 'Safer future',
    roots: [{ ...state.roots[0], title: 'Nature' }, state.roots[1]],
    trunkSegments: [...state.trunkSegments, { id: 'mine', title: 'Geografía' }],
    projects: state.projects.map((p) => (p.id === novela.id ? { ...p, title: 'Storytelling' } : p)),
  };
  assert.deepEqual(guideProgress(snap, next), { sun: true, roots: true, trunk: true, branch: true });
  const left = leftoverExample(snap, next);
  assert.equal(left.purpose, false);
  assert.equal(left.rootIds.length, 1);
  assert.equal(left.trunkIds.length, 1);
  assert.deepEqual(left.branchIds, [state.projects.find((p) => p.title === 'Web').id]);
  assert.deepEqual(left.appIds, [], 'Bear stays: the kept branch still uses it');
});

test('an example branch with a task of your own is kept', () => {
  const { state, snap } = plant();
  const web = state.projects.find((p) => p.title === 'Web');
  const next = { ...state, stages: [...state.stages, { id: 'my-task', projectId: web.id, title: 'Mi tarea' }] };
  assert.equal(leftoverExample(snap, next).branchIds.includes(web.id), false);
});
