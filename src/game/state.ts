import { getDialogue } from "../content/field-mission/dialogue/loader";
import { INITIAL_CLOCK_MINUTES } from "./clock";
import type { GameState } from "../types/game";

export function createInitialState(): GameState {
  return {
    view: "vn",
    clockMinutes: INITIAL_CLOCK_MINUTES,
    activeTasks: {
      mira: null,
      seoyun: null,
    },
    queuedTasks: {
      mira: [],
      seoyun: [],
    },
    completedTaskIds: [],
    taskCompletionLog: [],
    discoveredEvidence: [],
    recentlyCompleted: [],
    dialogue: getDialogue("opening"),
    dialogueIndex: 0,
    lastOpinion: null,
    rejectionPressure: 0,
    exploredRoutes: {
      power: false,
      motorcycle: false,
      refrigeration: false,
    },
    pendingFieldVisit: null,
    discoveredTerminalConcept: false,
    firstTerminalDiscoverySource: null,
    refrigerationEmergencyMitigated: false,
  };
}
