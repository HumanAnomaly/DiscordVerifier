import 'dotenv/config';

/**
 * Centralized, validated environment configuration.
 * Fails fast with a clear message if anything is missing or malformed.
 */

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. See .env.example.`);
  }
  return value;
}

function isSnowflake(value) {
  return /^\d{17,20}$/.test(value);
}

export const config = {
  token: requireEnv('DISCORD_TOKEN'),
  clientId: requireEnv('CLIENT_ID'),
  guildId: requireEnv('GUILD_ID'),
  verifiedRoleId: requireEnv('VERIFIED_ROLE_ID'),
};

for (const key of ['clientId', 'guildId', 'verifiedRoleId']) {
  if (!isSnowflake(config[key])) {
    throw new Error(
      `Invalid ${key.toUpperCase()} "${config[key]}". Expected a Discord snowflake (17-20 digits).`
    );
  }
}

if (config.token.length < 20) {
  throw new Error('Invalid DISCORD_TOKEN: value looks too short to be a real bot token.');
}
