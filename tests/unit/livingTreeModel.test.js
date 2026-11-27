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
