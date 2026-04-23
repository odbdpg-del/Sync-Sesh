import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiscordLocalProfile,
  getDiscordAvatarUrl,
  getDiscordDisplayName,
  getDiscordGuildMemberAvatarUrl,
} from "../src/lib/discord/user";

test("getDiscordDisplayName prefers guild nickname over global name and username", () => {
  assert.equal(
    getDiscordDisplayName({
      id: "1",
      nickname: "Server Nick",
      global_name: "Global Name",
      username: "username",
    }),
    "Server Nick",
  );

  assert.equal(
    getDiscordDisplayName({
      id: "2",
      nick: "Legacy Nick",
      global_name: "Global Name",
      username: "username",
    }),
    "Legacy Nick",
  );
});

test("getDiscordDisplayName falls back to global name then username", () => {
  assert.equal(
    getDiscordDisplayName({
      id: "3",
      global_name: "Global Name",
      username: "username",
    }),
    "Global Name",
  );

  assert.equal(
    getDiscordDisplayName({
      id: "4",
      username: "username",
    }),
    "username",
  );
});

test("getDiscordAvatarUrl keeps custom avatars and default avatars working", () => {
  assert.equal(
    getDiscordAvatarUrl({
      id: "5",
      avatar: "avatarhash",
    }),
    "https://cdn.discordapp.com/avatars/5/avatarhash.png?size=128",
  );

  const defaultAvatarUrl = getDiscordAvatarUrl({
    id: "175928847299117063",
    discriminator: "0",
  });

  assert.match(defaultAvatarUrl, /^https:\/\/cdn\.discordapp\.com\/embed\/avatars\/\d\.png$/);
});

test("getDiscordGuildMemberAvatarUrl prefers guild-scoped member avatars", () => {
  assert.equal(
    getDiscordGuildMemberAvatarUrl({
      user_id: "42",
      guild_id: "77",
      avatar: "guildavatarhash",
    }),
    "https://cdn.discordapp.com/guilds/77/users/42/avatars/guildavatarhash.png?size=128",
  );
});

test("buildDiscordLocalProfile prefers guild nickname and member avatar when present", () => {
  const profile = buildDiscordLocalProfile(
    {
      id: "42",
      username: "username",
      global_name: "Global Name",
      avatar: "useravatar",
    },
    {
      guildMember: {
        user_id: "42",
        guild_id: "77",
        nick: "Server Nick",
        avatar: "guildavatarhash",
      },
      avatarSeedBuilder: (displayName) => displayName.slice(0, 2).toUpperCase(),
    },
  );

  assert.equal(profile.id, "42");
  assert.equal(profile.displayName, "Server Nick");
  assert.equal(profile.avatarSeed, "SE");
  assert.equal(
    profile.avatarUrl,
    "https://cdn.discordapp.com/guilds/77/users/42/avatars/guildavatarhash.png?size=128",
  );
});
