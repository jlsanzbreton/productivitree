const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const applyHealthDecay = (healthState, nowIso, policy) => {
  const now = new Date(nowIso).getTime();
  const lastDecay = new Date(healthState.lastDecayAt).getTime();
  const intervalMs = policy.decayIntervalMinutes * 60 * 1000;

  if (Number.isNaN(lastDecay) || now <= lastDecay) {
    return healthState;
  }

  const intervalsElapsed = Math.floor((now - lastDecay) / intervalMs);
  if (intervalsElapsed <= 0) {
    return healthState;
  }

  return {
    ...healthState,
    value: clamp(healthState.value - intervalsElapsed * policy.decayStep, 0, 100),
    lastDecayAt: new Date(lastDecay + intervalsElapsed * intervalMs).toISOString(),
  };
};

export const applyWaterBoost = (healthState, nowIso, policy) => ({
  ...healthState,
  value: clamp(healthState.value + policy.waterBoostStep, 0, 100),
  lastWateredAt: nowIso,
  lastMeaningfulActivityAt: nowIso,
});

export const applyActivityBoost = (healthState, nowIso, policy) => ({
  ...healthState,
  value: clamp(healthState.value + policy.activityBoostStep, 0, 100),
  lastMeaningfulActivityAt: nowIso,
});

export const deriveStageStatusFromNeglect = (stage, nowIso, policy) => {
  if (stage.status === 'completed') {
    return stage.status;
  }

  const now = new Date(nowIso).getTime();
  const lastActivity = new Date(stage.lastActivityAt).getTime();
  if (Number.isNaN(lastActivity) || now <= lastActivity) {
    return stage.status;
  }

  const ageHours = (now - lastActivity) / (1000 * 60 * 60);
  if (ageHours >= policy.neglectThresholdHours) {
    return 'neglected';
  }

  if (ageHours >= policy.neglectThresholdHours / 2) {
    return 'needs_attention';
  }

  if (stage.status === 'neglected' || stage.status === 'needs_attention') {
    return 'healthy';
  }

  return stage.status;
};
