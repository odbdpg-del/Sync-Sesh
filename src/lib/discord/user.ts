import type { LocalProfile } from "../../types/session";

export interface DiscordUserLike {
  id: string;
  username?: string | null;
  global_name?: string | null;
  nick?: string | null;
  nickname?: string | null;
  discriminator?: string | null;
  avatar?: string | null;
}

export interface DiscordGuildMemberLike {
  user_id: string;
  guild_id: string;
  nick?: string | null;
  avatar?: string | null;
}

export function getDiscordDisplayName(user: DiscordUserLike): string {
  const guildNickname = user.nickname?.trim() || user.nick?.trim();

  if (guildNickname) {
    return guildNickname;
  }

  const globalName = user.global_name?.trim();

  if (globalName) {
    return globalName;
  }

  const username = user.username?.trim();

  if (username) {
    return username;
  }

  return "Unknown User";
}

export function getDiscordLegacyTag(user: DiscordUserLike): string {
  const username = user.username?.trim() || "unknown";
  const discriminator = user.discriminator?.trim();

  if (!discriminator || discriminator === "0") {
    return username;
  }

  return `${username}#${discriminator}`;
}

function getDiscordDefaultAvatarUrl(user: Pick<DiscordUserLike, "id" | "discriminator">) {
  const discriminator = user.discriminator?.trim();
  const index =
    discriminator && discriminator !== "0"
      ? Number(discriminator) % 5
      : Number((BigInt(user.id) >> 22n) % 6n);

  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

export function getDiscordAvatarUrl(user: DiscordUserLike, size = 128): string {
  if (user.avatar) {
    const ext = user.avatar.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=${size}`;
  }

  return getDiscordDefaultAvatarUrl(user);
}

export function getDiscordGuildMemberAvatarUrl(member: DiscordGuildMemberLike, size = 128): string | undefined {
  if (!member.avatar) {
    return undefined;
  }

  const ext = member.avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/guilds/${member.guild_id}/users/${member.user_id}/avatars/${member.avatar}.${ext}?size=${size}`;
}

export function buildDiscordLocalProfile(
  user: DiscordUserLike,
  options?: {
    guildMember?: DiscordGuildMemberLike;
    avatarSeedBuilder?: (displayName: string) => string;
  },
): LocalProfile {
  const displayName = getDiscordDisplayName({
    ...user,
    nick: options?.guildMember?.nick ?? user.nick,
  });
  const avatarUrl = options?.guildMember ? getDiscordGuildMemberAvatarUrl(options.guildMember) : undefined;

  return {
    id: user.id,
    displayName,
    avatarSeed: options?.avatarSeedBuilder?.(displayName) ?? "DX",
    avatarUrl: avatarUrl ?? getDiscordAvatarUrl(user),
  };
}
