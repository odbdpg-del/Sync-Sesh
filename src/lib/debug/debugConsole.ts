export type DebugLogLevel = "info" | "warn" | "error";
export type DebugLogCategory = "sdk" | "auth" | "profile" | "sync" | "network" | "command" | "ui";
export type DebugLogEntryKind = "event" | "command_input" | "command_output";

export interface DebugLogEntry {
  id: string;
  timestamp: number;
  kind: DebugLogEntryKind;
  level: DebugLogLevel;
  category: DebugLogCategory;
  label: string;
  detail?: string;
}

export interface DebugConsoleEventInput {
  kind?: DebugLogEntryKind;
  level: DebugLogLevel;
  category: DebugLogCategory;
  label: string;
  detail?: string;
}
