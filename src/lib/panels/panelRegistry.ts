import { PANEL_IDS, type PanelId, type PanelMinSize, type PanelRect } from "./panelLayout";

export type PanelDefaultDock = "left" | "right" | "bottom" | "center" | "float";

export interface PanelDefinition extends PanelMinSize {
  id: PanelId;
  title: string;
  defaultDock: PanelDefaultDock;
  defaultFloatingRect: PanelRect;
  canClose: boolean;
  canFloat: boolean;
  canDock: boolean;
  adapterKey: string;
}

export const PANEL_DEFINITIONS = {
  lobby: {
    id: "lobby",
    title: "Lobby",
    defaultDock: "left",
    defaultFloatingRect: { x: 72, y: 88, width: 560, height: 520 },
    minWidth: 1,
    minHeight: 1,
    canClose: false,
    canFloat: true,
    canDock: true,
    adapterKey: "lobby-panel",
  },
  timer: {
    id: "timer",
    title: "Timer",
    defaultDock: "right",
    defaultFloatingRect: { x: 672, y: 88, width: 820, height: 560 },
    minWidth: 1,
    minHeight: 1,
    canClose: false,
    canFloat: true,
    canDock: true,
    adapterKey: "timer-panel",
  },
  globe: {
    id: "globe",
    title: "Globe",
    defaultDock: "bottom",
    defaultFloatingRect: { x: 120, y: 120, width: 760, height: 560 },
    minWidth: 1,
    minHeight: 1,
    canClose: true,
    canFloat: true,
    canDock: true,
    adapterKey: "globe-panel",
  },
  "soundcloud-radio": {
    id: "soundcloud-radio",
    title: "SoundCloud Radio",
    defaultDock: "bottom",
    defaultFloatingRect: { x: 132, y: 132, width: 760, height: 440 },
    minWidth: 1,
    minHeight: 1,
    canClose: true,
    canFloat: true,
    canDock: true,
    adapterKey: "soundcloud-radio-panel",
  },
  "soundcloud-widget": {
    id: "soundcloud-widget",
    title: "SoundCloud Widget",
    defaultDock: "bottom",
    defaultFloatingRect: { x: 144, y: 144, width: 760, height: 440 },
    minWidth: 1,
    minHeight: 1,
    canClose: true,
    canFloat: true,
    canDock: true,
    adapterKey: "soundcloud-widget-panel",
  },
  "soundcloud-decks": {
    id: "soundcloud-decks",
    title: "SoundCloud Decks",
    defaultDock: "bottom",
    defaultFloatingRect: { x: 96, y: 96, width: 1120, height: 700 },
    minWidth: 1,
    minHeight: 1,
    canClose: true,
    canFloat: true,
    canDock: true,
    adapterKey: "soundcloud-decks-panel",
  },
  "text-voice": {
    id: "text-voice",
    title: "Text Voice",
    defaultDock: "bottom",
    defaultFloatingRect: { x: 180, y: 140, width: 520, height: 420 },
    minWidth: 1,
    minHeight: 1,
    canClose: true,
    canFloat: true,
    canDock: true,
    adapterKey: "text-voice-panel",
  },
  admin: {
    id: "admin",
    title: "Admin",
    defaultDock: "float",
    defaultFloatingRect: { x: 160, y: 120, width: 680, height: 560 },
    minWidth: 1,
    minHeight: 1,
    canClose: true,
    canFloat: true,
    canDock: true,
    adapterKey: "admin-panel",
  },
  "debug-console": {
    id: "debug-console",
    title: "Debug Console",
    defaultDock: "float",
    defaultFloatingRect: { x: 72, y: 96, width: 560, height: 420 },
    minWidth: 1,
    minHeight: 1,
    canClose: true,
    canFloat: true,
    canDock: true,
    adapterKey: "debug-console-panel",
  },
} satisfies Record<PanelId, PanelDefinition>;

export function getPanelDefinition(panelId: PanelId) {
  return PANEL_DEFINITIONS[panelId];
}

export function getPanelDefinitions() {
  return PANEL_IDS.map((panelId) => PANEL_DEFINITIONS[panelId]);
}
