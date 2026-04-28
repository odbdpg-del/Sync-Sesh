import { useEffect, useMemo, useRef } from "react";
import type { ElementRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { FreeRoamPresenceState, SessionUser } from "../types/session";
import { PlayerAvatar } from "./PlayerAvatar";

const FREE_ROAM_PRESENCE_EYE_HEIGHT = 1.7;
const REMOTE_MARKER_POSITION_SMOOTHING = 9;
const REMOTE_MARKER_YAW_SMOOTHING = 10;
type MarkerVector3 = readonly [number, number, number];

function dampAngle(current: number, target: number, lambda: number, deltaSeconds: number) {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * (1 - Math.exp(-lambda * deltaSeconds));
}

export function FreeRoamPresenceMarker({
  user,
  presence,
  isHost,
}: {
  user: SessionUser;
  presence: FreeRoamPresenceState;
  isHost: boolean;
}) {
  const groupRef = useRef<ElementRef<"group">>(null);
  const hasPlacedInitialPoseRef = useRef(false);
  const floorOriginPosition = useMemo(
    () =>
      [
        presence.position[0],
        Math.max(0, presence.position[1] - FREE_ROAM_PRESENCE_EYE_HEIGHT),
        presence.position[2],
      ] as const satisfies MarkerVector3,
    [presence.position],
  );
  const targetPoseRef = useRef({
    position: floorOriginPosition,
    yaw: presence.yaw,
  });
  const identity = useMemo(
    () => ({
      id: user.id,
      displayName: user.displayName,
      avatarSeed: user.avatarSeed,
      isTestUser: user.isTestUser,
    }),
    [user.avatarSeed, user.displayName, user.id, user.isTestUser],
  );

  useEffect(() => {
    targetPoseRef.current = {
      position: floorOriginPosition,
      yaw: presence.yaw,
    };

    if (!groupRef.current || hasPlacedInitialPoseRef.current) {
      return;
    }

    groupRef.current.position.set(...floorOriginPosition);
    groupRef.current.rotation.set(0, presence.yaw, 0);
    hasPlacedInitialPoseRef.current = true;
  }, [floorOriginPosition, presence.yaw]);

  useFrame((_, deltaSeconds) => {
    const group = groupRef.current;

    if (!group) {
      return;
    }

    const target = targetPoseRef.current;
    const positionAlpha = 1 - Math.exp(-REMOTE_MARKER_POSITION_SMOOTHING * deltaSeconds);

    group.position.x += (target.position[0] - group.position.x) * positionAlpha;
    group.position.y += (target.position[1] - group.position.y) * positionAlpha;
    group.position.z += (target.position[2] - group.position.z) * positionAlpha;
    group.rotation.y = dampAngle(group.rotation.y, target.yaw, REMOTE_MARKER_YAW_SMOOTHING, deltaSeconds);
  });

  return (
    <group ref={groupRef}>
      <PlayerAvatar
        identity={identity}
        mode="remote"
        presence={user.presence}
        isHost={isHost}
        isReady={user.presence === "ready"}
        showNameplate
      />
    </group>
  );
}
