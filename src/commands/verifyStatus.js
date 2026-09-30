import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { config } from '../utils/config.js';
import { getGuildSettings } from '../utils/settings.js';
import { getPendingCount } from '../utils/captcha.js';

export const data = new SlashCommandBuilder()
  .setName('verify-status')
  .setDescription('Show full config and verification health check.')
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
  const ok = [];
  const bad = [];
  const mark = (pass, text) => (pass ? ok.push(`✅ ${text}`) : bad.push(`❌ ${text}`));

  // Config matches this bot and server.
  mark(
    interaction.client.user.id === config.clientId,
    `CLIENT_ID matches this bot (${config.clientId}).`
  );
  mark(guild.id === config.guildId, `GUILD_ID matches this server (${config.guildId}).`);

  // Roles exist.
  const role = await guild.roles.fetch(config.verifiedRoleId).catch(() => null);
  mark(
    !!role,
    role
      ? `VERIFIED_ROLE_ID: ${role} (${role.name}).`
      : `VERIFIED_ROLE_ID ${config.verifiedRoleId} not found.`
  );

  const urole = config.unverifiedRoleId
    ? await guild.roles.fetch(config.unverifiedRoleId).catch(() => null)
    : null;
  if (config.unverifiedRoleId) {
    mark(
      !!urole,
      urole
        ? `UNVERIFIED_ROLE_ID: ${urole} (auto-remove on).`
        : `UNVERIFIED_ROLE_ID ${config.unverifiedRoleId} not found.`
    );
  }

  // Bot permission and hierarchy for every managed role.
  const me = await guild.members.fetchMe().catch(() => null);
  if (!me) {
    bad.push('❌ Could not fetch my own member.');
  } else {
    mark(me.permissions.has(PermissionFlagsBits.ManageRoles), 'Manage Roles permission: yes.');
    if (role) {
      mark(
        me.roles.highest.position > role.position,
        `My top role (${me.roles.highest.name}) is above ${role.name}.`
      );
    }
    if (urole) {
      mark(
        me.roles.highest.position > urole.position,
        `My top role (${me.roles.highest.name}) is above ${urole.name}.`
      );
    }
  }

  // Panel postable in this channel.
  const channel = interaction.channel;
  if (channel?.isTextBased()) {
    const perms = channel.permissionsFor(me ?? guild.members.me);
    mark(
      !!perms?.has(PermissionFlagsBits.ViewChannel) &&
        !!perms?.has(PermissionFlagsBits.SendMessages) &&
        !!perms?.has(PermissionFlagsBits.EmbedLinks),
      `Can post panel in ${channel}.`
    );
  }

  const lines = [...bad, ...ok];
  if (!config.unverifiedRoleId) {
    lines.push('➖ UNVERIFIED_ROLE_ID: not set (auto-remove off).');
  }

  // Runtime settings (per-guild, via commands).
  const settings = getGuildSettings(guild.id);
  lines.push(
    `ℹ️ Mode: **${settings.mode}** (${settings.mode === 'v1' ? 'direct, no captcha' : 'random-button captcha'}).`
  );
  lines.push(
    settings.welcomeChannelId
      ? `ℹ️ Welcome: <#${settings.welcomeChannelId}> (goodbye ${settings.goodbyeEnabled ? 'on' : 'off'}).`
      : 'ℹ️ Welcome: off (set via /welcome-setup).'
  );
  lines.push(
    settings.logChannelId ? `ℹ️ Verify log: <#${settings.logChannelId}>.` : 'ℹ️ Verify log: off.'
  );
  lines.push(
    `ℹ️ Min account age: ${settings.minAccountAgeDays}d · Cooldown: ${settings.cooldownSeconds}s · Active captchas: ${getPendingCount()}.`
  );

  const embed = new EmbedBuilder()
    .setTitle('Verification Status')
    .setDescription(lines.join('\n'))
    .setColor(bad.length ? 0xed4245 : 0x57f287);

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
