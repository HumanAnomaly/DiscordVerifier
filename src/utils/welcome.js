import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export function buildWelcomeEmbed(member) {
  const user = member.user;
  const created = `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`;
  return new EmbedBuilder()
    .setTitle(`Welcome, ${user.username}!`)
    .setDescription(
      `${member} just joined **${member.guild.name}**.\n` +
        `Account created ${created}.\n\n` +
        'Please click **Verify** in the verification channel to get access.'
    )
    .setThumbnail(user.displayAvatarURL())
    .setColor(0x57f287)
    .setFooter({ text: `Member #${member.guild.memberCount} · Discord Verifier by HumanAnomaly` })
    .setTimestamp();
}

export function buildGoodbyeEmbed(guild, user) {
  return new EmbedBuilder()
    .setTitle(`Goodbye, ${user.username}`)
    .setDescription(`${user} left **${guild.name}**.`)
    .setThumbnail(user.displayAvatarURL())
    .setColor(0xed4245)
    .setFooter({ text: `${guild.memberCount} members remaining · Discord Verifier` })
    .setTimestamp();
}

async function canPost(channel, me) {
  const perms = channel.permissionsFor(me);
  return (
    !!perms?.has(PermissionFlagsBits.ViewChannel) &&
    !!perms?.has(PermissionFlagsBits.SendMessages) &&
    !!perms?.has(PermissionFlagsBits.EmbedLinks)
  );
}

export async function sendWelcome(member, settings) {
  if (!settings.welcomeChannelId) return;
  try {
    const channel = await member.guild.channels.fetch(settings.welcomeChannelId).catch(() => null);
    if (!channel?.isTextBased()) return;
    const me = await member.guild.members.fetchMe().catch(() => null);
    if (!me || !(await canPost(channel, me))) {
      console.error('Cannot post welcome: missing View/Send/EmbedLinks in welcome channel.');
      return;
    }
    await channel.send({ embeds: [buildWelcomeEmbed(member)] });
  } catch (err) {
    console.error('Failed to send welcome:', err.message);
  }
}

export async function sendGoodbye(guild, user, settings) {
  if (!settings.welcomeChannelId || !settings.goodbyeEnabled) return;
  try {
    const channel = await guild.channels.fetch(settings.welcomeChannelId).catch(() => null);
    if (!channel?.isTextBased()) return;
    const me = await guild.members.fetchMe().catch(() => null);
    if (!me || !(await canPost(channel, me))) return;
    await channel.send({ embeds: [buildGoodbyeEmbed(guild, user)] });
  } catch (err) {
    console.error('Failed to send goodbye:', err.message);
  }
}
