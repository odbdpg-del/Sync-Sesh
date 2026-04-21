import { DiscordSDK, patchUrlMappings } from "@discord/embedded-app-sdk";
import type { LocalProfile } from "../../types/session";
import { getDiscordAvatarUrl, getDiscordDisplayName } from "./user";
import { buildAvatarSeed, getLocalProfile, persistLocalProfile } from "../session/localProfile";

export interface EmbeddedAppState {
  enabled: boolean;
  sdk?: DiscordSDK;
  channelId?: string;
  guildId?: string;
  instanceId?: string;
  localProfile?: LocalProfile;
}

const ACTIVITY_URL_MAPPINGS = [
  { prefix: "/sync", target: "sync-sesh.onrender.com" },
  { prefix: "/soundcloud-widget", target: "w.soundcloud.com" },
  { prefix: "/soundcloud-api", target: "api.soundcloud.com" },
];

let hasPatchedActivityUrlMappings = false;

function patchActivityUrlMappings() {
  if (hasPatchedActivityUrlMappings) {
    return;
  }

  patchUrlMappings(ACTIVITY_URL_MAPPINGS);
  hasPatchedActivityUrlMappings = true;
}

async function resolveDiscordLocalProfile(sdk: DiscordSDK): Promise<LocalProfile | undefined> {
  try {
    const auth = await sdk.commands.authenticate({});

    return {
      id: auth.user.id,
      displayName: getDiscordDisplayName(auth.user),
      avatarSeed: buildAvatarSeed(getDiscordDisplayName(auth.user)),
      avatarUrl: getDiscordAvatarUrl(auth.user),
    };
  } catch {
    try {
      const { participants } = await sdk.commands.getInstanceConnectedParticipants();

      if (participants.length !== 1) {
        return undefined;
      }

      const participant = participants[0];

      return {
        id: participant.id,
        displayName: getDiscordDisplayName(participant),
        avatarSeed: buildAvatarSeed(getDiscordDisplayName(participant)),
        avatarUrl: getDiscordAvatarUrl(participant),
      };
    } catch {
      return undefined;
    }
  }
}

export async function initializeEmbeddedApp(): Promise<EmbeddedAppState> {
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
  const enabled = import.meta.env.VITE_ENABLE_DISCORD_SDK === "true";

  if (!enabled || !clientId) {
    return { enabled: false, localProfile: getLocalProfile() };
  }

  patchActivityUrlMappings();

  const sdk = new DiscordSDK(clientId);
  await sdk.ready();
  const localProfile = (await resolveDiscordLocalProfile(sdk)) ?? getLocalProfile();
  persistLocalProfile(localProfile);

  return {
    enabled: true,
    sdk,
    channelId: sdk.channelId ?? undefined,
    guildId: sdk.guildId ?? undefined,
    instanceId: sdk.instanceId ?? undefined,
    localProfile,
  };
}
