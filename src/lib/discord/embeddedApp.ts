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

const DEFAULT_SYNC_PROXY_TARGET = "sync-sesh-sync.onrender.com";
const STATIC_ACTIVITY_URL_MAPPINGS = [
  { prefix: "/soundcloud-widget", target: "w.soundcloud.com" },
  { prefix: "/soundcloud-api", target: "api.soundcloud.com" },
  { prefix: "/soundcloud-api-widget", target: "api-widget.soundcloud.com" },
  { prefix: "/soundcloud-widget-assets", target: "widget.sndcdn.com" },
  { prefix: "/soundcloud-style", target: "style.sndcdn.com" },
  { prefix: "/soundcloud-va", target: "va.sndcdn.com" },
  { prefix: "/soundcloud-wis", target: "wis.sndcdn.com" },
  { prefix: "/soundcloud-w1", target: "w1.sndcdn.com" },
  { prefix: "/soundcloud-i1", target: "i1.sndcdn.com" },
  { prefix: "/soundcloud-i2", target: "i2.sndcdn.com" },
  { prefix: "/soundcloud-i3", target: "i3.sndcdn.com" },
  { prefix: "/soundcloud-i4", target: "i4.sndcdn.com" },
  { prefix: "/soundcloud-dwt", target: "dwt.soundcloud.com" },
] as const;

let hasPatchedActivityUrlMappings = false;

function resolveSyncProxyTarget() {
  const configuredUrl = import.meta.env.VITE_SYNC_SERVER_URL;

  if (configuredUrl && configuredUrl !== "auto") {
    try {
      const parsed = new URL(configuredUrl);
      const isLocalTarget = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";

      if (!isLocalTarget) {
        return parsed.hostname;
      }
    } catch {
      // Fall back to the known hosted sync service target.
    }
  }

  return DEFAULT_SYNC_PROXY_TARGET;
}

function patchActivityUrlMappings() {
  if (hasPatchedActivityUrlMappings) {
    return;
  }

  patchUrlMappings([{ prefix: "/sync", target: resolveSyncProxyTarget() }, ...STATIC_ACTIVITY_URL_MAPPINGS]);
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
