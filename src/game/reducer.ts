import {
  AUTONOMOUS_TAKEOVER_DIALOGUE_ID,
  getAutonomousTaskIds,
  getProposalReaction,
} from "../content/proposals";
import {
  getFieldRouteContent,
  getNextTerminalEncounterPosition,
} from "../content/field-mission/routes";
import { getDialogue } from "../content/field-mission/dialogue/loader";
import { TASKS } from "../content/tasks";
import { createInitialState } from "./state";
import type {
  Actor,
  GameAction,
  GameState,
  TaskDefinition,
  TaskId,
} from "../types/game";

export function getTask(taskId: TaskId): TaskDefinition {
  return TASKS.find((task) => task.id === taskId)!;
}

export function getAvailableTasks(state: GameState): TaskDefinition[] {
  const scheduledTaskIds = new Set(getScheduledTaskIds(state));
  return TASKS.filter(
    (task) =>
      task.id !== "terminalSearch" &&
      !state.completedTaskIds.includes(task.id) &&
      !scheduledTaskIds.has(task.id) &&
      (task.id !== "terminalLocationSearch" || state.discoveredTerminalConcept) &&
      (task.requires ?? []).every((evidenceId) =>
        state.discoveredEvidence.includes(evidenceId),
      ),
  );
}

export function getScheduledTaskIds(state: GameState): TaskId[] {
  return [
    ...Object.values(state.activeTasks)
      .filter((task): task is NonNullable<typeof task> => task !== null)
      .map((task) => task.taskId),
    ...Object.values(state.queuedTasks).flat(),
  ];
}

export function getNextCompletionMinutes(state: GameState): number | null {
  // A planned task for an idle actor starts when the player presses the
  // advance button. Include its duration in the preview so the button can be
  // enabled before anything is active, without mutating game state.
  const remaining = (Object.keys(state.activeTasks) as Actor[])
    .map((actor) => {
      const activeTask = state.activeTasks[actor];
      if (activeTask) return activeTask.remainingMinutes;
      const nextTaskId = state.queuedTasks[actor][0];
      return nextTaskId ? getTask(nextTaskId).durationMinutes : null;
    })
    .filter((minutes): minutes is number => minutes !== null);
  return remaining.length > 0 ? Math.min(...remaining) : null;
}

export function isActorBusy(state: GameState, actor: Actor): boolean {
  return state.activeTasks[actor] !== null;
}

export function advanceElapsedTime(
  state: GameState,
  elapsedMinutes: number,
): GameState {
  if (elapsedMinutes <= 0) return state;

  const activeTasks = { ...state.activeTasks };
  const completedTaskIds = [...state.completedTaskIds];
  const discoveredEvidence = [...state.discoveredEvidence];
  const recentlyCompleted: TaskId[] = [];

  (Object.entries(activeTasks) as [
    Actor,
    GameState["activeTasks"][Actor],
  ][]).forEach(([actor, activeTask]) => {
    if (!activeTask) return;
    if (activeTask.remainingMinutes > elapsedMinutes) {
      activeTasks[actor] = {
        ...activeTask,
        remainingMinutes: activeTask.remainingMinutes - elapsedMinutes,
      };
      return;
    }

    const task = getTask(activeTask.taskId);
    if (!completedTaskIds.includes(task.id)) completedTaskIds.push(task.id);
    if (
      task.result.evidenceId &&
      !discoveredEvidence.includes(task.result.evidenceId)
    ) {
      discoveredEvidence.push(task.result.evidenceId);
    }
    recentlyCompleted.push(task.id);
    activeTasks[actor] = null;
  });

  return {
    ...state,
    clockMinutes: state.clockMinutes + elapsedMinutes,
    activeTasks,
    completedTaskIds,
    discoveredEvidence,
    recentlyCompleted,
    rejectionPressure:
      discoveredEvidence.length > state.discoveredEvidence.length
        ? 0
        : state.rejectionPressure,
  };
}

function completeFieldVisit(state: GameState): GameState {
  const proposalId = state.pendingFieldVisit;
  if (!proposalId || state.exploredRoutes[proposalId]) return state;

  const route = getFieldRouteContent(proposalId);
  const elapsedState = advanceElapsedTime(state, route.durationMinutes);
  const discoveredEvidence = [...elapsedState.discoveredEvidence];
  route.reportResult.evidenceIds.forEach((evidenceId) => {
    if (!discoveredEvidence.includes(evidenceId)) discoveredEvidence.push(evidenceId);
  });

  return {
    ...elapsedState,
    exploredRoutes: {
      ...elapsedState.exploredRoutes,
      [proposalId]: true,
    },
    pendingFieldVisit: null,
    discoveredEvidence,
    discoveredTerminalConcept: true,
    firstTerminalDiscoverySource:
      elapsedState.firstTerminalDiscoverySource ?? proposalId,
    refrigerationEmergencyMitigated:
      elapsedState.refrigerationEmergencyMitigated || proposalId === "refrigeration",
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "ADVANCE_DIALOGUE": {
      const isLastLine = state.dialogueIndex >= state.dialogue.length - 1;
      if (isLastLine) {
        const completedState = completeFieldVisit(state);
        return {
          ...completedState,
          view: "report",
          dialogue: [],
          dialogueIndex: 0,
        };
      }
      return { ...state, dialogueIndex: state.dialogueIndex + 1 };
    }

    case "PLAN_TASK": {
      const task = getTask(action.taskId);
      const canStart = getAvailableTasks(state).some((item) => item.id === task.id);
      if (!canStart) return state;

      // Planning only records work. The clock and activeTasks move only in
      // ADVANCE_TO_NEXT_COMPLETION.
      return {
        ...state,
        queuedTasks: {
          ...state.queuedTasks,
          [task.actor]: [...state.queuedTasks[task.actor], task.id],
        },
        // A new plan means the previous completion toast is no longer the
        // current planning context. The completed result remains available
        // through completedTaskIds/discoveredEvidence.
        recentlyCompleted: [],
      };
    }

    case "REMOVE_PLANNED_TASK": {
      const task = getTask(action.taskId);
      const queue = state.queuedTasks[task.actor];
      if (!queue.includes(action.taskId)) return state;

      return {
        ...state,
        queuedTasks: {
          ...state.queuedTasks,
          [task.actor]: queue.filter((taskId) => taskId !== action.taskId),
        },
      };
    }

    case "MOVE_PLANNED_TASK": {
      const queue = state.queuedTasks[action.actor];
      const { fromIndex, toIndex } = action;
      if (
        fromIndex < 0 ||
        fromIndex >= queue.length ||
        toIndex < 0 ||
        toIndex >= queue.length ||
        fromIndex === toIndex
      ) {
        return state;
      }

      const nextQueue = [...queue];
      const [movedTask] = nextQueue.splice(fromIndex, 1);
      nextQueue.splice(toIndex, 0, movedTask);

      return {
        ...state,
        queuedTasks: {
          ...state.queuedTasks,
          [action.actor]: nextQueue,
        },
      };
    }

    case "ADVANCE_TO_NEXT_COMPLETION": {
      // Starting planned work and advancing the clock are one explicit player
      // action. Start at most one queued task for each idle actor, at the
      // current clock time; never start work while planning it.
      const activeTasks = { ...state.activeTasks };
      const queuedTasks = {
        mira: [...state.queuedTasks.mira],
        seoyun: [...state.queuedTasks.seoyun],
      };

      (Object.keys(activeTasks) as Actor[]).forEach((actor) => {
        if (activeTasks[actor] !== null) return;
        const nextTaskId = queuedTasks[actor].shift();
        if (!nextTaskId) return;
        const nextTask = getTask(nextTaskId);
        activeTasks[actor] = {
          taskId: nextTask.id,
          actor,
          remainingMinutes: nextTask.durationMinutes,
        };
      });

      const startedState = { ...state, activeTasks, queuedTasks };
      const step = getNextCompletionMinutes(startedState);
      if (step === null) return state;

       return advanceElapsedTime(startedState, step);
    }

    case "PROPOSE_ACTION": {
      if (
        state.pendingFieldVisit ||
        state.exploredRoutes[action.proposalId] ||
        state.activeTasks.seoyun
      ) {
        return state;
      }

      const selectedEvidenceIds = [...new Set(action.evidenceIds)].slice(0, 3);
      const reaction = getProposalReaction(state, action.proposalId, selectedEvidenceIds);
      const nextPressure = reaction.outcome === "rejected" ? state.rejectionPressure + 1 : 0;
      const shouldTakeOver = nextPressure >= 3;
      const queuedTasks = {
        mira: [...state.queuedTasks.mira],
        seoyun: [...state.queuedTasks.seoyun],
      };

      if (shouldTakeOver) {
        const scheduledTaskIds = new Set(getScheduledTaskIds(state));
        getAutonomousTaskIds(state).forEach((taskId) => {
          const task = getTask(taskId);
          const canPlan = getAvailableTasks(state).some((availableTask) => availableTask.id === taskId);
          if (!canPlan || scheduledTaskIds.has(taskId)) return;
          queuedTasks[task.actor].push(taskId);
          scheduledTaskIds.add(taskId);
        });
      }

      const route = getFieldRouteContent(action.proposalId);
      const reactionDialogue = getDialogue(reaction.dialogueId);
      const dialogue =
        reaction.outcome === "accepted"
          ? [
              ...reactionDialogue,
              ...getDialogue(route.fieldEntryDialogueId),
              ...getDialogue(
                route.fieldDialogueIds[getNextTerminalEncounterPosition(state)],
              ),
            ]
          : reactionDialogue;

      return {
        ...state,
        view: "vn",
        dialogue: shouldTakeOver
          ? [...dialogue, ...getDialogue(AUTONOMOUS_TAKEOVER_DIALOGUE_ID)]
          : dialogue,
        dialogueIndex: 0,
        lastOpinion: action.proposalId,
        queuedTasks,
        pendingFieldVisit:
          reaction.outcome === "accepted" ? action.proposalId : null,
        rejectionPressure: shouldTakeOver ? 0 : nextPressure,
      };
    }

    case "RESTART":
      return createInitialState();

    default:
      return state;
  }
}
