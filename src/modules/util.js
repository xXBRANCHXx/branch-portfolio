export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const lerp = (a, b, t) => a + (b - a) * t;

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/** 0 when the element's top reaches the bottom of the viewport, 1 when its top reaches `end` (fraction of the viewport). */
export function enterProgress(rect, vh, end = 0.4) {
  return clamp((vh - rect.top) / (vh * (1 - end)), 0, 1);
}

/** -1 when the element is just below the viewport, 0 when centred, 1 when just above. */
export function passProgress(rect, vh) {
  const centre = rect.top + rect.height / 2;
  return clamp((vh / 2 - centre) / (vh / 2 + rect.height / 2), -1, 1);
}

export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function safeSession(key, value) {
  try {
    if (value === undefined) return window.sessionStorage.getItem(key);
    window.sessionStorage.setItem(key, value);
  } catch (e) {
    return null;
  }
  return null;
}
