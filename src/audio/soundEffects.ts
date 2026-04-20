export type SoundCueId =
  | "ui_join_ping"
  | "ui_ready_hold_start"
  | "ui_ready_release_cancel"
  | "state_armed_lock"
  | "count_pre_3"
  | "count_pre_2"
  | "count_pre_1"
  | "count_launch_hit"
  | "count_urgent_tick"
  | "round_complete_sting"
  | "round_reset_sweep";

export interface SoundCueDefinition {
  id: SoundCueId;
  category: "ui" | "state" | "countdown" | "round";
  label: string;
  description: string;
  priority: "low" | "medium" | "high";
}

export const SOUND_CUES: Record<SoundCueId, SoundCueDefinition> = {
  ui_join_ping: {
    id: "ui_join_ping",
    category: "ui",
    label: "Join Ping",
    description: "Confirms a local join.",
    priority: "medium",
  },
  ui_ready_hold_start: {
    id: "ui_ready_hold_start",
    category: "ui",
    label: "Ready Hold Start",
    description: "Plays when the local ready hold begins.",
    priority: "medium",
  },
  ui_ready_release_cancel: {
    id: "ui_ready_release_cancel",
    category: "ui",
    label: "Ready Release Cancel",
    description: "Plays when the local hold ends before the round is armed.",
    priority: "medium",
  },
  state_armed_lock: {
    id: "state_armed_lock",
    category: "state",
    label: "Armed Lock",
    description: "Plays when all active participants are ready.",
    priority: "high",
  },
  count_pre_3: {
    id: "count_pre_3",
    category: "countdown",
    label: "Precount Three",
    description: "First pre-count cue.",
    priority: "high",
  },
  count_pre_2: {
    id: "count_pre_2",
    category: "countdown",
    label: "Precount Two",
    description: "Second pre-count cue.",
    priority: "high",
  },
  count_pre_1: {
    id: "count_pre_1",
    category: "countdown",
    label: "Precount One",
    description: "Final pre-count cue.",
    priority: "high",
  },
  count_launch_hit: {
    id: "count_launch_hit",
    category: "countdown",
    label: "Launch Hit",
    description: "Marks transition into the main countdown.",
    priority: "high",
  },
  count_urgent_tick: {
    id: "count_urgent_tick",
    category: "countdown",
    label: "Urgent Tick",
    description: "Optional final-10-seconds urgency tick.",
    priority: "low",
  },
  round_complete_sting: {
    id: "round_complete_sting",
    category: "round",
    label: "Round Complete",
    description: "Plays when the countdown reaches zero.",
    priority: "high",
  },
  round_reset_sweep: {
    id: "round_reset_sweep",
    category: "round",
    label: "Reset Sweep",
    description: "Plays when the session is reset back to lobby.",
    priority: "medium",
  },
};

export const SOUND_TRIGGER_NOTES: Record<SoundCueId, string> = {
  ui_join_ping: "Trigger after a successful local join.",
  ui_ready_hold_start: "Trigger when the local hold begins.",
  ui_ready_release_cancel: "Trigger when the local hold ends before ARMED.",
  state_armed_lock: "Trigger on transition into armed.",
  count_pre_3: "Trigger when the pre-count headline becomes 3.",
  count_pre_2: "Trigger when the pre-count headline becomes 2.",
  count_pre_1: "Trigger when the pre-count headline becomes 1.",
  count_launch_hit: "Trigger on phase change from precount to countdown.",
  count_urgent_tick: "Trigger once per second during the final 10 seconds.",
  round_complete_sting: "Trigger on phase change to completed.",
  round_reset_sweep: "Trigger when replay/reset returns to lobby.",
};
