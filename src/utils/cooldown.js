/** Simple in-memory per-user cooldown. Resets on restart (acceptable). */

const stamps = new Map(); // `${guildId}:${userId}:${scope}` -> timestamp ms

export function getRemainingSeconds(guildId, userId, scope, cooldownSeconds) {
  const key = `${guildId}:${userId}:${scope}`;
  const last = stamps.get(key);
  if (!last) return 0;
  const elapsed = (Date.now() - last) / 1000;
  const remaining = cooldownSeconds - elapsed;
  return remaining > 0 ? Math.ceil(remaining) : 0;
}

export function setCooldown(guildId, userId, scope) {
  stamps.set(`${guildId}:${userId}:${scope}`, Date.now());
}
