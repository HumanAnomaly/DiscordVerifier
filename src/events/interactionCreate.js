import { Events, PermissionFlagsBits, MessageFlags, EmbedBuilder } from 'discord.js';
import { VERIFY_BUTTON_ID } from '../utils/constants.js';
import { config } from '../utils/config.js';
import { getGuildSettings } from '../utils/settings.js';
import {
  CAPTCHA_PREFIX,
  CAPTCHA_MAX_ATTEMPTS,
  createChallenge,
  getChallenge,
  parseCaptchaCustomId,
  verifyAnswer,
  buildCaptchaMessage,
} from '../utils/captcha.js';
import { getRemainingSeconds, setCooldown } from '../utils/cooldown.js';
import { logVerifyEvent } from '../utils/verifyLog.js';

export function registerInteractionCreate(client, commands) {
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        const command = commands.get(interaction.commandName);
        if (!command) return;
        await command.execute(interaction);
        return;
      }

      if (interaction.isButton()) {
        if (interaction.customId === VERIFY_BUTTON_ID) {
          await handleVerifyButton(interaction);
        } else if (interaction.customId.startsWith(CAPTCHA_PREFIX)) {
          await handleCaptchaButton(interaction);
        }
      }
    } catch (err) {
      console.error('Interaction error:', err);
      // Interaction may already be replied to; guard both paths.
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({
            content: 'Something went wrong. Please try again later.',
            flags: MessageFlags.Ephemeral,
          });
        } else {
          await interaction.reply({
            content: 'Something went wrong. Please try again later.',
            flags: MessageFlags.Ephemeral,
          });
        }
      } catch {
        // Swallow follow-up errors (e.g. unknown interaction) to avoid crash loops.
      }
    }
  });
}

function getAccountAgeDays(user) {
  return (Date.now() - user.createdTimestamp) / 86_400_000;
}

async function resolveGuild(interaction) {
  const { guildId } = interaction;
  if (!guildId) return null;
  return interaction.guild ?? (await interaction.client.guilds.fetch(guildId).catch(() => null));
}

/** Shared pre-checks: role exists, bot can manage it. Returns { guild, verifiedRole, me } or sends an error reply and returns null. */
async function checkPrerequisites(interaction, guild) {
  // The role ID is server-controlled config only — never derived from user input.
  const verifiedRole = await guild.roles.fetch(config.verifiedRoleId).catch(() => null);
  if (!verifiedRole) {
    await interaction.reply({
      content: 'Verification is currently misconfigured. Please contact a server admin.',
      flags: MessageFlags.Ephemeral,
    });
    return null;
  }

  const me = await guild.members.fetchMe().catch(() => null);
  if (!me) {
    await interaction.reply({
      content: 'Could not verify permissions. Please try again later.',
      flags: MessageFlags.Ephemeral,
    });
    return null;
  }

  if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
    await interaction.reply({
      content: 'The bot is missing the **Manage Roles** permission. Please contact a server admin.',
      flags: MessageFlags.Ephemeral,
    });
    return null;
  }

  if (me.roles.highest.position <= verifiedRole.position) {
    await interaction.reply({
      content:
        'The bot cannot assign the verified role because its highest role is not above it. Please contact a server admin.',
      flags: MessageFlags.Ephemeral,
    });
    return null;
  }

  return { verifiedRole, me };
}

async function grantVerifiedRole(guild, userId, verifiedRole) {
  const member =
    guild.members.cache.get(userId) ?? (await guild.members.fetch(userId).catch(() => null));
  if (!member) return { ok: false, message: 'Could not find your server profile. Try leaving and rejoining, or contact an admin.' };
  if (member.roles.cache.has(verifiedRole.id)) {
    return { ok: false, message: 'You are already verified.', already: true };
  }

  try {
    await member.roles.add(verifiedRole, 'User verified via Verify button');
  } catch (err) {
    console.error('Failed to add verified role:', err);
    return { ok: false, message: getRoleAddErrorMessage(err) };
  }

  if (config.unverifiedRoleId && member.roles.cache.has(config.unverifiedRoleId)) {
    await member.roles
      .remove(config.unverifiedRoleId, 'Unverified role removed after verification')
      .catch((err) => console.error('Failed to remove unverified role:', err.message));
  }

  return { ok: true, member, message: `You have been verified and given the **${verifiedRole.name}** role. Welcome!` };
}

async function handleVerifyButton(interaction) {
  const guild = await resolveGuild(interaction);
  if (!guild) {
    await interaction.reply({
      content: 'This button can only be used inside a server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const settings = getGuildSettings(guild.id);

  const remaining = getRemainingSeconds(guild.id, interaction.user.id, 'verify', settings.cooldownSeconds);
  if (remaining > 0) {
    await interaction.reply({
      content: `Please wait **${remaining}s** before trying again (anti-spam cooldown).`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const pre = await checkPrerequisites(interaction, guild);
  if (!pre) return;

  // Min account age gate (applies to both v1 and v2).
  if (settings.minAccountAgeDays > 0) {
    const ageDays = getAccountAgeDays(interaction.user);
    if (ageDays < settings.minAccountAgeDays) {
      const need = Math.ceil(settings.minAccountAgeDays - ageDays);
      setCooldown(guild.id, interaction.user.id, 'verify');
      await interaction.reply({
        content: `Your account is too new to verify. Please try again in **${need}** day(s).`,
        flags: MessageFlags.Ephemeral,
      });
      await logVerifyEvent(guild, {
        type: 'age_rejected',
        user: interaction.user,
        detail: `Age ${ageDays.toFixed(1)}d < required ${settings.minAccountAgeDays}d.`,
      });
      return;
    }
  }

  if (settings.mode === 'v2') {
    setCooldown(guild.id, interaction.user.id, 'verify');
    const { token, prompt, options } = createChallenge(interaction.user.id);
    await interaction.reply({
      ...buildCaptchaMessage(prompt, options, token, CAPTCHA_MAX_ATTEMPTS),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // v1 — direct verify (original behaviour).
  const result = await grantVerifiedRole(guild, interaction.user.id, pre.verifiedRole);
  setCooldown(guild.id, interaction.user.id, 'verify');
  await interaction.reply({ content: result.message, flags: MessageFlags.Ephemeral });
  await logVerifyEvent(guild, {
    type: result.ok ? 'success' : 'error',
    user: interaction.user,
    detail: result.ok ? `Verified (v1) with role ${pre.verifiedRole.name}.` : result.message,
  });
}

async function handleCaptchaButton(interaction) {
  const guild = await resolveGuild(interaction);
  if (!guild) {
    await interaction.reply({
      content: 'This button can only be used inside a server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const parsed = parseCaptchaCustomId(interaction.customId);
  if (!parsed) return;

  const challenge = getChallenge(interaction.user.id);
  if (!challenge || challenge.token !== parsed.token) {
    await interaction.reply({
      content: 'This captcha is expired or not yours. Click **Verify** again to get a fresh one.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const outcome = verifyAnswer(interaction.user.id, parsed.token, parsed.index);

  if (outcome.status === 'expired') {
    await interaction.reply({
      content: 'Captcha expired. Click **Verify** again to get a fresh one.',
      flags: MessageFlags.Ephemeral,
    });
    await logVerifyEvent(guild, { type: 'captcha_expired', user: interaction.user, detail: 'Challenge expired or token mismatch.' });
    return;
  }

  if (outcome.status === 'correct') {
    const settings = getGuildSettings(guild.id);
    // Re-check age at solve time (cheap, prevents edge abuse).
    if (settings.minAccountAgeDays > 0) {
      const ageDays = getAccountAgeDays(interaction.user);
      if (ageDays < settings.minAccountAgeDays) {
        await interaction.update({
          content: 'Your account is too new to verify.',
          embeds: [],
          components: [],
        });
        return;
      }
    }
    const verifiedRole = await guild.roles.fetch(config.verifiedRoleId).catch(() => null);
    if (!verifiedRole) {
      await interaction.update({ content: 'Verification is misconfigured. Contact an admin.', embeds: [], components: [] });
      return;
    }
    const result = await grantVerifiedRole(guild, interaction.user.id, verifiedRole);
    if (result.ok) {
      const embed = new EmbedBuilder()
        .setTitle('Verified!')
        .setDescription(result.message)
        .setColor(0x57f287)
        .setFooter({ text: 'Discord Verifier by HumanAnomaly' });
      await interaction.update({ embeds: [embed], components: [] });
      await logVerifyEvent(guild, {
        type: 'success',
        user: interaction.user,
        detail: `Verified (v2 captcha) with role ${verifiedRole.name}.`,
      });
    } else {
      await interaction.update({ content: result.message, embeds: [], components: [] });
    }
    return;
  }

  // Wrong answer.
  if (outcome.attemptsLeft > 0) {
    const retry = getChallenge(interaction.user.id);
    if (!retry) {
      await interaction.reply({
        content: 'Captcha expired. Click **Verify** again.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const prompt = String(retry.options[retry.correctIndex]);
    await interaction.update(buildCaptchaMessage(prompt, retry.options, retry.token, outcome.attemptsLeft));
    return;
  }

  // Out of attempts.
  const settings = getGuildSettings(guild.id);
  setCooldown(guild.id, interaction.user.id, 'verify');
  const embed = new EmbedBuilder()
    .setTitle('Captcha failed')
    .setDescription(
      `Out of attempts. Wait **${settings.cooldownSeconds}s**, then click **Verify** for a new captcha.`
    )
    .setColor(0xed4245)
    .setFooter({ text: 'Discord Verifier by HumanAnomaly' });
  await interaction.update({ embeds: [embed], components: [] });
  await logVerifyEvent(guild, {
    type: 'captcha_fail',
    user: interaction.user,
    detail: `Failed captcha (${CAPTCHA_MAX_ATTEMPTS} wrong attempts).`,
  });
}

function getRoleAddErrorMessage(err) {
  // discord.js exposes status/code; map the common permission/hierarchy cases to user-friendly text without leaking internals error details.
  const code = err?.code ?? err?.status;
  if (code === 50013 || code === 50001) {
    return 'The bot lacks permission to assign roles. Please contact a server admin.';
  }
  return 'Verification failed due to a Discord error. Please try again later or contact an admin.';
}
