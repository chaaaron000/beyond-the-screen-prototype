import { getOpinionDialogue } from "../content/dialogue/opinions";
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
  return TASKS.filter(
    (task) =>
      !state.completedTaskIds.includes(task.id) &&
      (task.requires ?? []).every((evidenceId) =>
        state.discoveredEvidence.includes(evidenceId),
      ),
  );
}

export function getNextCompletionMinutes(state: GameState): number | null {
  const remaining = Object.values(state.activeTasks)
    .filter((task): task is NonNullable<typeof task> => task !== null)
    .map((task) => task.remainingMinutes);
  return remaining.length > 0 ? Math.min(...remaining) : null;
}

export function isActorBusy(state: GameState, actor: Actor): boolean {
  return state.activeTasks[actor] !== null;
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "ADVANCE_DIALOGUE": {
      const isLastLine = state.dialogueIndex >= state.dialogue.length - 1;
      if (isLastLine) {
        return {
          ...state,
          view: "report",
          dialogue: [],
          dialogueIndex: 0,
        };
      }
      return { ...state, dialogueIndex: state.dialogueIndex + 1 };
    }

    case "START_TASK": {
      const task = getTask(action.taskId);
      const canStart = getAvailableTasks(state).some((item) => item.id === task.id);
      if (!canStart || isActorBusy(state, task.actor)) return state;

      // Scheduling only records work. The clock moves in ADVANCE_TO_NEXT_COMPLETION.
      return {
        ...state,
        activeTasks: {
          ...state.activeTasks,
          [task.actor]: {
            taskId: task.id,
            actor: task.actor,
            remainingMinutes: task.durationMinutes,
          },
        },
        recentlyCompleted: [],
      };
    }

    case "ADVANCE_TO_NEXT_COMPLETION": {
      const step = getNextCompletionMinutes(state);
      if (step === null) return state;

      const completedNow = (Object.entries(state.activeTasks) as [
        Actor,
        GameState["activeTasks"][Actor],
      ][]).filter(([, task]) => task !== null && task.remainingMinutes === step);
      const completedTaskIds = [...state.completedTaskIds];
      const discoveredEvidence = [...state.discoveredEvidence];
      const activeTasks = { ...state.activeTasks };

      completedNow.forEach(([actor, activeTask]) => {
        if (!activeTask) return;
        const task = getTask(activeTask.taskId);
        if (!completedTaskIds.includes(task.id)) completedTaskIds.push(task.id);
        if (
          task.result.evidenceId &&
          !discoveredEvidence.includes(task.result.evidenceId)
        ) {
          discoveredEvidence.push(task.result.evidenceId);
        }
        activeTasks[actor] = null;
      });

      (Object.entries(activeTasks) as [
        Actor,
        GameState["activeTasks"][Actor],
      ][]).forEach(([actor, task]) => {
        if (task) {
          activeTasks[actor] = {
            ...task,
            remainingMinutes: task.remainingMinutes - step,
          };
        }
      });

      return {
        ...state,
        clockMinutes: state.clockMinutes + step,
        activeTasks,
        completedTaskIds,
        discoveredEvidence,
        recentlyCompleted: completedNow.map(([, task]) => task!.taskId),
      };
    }

    case "CHOOSE_OPINION":
      return {
        ...state,
        view: "vn",
        dialogue: getOpinionDialogue(state, action.opinion),
        dialogueIndex: 0,
        lastOpinion: action.opinion,
      };

    case "RESTART":
      return createInitialState();

    default:
      return state;
  }
}
