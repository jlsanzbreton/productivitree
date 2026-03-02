import test from 'node:test';
import assert from 'node:assert/strict';
import { applyActivityBoost, applyHealthDecay, applyWaterBoost, deriveStageStatusFromNeglect } from '../../utils/healthEngine.js';

const policy = {
  decayIntervalMinutes: 60,
  decayStep: 2,
  neglectThresholdHours: 48,
  activityBoostStep: 4,
  waterBoostStep: 10,
};

test('applyHealthDecay reduces health by elapsed intervals', () => {
  const state = {
    value: 70,
    lastDecayAt: '2026-03-01T00:00:00.000Z',
    lastWateredAt: null,
    lastMeaningfulActivityAt: '2026-03-01T00:00:00.000Z',
  };
  const next = applyHealthDecay(state, '2026-03-01T03:00:00.000Z', policy);
  assert.equal(next.value, 64);
});

test('applyWaterBoost increases health with cap', () => {
  const state = {
    value: 95,
    lastDecayAt: '2026-03-01T00:00:00.000Z',
    lastWateredAt: null,
    lastMeaningfulActivityAt: '2026-03-01T00:00:00.000Z',
  };
  const next = applyWaterBoost(state, '2026-03-01T03:00:00.000Z', policy);
  assert.equal(next.value, 100);
});

test('deriveStageStatusFromNeglect marks old stages as neglected', () => {
  const stage = {
    status: 'healthy',
    lastActivityAt: '2026-02-25T00:00:00.000Z',
  };
  const status = deriveStageStatusFromNeglect(stage, '2026-03-01T10:00:00.000Z', policy);
  assert.equal(status, 'neglected');
});

test('applyActivityBoost increases health with cap', () => {
  const state = {
    value: 98,
    lastDecayAt: '2026-03-01T00:00:00.000Z',
    lastWateredAt: null,
    lastMeaningfulActivityAt: '2026-03-01T00:00:00.000Z',
  };
  const next = applyActivityBoost(state, '2026-03-01T03:00:00.000Z', policy);
  assert.equal(next.value, 100);
});
