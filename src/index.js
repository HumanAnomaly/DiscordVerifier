import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { config } from './utils/config.js';
import { registerReady } from './events/ready.js';
import { registerInteractionCreate } from './events/interactionCreate.js';
import { registerGuildMemberAdd } from './events/guildMemberAdd.js';
import { registerGuildMemberRemove } from './events/guildMemberRemove.js';
import * as verifySetup from './commands/verifySetup.js';
import * as verifyStatus from './commands/verifyStatus.js';
import * as verifyHelp from './commands/verifyHelp.js';
import * as verifyMode from './commands/verifyMode.js';
import * as welcomeSetup from './commands/welcomeSetup.js';
import * as verifyConfig from './commands/verifyConfig.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const commands = new Collection();
for (const cmd of [verifySetup, verifyStatus, verifyHelp, verifyMode, welcomeSetup, verifyConfig]) {
  commands.set(cmd.data.name, cmd);
}

registerReady(client);
registerInteractionCreate(client, commands);
registerGuildMemberAdd(client);
registerGuildMemberRemove(client);

client.login(config.token).catch((err) => {
  console.error('Failed to log in. Check DISCORD_TOKEN in your .env.');
  console.error(err.message);
  process.exit(1);
});
