import type { LocalPatchCable } from "./useLocalDawState";

export type PatchPortWorldPosition = readonly [number, number, number];

export type PatchPortRegistrationKind =
  | "instrument-output"
  | "mic-output"
  | "mixer-input"
  | "mixer-output"
  | "interface-input"
  | "interface-output"
  | "speaker-input";

export interface PatchPortRegistration {
  portId: string;
  label: string;
  kind: PatchPortRegistrationKind;
  worldPosition: PatchPortWorldPosition;
  visualRadius: number;
}

export type PatchPortRegistrationMap = Record<string, PatchPortRegistration>;

export interface PatchCableWorldEndpoints {
  from: PatchPortWorldPosition;
  to: PatchPortWorldPosition;
}

export const LEVEL1_PATCH_PORT_REGISTRATIONS: readonly PatchPortRegistration[] = [
  {
    portId: "piano-out",
    label: "Piano Out",
    kind: "instrument-output",
    worldPosition: [-15.65, 0.86, -1.35],
    visualRadius: 0.08,
  },
  {
    portId: "kick-mic-out",
    label: "Kick Mic Out",
    kind: "mic-output",
    worldPosition: [-14.35, 0.5, 0.58],
    visualRadius: 0.06,
  },
  {
    portId: "snare-mic-out",
    label: "Snare Mic Out",
    kind: "mic-output",
    worldPosition: [-14.9, 0.84, 0.72],
    visualRadius: 0.06,
  },
  {
    portId: "hat-mic-out",
    label: "Hat Mic Out",
    kind: "mic-output",
    worldPosition: [-15.4, 1.1, 0.8],
    visualRadius: 0.06,
  },
  {
    portId: "overhead-left-mic-out",
    label: "OH L Mic Out",
    kind: "mic-output",
    worldPosition: [-14.97, 1.62, 1.3],
    visualRadius: 0.06,
  },
  {
    portId: "overhead-right-mic-out",
    label: "OH R Mic Out",
    kind: "mic-output",
    worldPosition: [-13.73, 1.62, 1.3],
    visualRadius: 0.06,
  },
  {
    portId: "drum-mixer-kick-in",
    label: "Kick In",
    kind: "mixer-input",
    worldPosition: [-13.18, 0.7, 1.72],
    visualRadius: 0.055,
  },
  {
    portId: "drum-mixer-snare-in",
    label: "Snare In",
    kind: "mixer-input",
    worldPosition: [-13.08, 0.7, 1.72],
    visualRadius: 0.055,
  },
  {
    portId: "drum-mixer-hat-in",
    label: "Hat In",
    kind: "mixer-input",
    worldPosition: [-12.98, 0.7, 1.74],
    visualRadius: 0.055,
  },
  {
    portId: "drum-mixer-overhead-left-in",
    label: "OH L In",
    kind: "mixer-input",
    worldPosition: [-13.18, 0.78, 1.84],
    visualRadius: 0.055,
  },
  {
    portId: "drum-mixer-overhead-right-in",
    label: "OH R In",
    kind: "mixer-input",
    worldPosition: [-13.02, 0.78, 1.86],
    visualRadius: 0.055,
  },
  {
    portId: "drum-mixer-out",
    label: "Drum Mix Out",
    kind: "mixer-output",
    worldPosition: [-13.16, 0.72, 1.78],
    visualRadius: 0.065,
  },
  {
    portId: "audio-interface-input-1",
    label: "IN 1",
    kind: "interface-input",
    worldPosition: [-22.01, 0.92, -2.33],
    visualRadius: 0.06,
  },
  {
    portId: "audio-interface-input-2",
    label: "IN 2",
    kind: "interface-input",
    worldPosition: [-22.01, 0.92, -2.18],
    visualRadius: 0.06,
  },
  {
    portId: "audio-interface-input-3",
    label: "IN 3",
    kind: "interface-input",
    worldPosition: [-22.01, 0.92, -2.03],
    visualRadius: 0.06,
  },
  {
    portId: "audio-interface-input-4",
    label: "IN 4",
    kind: "interface-input",
    worldPosition: [-22.01, 0.92, -1.88],
    visualRadius: 0.06,
  },
  {
    portId: "audio-interface-out",
    label: "OUT",
    kind: "interface-output",
    worldPosition: [-21.66, 0.92, -1.88],
    visualRadius: 0.065,
  },
  {
    portId: "speaker-system-input",
    label: "Speaker In",
    kind: "speaker-input",
    worldPosition: [-14.35, 1.02, 2.36],
    visualRadius: 0.075,
  },
] as const;

export function createPatchPortRegistrationMap(
  registrations: readonly PatchPortRegistration[],
): PatchPortRegistrationMap {
  return registrations.reduce<PatchPortRegistrationMap>((map, registration) => {
    map[registration.portId] = registration;
    return map;
  }, {});
}

export const LEVEL1_PATCH_PORT_REGISTRATION_MAP = createPatchPortRegistrationMap(
  LEVEL1_PATCH_PORT_REGISTRATIONS,
);

export function getPatchPortRegistration(
  portId: string,
  registrations: PatchPortRegistrationMap = LEVEL1_PATCH_PORT_REGISTRATION_MAP,
): PatchPortRegistration | undefined {
  return registrations[portId];
}

export function getPatchPortWorldPosition(
  portId: string,
  registrations: PatchPortRegistrationMap = LEVEL1_PATCH_PORT_REGISTRATION_MAP,
): PatchPortWorldPosition | undefined {
  return getPatchPortRegistration(portId, registrations)?.worldPosition;
}

export function getPatchCableWorldEndpoints(
  cable: Pick<LocalPatchCable, "fromPortId" | "toPortId">,
  registrations: PatchPortRegistrationMap = LEVEL1_PATCH_PORT_REGISTRATION_MAP,
): PatchCableWorldEndpoints | undefined {
  if (cable.fromPortId === null || cable.toPortId === null) {
    return undefined;
  }

  const from = getPatchPortWorldPosition(cable.fromPortId, registrations);
  const to = getPatchPortWorldPosition(cable.toPortId, registrations);

  if (!from || !to) {
    return undefined;
  }

  return { from, to };
}
