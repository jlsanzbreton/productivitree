import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getBranchVisualState,
  leafCompletionRatio,
  mixColor,
  priorityWidthMultiplier,
} from '../../utils/branchVisuals.js';

const leaves = (statuses) => statuses.map((status) => ({ status }));

test('leafCompletionRatio counts completed leaves', () => {
  assert.equal(leafCompletionRatio([]), 0);
  assert.equal(leafCompletionRatio(leaves(['completed', 'healthy', 'completed', 'neglected'])), 0.5);
});

test('priorityWidthMultiplier keeps priority 3 neutral and clamps out-of-range values', () => {
  assert.equal(priorityWidthMultiplier(3), 1);
  assert.ok(priorityWidthMultiplier(5) > priorityWidthMultiplier(1));
  assert.equal(priorityWidthMultiplier(9), priorityWidthMultiplier(5));
  assert.equal(priorityWidthMultiplier(undefined), 1);
});

test('active branch keeps the species colour and shows leaf progress', () => {
  const visual = getBranchVisualState({
    status: 'active',
    priorityLevel: 3,
    leaves: leaves(['completed', 'healthy']),
    baseColor: '#D9A33A',
  });
  assert.equal(visual.color, '#D9A33A');
  assert.equal(visual.completionRatio, 0.5);
  assert.equal(visual.droop, 0);
});

test('paused branch withers: greyer, droops, faded leaves', () => {
  const visual = getBranchVisualState({ status: 'paused', priorityLevel: 3, leaves: [], baseColor: '#D9A33A' });
  assert.notEqual(visual.color, '#D9A33A');
  assert.ok(visual.droop > 0);
  assert.ok(visual.leafAlpha < 1);
  assert.ok(visual.widthMultiplier < 1);
});

test('completed branch is fully ripe and blooms', () => {
  const visual = getBranchVisualState({ status: 'completed', priorityLevel: 3, leaves: leaves(['healthy']), baseColor: '#D9A33A' });
  assert.equal(visual.completionRatio, 1);
  assert.equal(visual.tipBloom, true);
});

test('unknown status falls back to active and bad colours pass through', () => {
  assert.equal(getBranchVisualState({ status: 'weird', baseColor: '#000000' }).status, 'active');
  assert.equal(mixColor('rgb(1,2,3)', '#FFFFFF', 0.5), 'rgb(1,2,3)');
});
