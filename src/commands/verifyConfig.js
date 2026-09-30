import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  EmbedBuilder,
} from 'discord.js';
import { getGuildSettings, updateGuildSettings } from '../utils/settings.js';

export const data = new SlashCommandBuilder()
  .setName('verify-config')
  .setDescription('View or change verify extras: log channel, min account age, cooldown.')
  .addChannelOption((opt) =>
    opt
      .setName('log-channel')
      .setDescription('Channel for verify audit logs. Omit to keep current.')
      .addChannelTypes(ChannelType.GuildText)
  )
  .addIntegerOption((opt) =>
    opt
      .setName('min-account-age-days')
      .setDescription('Reject accounts younger than this (0-365, 0 = off).')
      .setMinValue(0)
      .setMaxValue(365)
  )
  .addIntegerOption((opt) =>
    opt
      .setName('cooldown-seconds')
      .setDescription('Anti-spam cooldown per user (5-60s).')
      .setMinValue(5)
      .setMaxValue(60)
  )
  .addBooleanOption((opt) =>
    opt.setName('disable-log').setDescription('Turn off verify logging.')
  )
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

  const patch = {};
  const logChannel = interaction.options.getChannel('log-channel');
  const disableLog = interaction.options.getBoolean('disable-log') ?? false;
  const minAge = interaction.options.getInteger('min-account-age-days');
  const cooldown = interaction.options.getInteger('cooldown-seconds');

  if (disableLog) patch.logChannelId = null;
  else if (logChannel) patch.logChannelId = logChannel.id;
  if (minAge !== null && minAge !== undefined) patch.minAccountAgeDays = minAge;
  if (cooldown !== null && cooldown !== undefined) patch.cooldownSeconds = cooldown;

  let settings = getGuildSettings(interaction.guildId);
  if (Object.keys(patch).length > 0) {
    try {
      settings = updateGuildSettings(interaction.guildId, patch);
    } catch (err) {
      await interaction.reply({ content: err.message, flags: MessageFlags.Ephemeral });
      return;
    }
  }

  const embed = new EmbedBuilder()
    .setTitle('Verify Config')
    .setDescription(
      `Mode: **${settings.mode}** (change via /verify-mode)\n` +
        `Welcome channel: ${settings.welcomeChannelId ? `<#${settings.welcomeChannelId}>` : 'off'} (goodbye ${settings.goodbyeEnabled ? 'on' : 'off'})\n` +
        `Log channel: ${settings.logChannelId ? `<#${settings.logChannelId}>` : 'off'}\n` +
        `Min account age: **${settings.minAccountAgeDays}** day(s) (0 = off)\n` +
        `Cooldown: **${settings.cooldownSeconds}**s`
    )
    .setColor(0x5865f2)
    .setFooter({ text: 'Discord Verifier by HumanAnomaly' });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
