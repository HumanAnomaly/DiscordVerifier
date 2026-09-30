import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} from 'discord.js';
import { getGuildSettings, updateGuildSettings } from '../utils/settings.js';

export const data = new SlashCommandBuilder()
  .setName('verify-mode')
  .setDescription('Switch verification version: v1 (direct) or v2 (random-button captcha).')
  .addStringOption((opt) =>
    opt
      .setName('mode')
      .setDescription('v1 = no captcha (current), v2 = captcha in Discord.')
      .setRequired(true)
      .addChoices(
        { name: 'v1 — direct (no captcha)', value: 'v1' },
        { name: 'v2 — captcha (random button)', value: 'v2' }
      )
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
  const mode = interaction.options.getString('mode', true);
  const settings = updateGuildSettings(interaction.guildId, { mode });
  const current = getGuildSettings(interaction.guildId);
  await interaction.reply({
    content:
      `Verification mode set to **${settings.mode}** ` +
      (settings.mode === 'v1'
        ? '(direct Verify, no captcha).'
        : '(random-button captcha in Discord).') +
      `\nCooldown: ${current.cooldownSeconds}s · Min account age: ${current.minAccountAgeDays}d.`,
    flags: MessageFlags.Ephemeral,
  });
}
