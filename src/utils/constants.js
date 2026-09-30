/** Shared interaction identifiers. The verified role always comes from config — never from user input. */
export const VERIFY_BUTTON_ID = 'discordverifier:verify';
// Captcha button prefix lives in utils/captcha.js (CAPTCHA_PREFIX) to keep the
// answer server-side only; re-exported here for panels/debugging convenience.
export { CAPTCHA_PREFIX } from './captcha.js';

/** Public source code link shown on the verification panel. */
export const REPO_URL = 'https://github.com/HumanAnomaly/DiscordVerifier';
