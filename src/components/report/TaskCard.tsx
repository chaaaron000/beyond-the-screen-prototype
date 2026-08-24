import type { Dispatch } from "react";
import { formatDuration } from "../../game/clock";
import { isActorBusy } from "../../game/reducer";
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
  const actorBusy = isActorBusy(state, task.actor);
  const isComplete = state.completedTaskIds.includes(task.id);

  return (
    <article className={`task-card task-card--${task.actor}`}>
      <div className="task-card-heading">
        <span className="actor-label">{ACTOR_LABEL[task.actor]}</span>
        <span className="task-duration">{formatDuration(task.durationMinutes)}</span>
      </div>
      <h3>{task.title}</h3>
      <p>{task.description}</p>
      <button
        className="task-start-button"
        type="button"
        disabled={isActive || actorBusy || isComplete}
        onClick={() => dispatch({ type: "START_TASK", taskId: task.id })}
      >
        {isActive
          ? `진행 중 · ${formatDuration(activeTask.remainingMinutes)} 남음`
          : actorBusy
            ? "현재 다른 작업 중"
            : "이 작업 시작"}
      </button>
    </article>
  );
}
