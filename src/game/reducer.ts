import {
  AUTONOMOUS_TAKEOVER_DIALOGUE,
  getAutonomousTaskIds,
  getProposalReaction,
} from "../content/proposals";
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

      const completedNow = (Object.entries(startedState.activeTasks) as [
        Actor,
        GameState["activeTasks"][Actor],
      ][]).filter(([, task]) => task !== null && task.remainingMinutes <= step);
      const completedTaskIds = [...state.completedTaskIds];
      const discoveredEvidence = [...state.discoveredEvidence];

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

      const foundNewEvidence = discoveredEvidence.length > state.discoveredEvidence.length;

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
        queuedTasks,
        completedTaskIds,
        discoveredEvidence,
        recentlyCompleted: completedNow.map(([, task]) => task!.taskId),
        rejectionPressure: foundNewEvidence ? 0 : state.rejectionPressure,
      };
    }

    case "PROPOSE_ACTION": {
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

      return {
        ...state,
        view: "vn",
        dialogue: shouldTakeOver
          ? [...reaction.dialogue, ...AUTONOMOUS_TAKEOVER_DIALOGUE]
          : reaction.dialogue,
        dialogueIndex: 0,
        lastOpinion: action.proposalId,
        queuedTasks,
        rejectionPressure: shouldTakeOver ? 0 : nextPressure,
      };
    }

    case "RESTART":
      return createInitialState();

    default:
      return state;
  }
}
