import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { config } from '../utils/config.js';

export const data = new SlashCommandBuilder()
  .setName('verify-status')
  .setDescription('Show verification health: role, permissions, hierarchy.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setDMPermission(false);

export async function execute(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: 'You need the Administrator permission to use this command.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const guild = interaction.guild;
  const lines = [];
  let color = 0x57f287;

  const role = await guild.roles.fetch(config.verifiedRoleId).catch(() => null);
  lines.push(role ? `✅ Verified role: ${role} (\`${role.name}\`)` : '❌ Verified role not found — check VERIFIED_ROLE_ID.');
  if (!role) color = 0xed4245;

  const me = await guild.members.fetchMe().catch(() => null);
  if (!me) {
    lines.push('❌ Could not fetch my own member — try again later.');
    color = 0xed4245;
  } else {
    const canManage = me.permissions.has(PermissionFlagsBits.ManageRoles);
    lines.push(canManage ? '✅ Manage Roles permission: yes' : '❌ Manage Roles permission: missing.');
    if (!canManage) color = 0xed4245;

    if (role) {
      const above = me.roles.highest.position > role.position;
      lines.push(
        above
          ? `✅ Hierarchy: my top role (${me.roles.highest.name}) is above ${role.name}.`
          : `❌ Hierarchy: move my role above ${role.name} in Server Settings → Roles.`
      );
      if (!above) color = 0xed4245;
    }
  }

  const embed = new EmbedBuilder()
    .setTitle('Verification Status')
    .setDescription(lines.join('\n'))
    .setColor(color)
    .setFooter({ text: 'Discord Verifier by HumanAnomaly' });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
