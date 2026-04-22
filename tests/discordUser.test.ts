import assert from "node:assert/strict";
import test from "node:test";
import { getDiscordAvatarUrl, getDiscordDisplayName } from "../src/lib/discord/user";

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
