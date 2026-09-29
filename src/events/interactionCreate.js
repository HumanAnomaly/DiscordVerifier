import { Events, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { VERIFY_BUTTON_ID } from '../utils/constants.js';
import { config } from '../utils/config.js';

export function registerInteractionCreate(client, commands) {
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        const command = commands.get(interaction.commandName);
        if (!command) return;
        await command.execute(interaction);
        return;
      }

      if (interaction.isButton() && interaction.customId === VERIFY_BUTTON_ID) {
        await handleVerifyButton(interaction);
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

async function handleVerifyButton(interaction) {
  const { guildId } = interaction;
  if (!guildId) {
    await interaction.reply({
      content: 'This button can only be used inside a server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const guild = interaction.guild ?? (await interaction.client.guilds.fetch(guildId).catch(() => null));
  if (!guild) {
    await interaction.reply({
      content: 'Could not access server information. Please try again later.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // The role ID is server-controlled config only — never derived from user input.
  const verifiedRole = await guild.roles.fetch(config.verifiedRoleId).catch(() => null);
  if (!verifiedRole) {
    await interaction.reply({
      content: 'Verification is currently misconfigured. Please contact a server admin.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const me = await guild.members.fetchMe().catch(() => null);
  if (!me) {
    await interaction.reply({
      content: 'Could not verify permissions. Please try again later.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
    await interaction.reply({
      content: 'The bot is missing the **Manage Roles** permission. Please contact a server admin.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (me.roles.highest.position <= verifiedRole.position) {
    await interaction.reply({
      content:
        'The bot cannot assign the verified role because its highest role is not above it. Please contact a server admin.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const member = interaction.member ?? (await guild.members.fetch(interaction.user.id).catch(() => null));
  if (!member) {
    await interaction.reply({
      content: 'Could not find your server profile. Try leaving and rejoining, or contact an admin.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (member.roles.cache.has(verifiedRole.id)) {
    await interaction.reply({
      content: 'You are already verified.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    await member.roles.add(verifiedRole, 'User verified via Verify button');
  } catch (err) {
    console.error('Failed to add verified role:', err);
    await interaction.reply({
      content: getRoleAddErrorMessage(err),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (config.unverifiedRoleId && member.roles.cache.has(config.unverifiedRoleId)) {
    await member.roles
      .remove(config.unverifiedRoleId, 'Unverified role removed after verification')
      .catch((err) => console.error('Failed to remove unverified role:', err.message));
  }

  await interaction.reply({
    content: `You have been verified and given the **${verifiedRole.name}** role. Welcome!`,
    flags: MessageFlags.Ephemeral,
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
