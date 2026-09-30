import fs from 'node:fs';
import path from 'node:path';

/**
 * Per-guild runtime settings persisted to data/settings.json.
 * Defaults preserve v1 behaviour (no captcha) so existing installs keep working.
 */

const DEFAULTS = {
  mode: 'v1', // 'v1' = direct verify, 'v2' = random-button captcha
  welcomeChannelId: null,
  goodbyeEnabled: true,
  logChannelId: null,
  minAccountAgeDays: 0, // 0 = off, max 365
  cooldownSeconds: 10, // 5-60
};

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

let cache = null;

function isSnowflake(value) {
  return typeof value === 'string' && /^\d{17,20}$/.test(value);
}

function loadFromDisk() {
  if (cache) return cache;
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
    cache = JSON.parse(raw);
    if (typeof cache !== 'object' || cache === null) cache = {};
  } catch {
    cache = {};
  }
  return cache;
}

function saveToDisk() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(cache, null, 2));
  } catch (err) {
    console.error('Failed to save settings:', err.message);
  }
}

export function getGuildSettings(guildId) {
  const all = loadFromDisk();
  return { ...DEFAULTS, ...(all[guildId] ?? {}) };
}

export function updateGuildSettings(guildId, patch) {
  const all = loadFromDisk();
  const current = { ...DEFAULTS, ...(all[guildId] ?? {}) };
  const next = { ...current };

  if (patch.mode !== undefined) {
    if (patch.mode !== 'v1' && patch.mode !== 'v2') {
      throw new Error('Mode must be "v1" or "v2".');
    }
    next.mode = patch.mode;
  }
  if (patch.welcomeChannelId !== undefined) {
    if (patch.welcomeChannelId !== null && !isSnowflake(patch.welcomeChannelId)) {
      throw new Error('Invalid welcome channel ID.');
    }
    next.welcomeChannelId = patch.welcomeChannelId;
  }
  if (patch.goodbyeEnabled !== undefined) {
    next.goodbyeEnabled = Boolean(patch.goodbyeEnabled);
  }
  if (patch.logChannelId !== undefined) {
    if (patch.logChannelId !== null && !isSnowflake(patch.logChannelId)) {
      throw new Error('Invalid log channel ID.');
    }
    next.logChannelId = patch.logChannelId;
  }
  if (patch.minAccountAgeDays !== undefined) {
    const n = Number(patch.minAccountAgeDays);
    if (!Number.isInteger(n) || n < 0 || n > 365) {
      throw new Error('Min account age must be an integer 0-365 (days). 0 disables it.');
    }
    next.minAccountAgeDays = n;
  }
  if (patch.cooldownSeconds !== undefined) {
    const n = Number(patch.cooldownSeconds);
    if (!Number.isInteger(n) || n < 5 || n > 60) {
      throw new Error('Cooldown must be an integer 5-60 (seconds).');
    }
    next.cooldownSeconds = n;
  }

  all[guildId] = next;
  cache = all;
  saveToDisk();
  return next;
}
