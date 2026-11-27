import test from 'node:test';
import assert from 'node:assert/strict';
import { exportTreeJson, parseTreeJson } from '../../utils/treeJson.js';

const now = new Date('2026-11-27T10:00:00Z');
const sample = {
  purpose: 'Safer future',
  passions: ['Nature', { name: 'Root problem', description: 'why' }],
  experience: ['Mechanical Engineering'],
  apps: [{ id: 'wl', name: "Writer's Lens", kind: 'webapp', openUrl: 'https://example.com/?doc={tarea}', tracking: 'link' }],
  branches: [
    {
      name: 'Storytelling',
      priority: 4,
      app: 'wl',
      passion: 'Root problem',
      leaves: [{ name: 'Cuento 7', lastActivity: 2 }, { name: 'Cuento 4', lastActivity: '2026-10-01', done: true }],
      fruits: [{ name: 'Absurd Tales', harvested: true }],
    },
    { name: 'Retreat', status: 'paused', side: 'center' },
  ],
};

test('parses a tree JSON into app entities', () => {
  const result = parseTreeJson(JSON.stringify(sample), { userId: 'u1', now });
  assert.equal(result.ok, true);
  const { data, summary } = result;
  assert.deepEqual(summary, { branches: 2, leaves: 2, fruits: 1, passions: 2, experience: 1, apps: 1 });
  const story = data.projects.find((p) => p.title === 'Storytelling');
  assert.equal(story.priorityLevel, 4);
  assert.equal(story.appId, data.connections[0].id);
  assert.equal(story.rootId, data.roots[1].id);
  const cuento7 = data.stages.find((s) => s.title === 'Cuento 7');
  assert.equal(cuento7.lastActivityAt, '2026-11-25T10:00:00.000Z');
  assert.equal(data.stages.find((s) => s.title === 'Cuento 4').status, 'completed');
  assert.equal(data.achievements[0].harvested, true);
  assert.equal(data.projects.find((p) => p.title === 'Retreat').side, 'center');
});

test('reports clear errors and warnings', () => {
  assert.equal(parseTreeJson('{nope').ok, false);
  const missing = parseTreeJson({ branches: [{ leaves: [] }] });
  assert.equal(missing.ok, false);
  assert.match(missing.errors[0], /falta "name"/);
  const backup = parseTreeJson({ exportedAt: 'x', data: { schemaVersion: 2 } });
  assert.match(backup.errors[0], /copia de seguridad/);
  const warn = parseTreeJson({ branches: [{ name: 'A', app: 'ghost' }] }, { now });
  assert.equal(warn.ok, true);
  assert.match(warn.warnings[0], /ghost/);
});

test('export and re-import keep the tree', () => {
  const first = parseTreeJson(sample, { userId: 'u1', now });
  const json = exportTreeJson({ ...first.data });
  const again = parseTreeJson(json, { userId: 'u1', now });
  assert.equal(again.ok, true);
  assert.deepEqual(again.summary, first.summary);
  assert.equal(again.data.purpose, 'Safer future');
  assert.equal(again.data.projects[0].appId, again.data.connections[0].id);
});

test('twigs (leaves inside a leaf) and grownFrom survive a round trip', () => {
  const doc = {
    branches: [
      { name: 'Storytelling', leaves: [{ name: 'Trilogía', lastActivity: 1, leaves: [{ name: 'Libro 1', lastActivity: 2 }, 'Libro 2'] }] },
      { name: 'Ensayos', grownFrom: 'Storytelling' },
      { name: 'Huérfana', grownFrom: 'No existe' },
    ],
  };
  const result = parseTreeJson(JSON.stringify(doc), { userId: 'u1', now });
  assert.equal(result.ok, true);
  const twig = result.data.stages.find((s) => s.title === 'Trilogía');
  const kids = result.data.stages.filter((s) => s.parentTaskId === twig.id).map((s) => s.title);
  assert.deepEqual(kids, ['Libro 1', 'Libro 2']);
  const story = result.data.projects.find((p) => p.title === 'Storytelling');
  assert.equal(result.data.projects.find((p) => p.title === 'Ensayos').grownFrom, story.id);
  assert.equal(result.data.projects.find((p) => p.title === 'Huérfana').grownFrom, undefined);
  assert.ok(result.warnings.some((w) => w.includes('No existe')));

  const again = JSON.parse(exportTreeJson({ ...result.data, stages: result.data.stages }));
  assert.equal(again.branches[0].leaves.length, 1);
  assert.deepEqual(again.branches[0].leaves[0].leaves.map((l) => l.name), ['Libro 1', 'Libro 2']);
  assert.equal(again.branches[1].grownFrom, 'Storytelling');
});
