import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTreeData } from '../../utils/treeBuilder.js';

test('buildTreeData creates trunk hub and branch/leaf hierarchy', () => {
  const tree = buildTreeData({
    roots: [{ id: 'r1', title: 'Purpose', description: 'desc', userId: 'u1', strengthLevel: 8, createdAt: '2026-01-01' }],
    trunkSegments: [
      {
        id: 't1',
        title: 'Product',
        description: 'desc',
        userId: 'u1',
        proficiencyLevel: 7,
        yearsOfExperience: 3,
        createdAt: '2026-01-01',
      },
    ],
    projects: [
      {
        id: 'p1',
        title: 'Main Project',
        description: 'desc',
        userId: 'u1',
        priorityLevel: 3,
        status: 'active',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ],
    stages: [
      {
        id: 's1',
        projectId: 'p1',
        title: 'Stage',
        description: 'desc',
        userId: 'u1',
        status: 'healthy',
        priority: 2,
        createdAt: '2026-01-01',
        lastActivityAt: '2026-01-01',
      },
    ],
    achievements: [],
  });

  assert.equal(tree.type, 'rootNode');
  const trunkHub = tree.children.find((node) => node.id === 'trunk-hub');
  assert.ok(trunkHub);
  const branch = trunkHub.children.find((node) => node.id === 'p1');
  assert.ok(branch);
  assert.equal(branch.children[0].type, 'leaf');
});
