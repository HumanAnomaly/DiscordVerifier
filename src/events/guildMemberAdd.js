import { Events, PermissionFlagsBits } from 'discord.js';
import { config } from '../utils/config.js';

export function registerGuildMemberAdd(client) {
  client.on(Events.GuildMemberAdd, async (member) => {
    if (!config.unverifiedRoleId) return; // auto unverified role feature - off
    if (member.user.bot) return;

    try {
      const role = await member.guild.roles.fetch(config.unverifiedRoleId).catch(() => null);
      if (!role) {
        console.error('UNVERIFIED_ROLE_ID not found. Check config.');
        return;
      }

      const me = await member.guild.members.fetchMe().catch(() => null);
      if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) return;
      if (me.roles.highest.position <= role.position) return;
      if (member.roles.cache.has(role.id)) return;

      await member.roles.add(role, 'Auto unverified role on join');
    } catch (err) {
      console.error('Failed to add unverified role:', err.message);
    }
  });
}
