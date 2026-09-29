import { Events } from 'discord.js';

export function registerReady(client) {
  client.once(Events.ClientReady, (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}`);
  });
}
