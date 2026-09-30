import { Events } from 'discord.js';
import { getGuildSettings } from '../utils/settings.js';
import { sendGoodbye } from '../utils/welcome.js';

export function registerGuildMemberRemove(client) {
  client.on(Events.GuildMemberRemove, async (member) => {
    try {
      const settings = getGuildSettings(member.guild.id);
      await sendGoodbye(member.guild, member.user, settings);
    } catch (err) {
      console.error('Goodbye handler error:', err.message);
    }
  });
}
