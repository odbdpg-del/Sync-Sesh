import { useMemo, useRef } from "react";
import type { ElementRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { LevelConfig } from "./levels";
import { getSimBotRoamingPose } from "./simBotRoaming";
import type { SessionUser } from "../types/session";
import { PlayerAvatar } from "./PlayerAvatar";

export function SimBotRoamingMarker({
  user,
  levelConfig,
  isHost,
}: {
  user: SessionUser;
  levelConfig: LevelConfig;
  isHost: boolean;
}) {
  const groupRef = useRef<ElementRef<"group">>(null);
  const identity = useMemo(
    () => ({
      id: user.id,
      displayName: user.displayName,
      avatarSeed: user.avatarSeed,
      isTestUser: true,
    }),
    [user.avatarSeed, user.displayName, user.id],
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) {
      return;
    }

    const pose = getSimBotRoamingPose({
      user,
      levelConfig,
      elapsedSeconds: clock.getElapsedTime(),
    });

    if (!pose) {
      groupRef.current.visible = false;
      return;
    }

    groupRef.current.visible = true;
    groupRef.current.position.set(...pose.position);
    groupRef.current.rotation.set(0, pose.yaw, 0);
  });

  return (
    <group ref={groupRef}>
      <PlayerAvatar
        identity={identity}
        mode="sim"
        presence={user.presence}
        isHost={isHost}
        isReady={user.presence === "ready"}
        showNameplate
      />
    </group>
  );
}
