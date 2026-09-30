import { EmbedBuilder } from 'discord.js';
import { getGuildSettings } from './settings.js';

const COLORS = {
  success: 0x57f287,
  captcha_fail: 0xfee75c,
  captcha_expired: 0xfee75c,
  age_rejected: 0xed4245,
  error: 0xed4245,
};

/**
 * Append-only audit trail to the configured log channel. Fail-silent by design:
 * logging must never break verification itself.
 */
export async function logVerifyEvent(guild, { type, user, detail }) {
  try {
    const settings = getGuildSettings(guild.id);
    if (!settings.logChannelId) return;
    const channel = await guild.channels.fetch(settings.logChannelId).catch(() => null);
    if (!channel?.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setTitle(`Verify log — ${type}`)
      .setDescription(detail ?? '—')
      .setColor(COLORS[type] ?? 0x5865f2)
      .setFooter({ text: 'Discord Verifier by HumanAnomaly' })
      .setTimestamp();
    if (user) {
      embed.setAuthor({ name: `${user.tag} (${user.id})` });
    }
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('Failed to send verify log:', err.message);
  }
}
