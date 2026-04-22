export type UserPresenceState = "idle" | "ready" | "spectating";
export type SessionPhase = "idle" | "lobby" | "armed" | "precount" | "countdown" | "completed";
export type SyncTransportMode = "mock" | "ws";
export type SyncConnectionState = "offline" | "connecting" | "connected" | "error";

export interface SessionUser {
  id: string;
  displayName: string;
  avatarSeed: string;
  avatarUrl?: string;
  presence: UserPresenceState;
  isHost: boolean;
  isTestUser?: boolean;
  joinedAt: string;
}

export interface LocalProfile {
  id: string;
  displayName: string;
  avatarSeed: string;
  avatarUrl?: string;
}

export interface TimerConfig {
  durationSeconds: number;
  preCountSeconds: number;
  allowLateJoinSpectators: boolean;
  lateJoinersJoinReady: boolean;
  autoJoinOnLoad: boolean;
  presets: number[];
  preCountPresets: number[];
}

export interface CountdownTimeline {
  preCountStartAt?: string;
  countdownStartAt?: string;
  countdownEndAt?: string;
  completedAt?: string;
  triggeredByUserId?: string;
}

export interface SessionInfo {
  id: string;
  code: string;
  phase: SessionPhase;
  roundNumber: number;
  ownerId: string;
  capacity: {
    min: number;
    max: number;
  };
}

export interface SessionMetrics {
  readyCount: number;
  spectatorCount: number;
  activeCount: number;
  idleCount: number;
}

export interface RangeScoreSubmission {
  levelId: string;
  score: number;
  shots: number;
  hits: number;
  misses: number;
  accuracy: number;
  durationMs: number;
}

export interface RangeScoreResult extends RangeScoreSubmission {
  roundNumber: number;
  completedAt: string;
  userId: string;
  displayName: string;
  avatarSeed: string;
  avatarUrl?: string;
  isTestUser?: boolean;
}

export interface FreeRoamPresenceUpdate {
  levelId: string;
  position: readonly [number, number, number];
  yaw: number;
}

export interface FreeRoamPresenceState extends FreeRoamPresenceUpdate {
  userId: string;
  updatedAt: string;
}

export interface SyncStatus {
  mode: SyncTransportMode;
  connection: SyncConnectionState;
  lastEventAt?: string;
  latencyMs?: number;
  serverTimeOffsetMs?: number;
  warning?: string;
}

export interface SessionSnapshot {
  session: SessionInfo;
  users: SessionUser[];
  timerConfig: TimerConfig;
  countdown: CountdownTimeline;
  rangeScoreboard: RangeScoreResult[];
  freeRoamPresence: FreeRoamPresenceState[];
}

export interface DabSyncState extends SessionSnapshot {
  syncStatus: SyncStatus;
  localProfile: LocalProfile;
}

export interface DerivedLobbyState {
  localUser?: SessionUser;
  metrics: SessionMetrics;
  isJoined: boolean;
  isLocalHost: boolean;
  canUseAdminTools: boolean;
  isLocalUserReady: boolean;
  isLocalUserSpectating: boolean;
  canJoinSession: boolean;
  canHoldToReady: boolean;
  canEditTimer: boolean;
  canResetRound: boolean;
  isArmed: boolean;
  releaseStartsCountdown: boolean;
  lateJoinersSpectating: boolean;
  instructions: string[];
}

export interface CountdownDisplayState {
  phase: SessionPhase;
  headline: string;
  subheadline: string;
  timerText: string;
  accentText?: string;
  isUrgent: boolean;
}

export type SessionEvent =
  | { type: "join_session" }
  | { type: "leave_session" }
  | { type: "ready_hold_start" }
  | { type: "ready_hold_end" }
  | { type: "set_timer_duration"; durationSeconds: number }
  | { type: "set_precount_duration"; preCountSeconds: number }
  | { type: "reset_round" }
  | { type: "admin_force_start_round" }
  | { type: "admin_force_complete_round" }
  | { type: "admin_reset_session" }
  | { type: "admin_add_test_participant" }
  | { type: "admin_toggle_test_participants_ready" }
  | { type: "admin_clear_test_participants" }
  | { type: "admin_set_late_joiners_join_ready"; enabled: boolean }
  | { type: "admin_set_auto_join_on_load"; enabled: boolean }
  | { type: "range_score_submit"; result: RangeScoreSubmission }
  | { type: "free_roam_presence_update"; presence: FreeRoamPresenceUpdate }
  | { type: "free_roam_presence_clear" };
