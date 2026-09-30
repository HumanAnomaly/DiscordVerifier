import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { config } from './utils/config.js';
import { data as verifySetupData } from './commands/verifySetup.js';
import { data as verifyStatusData } from './commands/verifyStatus.js';
import { data as verifyHelpData } from './commands/verifyHelp.js';
import { data as verifyModeData } from './commands/verifyMode.js';
import { data as welcomeSetupData } from './commands/welcomeSetup.js';
import { data as verifyConfigData } from './commands/verifyConfig.js';

// Registers (or refreshes) the guild commands.
const rest = new REST({ version: '10' }).setToken(config.token);
const body = [
  verifySetupData,
  verifyStatusData,
  verifyHelpData,
  verifyModeData,
  welcomeSetupData,
  verifyConfigData,
].map((d) => d.toJSON());

try {
  console.log('Registering commands…');
  await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body });
  console.log(
    'Done. /verify-setup, /verify-status, /verify-help, /verify-mode, /welcome-setup, /verify-config are available in your server.'
  );
} catch (err) {
  console.error('Failed to register slash commands:', err.message);
  process.exit(1);
}
