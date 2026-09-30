import { randomInt, randomUUID } from 'node:crypto';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

/**
 * v2 captcha: "click the correct random button".
 * The answer lives ONLY in this server-side Map — never in the customId —
 * so inspecting button IDs reveals nothing.
 */

export const CAPTCHA_PREFIX = 'discordverifier:captcha:';
export const CAPTCHA_TTL_MS = 120_000;
export const CAPTCHA_MAX_ATTEMPTS = 3;

const challenges = new Map(); // userId -> { token, options, correctIndex, attempts, expiresAt, timeout }

function pickOptions() {
  const correct = randomInt(1, 10); // 1-9
  const set = new Set([correct]);
  while (set.size < 4) set.add(randomInt(1, 10));
  const options = [...set];
  // Fisher-Yates shuffle so position is random.
  for (let i = options.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { options, correctIndex: options.indexOf(correct) };
}

export function createChallenge(userId) {
  clearChallenge(userId);
  const { options, correctIndex } = pickOptions();
  const token = randomUUID().replace(/-/g, '').slice(0, 12);
  const expiresAt = Date.now() + CAPTCHA_TTL_MS;
  const timeout = setTimeout(() => challenges.delete(userId), CAPTCHA_TTL_MS);
  timeout.unref?.();
  const entry = { token, options, correctIndex, attempts: 0, expiresAt, timeout };
  challenges.set(userId, entry);
  return { token, prompt: String(options[correctIndex]), options };
}

export function getChallenge(userId) {
  const entry = challenges.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    clearChallenge(userId);
    return null;
  }
  return entry;
}

export function clearChallenge(userId) {
  const entry = challenges.get(userId);
  if (entry?.timeout) clearTimeout(entry.timeout);
  challenges.delete(userId);
}

export function getPendingCount() {
  return challenges.size;
}

/** Parse a captcha button customId. Returns { token, index } or null. */
export function parseCaptchaCustomId(customId) {
  if (!customId.startsWith(CAPTCHA_PREFIX)) return null;
  const rest = customId.slice(CAPTCHA_PREFIX.length);
  const [token, indexRaw] = rest.split(':');
  const index = Number(indexRaw);
  if (!token || !Number.isInteger(index) || index < 0 || index > 3) return null;
  return { token, index };
}

/**
 * Validate a press. Returns one of:
 *  { status: 'expired' } | { status: 'mismatch' } |
 *  { status: 'correct' } | { status: 'wrong', attemptsLeft }
 */
export function verifyAnswer(userId, token, index) {
  const entry = getChallenge(userId);
  if (!entry || entry.token !== token) return { status: 'expired' };
  if (index === entry.correctIndex) {
    clearChallenge(userId);
    return { status: 'correct' };
  }
  entry.attempts += 1;
  const attemptsLeft = CAPTCHA_MAX_ATTEMPTS - entry.attempts;
  if (attemptsLeft <= 0) {
    clearChallenge(userId);
    return { status: 'wrong', attemptsLeft: 0 };
  }
  // Regenerate options for the retry so the answer/position changes.
  const { options, correctIndex } = pickOptions();
  entry.options = options;
  entry.correctIndex = correctIndex;
  return { status: 'wrong', attemptsLeft };
}

export function buildCaptchaMessage(prompt, options, token, attemptsLeft) {
  const embed = new EmbedBuilder()
    .setTitle('Verification — Captcha (v2)')
    .setDescription(
      `Click the button labeled **${prompt}**.\n` +
        `Attempts left: **${attemptsLeft}** · Expires in 2 minutes.\n` +
        'Only you can press these buttons.'
    )
    .setColor(0x5865f2);

  const row = new ActionRowBuilder().addComponents(
    options.map((value, i) =>
      new ButtonBuilder()
        .setCustomId(`${CAPTCHA_PREFIX}${token}:${i}`)
        .setLabel(String(value))
        .setStyle(ButtonStyle.Primary)
    )
  );

  return { embeds: [embed], components: [row] };
}
