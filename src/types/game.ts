export type Actor = "mira" | "seoyun";
export type ViewMode = "vn" | "report";
export type Speaker = Actor | "player" | "narrator";

export type Opinion =
  | "power"
  | "motorcycle"
  | "refrigeration";

export type ProposalId = Opinion;
export type EvidenceRelation = "supports" | "complicates" | "irrelevant";
export type ProposalOutcome = "accepted" | "considering" | "rejected";

export type EvidenceId =
  | "refrigerationLimit"
  | "refrigerationWarmingConfirmed"
  | "refrigerationEmergencyMitigation"
  | "refrigerationControlDependency"
  | "powerTerminalRequirement"
  | "motorcycleCondition"
  | "motorcycleLightingDependency"
  | "powerEntranceStatus"
  | "terminalLocation"
  | "terminalConfirmed";

export type TaskId =
  | "powerAnalysis"
  | "refrigerationAnalysis"
  | "motorcycleInspection"
  | "powerEntranceInspection"
  | "terminalLocationSearch"
  | "terminalSearch";

export interface DialogueLine {
  speaker: Speaker;
  text: string;
}

export interface EvidenceRecord {
  id: EvidenceId;
  title: string;
  source: string;
  detail: string;
}

export interface TaskDefinition {
  id: TaskId;
  actor: Actor;
  title: string;
  durationMinutes: number;
  description: string;
  requires?: EvidenceId[];
  result: {
    summary: string;
    evidenceId?: EvidenceId;
  };
}

export interface ActiveTask {
  taskId: TaskId;
  actor: Actor;
  remainingMinutes: number;
}

export type ExploredRouteRecord = Record<ProposalId, boolean>;

export interface GameState {
  view: ViewMode;
  clockMinutes: number;
  activeTasks: Record<Actor, ActiveTask | null>;
  queuedTasks: Record<Actor, TaskId[]>;
  completedTaskIds: TaskId[];
  discoveredEvidence: EvidenceId[];
  recentlyCompleted: TaskId[];
  dialogue: DialogueLine[];
  dialogueIndex: number;
  lastOpinion: Opinion | null;
  rejectionPressure: number;
  exploredRoutes: ExploredRouteRecord;
  pendingFieldVisit: ProposalId | null;
  discoveredTerminalConcept: boolean;
  firstTerminalDiscoverySource: ProposalId | null;
  refrigerationEmergencyMitigated: boolean;
}

export type GameAction =
  | { type: "ADVANCE_DIALOGUE" }
  /** Add an available task to its actor's planned queue. Does not start it. */
  | { type: "PLAN_TASK"; taskId: TaskId }
  /** Remove a task that has not started from its actor's planned queue. */
  | { type: "REMOVE_PLANNED_TASK"; taskId: TaskId }
  /** Move a task within its actor's planned queue. */
  | { type: "MOVE_PLANNED_TASK"; actor: Actor; fromIndex: number; toIndex: number }
  | { type: "ADVANCE_TO_NEXT_COMPLETION" }
  | { type: "PROPOSE_ACTION"; proposalId: ProposalId; evidenceIds: EvidenceId[] }
  | { type: "RESTART" };
