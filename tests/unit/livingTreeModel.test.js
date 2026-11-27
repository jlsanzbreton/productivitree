import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLivingTreeModel, placeBranches, splitTwoLines } from '../../utils/livingTreeModel.js';

const now = new Date('2026-11-27T00:00:00Z');
const project = (id, createdAt, extra = {}) => ({ id, title: id, priorityLevel: 3, status: 'active', createdAt, ...extra });

test('branches alternate sides, older ones lower on the trunk', () => {
  const placement = placeBranches([project('a', '2026-01-01'), project('b', '2026-02-01'), project('c', '2026-03-01'), project('d', '2026-04-01')]);
  assert.equal(placement.get('a').side, 1);
  assert.equal(placement.get('b').side, -1);
  assert.ok(placement.get('a').t < placement.get('c').t);
  const forced = placeBranches([project('x', '2026-01-01', { side: 'center' })]);
  assert.equal(forced.get('x').side, 0);
});

test('model carries leaf ages and only real fruits', () => {
  const model = buildLivingTreeModel(
    {
      purpose: 'Safer future',
      roots: [{ title: 'Nature' }],
      trunkSegments: [{ title: 'Mechanical Engineering' }],
      projects: [project('p', '2026-11-01')],
      stages: [{ id: 's', projectId: 'p', title: 'T', status: 'healthy', lastActivityAt: '2026-11-25T00:00:00Z' }],
      achievements: [
        { id: 'f', projectId: 'p', title: 'Book', harvested: true, fromTaskId: 's' },
        { id: 'm', projectId: 'p', title: 'Milestone reached', type: 'milestone' },
      ],
    },
    now
  );
  assert.equal(model.branches[0].tasks[0].d, 2);
  assert.deepEqual(model.branches[0].fruits.map((f) => f.id), ['f']);
  assert.equal(model.branches[0].fruits[0].from, 's', 'a fruit remembers its leaf so it hangs next to it');
  assert.deepEqual(model.trunk[0], ['Mechanical', 'Engineering']);
});

test('splits long trunk labels in two lines', () => {
  assert.deepEqual(splitTwoLines('Geography & History'), ['Geography', '& History']);
  assert.deepEqual(splitTwoLines('Coaching'), ['Coaching', '']);
});

test('a branch grown from a twig comes out of the trunk next to its original branch', () => {
  const placement = placeBranches([
    project('a', '2026-01-01'),
    project('b', '2026-02-01'),
    project('c', '2026-03-01'),
    project('twig', '2026-11-27', { grownFrom: 'a' }),
  ]);
  assert.equal(placement.get('twig').side, placement.get('a').side);
  assert.ok(placement.get('twig').t > placement.get('a').t && placement.get('twig').t - placement.get("a").t < 0.08);
  // the other branches keep their places
  const without = placeBranches([project('a', '2026-01-01'), project('b', '2026-02-01'), project('c', '2026-03-01')]);
  assert.deepEqual(placement.get('c'), without.get('c'));
});

test('leaves of a twig point to their parent leaf, one level deep', () => {
  const stages = [
    { id: 'tw', projectId: 'p', title: 'Twig', lastActivityAt: '2026-11-25T00:00:00Z' },
    { id: 'k1', projectId: 'p', title: 'Kid', parentTaskId: 'tw', lastActivityAt: '2026-11-25T00:00:00Z' },
    { id: 'k2', projectId: 'p', title: 'Grandkid', parentTaskId: 'k1', lastActivityAt: '2026-11-25T00:00:00Z' },
    { id: 'k3', projectId: 'p', title: 'Orphan', parentTaskId: 'gone', lastActivityAt: '2026-11-25T00:00:00Z' },
  ];
  const model = buildLivingTreeModel({ projects: [project('p', '2026-11-01')], stages }, now);
  const par = Object.fromEntries(model.branches[0].tasks.map((t) => [t.id, t.par || '']));
  assert.deepEqual(par, { tw: '', k1: 'tw', k2: '', k3: '' });
});
