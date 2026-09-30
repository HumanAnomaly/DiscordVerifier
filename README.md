<p align="center">
  <img src="assets/human-anomaly.png" width="120" alt="DiscordVerifier">
</p>

<h1 align="center">Discord Verifier</h1>

<p align="center">
  Lightweight Discord verification bot with a Verify button.
</p>

<p align="center">
  <a href="https://github.com/HumanAnomaly/DiscordVerifier"><img src="https://img.shields.io/github/stars/HumanAnomaly/DiscordVerifier?style=flat-square&logo=github" alt="stars"></a>
  <a href="https://github.com/HumanAnomaly/DiscordVerifier/blob/main/LICENSE"><img src="https://img.shields.io/github/license/HumanAnomaly/DiscordVerifier?style=flat-square" alt="license"></a>
  <img src="https://img.shields.io/badge/node-18%2B-green?style=flat-square&logo=node.js" alt="node">
  <img src="https://img.shields.io/badge/discord.js-v14-blue?style=flat-square&logo=discord" alt="discord.js">
</p>

> **Simple / Starter** Admin runs `/verify-setup` once, users click **Verify**, bot assigns the verified role.



<p align="center">
  <img src="assets/example.png" alt="Discord Verifier verification panel" width="700">
  <br>
  <sub>Example of the Discord Verifier verification panel.</sub>
</p>

## Install

```bash
npm i
cp .env.example .env
npm run deploy
npm start
```

---

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Bot token |
| `CLIENT_ID` | Application ID |
| `GUILD_ID` | Server ID |
| `VERIFIED_ROLE_ID` | Role granted on verify |
| `UNVERIFIED_ROLE_ID` | Optional. New members get it on join, lose it on verify. Hide locked channels from this role via deny View Channel |

Node 18+. Intents: `Guilds` + `GuildMembers` (privileged, enable Server Members Intent in the portal).


---

### Invite

Invite with `bot` + `applications.commands` scopes and Manage Roles (`268435456`):

```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=268435456&scope=bot%20applications.commands
```

Bot role must sit above the verified role in Server Settings → Roles.

## Usage

| Script | Description |
|---|---|
| `npm run deploy` | Register guild commands |
| `npm start` | Start the bot |
| `npm run dev` | Start with `--watch` |

| Command | Description |
|---|---|
| `/verify-setup [channel]` | Seed the verification panel here or in the target channel (Administrator-only) |
| `/verify-mode <v1\|v2>` | Switch verification version: v1 direct, v2 random-button captcha (Administrator-only) |
| `/welcome-setup <channel> [enable] [goodbye]` | Welcome + goodbye embeds (Administrator-only) |
| `/verify-config [log-channel] [min-account-age-days] [cooldown-seconds]` | View/change log, account-age gate, cooldown (Administrator-only) |
| `/verify-status` | Full config + health check: IDs, roles, permission, hierarchy, channel, mode/settings (Administrator-only) |
| `/verify-help` | List commands (Administrator-only) |

> Settings from `/verify-mode`, `/welcome-setup`, `/verify-config` are stored per-server in `data/settings.json` (gitignored). Defaults = v1 behaviour (no captcha, no welcome, no log, no age gate, 10s cooldown).

## How it works

```mermaid
flowchart LR
    J[join server] --> U[unverified role, if configured]
    J --> W[welcome embed, if /welcome-setup]
    L[leave server] --> G[goodbye embed, if enabled]
    A[admin: /verify-setup] --> B[embed + Verify + Source Code buttons]
    B --> C[user clicks Verify]
    C --> D{has verified role?}
    D -->|yes| E[ephemeral: already verified]
    D -->|no| F[checks: cooldown, account age, role exists, Manage Roles, hierarchy]
    F --> M{mode?}
    M -->|v1| G1[add VERIFIED_ROLE_ID, remove unverified role]
    M -->|v2| K[captcha: click correct random button, 3 attempts, 120s]
    K -->|correct| G1
    K -->|out of attempts| K2[cooldown, retry via Verify]
    G1 --> H[ephemeral: success + log channel, if set]
```

## Structure

```
src/                  index · deploy-commands
src/commands/         verifySetup · verifyStatus · verifyHelp · verifyMode · welcomeSetup · verifyConfig
src/events/           interactionCreate · ready · guildMemberAdd · guildMemberRemove
src/utils/            config · constants · settings · captcha · cooldown · welcome · verifyLog
data/                 settings.json (runtime, gitignored)
```

## License

MIT, see [LICENSE](LICENSE).
