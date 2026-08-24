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
  const scheduledTaskIds = new Set(getScheduledTaskIds(state));
  return TASKS.filter(
    (task) =>
      !state.completedTaskIds.includes(task.id) &&
      !scheduledTaskIds.has(task.id) &&
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

    case "START_TASK":
    case "QUEUE_TASK": {
      const task = getTask(action.taskId);
      const canStart = getAvailableTasks(state).some((item) => item.id === task.id);
      if (!canStart) return state;

      // Scheduling only records work. The clock moves in ADVANCE_TO_NEXT_COMPLETION.
      const activeTask = state.activeTasks[task.actor];
      const queuedTasks = {
        ...state.queuedTasks,
        [task.actor]: activeTask
          ? [...state.queuedTasks[task.actor], task.id]
          : state.queuedTasks[task.actor],
      };

      return {
        ...state,
        activeTasks: {
          ...state.activeTasks,
          [task.actor]: activeTask
            ? activeTask
            : {
                taskId: task.id,
                actor: task.actor,
                remainingMinutes: task.durationMinutes,
              },
        },
        queuedTasks,
        recentlyCompleted: [],
      };
    }

    case "CANCEL_QUEUED_TASK": {
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

    case "MOVE_QUEUED_TASK": {
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
      const step = getNextCompletionMinutes(state);
      if (step === null) return state;

      const completedNow = (Object.entries(state.activeTasks) as [
        Actor,
        GameState["activeTasks"][Actor],
      ][]).filter(([, task]) => task !== null && task.remainingMinutes === step);
      const completedTaskIds = [...state.completedTaskIds];
      const discoveredEvidence = [...state.discoveredEvidence];
      const activeTasks = { ...state.activeTasks };
      const queuedTasks = {
        mira: [...state.queuedTasks.mira],
        seoyun: [...state.queuedTasks.seoyun],
      };

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

      // A queued task begins at the exact completion time, without another clock step.
      completedNow.forEach(([actor]) => {
        const nextTaskId = queuedTasks[actor].shift();
        if (!nextTaskId) return;
        const nextTask = getTask(nextTaskId);
        activeTasks[actor] = {
          taskId: nextTask.id,
          actor,
          remainingMinutes: nextTask.durationMinutes,
        };
      });

      return {
        ...state,
        clockMinutes: state.clockMinutes + step,
        activeTasks,
        queuedTasks,
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
