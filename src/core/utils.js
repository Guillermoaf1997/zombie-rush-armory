export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(start, end, t) {
  return start + (end - start) * t;
}

export function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

export function randomInt(min, max) {
  return Math.floor(randomRange(min, max + 1));
}

export function distanceSquared(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function circlesOverlap(a, b) {
  const radius = a.radius + b.radius;
  return distanceSquared(a.x, a.y, b.x, b.y) <= radius * radius;
}

export function formatScore(value) {
  return Math.floor(value).toString().padStart(4, '0');
}
