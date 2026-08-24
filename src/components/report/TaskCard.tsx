import type { Dispatch } from "react";
import { formatDuration } from "../../game/clock";
import { getScheduledTaskIds } from "../../game/reducer";
import type { GameAction, GameState, TaskDefinition } from "../../types/game";

interface TaskCardProps {
  task: TaskDefinition;
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

const ACTOR_LABEL: Record<TaskDefinition["actor"], string> = {
  mira: "미라",
  seoyun: "한서윤",
};

export function TaskCard({ task, state, dispatch }: TaskCardProps) {
  const activeTask = state.activeTasks[task.actor];
  const isActive = activeTask?.taskId === task.id;
  const isQueued = state.queuedTasks[task.actor].includes(task.id);
  const isScheduled = getScheduledTaskIds(state).includes(task.id);
  const isComplete = state.completedTaskIds.includes(task.id);

  return (
    <article className={`report-task-row report-task-row--${task.actor}`}>
      <div className="report-task-meta">
        <span className={`task-actor task-actor--${task.actor}`}>{ACTOR_LABEL[task.actor]}</span>
        <span>{formatDuration(task.durationMinutes)}</span>
      </div>
      <div className="report-task-main">
        <h3>{task.title}</h3>
        <p>{task.description}</p>
      </div>
      <button
        className="task-request-button"
        type="button"
        disabled={isScheduled || isComplete}
        onClick={() => dispatch({ type: "START_TASK", taskId: task.id })}
      >
        {isActive
          ? `진행 중 · ${formatDuration(activeTask.remainingMinutes)} 남음`
          : isQueued
            ? "예약됨"
            : task.actor === "mira"
              ? "조사 예약"
              : "현장 확인 예약"}
      </button>
    </article>
  );
}
