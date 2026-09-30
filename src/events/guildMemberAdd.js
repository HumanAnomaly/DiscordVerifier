import { Events, PermissionFlagsBits } from 'discord.js';
import { config } from '../utils/config.js';
import { getGuildSettings } from '../utils/settings.js';
import { sendWelcome } from '../utils/welcome.js';

export function registerGuildMemberAdd(client) {
  client.on(Events.GuildMemberAdd, async (member) => {
    const settings = getGuildSettings(member.guild.id);

    if (config.unverifiedRoleId && !member.user.bot) {
      try {
        const role = await member.guild.roles.fetch(config.unverifiedRoleId).catch(() => null);
        if (!role) {
          console.error('UNVERIFIED_ROLE_ID not found. Check config.');
        } else {
          const me = await member.guild.members.fetchMe().catch(() => null);
          if (
            me?.permissions.has(PermissionFlagsBits.ManageRoles) &&
            me.roles.highest.position > role.position &&
            !member.roles.cache.has(role.id)
          ) {
            await member.roles.add(role, 'Auto unverified role on join');
          }
        }
      } catch (err) {
        console.error('Failed to add unverified role:', err.message);
      }
    }

    if (!member.user.bot) {
      await sendWelcome(member, settings);
    }
  });
}
