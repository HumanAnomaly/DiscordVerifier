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
        '**/verify-mode <v1|v2>**\n' +
        'Switch verification version. v1 = direct (no captcha), v2 = random-button captcha in Discord.\n\n' +
        '**/welcome-setup <channel> [enable] [goodbye]**\n' +
        'Welcome + goodbye embeds for joins/leaves.\n\n' +
        '**/verify-config [log-channel] [min-account-age-days] [cooldown-seconds] [disable-log]**\n' +
        'View or change verify extras: audit log, account-age gate, anti-spam cooldown.\n\n' +
        '**/verify-status**\n' +
        'Health check: verified role, Manage Roles permission, role hierarchy, plus current mode/settings.\n\n' +
        '**/verify-help**\n' +
        'Show this list.\n\n' +
        '**Auto-remove (optional)**\n' +
        'Set UNVERIFIED_ROLE_ID to gate channels until verify; removed automatically.'
    )
    .setColor(0x5865f2)
    .setFooter({ text: 'Discord Verifier by HumanAnomaly' });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
