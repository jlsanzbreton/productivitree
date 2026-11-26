// Visual encoding of a project branch's state on the tree canvas.
//
// Pure helpers (no canvas access) so the mapping can be unit-tested and
// tuned in one place:
//   - status (active / paused / completed) -> tint, glow, droop, leaf opacity
//   - priorityLevel (1-5)                   -> branch thickness
//   - % of leaves completed                 -> how far the "ripening" light
//                                              runs from base to tip

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const STATUS_STYLES = {
  // Living branch: species colour, normal glow.
  active: {
    tint: null,
    tintMix: 0,
    glowMultiplier: 1,
    droop: 0,
    widthMultiplier: 1,
    leafAlpha: 1,
    tipBloom: false,
  },
  // Dormant / withering: greyish bark, almost no glow, sags under its own
  // weight, thinner and its leaves fade.
  paused: {
    tint: '#6E6656',
    tintMix: 0.62,
    glowMultiplier: 0.25,
    droop: 30,
    widthMultiplier: 0.82,
    leafAlpha: 0.5,
    tipBloom: false,
  },
  // Harvested: warm golden bark, stronger glow and a bloom at the tip.
  completed: {
    tint: '#FEEA96',
    tintMix: 0.45,
    glowMultiplier: 1.6,
    droop: 0,
    widthMultiplier: 1,
    leafAlpha: 1,
    tipBloom: true,
  },
};

const hexToRgb = (hex) => {
  const clean = String(hex).replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const int = Number.parseInt(full, 16);
  if (Number.isNaN(int) || full.length !== 6) return null;
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
};

const toHex = ({ r, g, b }) =>
  `#${[r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('')}`;

export const mixColor = (baseHex, tintHex, amount) => {
  const base = hexToRgb(baseHex);
  const tint = hexToRgb(tintHex);
  if (!base || !tint) return baseHex;
  const t = clamp(amount, 0, 1);
  return toHex({
    r: base.r + (tint.r - base.r) * t,
    g: base.g + (tint.g - base.g) * t,
    b: base.b + (tint.b - base.b) * t,
  });
};

export const normalizeBranchStatus = (status) =>
  status === 'paused' || status === 'completed' ? status : 'active';

// priorityLevel goes 1-5 in the UI. 3 keeps today's thickness.
export const priorityWidthMultiplier = (priorityLevel) => {
  const level = clamp(Number(priorityLevel) || 3, 1, 5);
  return 0.6 + (level - 1) * 0.2; // 1 -> 0.60, 3 -> 1.00, 5 -> 1.40
};

export const leafCompletionRatio = (leaves) => {
  if (!Array.isArray(leaves) || leaves.length === 0) return 0;
  const done = leaves.filter((leaf) => leaf && leaf.status === 'completed').length;
  return done / leaves.length;
};

export const getBranchVisualState = ({ status, priorityLevel, leaves, baseColor }) => {
  const normalized = normalizeBranchStatus(status);
  const style = STATUS_STYLES[normalized];
  const completionRatio = normalized === 'completed' ? 1 : leafCompletionRatio(leaves);

  return {
    status: normalized,
    color: style.tint ? mixColor(baseColor, style.tint, style.tintMix) : baseColor,
    ripeColor: mixColor(baseColor, '#FFFBE6', 0.8),
    glowMultiplier: style.glowMultiplier,
    droop: style.droop,
    widthMultiplier: style.widthMultiplier * priorityWidthMultiplier(priorityLevel),
    leafAlpha: style.leafAlpha,
    tipBloom: style.tipBloom,
    completionRatio,
  };
};

export const branchStatusLabel = (status) =>
  ({ active: 'activo', paused: 'en pausa', completed: 'completado' })[normalizeBranchStatus(status)];
