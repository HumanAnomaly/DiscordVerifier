import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
} from 'discord.js';
import { updateGuildSettings } from '../utils/settings.js';

export const data = new SlashCommandBuilder()
  .setName('welcome-setup')
  .setDescription('Set the welcome/goodbye channel (embed) for new members.')
  .addChannelOption((opt) =>
    opt
      .setName('channel')
      .setDescription('Channel for welcome + goodbye embeds.')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  )
  .addBooleanOption((opt) =>
    opt.setName('enable').setDescription('Turn welcome messages on/off (default: true).')
  )
  .addBooleanOption((opt) =>
    opt.setName('goodbye').setDescription('Also send goodbye embeds here (default: true).')
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

  const channel = interaction.options.getChannel('channel', true);
  const enable = interaction.options.getBoolean('enable') ?? true;
  const goodbye = interaction.options.getBoolean('goodbye') ?? true;

  if (!channel?.isTextBased()) {
    await interaction.reply({
      content: 'Target channel must be a text channel the bot can send to.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const botPerms = channel.permissionsFor(interaction.guild.members.me);
  if (
    !botPerms?.has(PermissionFlagsBits.ViewChannel) ||
    !botPerms?.has(PermissionFlagsBits.SendMessages) ||
    !botPerms?.has(PermissionFlagsBits.EmbedLinks)
  ) {
    await interaction.reply({
      content: `I can't post in ${channel}. I need View Channel, Send Messages, and Embed Links there.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const settings = updateGuildSettings(interaction.guildId, {
    welcomeChannelId: enable ? channel.id : null,
    goodbyeEnabled: goodbye,
  });

  await interaction.reply({
    content: enable
      ? `Welcome embeds will be sent in ${channel}. Goodbye: **${settings.goodbyeEnabled ? 'on' : 'off'}**.`
      : 'Welcome messages disabled.',
    flags: MessageFlags.Ephemeral,
  });
}
