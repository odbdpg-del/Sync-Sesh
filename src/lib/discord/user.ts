export interface DiscordUserLike {
  id: string;
  username?: string | null;
  global_name?: string | null;
  discriminator?: string | null;
  avatar?: string | null;
}

export function getDiscordDisplayName(user: DiscordUserLike): string {
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
