import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import { VERIFY_BUTTON_ID, REPO_URL } from '../utils/constants.js';

export const data = new SlashCommandBuilder()
  .setName('verify-setup')
  .setDescription('Post (seed) the verification panel with a Verify button.')
  .addChannelOption((opt) =>
    opt
      .setName('channel')
      .setDescription('Target channel for the panel (default: this channel).')
      .addChannelTypes(ChannelType.GuildText)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setDMPermission(false);

/** Shared builder so the panel stays identical wherever it is posted. */
export function buildVerifyPanel() {
  const embed = new EmbedBuilder()
    .setTitle('Server Verification')
    .setDescription(
      'Click the **Verify** button below to verify yourself and gain access to the server.'
    )
    .setColor(0x5865f2);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(VERIFY_BUTTON_ID)
      .setLabel('Verify')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setLabel('Source Code')
      .setStyle(ButtonStyle.Link)
      .setURL(REPO_URL)
  );

  return { embeds: [embed], components: [row] };
}

export async function execute(interaction) {
  // Defer first: channel sends can take >3s, after which the
  // interaction token expires (Unknown interaction).
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // Double-check admin at runtime (guild permission check can't be spoofed,
  // but this guards against permission misconfiguration and is explicit).
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.editReply('You need the Administrator permission to use this command.');
    return;
  }

  const target = interaction.options.getChannel('channel') ?? interaction.channel;
  if (!target?.isTextBased()) {
    await interaction.editReply('Target channel must be a text channel the bot can send to.');
    return;
  }

  const botPerms = target.permissionsFor(interaction.guild.members.me);
  if (
    !botPerms?.has(PermissionFlagsBits.ViewChannel) ||
    !botPerms?.has(PermissionFlagsBits.SendMessages) ||
    !botPerms?.has(PermissionFlagsBits.EmbedLinks)
  ) {
    await interaction.editReply(
      `I can't post in ${target}. I need View Channel, Send Messages, and Embed Links there.`
    );
    return;
  }

  await target.send(buildVerifyPanel());

  await interaction.editReply(`Verification panel posted in ${target}.`);
}
