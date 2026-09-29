import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('verify-help')
  .setDescription('List all DiscordVerifier commands.')
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

  const embed = new EmbedBuilder()
    .setTitle('DiscordVerifier — Commands')
    .setDescription(
      '**/verify-setup [channel]**\n' +
        'Seed the verification panel (embed + Verify button) in this channel or the target channel.\n\n' +
        '**/verify-status**\n' +
        'Health check: verified role, Manage Roles permission, and role hierarchy.\n\n' +
        '**/verify-help**\n' +
        'Show this list.'
    )
    .setColor(0x5865f2)
    .setFooter({ text: 'Discord Verifier by HumanAnomaly' });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
