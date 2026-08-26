import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { ATTACHMENTS, type AttachmentDefinition } from "../../content/reports/attachments";
import { EVIDENCE, KNOWN_FACTS, TASK_RESULT_LABELS } from "../../content/reports/facts";
import { getFieldRouteContent } from "../../content/field-mission/routes";
import { getDialogue } from "../../content/field-mission/dialogue/loader";
import {
  getProposal,
  getProposalPresentation,
  PROPOSALS,
  type ProposalDefinition,
} from "../../content/proposals";
import {
  formatClock,
  formatDuration,
  formatRemainingPreservation,
  REFRIGERATION_DEADLINE_MINUTES,
} from "../../game/clock";
import {
  getAvailableTasks,
  getNextCompletionMinutes,
  getNextCompletionTaskIds,
  getTask,
} from "../../game/reducer";
import type {
  Actor,
  DialogueLine,
  GameAction,
  GameState,
  EvidenceId,
  ProposalId,
  TaskDefinition,
  TaskId,
} from "../../types/game";

interface ReportScreenProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  onProposeAction?: (proposalId: ProposalId, evidenceIds: EvidenceId[]) => void;
  inputLocked?: boolean;
  highlightedRoute?: ProposalId | null;
  activeProposal?: ProposalId | null;
  themeControls?: ReactNode;
}

interface TimelineBlock {
  task: TaskDefinition;
  start: number;
  end: number;
  active: boolean;
}

const ACTOR_LABEL: Record<Actor, string> = {
  mira: "미라",
  seoyun: "한서윤",
};

const ACTOR_COLOR: Record<Actor, string> = {
  mira: "var(--plan-mira)",
  seoyun: "var(--plan-seoyun)",
};

function useDraggableWindow(cascade: number) {
  const windowRef = useRef<HTMLElement | null>(null);
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    initialRect: DOMRect;
  } | null>(null);
  const [offset, setOffset] = useState({ x: -cascade, y: cascade });

  const startDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    const windowElement = windowRef.current;
    if (!windowElement) return;

    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
      initialRect: windowElement.getBoundingClientRect(),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const moveDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const desiredLeft = drag.initialRect.left + event.clientX - drag.startX;
    const desiredTop = drag.initialRect.top + event.clientY - drag.startY;
    const left = Math.max(8, Math.min(window.innerWidth - drag.initialRect.width - 8, desiredLeft));
    const top = Math.max(8, Math.min(window.innerHeight - drag.initialRect.height - 8, desiredTop));
    setOffset({
      x: drag.originX + left - drag.initialRect.left,
      y: drag.originY + top - drag.initialRect.top,
    });
  };

  const stopDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragState.current?.pointerId !== event.pointerId) return;
    dragState.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return {
    windowRef,
    windowStyle: {
      transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
    } satisfies CSSProperties,
    dragHandleProps: {
      onPointerDown: startDrag,
      onPointerMove: moveDrag,
      onPointerUp: stopDrag,
      onPointerCancel: stopDrag,
    },
  };
}

type FloatingWindowRequest =
  | { key: `attachment:${EvidenceId}`; type: "attachment"; contentId: EvidenceId }
  | { key: `result:${TaskId}`; type: "result"; contentId: TaskId }
  | { key: `raw-log:${ProposalId}`; type: "raw-log"; contentId: ProposalId };

type FloatingWindowState = FloatingWindowRequest & {
  zIndex: number;
  cascade: number;
};

function FloatingWindowFrame({
  windowState,
  eyebrow,
  title,
  className,
  onClose,
  onFocus,
  children,
}: {
  windowState: FloatingWindowState;
  eyebrow: string;
  title: string;
  className: string;
  onClose: () => void;
  onFocus: () => void;
  children: ReactNode;
}) {
  const draggable = useDraggableWindow(windowState.cascade);
  const titleId = `floating-window-title-${windowState.key.replace(":", "-")}`;

  return (
    <section
      ref={draggable.windowRef}
      className={`floating-window ${className}`}
      role="dialog"
      aria-labelledby={titleId}
      style={{ ...draggable.windowStyle, zIndex: windowState.zIndex }}
      onPointerDown={onFocus}
    >
      <header className="floating-window-header" {...draggable.dragHandleProps}>
        <div>
          <p>{eyebrow}</p>
          <h2 id={titleId}>{title}</h2>
        </div>
        <div className="floating-window-actions">
          <span className="floating-window-drag-hint" aria-hidden="true"><i />잡고 이동</span>
          <button type="button" onClick={onClose} aria-label={`${title} 닫기`}>닫기</button>
        </div>
      </header>
      {children}
    </section>
  );
}

function getTimelineBlocks(state: GameState, actor: Actor, previewProgress = 0): TimelineBlock[] {
  const blocks: TimelineBlock[] = [];
  let activeTask = state.activeTasks[actor];
  let plannedTaskIds = state.queuedTasks[actor];
  const previewStep = getNextCompletionMinutes(state) ?? 0;

  // During the presentation-only transition, preview the first planned task
  // as running without mutating the real reducer state.
  if (!activeTask && previewProgress > 0 && plannedTaskIds.length > 0) {
    const plannedTask = getTask(plannedTaskIds[0]);
    activeTask = {
      taskId: plannedTask.id,
      actor,
      remainingMinutes: Math.max(1, Math.round(plannedTask.durationMinutes - previewStep * previewProgress)),
    };
    plannedTaskIds = plannedTaskIds.slice(1);
  } else if (activeTask && previewProgress > 0) {
    activeTask = {
      ...activeTask,
      remainingMinutes: Math.max(1, Math.round(activeTask.remainingMinutes - previewStep * previewProgress)),
    };
  }
  let cursor = 0;

  if (activeTask) {
    const task = getTask(activeTask.taskId);
    blocks.push({ task, start: 0, end: activeTask.remainingMinutes, active: true });
    cursor = activeTask.remainingMinutes;
  }

  plannedTaskIds.forEach((taskId) => {
    const task = getTask(taskId);
    blocks.push({ task, start: cursor, end: cursor + task.durationMinutes, active: false });
    cursor += task.durationMinutes;
  });

  return blocks;
}

function getTimelineWindow(state: GameState): number {
  const scheduleLength = (Object.keys(ACTOR_LABEL) as Actor[]).reduce(
    (longest, actor) => {
      const blocks = getTimelineBlocks(state, actor);
      const end = blocks.at(-1)?.end ?? 0;
      return Math.max(longest, end);
    },
    0,
  );
  const knownDeadline = state.discoveredEvidence.includes("refrigerationLimit");
  const deadlineDistance = knownDeadline
    ? Math.max(0, REFRIGERATION_DEADLINE_MINUTES - state.clockMinutes) + 30
    : 0;

  return Math.max(240, scheduleLength + 30, deadlineDistance);
}

function getSafeWidth(block: TimelineBlock, deadlineOffset: number | null): number {
  if (deadlineOffset === null || block.end <= deadlineOffset) return 100;
  if (block.start >= deadlineOffset) return 0;
  return ((deadlineOffset - block.start) / (block.end - block.start)) * 100;
}

function getPlannedScheduleEnd(state: GameState): number {
  return (Object.keys(ACTOR_LABEL) as Actor[]).reduce((latest, actor) => {
    const blocks = getTimelineBlocks(state, actor);
    return Math.max(latest, blocks.at(-1)?.end ?? 0);
  }, 0);
}

interface DeadlineSummaryItem {
  id: string;
  title: string;
  deadlineMinutes: number | null;
  remainingMinutes: number | null;
  statusLabel: string;
  isWarning: boolean;
}

function getDeadlineSummaryItems(
  state: GameState,
  displayClockMinutes: number,
): DeadlineSummaryItem[] {
  const knowsDeadline = state.discoveredEvidence.includes("refrigerationLimit");
  const remainingMinutes = REFRIGERATION_DEADLINE_MINUTES - displayClockMinutes;
  const planRunsPastDeadline = knowsDeadline && getPlannedScheduleEnd(state) > Math.max(0, remainingMinutes);
  const isWarning = knowsDeadline && (remainingMinutes <= 120 || planRunsPastDeadline);

  // Keep the summary data-driven: adding a later deadline only requires another
  // item here, while each item still respects the player's discovered evidence.
  return [
    {
      id: "refrigeration",
      title: "냉장 시설",
      deadlineMinutes: knowsDeadline ? REFRIGERATION_DEADLINE_MINUTES : null,
      remainingMinutes: knowsDeadline ? remainingMinutes : null,
      statusLabel: !knowsDeadline
        ? "분석 필요"
        : remainingMinutes <= 0
          ? "한계 도달"
          : formatRemainingPreservation(remainingMinutes),
      isWarning,
    },
  ];
}

function DeadlineSummary({
  state,
  displayClockMinutes = state.clockMinutes,
}: {
  state: GameState;
  displayClockMinutes?: number;
}) {
  const items = getDeadlineSummaryItems(state, displayClockMinutes);
  const allDeadlinesUnknown = items.every((item) => item.deadlineMinutes === null);
  const hasWarning = items.some((item) => item.isWarning);

  return (
    <section
      className={`deadline-summary${allDeadlinesUnknown ? " deadline-summary--unknown" : ""}${hasWarning ? " deadline-summary--warning" : ""}`}
      aria-labelledby="deadline-summary-heading"
      aria-live="polite"
    >
      <div className="deadline-summary-heading">
        <p id="deadline-summary-heading" className="deadline-summary-label">시간 제한</p>
        <span className="deadline-summary-count">{items.length}개 추적 중</span>
      </div>
      <div className="deadline-summary-list">
        {items.map((item) => (
          <article
            className={`deadline-summary-item${item.deadlineMinutes === null ? " deadline-summary-item--unknown" : ""}${item.isWarning ? " deadline-summary-item--warning" : ""}`}
            key={item.id}
          >
            <span className="deadline-summary-marker" aria-hidden="true" />
            <div className="deadline-summary-copy">
              <h3>{item.title}</h3>
              <p>
                {item.deadlineMinutes === null
                  ? "보존 한계 미확인"
                  : `보존 한계 ${formatClock(item.deadlineMinutes)}`}
              </p>
            </div>
            <strong className="deadline-summary-status">{item.statusLabel}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function DeadlineReminder({
  state,
  displayClockMinutes,
  visible,
}: {
  state: GameState;
  displayClockMinutes: number;
  visible: boolean;
}) {
  const items = getDeadlineSummaryItems(state, displayClockMinutes);
  const knownItems = items
    .filter((item) => item.deadlineMinutes !== null)
    .sort((left, right) => left.deadlineMinutes! - right.deadlineMinutes!);
  const item = knownItems[0] ?? items[0];

  return (
    <div
      className={`deadline-reminder${visible ? " is-visible" : ""}${item.isWarning ? " deadline-reminder--warning" : ""}`}
      aria-hidden={!visible}
    >
      <span>현재 {formatClock(displayClockMinutes)}</span>
      {item.deadlineMinutes !== null && item.remainingMinutes !== null ? (
        <strong>{item.title} 보존 한계 {formatClock(item.deadlineMinutes)} · {formatRemainingPreservation(item.remainingMinutes)}</strong>
      ) : (
        <strong>{item.title} · 보존 가능 시간 미확인</strong>
      )}
    </div>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="field-section-heading">
      <p>{eyebrow}</p>
      <h2>{title}</h2>
    </header>
  );
}

function Timeline({
  state,
  displayClockMinutes = state.clockMinutes,
  transitionProgress = 0,
}: {
  state: GameState;
  displayClockMinutes?: number;
  transitionProgress?: number;
}) {
  const windowMinutes = getTimelineWindow(state);
  const knowsDeadline = state.discoveredEvidence.includes("refrigerationLimit");
  const deadlineOffset = knowsDeadline
    ? REFRIGERATION_DEADLINE_MINUTES - displayClockMinutes
    : null;
  const baseTicks = [0, 60, 120, 180, 240].filter((tick) => tick <= windowMinutes);
  const ticks = [
    ...baseTicks,
    ...(windowMinutes >= 270 ? [windowMinutes] : []),
  ].filter(
    (tick) =>
      knowsDeadline || displayClockMinutes + tick !== REFRIGERATION_DEADLINE_MINUTES,
  );
  const deadlinePosition =
    deadlineOffset === null
      ? null
      : Math.max(0, Math.min(100, (deadlineOffset / windowMinutes) * 100));

  return (
    <section className="timeline-section" aria-label="조사 일정 timeline">
      <div className="timeline-heading">
        <div>
          <p className="panel-eyebrow">가벼운 일정표</p>
          <h3>두 사람의 다음 움직임</h3>
        </div>
        {knowsDeadline ? (
          <span className="deadline-key">냉장 보존 한계 · 13:20</span>
        ) : (
          <span className="deadline-unknown">보존 한계 미확인</span>
        )}
      </div>

      <div className="timeline-axis" aria-hidden="true">
        {ticks.map((tick) => (
          <span key={tick} style={{ left: `${(tick / windowMinutes) * 100}%` }}>
            {formatClock(displayClockMinutes + tick)}
          </span>
        ))}
      </div>

      <div className="timeline-board">
        <div
          className={`timeline-now-marker${transitionProgress > 0 ? " timeline-now-marker--moving" : ""}`}
          style={{ left: `${Math.max(0, Math.min(100, (transitionProgress * (getNextCompletionMinutes(state) ?? 0) / windowMinutes) * 100))}%` }}
          aria-label={`현재 시각 ${formatClock(displayClockMinutes)}`}
        >
          <span>현재</span>
        </div>
        {deadlinePosition !== null && (
          <>
            <div
              className="deadline-zone"
              style={{ left: `${deadlinePosition}%` }}
              aria-hidden="true"
            />
            <div
              className={`deadline-line${deadlinePosition > 70 ? " deadline-line--near-right" : ""}`}
              style={{ left: `${deadlinePosition}%` }}
              aria-label="냉장 보존 한계 13:20"
            >
              <span>냉장 보존 한계 · 13:20</span>
            </div>
          </>
        )}
        {["mira", "seoyun"].map((actor) => {
          const typedActor = actor as Actor;
          const blocks = getTimelineBlocks(state, typedActor, transitionProgress);
          return (
            <div className={`timeline-lane timeline-lane--${typedActor}`} key={typedActor}>
              <div className="timeline-lane-label">
                <span>{ACTOR_LABEL[typedActor]}</span>
                <small>
                  {state.activeTasks[typedActor] || (transitionProgress > 0 && state.queuedTasks[typedActor].length > 0)
                    ? "진행 중"
                    : state.queuedTasks[typedActor].length > 0
                      ? "조사 예정"
                      : "대기 중"}
                </small>
              </div>
              <div className="timeline-track">
                {ticks.slice(1).map((tick) => (
                  <i
                    key={tick}
                    className="timeline-tick"
                    style={{ left: `${(tick / windowMinutes) * 100}%` }}
                    aria-hidden="true"
                  />
                ))}
                {blocks.length === 0 && <span className="timeline-empty">조사 예정 없음</span>}
                {blocks.map((block) => {
                  const safeWidth = getSafeWidth(block, deadlineOffset);
                  const isAtRisk = deadlineOffset !== null && block.end > deadlineOffset;
                  const color = ACTOR_COLOR[typedActor];
                  const style = {
                    left: `${(block.start / windowMinutes) * 100}%`,
                    width: `${((block.end - block.start) / windowMinutes) * 100}%`,
                    background: isAtRisk
                      ? `linear-gradient(90deg, ${color} 0%, ${color} ${safeWidth}%, var(--plan-risk) ${safeWidth}%, var(--plan-risk) 100%)`
                      : color,
                  } satisfies CSSProperties;
                  return (
                    <div
                      className={`timeline-block${block.active ? " timeline-block--active" : ""}${isAtRisk ? " timeline-block--risk" : ""}`}
                      key={`${typedActor}-${block.task.id}`}
                      style={style}
                      title={`${block.task.title} · ${formatDuration(block.end - block.start)}`}
                    >
                      <span>{block.task.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {knowsDeadline && (
        <p className="timeline-note">
          붉은 영역은 알려진 보존 한계 이후입니다. 일정 위험만 표시하며, 결과를 미리 결정하지 않습니다.
        </p>
      )}
    </section>
  );
}

function QueueList({
  actor,
  state,
  dispatch,
  disabled = false,
}: {
  actor: Actor;
  state: GameState;
  dispatch: Dispatch<GameAction>;
  disabled?: boolean;
}) {
  const queue = state.queuedTasks[actor];

  if (queue.length === 0) {
    return <p className="queue-empty">이후 작업은 비워둔 상태</p>;
  }

  return (
    <ol className="queue-list" aria-label={`${ACTOR_LABEL[actor]} 조사 예정 목록`}>
      {queue.map((taskId, index) => (
        <li key={taskId}>
          <span className="queue-index">{index + 1}</span>
          <span className="queue-title">{getTask(taskId).title}</span>
          <span className="queue-actions">
            <button
              type="button"
              disabled={disabled || index === 0}
              aria-label={`${getTask(taskId).title} 위로 이동`}
              onClick={() =>
                dispatch({ type: "MOVE_PLANNED_TASK", actor, fromIndex: index, toIndex: index - 1 })
              }
            >
              ↑
            </button>
            <button
              type="button"
              disabled={disabled || index === queue.length - 1}
              aria-label={`${getTask(taskId).title} 아래로 이동`}
              onClick={() =>
                dispatch({ type: "MOVE_PLANNED_TASK", actor, fromIndex: index, toIndex: index + 1 })
              }
            >
              ↓
            </button>
            <button
              type="button"
              disabled={disabled}
              aria-label={`${getTask(taskId).title} 조사 예정에서 제거`}
              onClick={() => dispatch({ type: "REMOVE_PLANNED_TASK", taskId })}
            >
              ×
            </button>
          </span>
        </li>
      ))}
    </ol>
  );
}

function ActorPlanningCard({
  actor,
  state,
  dispatch,
  disabled = false,
  transitionProgress = 0,
}: {
  actor: Actor;
  state: GameState;
  dispatch: Dispatch<GameAction>;
  disabled?: boolean;
  transitionProgress?: number;
}) {
  const nextStep = getNextCompletionMinutes(state) ?? 0;
  let activeTask = state.activeTasks[actor];
  let plannedTaskIds = state.queuedTasks[actor];
  if (!activeTask && transitionProgress > 0 && plannedTaskIds.length > 0) {
    const plannedTask = getTask(plannedTaskIds[0]);
    activeTask = {
      taskId: plannedTask.id,
      actor,
      remainingMinutes: Math.max(1, Math.round(plannedTask.durationMinutes - nextStep * transitionProgress)),
    };
    plannedTaskIds = plannedTaskIds.slice(1);
  } else if (activeTask && transitionProgress > 0) {
    activeTask = {
      ...activeTask,
      remainingMinutes: Math.max(1, Math.round(activeTask.remainingMinutes - nextStep * transitionProgress)),
    };
  }
  const availableTasks = getAvailableTasks(state).filter((task) => task.actor === actor);
  const assetBaseUrl = import.meta.env.BASE_URL;
  const avatar = actor === "mira"
    ? `${assetBaseUrl}assets/characters/미라.png`
    : `${assetBaseUrl}assets/characters/서윤.png`;

  return (
    <article className={`actor-planning-card actor-planning-card--${actor}`}>
      <div className="actor-planning-row">
        <div className="actor-planning-profile">
          <div className="actor-planning-identity">
            <img src={avatar} alt="" className="actor-avatar" />
            <div>
              <p className="actor-planning-kicker">조사 담당</p>
              <h3>{actor === "mira" ? "MIRAGE" : ACTOR_LABEL[actor]}</h3>
            </div>
          </div>
          <span className="actor-planning-count">{availableTasks.length}건 가능</span>

          <section className="actor-current-work" aria-label={`${ACTOR_LABEL[actor]} 현재 진행 중`}>
            <div className="actor-subheading">
              <span>현재 진행 중</span>
              {activeTask && <strong>{formatDuration(activeTask.remainingMinutes)} 남음</strong>}
            </div>
            {activeTask ? (
              <p className="actor-current-task">{getTask(activeTask.taskId).title}</p>
            ) : (
              <p className="actor-current-task actor-current-task--empty">현재 진행 중인 작업 없음</p>
            )}
          </section>
        </div>

        <section className="actor-available-section" aria-label={`${ACTOR_LABEL[actor]} 가능한 조사`}>
          <div className="actor-subheading">
            <span>가능한 조사</span>
            <small>클릭하면 오른쪽 끝에 계획</small>
          </div>
          {availableTasks.length === 0 ? (
            <p className="actor-empty-message">지금 확인할 수 있는 새 조사가 없습니다.</p>
          ) : (
            <div className="actor-available-list">
              {availableTasks.map((task) => (
                <button
                  key={task.id}
                  className="actor-available-task"
                  type="button"
                  disabled={disabled}
                  aria-label={`${task.title} 조사 예정에 추가`}
                  onClick={() => dispatch({ type: "PLAN_TASK", taskId: task.id })}
                >
                  <span>
                    <strong>{task.title}</strong>
                    <small>{formatDuration(task.durationMinutes)} · {task.description}</small>
                  </span>
                  <em>계획 +</em>
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="actor-planning-arrow" aria-hidden="true">→</div>

        <section className="actor-queue-section" aria-label={`${ACTOR_LABEL[actor]} 조사 예정`}>
          <div className="actor-subheading"><span>조사 예정</span><small>시작 전까지 수정 가능</small></div>
          <QueueList
            actor={actor}
            state={{ ...state, queuedTasks: { ...state.queuedTasks, [actor]: plannedTaskIds } }}
            dispatch={dispatch}
            disabled={disabled}
          />
        </section>
      </div>
    </article>
  );
}

function InvestigationPlanner({
  state,
  dispatch,
  disabled = false,
  transitionProgress = 0,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  disabled?: boolean;
  transitionProgress?: number;
}) {
  return (
    <section className="investigation-planner" aria-label="캐릭터별 조사 큐">
      <div className="planner-section-heading">
        <div>
          <p className="panel-eyebrow">QUEUE / HANDOFF</p>
          <h3>조사 순서 정하기</h3>
        </div>
        <span>예약은 시간을 소비하지 않아요</span>
      </div>
      <div className="actor-planning-grid">
        <ActorPlanningCard actor="mira" state={state} dispatch={dispatch} disabled={disabled} transitionProgress={transitionProgress} />
        <ActorPlanningCard actor="seoyun" state={state} dispatch={dispatch} disabled={disabled} transitionProgress={transitionProgress} />
      </div>
    </section>
  );
}

function ScheduleStatus({ actor, state, dispatch }: { actor: Actor; state: GameState; dispatch: Dispatch<GameAction> }) {
  const activeTask = state.activeTasks[actor];
  return (
    <section className={`schedule-status schedule-status--${actor}`}>
      <div className="schedule-status-heading">
        <span className={`actor-name actor-name--${actor}`}>{ACTOR_LABEL[actor]}</span>
        <span>{activeTask ? "지금 수행 중" : "다음 작업을 기다리는 중"}</span>
      </div>
      {activeTask ? (
        <p className="current-task-line">
          <strong>{getTask(activeTask.taskId).title}</strong>
          <span>{formatDuration(activeTask.remainingMinutes)} 남음</span>
        </p>
      ) : (
        <p className="current-task-line current-task-line--empty">현재 실행 중인 작업 없음</p>
      )}
      <QueueList actor={actor} state={state} dispatch={dispatch} />
    </section>
  );
}

function TaskPicker({ state, dispatch }: { state: GameState; dispatch: Dispatch<GameAction> }) {
  const availableTasks = getAvailableTasks(state);

  return (
    <section className="task-picker">
      <SectionHeading eyebrow="추가 조사" title="새로 맡길 수 있는 조사" />
      {availableTasks.length === 0 ? (
        <p className="panel-empty">지금 확인 가능한 새로운 작업이 없습니다.</p>
      ) : (
        <div className="task-picker-list">
          {availableTasks.map((task) => {
            const actorBusy = state.activeTasks[task.actor] !== null;
            return (
              <article className={`task-option task-option--${task.actor}`} key={task.id}>
                <div>
                  <div className="task-option-meta">
                    <span>{ACTOR_LABEL[task.actor]}</span>
                    <span>{formatDuration(task.durationMinutes)}</span>
                  </div>
                  <h4>{task.title}</h4>
                  <p>{task.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "PLAN_TASK", taskId: task.id })}
                >
                  {actorBusy ? "뒤에 계획" : "계획에 추가"}
                </button>
              </article>
            );
          })}
        </div>
      )}
      <p className="panel-footnote">예약과 순서 변경은 무료입니다. 시간은 아래 진행 버튼을 누를 때만 흐릅니다.</p>
    </section>
  );
}

function ProposalEvidenceDialog({
  proposal,
  state,
  selectedEvidenceIds,
  onToggleEvidence,
  onCancel,
  onConfirm,
}: {
  proposal: ProposalDefinition;
  state: GameState;
  selectedEvidenceIds: EvidenceId[];
  onToggleEvidence: (evidenceId: EvidenceId) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="proposal-backdrop" role="presentation" onClick={onCancel}>
      <section
        className="proposal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="proposal-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="proposal-dialog-header">
          <div>
            <p className="panel-eyebrow">PLAYER PROPOSAL / EVIDENCE</p>
            <h2 id="proposal-dialog-title">제안</h2>
          </div>
          <button type="button" className="proposal-dialog-close" onClick={onCancel}>닫기</button>
        </header>

        <div className="proposal-dialog-action">
          <span>{proposal.number}</span>
          <strong>{proposal.title}</strong>
          <p>행동만 제안하거나, 지금까지 확보한 정보를 함께 제시할 수 있습니다.</p>
        </div>

        <div className="proposal-evidence-heading">
          <div>
            <p>함께 제시할 정보</p>
            <small>근거는 선택 사항입니다. 최대 3개까지 고를 수 있습니다.</small>
          </div>
          <strong>{selectedEvidenceIds.length} / 3</strong>
        </div>

        <div className="proposal-evidence-options">
          {state.discoveredEvidence.length === 0 ? (
            <p className="proposal-no-evidence">아직 확보한 정보가 없습니다. 행동만 제안할 수 있습니다.</p>
          ) : (
            state.discoveredEvidence.map((evidenceId) => {
              const evidence = EVIDENCE[evidenceId];
              const isSelected = selectedEvidenceIds.includes(evidenceId);
              const isAtLimit = selectedEvidenceIds.length >= 3 && !isSelected;
              return (
                <label className={`proposal-evidence-option${isSelected ? " is-selected" : ""}`} key={evidenceId}>
                  <input
                    type="checkbox"
                    aria-label={evidence.title}
                    checked={isSelected}
                    disabled={isAtLimit}
                    onChange={() => onToggleEvidence(evidenceId)}
                  />
                  <span>
                    <strong>{evidence.title}</strong>
                    <small>{evidence.detail}</small>
                  </span>
                </label>
              );
            })
          )}
        </div>

        <div className="proposal-selected-evidence">
          <p>선택한 근거</p>
          {selectedEvidenceIds.length === 0 ? (
            <span>· 근거 없이 행동만 제안</span>
          ) : (
            selectedEvidenceIds.map((evidenceId) => <span key={evidenceId}>· {EVIDENCE[evidenceId].title}</span>)
          )}
        </div>

        <footer className="proposal-dialog-actions">
          <button type="button" className="proposal-cancel-button" onClick={onCancel}>취소</button>
          <button type="button" className="proposal-confirm-button" onClick={onConfirm}>제시하시겠습니까?</button>
        </footer>
      </section>
    </div>
  );
}

function EvidenceSidebar({
  state,
  onOpenAttachment,
  disabled = false,
}: {
  state: GameState;
  onOpenAttachment: (attachment: AttachmentDefinition) => void;
  disabled?: boolean;
}) {
  return (
    <section className="evidence-sidebar">
      <SectionHeading eyebrow="다시 확인할 근거" title="확보한 정보" />
      {state.discoveredEvidence.length === 0 ? (
        <p className="panel-empty">아직 도착한 조사 기록이 없습니다.</p>
      ) : (
        <div className="sidebar-evidence-list">
          {state.discoveredEvidence.map((evidenceId) => {
            const evidence = EVIDENCE[evidenceId];
            const attachment = ATTACHMENTS[evidenceId];
            return (
              <article className="sidebar-evidence" key={evidenceId}>
                <p>{evidence.source}</p>
                <button type="button" disabled={disabled} onClick={() => onOpenAttachment(attachment)}>
                  <strong>{evidence.title}</strong>
                  <span>{evidence.detail}</span>
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function AttachmentVisual({ attachment }: { attachment: AttachmentDefinition }) {
  if (attachment.evidenceId === "powerGridStatus") {
    return (
      <div className="attachment-visual attachment-visual--log">
        <p className="log-line"><b>주 발전</b><span>OFFLINE</span><em>확인</em></p>
        <p className="log-line"><b>생활 구역</b><span>비상·제한 전력 의존</span><em>주의</em></p>
        <p className="log-line"><b>지속성</b><span>장시간 유지 어려움</span><em>분석</em></p>
      </div>
    );
  }

  if (attachment.kind === "trend") {
    return (
      <div className="attachment-visual attachment-visual--trend" aria-label="냉장 설비 출력 추세 placeholder">
        <div className="graph-labels"><span>비상 출력</span><span>보존 한계 13:20</span></div>
        <svg viewBox="0 0 420 160" role="img" aria-label="하락하는 출력 추세">
          <path className="graph-grid" d="M0 30H420M0 80H420M0 130H420" />
          <path className="graph-deadline" d="M348 8V152" />
          <path className="graph-line" d="M8 36 C84 38, 126 62, 184 70 S286 94, 410 138" />
        </svg>
        <div className="graph-axis"><span>현재</span><span>분석 추세</span><span>13:20</span></div>
      </div>
    );
  }

  if (attachment.kind === "log") {
    return (
      <div className="attachment-visual attachment-visual--log">
        <p className="log-line"><b>접근</b><span>원격 접근만으로 복구할 수 없음</span><em>확인</em></p>
        <p className="log-line"><b>조건</b><span>현장 유지보수·인증 단말 필요</span><em>기록</em></p>
      </div>
    );
  }

  if (attachment.kind === "photo") {
    return (
      <div className="attachment-visual attachment-visual--photo">
        <div className="photo-placeholder"><span>{attachment.evidenceId === "terminalConfirmed" ? "DEVICE / C-12" : "FIELD / RECORD"}</span></div>
        <p>실제 에셋이 없는 기록을 위한 시각화 placeholder</p>
      </div>
    );
  }

  return (
    <div className="attachment-visual attachment-visual--map">
      <div className="map-grid" aria-label="기록 위치 placeholder">
        <span className="map-line map-line--one" />
        <span className="map-line map-line--two" />
        <span className="map-marker">{attachment.evidenceId === "terminalLocation" ? "C-12" : "입구 셔터"}</span>
      </div>
      <p>{attachment.evidenceId === "terminalLocation" ? "중앙 서비스 구역 공동 보관실" : "외부에서 내부 설비 상태는 확인할 수 없음"}</p>
    </div>
  );
}

function AttachmentViewer({
  attachment,
  windowState,
  onClose,
  onFocus,
}: {
  attachment: AttachmentDefinition;
  windowState: FloatingWindowState;
  onClose: () => void;
  onFocus: () => void;
}) {
  return (
    <FloatingWindowFrame
      windowState={windowState}
      eyebrow="OASIS / ATTACHMENT"
      title={attachment.title}
      className="floating-window--attachment attachment-viewer"
      onClose={onClose}
      onFocus={onFocus}
    >
      <AttachmentVisual attachment={attachment} />
      <p className="attachment-caption">{attachment.caption}</p>
    </FloatingWindowFrame>
  );
}

function rawSpeakerLabel(speaker: DialogueLine["speaker"]): string {
  switch (speaker) {
    case "mira":
      return "MIRAGE";
    case "seoyun":
      return "한서윤";
    case "player":
      return "당신";
    default:
      return "OASIS 기록";
  }
}

function ProposalLedger({
  state,
  onStartProposal,
  onOpenRawLog,
  activeProposal,
  disabled = false,
}: {
  state: GameState;
  onStartProposal: (proposalId: ProposalId) => void;
  onOpenRawLog: (proposalId: ProposalId) => void;
  activeProposal?: ProposalId | null;
  disabled?: boolean;
}) {
  const seoyunBusy = state.activeTasks.seoyun !== null;
  return (
    <section className="proposal-ledger" aria-label="행동별 논쟁">
      <header className="proposal-ledger-heading">
        <div>
          <p>행동별 논쟁</p>
          <h2>무엇을 먼저 할지</h2>
        </div>
        <span>읽은 자리에서 바로 제안</span>
      </header>
      <div className="proposal-list">
        {PROPOSALS.map((proposal) => {
          const presentation = getProposalPresentation(state, proposal.id);
          const seoyunSummary = getDialogue(presentation.summaryDialogueIds.seoyun)[0];
          const miraSummary = getDialogue(presentation.summaryDialogueIds.mira)[0];
          return (
          <article className={`proposal-entry${activeProposal === proposal.id ? " proposal-entry--active" : ""}`} key={proposal.id}>
            <header className="proposal-entry-header">
              <div className="proposal-entry-title">
                <span>{proposal.number}</span>
                <h3>{proposal.title}</h3>
              </div>
              <button
                type="button"
                className="proposal-start-button"
                disabled={disabled || seoyunBusy || state.exploredRoutes[proposal.id]}
                title={seoyunBusy ? "한서윤이 현재 다른 현장 작업을 수행 중입니다." : undefined}
                onClick={() => onStartProposal(proposal.id)}
              >
                {state.exploredRoutes[proposal.id]
                  ? "현장 확인 완료"
                  : seoyunBusy
                    ? "한서윤 작업 중"
                    : <>제안하기 <span aria-hidden="true">↗</span></>}
              </button>
            </header>

            <div className="proposal-positions">
              <blockquote className="proposal-position proposal-position--seoyun">
                <cite>한서윤</cite>
                <p>“{seoyunSummary.text}”</p>
              </blockquote>
              <blockquote className="proposal-position proposal-position--mira">
                <cite>MIRAGE</cite>
                <p>“{miraSummary.text}”</p>
              </blockquote>
            </div>

            <button
              type="button"
              className="proposal-raw-log-button"
              disabled={disabled}
              onClick={() => onOpenRawLog(proposal.id)}
            >
              <span>대화 LOG RAW</span><small>독립 창으로 원문 열기</small><b aria-hidden="true">↗</b>
            </button>
          </article>
          );
        })}
      </div>
    </section>
  );
}

function FieldDocument({
  state,
  onOpenAttachment,
  onStartProposal,
  onOpenRawLog,
  highlightedRoute,
  activeProposal,
  disabled = false,
}: {
  state: GameState;
  onOpenAttachment: (attachment: AttachmentDefinition) => void;
  onStartProposal: (proposalId: ProposalId) => void;
  onOpenRawLog: (proposalId: ProposalId) => void;
  highlightedRoute?: ProposalId | null;
  activeProposal?: ProposalId | null;
  disabled?: boolean;
}) {
  const completedRoutes = PROPOSALS.filter((proposal) => state.exploredRoutes[proposal.id]);

  return (
    <article className="field-document">
      <header className="field-document-header">
        <div className="document-stamp">OASIS / 생활 구역 03 / 공유 작업 문서</div>
        <p className="field-document-date">2120-03-21 / ACT 02 · DAY 01</p>
        <h1>시설 정보</h1>
        <p className="field-document-lede">두 사람이 보내오는 자료를 읽고, 다음 움직임을 함께 정한다.</p>
      </header>

      <div className="field-document-rule" />

      <section className="field-document-section">
        <SectionHeading eyebrow="현재 상황" title="아침의 운영 기록" />
        <div className="situation-copy">
          {KNOWN_FACTS.map((fact) => <p key={fact}>{fact}</p>)}
        </div>
      </section>

      <ProposalLedger
        state={state}
        onStartProposal={onStartProposal}
        onOpenRawLog={onOpenRawLog}
        activeProposal={activeProposal}
        disabled={disabled}
      />

      <section className="field-document-section">
        <SectionHeading eyebrow="조사 결과" title="도착한 기록" />
        {state.discoveredEvidence.length === 0 ? (
          <p className="document-empty">아직 추가로 확인한 정보가 이 문서에 들어오지 않았다.</p>
        ) : (
          <div className="document-records" aria-live="polite">
            {state.discoveredEvidence.map((evidenceId) => {
              const evidence = EVIDENCE[evidenceId];
              const attachment = ATTACHMENTS[evidenceId];
              return (
                <article className="document-record" key={evidenceId}>
                  <p className="record-source">{evidence.source}</p>
                  <h3>{evidence.title}</h3>
                  <p>{evidence.detail}</p>
                  <button type="button" className="attachment-link" onClick={() => onOpenAttachment(attachment)}>
                    <span aria-hidden="true">↗</span>{attachment.label}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="field-document-section field-document-section--field-log" aria-label="현장 확인 기록">
        <SectionHeading eyebrow="현장 기록" title="확인한 장소" />
        {completedRoutes.length === 0 ? (
          <p className="document-empty">아직 현장에서 돌아온 기록이 없다.</p>
        ) : (
          <div className="field-route-records" aria-live="polite">
            {completedRoutes.map((proposal) => {
              const route = getFieldRouteContent(proposal.id);
              const isHighlighted = highlightedRoute === proposal.id;
              return (
                <article
                  className={`field-route-record${isHighlighted ? " field-route-record--highlighted" : ""}`}
                  data-route-id={proposal.id}
                  key={proposal.id}
                >
                  <p className="field-route-record-kicker">{route.fieldLogUpdatedLabel}</p>
                  <h3>{route.location}</h3>
                  <p className="field-route-record-note">{route.reportResult.fieldNote}</p>
                  <p className="field-route-record-summary">{route.reportResult.summary}</p>
                  <ul>
                    {route.reportResult.facts.map((fact) => <li key={fact}>{fact}</li>)}
                  </ul>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="field-document-section field-document-section--records">
        <SectionHeading eyebrow="문서 사용법" title="읽는 곳, 정하는 곳" />
        <p className="document-note">본문의 행동별 논쟁에서 제안을 시작하고, 조사 요청과 시간 진행은 오른쪽 계획판에서 조정할 수 있습니다.</p>
      </section>
    </article>
  );
}

function CompletionNote({ state }: { state: GameState }) {
  if (state.recentlyCompleted.length === 0) return null;
  return (
    <section className="completion-note-panel" aria-live="polite">
      <p className="panel-eyebrow">방금 도착한 기록</p>
      {state.recentlyCompleted.map((taskId) => {
        const task = getTask(taskId);
        return (
          <p key={taskId}><strong>{TASK_RESULT_LABELS[taskId]}</strong><span>{task.result.summary}</span></p>
        );
      })}
    </section>
  );
}

type PlanningTab = "schedule" | "collected";

function ResultHistory({
  state,
  onOpenResult,
  disabled = false,
}: {
  state: GameState;
  onOpenResult: (taskId: TaskId) => void;
  disabled?: boolean;
}) {
  const completed = [...state.completedTaskIds].reverse();
  return (
    <section className="support-panel support-panel--results" aria-label="최근 조사 결과">
      <div className="support-panel-heading">
        <p className="panel-eyebrow">FIELD NOTES / RESULTS</p>
        <h3>최근 결과</h3>
      </div>
      {completed.length === 0 ? (
        <p className="panel-empty">아직 도착한 조사 결과가 없습니다.</p>
      ) : (
        <div className="result-history-list">
          {completed.map((taskId, index) => {
            const task = getTask(taskId);
            return (
              <button
                type="button"
                className={`result-history-item${index === 0 ? " result-history-item--latest" : ""}`}
                key={taskId}
                disabled={disabled}
                onClick={() => onOpenResult(taskId)}
              >
                <span>
                  <small>{ACTOR_LABEL[task.actor]} · {TASK_RESULT_LABELS[taskId]}</small>
                  <strong>{task.result.summary}</strong>
                </span>
                <em>열기</em>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ResultViewer({
  taskId,
  windowState,
  onClose,
  onFocus,
  onOpenAttachment,
}: {
  taskId: TaskId;
  windowState: FloatingWindowState;
  onClose: () => void;
  onFocus: () => void;
  onOpenAttachment: (attachment: AttachmentDefinition) => void;
}) {
  const task = getTask(taskId);
  const evidence = task.result.evidenceId ? EVIDENCE[task.result.evidenceId] : null;
  const attachment = task.result.evidenceId ? ATTACHMENTS[task.result.evidenceId] : null;

  return (
    <FloatingWindowFrame
      windowState={windowState}
      eyebrow="WORK COMPLETE / REPORT IN"
      title="조사 결과"
      className="floating-window--result result-viewer"
      onClose={onClose}
      onFocus={onFocus}
    >
      <div className="result-viewer-list">
        <article className="result-viewer-entry">
          <p className={`result-viewer-actor result-viewer-actor--${task.actor}`}>{ACTOR_LABEL[task.actor]} · 완료</p>
          <h3>{task.title}</h3>
          <p className="result-viewer-summary">{task.result.summary}</p>
          {evidence && (
            <div className="result-viewer-evidence">
              <strong>{evidence.title}</strong>
              <p>{evidence.detail}</p>
              {attachment && <button type="button" onClick={() => onOpenAttachment(attachment)}>{attachment.label}</button>}
            </div>
          )}
        </article>
      </div>
    </FloatingWindowFrame>
  );
}

function RawLogViewer({
  proposal,
  state,
  windowState,
  onClose,
  onFocus,
}: {
  proposal: ProposalDefinition;
  state: GameState;
  windowState: FloatingWindowState;
  onClose: () => void;
  onFocus: () => void;
}) {
  const presentation = getProposalPresentation(state, proposal.id);
  return (
    <FloatingWindowFrame
      windowState={windowState}
      eyebrow="OASIS / CONVERSATION LOG"
      title={`${proposal.title} / 대화 기록`}
      className="floating-window--raw-log raw-log-viewer"
      onClose={onClose}
      onFocus={onFocus}
    >
      <div className="raw-log-window-lines">
        {getDialogue(presentation.rawDialogueId).map((line, index) => (
          <p key={`${proposal.id}-window-raw-${index}`}>
            <strong>{rawSpeakerLabel(line.speaker)}</strong>
            <span>{line.text}</span>
          </p>
        ))}
      </div>
    </FloatingWindowFrame>
  );
}

function PlanningTabs({
  state,
  activeTab,
  onChange,
  dispatch,
  onOpenAttachment,
  onOpenResult,
  transitionProgress,
  disabled = false,
}: {
  state: GameState;
  activeTab: PlanningTab;
  onChange: (tab: PlanningTab) => void;
  dispatch: Dispatch<GameAction>;
  onOpenAttachment: (attachment: AttachmentDefinition) => void;
  onOpenResult: (taskId: TaskId) => void;
  transitionProgress: number;
  disabled?: boolean;
}) {
  return (
    <section className={`planning-tabs${disabled ? " planning-tabs--disabled" : ""}`} aria-label="조사 계획 상세">
      <nav className="planning-tab-list" aria-label="조사 계획 탭" role="tablist">
        {([
          ["schedule", "조사 일정 편집"],
          ["collected", "추가 수집한 정보"],
        ] as [PlanningTab, string][]).map(([tab, label]) => (
          <button
            type="button"
            className={activeTab === tab ? "is-active" : ""}
            aria-selected={activeTab === tab}
            aria-controls={`planning-tab-${tab}`}
            id={`planning-tab-button-${tab}`}
            role="tab"
            key={tab}
            disabled={disabled}
            onClick={() => onChange(tab)}
          >
            {label}
            {tab === "collected" && state.completedTaskIds.length > 0 && (
              <span>{state.completedTaskIds.length}</span>
            )}
          </button>
        ))}
      </nav>
      {activeTab === "schedule" ? (
        <div
          className="planning-tab-content planning-tab-content--schedule"
          id="planning-tab-schedule"
          role="tabpanel"
          aria-labelledby="planning-tab-button-schedule"
        >
          <InvestigationPlanner
            state={state}
            dispatch={dispatch}
            disabled={disabled}
            transitionProgress={transitionProgress}
          />
        </div>
      ) : (
        <div
          className="planning-tab-content planning-tab-content--collected"
          id="planning-tab-collected"
          role="tabpanel"
          aria-labelledby="planning-tab-button-collected"
        >
          <header className="collected-information-heading">
            <p className="panel-eyebrow">FIELD NOTES / COLLECTED</p>
            <h3>조사로 새로 얻은 근거와 기록</h3>
          </header>
          <EvidenceSidebar state={state} onOpenAttachment={onOpenAttachment} disabled={disabled} />
          <ResultHistory state={state} onOpenResult={onOpenResult} disabled={disabled} />
        </div>
      )}
    </section>
  );
}

function CompletionToast({
  taskIds,
  onOpen,
  onDismiss,
}: {
  taskIds: TaskId[];
  onOpen: () => void;
  onDismiss: () => void;
}) {
  if (taskIds.length === 0) return null;
  return (
    <div className="completion-toast" role="status" aria-live="polite">
      <button type="button" className="completion-toast-main" onClick={onOpen}>
        <span className="completion-toast-icon" aria-hidden="true">✓</span>
        <span>
          <strong>작업 결과 도착</strong>
          {taskIds.map((taskId) => <small key={taskId}>{ACTOR_LABEL[getTask(taskId).actor]}: {TASK_RESULT_LABELS[taskId]}</small>)}
        </span>
        <em>결과 보기</em>
      </button>
      <button type="button" className="completion-toast-close" aria-label="알림 닫기" onClick={onDismiss}>×</button>
    </div>
  );
}

function PlanningPanel({
  state,
  dispatch,
  onOpenAttachment,
  displayClockMinutes = state.clockMinutes,
  transitionProgress = 0,
  isAdvancing = false,
  activePlanningTab,
  onPlanningTabChange,
  onOpenResult,
  onAdvance,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  onOpenAttachment: (attachment: AttachmentDefinition) => void;
  displayClockMinutes?: number;
  transitionProgress?: number;
  isAdvancing?: boolean;
  activePlanningTab: PlanningTab;
  onPlanningTabChange: (tab: PlanningTab) => void;
  onOpenResult: (taskId: TaskId) => void;
  onAdvance: () => void;
}) {
  const nextStep = getNextCompletionMinutes(state);
  const nextClock = nextStep === null ? null : state.clockMinutes + nextStep;
  const nextCompletionTaskIds = getNextCompletionTaskIds(state);
  const nextCompletionLabel =
    nextCompletionTaskIds.length === 0
      ? ""
      : nextCompletionTaskIds
          .map((taskId) => getTask(taskId).title)
          .join(", ");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const overviewEndRef = useRef<HTMLDivElement | null>(null);
  const [showDeadlineReminder, setShowDeadlineReminder] = useState(false);

  const updateDeadlineReminder = () => {
    const scrollElement = scrollRef.current;
    const overviewEnd = overviewEndRef.current;
    if (!scrollElement || !overviewEnd) return;
    setShowDeadlineReminder(overviewEnd.offsetTop <= scrollElement.scrollTop + 128);
  };

  return (
    <aside className="planning-pane">
      <div className="planning-scroll" ref={scrollRef} onScroll={updateDeadlineReminder}>
        <DeadlineReminder
          state={state}
          displayClockMinutes={displayClockMinutes}
          visible={showDeadlineReminder}
        />
        <header className="planning-header">
          <div>
            <p className="panel-eyebrow">FIELD PLAN / LIVE</p>
            <h2>조사 계획</h2>
          </div>
          <div className="planning-clock">
            <span>현재 시각</span>
            <strong>{formatClock(displayClockMinutes)}</strong>
          </div>
        </header>

        <DeadlineSummary state={state} displayClockMinutes={displayClockMinutes} />

        <Timeline state={state} displayClockMinutes={displayClockMinutes} transitionProgress={transitionProgress} />

        <section className="advance-time-block" aria-label="시간 진행">
          <button
            className="advance-time-control"
            type="button"
            disabled={nextStep === null || isAdvancing}
            onClick={onAdvance}
          >
            <span>
              <b>{isAdvancing ? "시간이 흐르는 중…" : nextClock === null ? "진행할 작업이 없습니다" : "조사 시작"}</b>
              {nextClock !== null && !isAdvancing && <small>다음 완료: {nextCompletionLabel} · {formatClock(nextClock)} · {formatDuration(nextStep ?? 0)} 후</small>}
              {isAdvancing && <small>작업 완료 시점으로 이동하고 있습니다</small>}
            </span>
            <strong>{nextClock === null ? "—" : formatClock(isAdvancing ? displayClockMinutes : nextClock)}</strong>
          </button>
          <p className="advance-time-note">작업을 예약하거나 순서를 바꾸는 것만으로는 시간이 흐르지 않습니다.</p>
        </section>
        <div className="planning-overview-end" ref={overviewEndRef} aria-hidden="true" />

        <PlanningTabs
          state={state}
          activeTab={activePlanningTab}
          onChange={onPlanningTabChange}
          dispatch={dispatch}
          onOpenAttachment={onOpenAttachment}
          onOpenResult={onOpenResult}
          transitionProgress={transitionProgress}
          disabled={isAdvancing}
        />
      </div>
    </aside>
  );
}

export function ReportScreen({
  state,
  dispatch,
  onProposeAction,
  inputLocked = false,
  highlightedRoute = null,
  activeProposal = null,
  themeControls,
}: ReportScreenProps) {
  const [openWindows, setOpenWindows] = useState<FloatingWindowState[]>([]);
  const [proposalDialog, setProposalDialog] = useState<{ id: ProposalId; evidenceIds: EvidenceId[] } | null>(null);
  const [activePlanningTab, setActivePlanningTab] = useState<PlanningTab>("schedule");
  const [toastTaskIds, setToastTaskIds] = useState<TaskId[]>([]);
  const [transition, setTransition] = useState<{ from: number; to: number } | null>(null);
  const [previewClock, setPreviewClock] = useState(state.clockMinutes);
  const transitionFrame = useRef<number | null>(null);
  const transitionTimer = useRef<number | null>(null);
  const windowLayer = useRef(30);
  const windowSpawn = useRef(0);
  const [documentPanePercent, setDocumentPanePercent] = useState(58);
  const [isResizing, setIsResizing] = useState(false);
  const resizePointer = useRef<number | null>(null);

  useEffect(() => {
    if (state.recentlyCompleted.length > 0) {
      setToastTaskIds(state.recentlyCompleted);
    }
  }, [state.recentlyCompleted]);

  useEffect(() => {
    if (!transition) return undefined;
    const duration = 1800;
    const startedAt = performance.now();
    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setPreviewClock(Math.round(transition.from + (transition.to - transition.from) * eased));
      if (progress < 1) transitionFrame.current = requestAnimationFrame(animate);
    };

    transitionFrame.current = requestAnimationFrame(animate);
    transitionTimer.current = window.setTimeout(() => {
      setPreviewClock(transition.to);
      dispatch({ type: "ADVANCE_TO_NEXT_COMPLETION" });
      setTransition(null);
    }, duration);

    return () => {
      if (transitionFrame.current !== null) cancelAnimationFrame(transitionFrame.current);
      if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
    };
  }, [dispatch, transition]);

  const nextStep = getNextCompletionMinutes(state);
  const isAdvancing = transition !== null;
  const isInputLocked = inputLocked || isAdvancing;
  const displayClockMinutes = isAdvancing ? previewClock : state.clockMinutes;
  const transitionProgress = transition && transition.to > transition.from
    ? Math.max(0, Math.min(1, (previewClock - transition.from) / (transition.to - transition.from)))
    : 0;

  const beginTimeAdvance = () => {
    if (transition || nextStep === null) return;
    setPreviewClock(state.clockMinutes);
    setTransition({ from: state.clockMinutes, to: state.clockMinutes + nextStep });
  };

  const openWindow = (request: FloatingWindowRequest) => {
    const zIndex = ++windowLayer.current;
    setOpenWindows((current) => {
      if (current.some((windowState) => windowState.key === request.key)) {
        return current.map((windowState) =>
          windowState.key === request.key ? { ...windowState, zIndex } : windowState,
        );
      }
      const cascade = (windowSpawn.current++ % 6) * 18;
      return [...current, { ...request, zIndex, cascade }];
    });
  };

  const focusWindow = (key: FloatingWindowState["key"]) => {
    const zIndex = ++windowLayer.current;
    setOpenWindows((current) => current.map((windowState) =>
      windowState.key === key ? { ...windowState, zIndex } : windowState,
    ));
  };

  const closeWindow = (key: FloatingWindowState["key"]) => {
    setOpenWindows((current) => current.filter((windowState) => windowState.key !== key));
  };

  const openAttachmentViewer = (attachment: AttachmentDefinition) => {
    openWindow({
      key: `attachment:${attachment.evidenceId}`,
      type: "attachment",
      contentId: attachment.evidenceId,
    });
  };

  const openResultViewer = (taskId: TaskId) => {
    setActivePlanningTab("collected");
    openWindow({ key: `result:${taskId}`, type: "result", contentId: taskId });
  };

  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    resizePointer.current = event.pointerId;
    setIsResizing(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const moveResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (resizePointer.current !== event.pointerId) return;
    const workspace = event.currentTarget.parentElement;
    if (!workspace) return;
    const rect = workspace.getBoundingClientRect();
    const percent = ((event.clientX - rect.left) / rect.width) * 100;
    setDocumentPanePercent(Math.max(35, Math.min(69, percent)));
  };

  const stopResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (resizePointer.current !== event.pointerId) return;
    resizePointer.current = null;
    setIsResizing(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const startProposal = (proposalId: ProposalId) => {
    if (isInputLocked || state.activeTasks.seoyun || state.exploredRoutes[proposalId]) return;
    setProposalDialog({ id: proposalId, evidenceIds: [] });
  };

  const toggleProposalEvidence = (evidenceId: EvidenceId) => {
    if (isInputLocked) return;
    setProposalDialog((current) => {
      if (!current) return current;
      const evidenceIds = current.evidenceIds.includes(evidenceId)
        ? current.evidenceIds.filter((id) => id !== evidenceId)
        : current.evidenceIds.length >= 3
          ? current.evidenceIds
          : [...current.evidenceIds, evidenceId];
      return { ...current, evidenceIds };
    });
  };

  return (
    <main className="report-shell">
      <header className="report-topbar">
        <div>
          <p className="report-topbar-eyebrow">OASIS / ACT 02 / DAY 01</p>
          <strong>생활 구역 03 · 조사 브리핑</strong>
        </div>
        <div className="report-topbar-right">
          <span>현재 시각</span>
          <time>{formatClock(displayClockMinutes)}</time>
          {themeControls}
          <button type="button" disabled={isInputLocked} onClick={() => dispatch({ type: "RESTART" })}>처음부터</button>
        </div>
      </header>
      <div
        className={`report-workspace${isResizing ? " is-resizing" : ""}`}
        style={{ "--document-pane-width": `${documentPanePercent}%` } as CSSProperties}
      >
        <section className="document-pane" aria-label="정보 문서">
          <div className="document-scroll">
            <FieldDocument
              state={state}
              onOpenAttachment={openAttachmentViewer}
              onStartProposal={startProposal}
              onOpenRawLog={(proposalId) => openWindow({ key: `raw-log:${proposalId}`, type: "raw-log", contentId: proposalId })}
              highlightedRoute={highlightedRoute}
              activeProposal={activeProposal}
              disabled={isInputLocked}
            />
          </div>
        </section>
        <div
          className="workspace-resizer"
          role="separator"
          aria-label="보고서와 조사 계획 너비 조절"
          aria-orientation="vertical"
          aria-valuemin={35}
          aria-valuemax={69}
          aria-valuenow={Math.round(documentPanePercent)}
          tabIndex={0}
          onPointerDown={startResize}
          onPointerMove={moveResize}
          onPointerUp={stopResize}
          onPointerCancel={stopResize}
        ><span aria-hidden="true" /></div>
        <PlanningPanel
          state={state}
          dispatch={dispatch}
          onOpenAttachment={openAttachmentViewer}
          displayClockMinutes={displayClockMinutes}
          transitionProgress={transitionProgress}
          isAdvancing={isInputLocked}
          activePlanningTab={activePlanningTab}
          onPlanningTabChange={setActivePlanningTab}
          onOpenResult={openResultViewer}
          onAdvance={beginTimeAdvance}
        />
      </div>
      <CompletionToast
        taskIds={toastTaskIds}
        onOpen={() => {
          if (toastTaskIds.length > 0) {
            setActivePlanningTab("collected");
            toastTaskIds.forEach((taskId) => openWindow({ key: `result:${taskId}`, type: "result", contentId: taskId }));
            setToastTaskIds([]);
          }
        }}
        onDismiss={() => setToastTaskIds([])}
      />
      {openWindows.map((windowState) => {
        const commonProps = {
          windowState,
          onClose: () => closeWindow(windowState.key),
          onFocus: () => focusWindow(windowState.key),
        };
        switch (windowState.type) {
          case "attachment":
            return <AttachmentViewer key={windowState.key} attachment={ATTACHMENTS[windowState.contentId]} {...commonProps} />;
          case "result":
            return <ResultViewer key={windowState.key} taskId={windowState.contentId} onOpenAttachment={openAttachmentViewer} {...commonProps} />;
          case "raw-log":
            return <RawLogViewer key={windowState.key} proposal={getProposal(windowState.contentId)} state={state} {...commonProps} />;
        }
      })}
      {proposalDialog && (
        <ProposalEvidenceDialog
          proposal={getProposal(proposalDialog.id)}
          state={state}
          selectedEvidenceIds={proposalDialog.evidenceIds}
          onToggleEvidence={toggleProposalEvidence}
          onCancel={() => setProposalDialog(null)}
          onConfirm={() => {
            if (isInputLocked || state.activeTasks.seoyun) return;
            if (onProposeAction) {
              onProposeAction(proposalDialog.id, proposalDialog.evidenceIds);
            } else {
              dispatch({
                type: "PROPOSE_ACTION",
                proposalId: proposalDialog.id,
                evidenceIds: proposalDialog.evidenceIds,
              });
            }
            setProposalDialog(null);
          }}
        />
      )}
    </main>
  );
}
