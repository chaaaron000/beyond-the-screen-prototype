import { useState, type CSSProperties, type Dispatch } from "react";
import { ATTACHMENTS, type AttachmentDefinition } from "../../content/reports/attachments";
import { EVIDENCE, KNOWN_FACTS, TASK_RESULT_LABELS } from "../../content/reports/facts";
import { formatClock, formatDuration, REFRIGERATION_DEADLINE_MINUTES } from "../../game/clock";
import {
  getAvailableTasks,
  getNextCompletionMinutes,
  getTask,
} from "../../game/reducer";
import type {
  Actor,
  GameAction,
  GameState,
  Opinion,
  TaskDefinition,
} from "../../types/game";

interface ReportScreenProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
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

const OPINIONS: { id: Opinion; label: string; detail: string }[] = [
  { id: "power", label: "발전소부터 보자", detail: "주 전원을 먼저 확인한다" },
  { id: "motorcycle", label: "바이크부터 보자", detail: "서윤의 이동 수단을 먼저 확인한다" },
  { id: "refrigeration", label: "냉장 설비부터 보자", detail: "비상 전원에 의존하는 설비를 본다" },
  { id: "investigate", label: "조금 더 조사하자", detail: "판단 전에 새 정보를 요청한다" },
];

function getTimelineBlocks(state: GameState, actor: Actor): TimelineBlock[] {
  const blocks: TimelineBlock[] = [];
  const activeTask = state.activeTasks[actor];
  let cursor = 0;

  if (activeTask) {
    const task = getTask(activeTask.taskId);
    blocks.push({ task, start: 0, end: activeTask.remainingMinutes, active: true });
    cursor = activeTask.remainingMinutes;
  }

  state.queuedTasks[actor].forEach((taskId) => {
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

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="field-section-heading">
      <p>{eyebrow}</p>
      <h2>{title}</h2>
    </header>
  );
}

function Timeline({ state }: { state: GameState }) {
  const windowMinutes = getTimelineWindow(state);
  const knowsDeadline = state.discoveredEvidence.includes("refrigerationLimit");
  const deadlineOffset = knowsDeadline
    ? REFRIGERATION_DEADLINE_MINUTES - state.clockMinutes
    : null;
  const ticks = Array.from(
    new Set(
      [0, 60, 120, 180, 240, windowMinutes].filter(
        (tick) =>
          tick <= windowMinutes &&
          (knowsDeadline || state.clockMinutes + tick !== REFRIGERATION_DEADLINE_MINUTES),
      ),
    ),
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
          <span className="deadline-key">보존 한계 13:20</span>
        ) : (
          <span className="deadline-unknown">보존 한계 미확인</span>
        )}
      </div>

      <div className="timeline-axis" aria-hidden="true">
        {ticks.map((tick) => (
          <span key={tick} style={{ left: `${(tick / windowMinutes) * 100}%` }}>
            {formatClock(state.clockMinutes + tick)}
          </span>
        ))}
      </div>

      <div className="timeline-board">
        {deadlinePosition !== null && (
          <>
            <div
              className="deadline-zone"
              style={{ left: `${deadlinePosition}%` }}
              aria-hidden="true"
            />
            <div
              className="deadline-line"
              style={{ left: `${deadlinePosition}%` }}
              aria-label="냉장 보존 한계 13:20"
            >
              <span>13:20</span>
            </div>
          </>
        )}
        {["mira", "seoyun"].map((actor) => {
          const typedActor = actor as Actor;
          const blocks = getTimelineBlocks(state, typedActor);
          return (
            <div className={`timeline-lane timeline-lane--${typedActor}`} key={typedActor}>
              <div className="timeline-lane-label">
                <span>{ACTOR_LABEL[typedActor]}</span>
                <small>
                  {state.activeTasks[typedActor]
                    ? "진행 중"
                    : state.queuedTasks[typedActor].length > 0
                      ? "예약 대기"
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
                {blocks.length === 0 && <span className="timeline-empty">예약된 작업 없음</span>}
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

function QueueList({ actor, state, dispatch }: { actor: Actor; state: GameState; dispatch: Dispatch<GameAction> }) {
  const queue = state.queuedTasks[actor];

  if (queue.length === 0) {
    return <p className="queue-empty">이후 작업은 비워둔 상태</p>;
  }

  return (
    <ol className="queue-list" aria-label={`${ACTOR_LABEL[actor]} 예약 대기열`}>
      {queue.map((taskId, index) => (
        <li key={taskId}>
          <span className="queue-index">{index + 1}</span>
          <span className="queue-title">{getTask(taskId).title}</span>
          <span className="queue-actions">
            <button
              type="button"
              disabled={index === 0}
              aria-label={`${getTask(taskId).title} 위로 이동`}
              onClick={() =>
                dispatch({ type: "MOVE_QUEUED_TASK", actor, fromIndex: index, toIndex: index - 1 })
              }
            >
              위
            </button>
            <button
              type="button"
              disabled={index === queue.length - 1}
              aria-label={`${getTask(taskId).title} 아래로 이동`}
              onClick={() =>
                dispatch({ type: "MOVE_QUEUED_TASK", actor, fromIndex: index, toIndex: index + 1 })
              }
            >
              아래
            </button>
            <button
              type="button"
              aria-label={`${getTask(taskId).title} 예약 취소`}
              onClick={() => dispatch({ type: "CANCEL_QUEUED_TASK", taskId })}
            >
              취소
            </button>
          </span>
        </li>
      ))}
    </ol>
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
      <SectionHeading eyebrow="현재 knowledge state" title="새로 맡길 수 있는 조사" />
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
                  onClick={() => dispatch({ type: "START_TASK", taskId: task.id })}
                >
                  {actorBusy ? "뒤에 예약" : "지금 맡기기"}
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

function OpinionDrawer({ dispatch }: { dispatch: Dispatch<GameAction> }) {
  return (
    <details className="opinion-drawer">
      <summary>
        <span>
          <small>판단</small>
          의견 말하기
        </span>
        <b>열기</b>
      </summary>
      <div className="opinion-drawer-list">
        {OPINIONS.map((opinion) => (
          <button
            type="button"
            key={opinion.id}
            onClick={() => dispatch({ type: "CHOOSE_OPINION", opinion: opinion.id })}
          >
            <strong>{opinion.label}</strong>
            <span>{opinion.detail}</span>
          </button>
        ))}
      </div>
    </details>
  );
}

function EvidenceSidebar({
  state,
  onOpenAttachment,
}: {
  state: GameState;
  onOpenAttachment: (attachment: AttachmentDefinition) => void;
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
                <button type="button" onClick={() => onOpenAttachment(attachment)}>
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
        <div className="photo-placeholder"><span>{attachment.evidenceId === "motorcycleCondition" ? "BIKE / STORAGE" : "DEVICE / C-12"}</span></div>
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
  onClose,
}: {
  attachment: AttachmentDefinition;
  onClose: () => void;
}) {
  return (
    <div className="attachment-backdrop" role="presentation" onClick={onClose}>
      <section
        className="attachment-viewer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="attachment-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="attachment-viewer-header">
          <div>
            <p>OASIS / ATTACHMENT</p>
            <h2 id="attachment-title">{attachment.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="첨부 자료 닫기">닫기</button>
        </header>
        <AttachmentVisual attachment={attachment} />
        <p className="attachment-caption">{attachment.caption}</p>
      </section>
    </div>
  );
}

function FieldDocument({
  state,
  onOpenAttachment,
}: {
  state: GameState;
  onOpenAttachment: (attachment: AttachmentDefinition) => void;
}) {
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

      <section className="field-document-section">
        <SectionHeading eyebrow="두 사람의 메모" title="서로 다른 우선순위" />
        <div className="field-opinion-notes">
          <blockquote className="field-opinion-note field-opinion-note--mira">
            <p>“주 발전 계통부터요. 여기 살아있는 설비 대부분이 거기 물려 있어요.”</p>
            <cite>미라</cite>
          </blockquote>
          <blockquote className="field-opinion-note field-opinion-note--seoyun">
            <p>“난 바이크부터 보고 싶은데?”</p>
            <cite>한서윤</cite>
          </blockquote>
        </div>
      </section>

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

      <section className="field-document-section field-document-section--records">
        <SectionHeading eyebrow="문서 사용법" title="읽는 곳, 정하는 곳" />
        <p className="document-note">본문은 상황과 상세 기록을 읽는 곳입니다. 조사 요청과 시간 진행은 오른쪽 계획판에서 언제든 조정할 수 있습니다.</p>
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

function PlanningPanel({ state, dispatch, onOpenAttachment }: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  onOpenAttachment: (attachment: AttachmentDefinition) => void;
}) {
  const nextStep = getNextCompletionMinutes(state);
  const nextClock = nextStep === null ? null : state.clockMinutes + nextStep;

  return (
    <aside className="planning-pane">
      <div className="planning-scroll">
        <header className="planning-header">
          <div>
            <p className="panel-eyebrow">FIELD PLAN / LIVE</p>
            <h2>조사 계획</h2>
          </div>
          <div className="planning-clock">
            <span>현재 시각</span>
            <strong>{formatClock(state.clockMinutes)}</strong>
          </div>
        </header>

        <Timeline state={state} />

        <div className="deadline-readout">
          <span>중요한 시간 제한</span>
          {state.discoveredEvidence.includes("refrigerationLimit") ? (
            <strong>냉장 보존 한계 / {formatClock(REFRIGERATION_DEADLINE_MINUTES)}</strong>
          ) : (
            <strong className="is-unknown">아직 분석되지 않음</strong>
          )}
        </div>

        <div className="schedule-status-list">
          <ScheduleStatus actor="mira" state={state} dispatch={dispatch} />
          <ScheduleStatus actor="seoyun" state={state} dispatch={dispatch} />
        </div>

        <button
          className="advance-time-control"
          type="button"
          disabled={nextStep === null}
          onClick={() => dispatch({ type: "ADVANCE_TO_NEXT_COMPLETION" })}
        >
          <span>{nextClock === null ? "진행할 작업이 없습니다" : "다음 완료 시점까지 시간 진행"}</span>
          {nextClock !== null && <strong>{formatClock(nextClock)}까지</strong>}
        </button>
        <p className="advance-time-note">작업을 예약하거나 순서를 바꾸는 것만으로는 시간이 흐르지 않습니다.</p>

        <CompletionNote state={state} />
        <TaskPicker state={state} dispatch={dispatch} />
        <OpinionDrawer dispatch={dispatch} />
        <EvidenceSidebar state={state} onOpenAttachment={onOpenAttachment} />
      </div>
    </aside>
  );
}

export function ReportScreen({ state, dispatch }: ReportScreenProps) {
  const [openAttachment, setOpenAttachment] = useState<AttachmentDefinition | null>(null);

  return (
    <main className="report-shell">
      <header className="report-topbar">
        <div>
          <p className="report-topbar-eyebrow">OASIS / ACT 02 / DAY 01</p>
          <strong>생활 구역 03 · 조사 브리핑</strong>
        </div>
        <div className="report-topbar-right">
          <span>현재 시각</span>
          <time>{formatClock(state.clockMinutes)}</time>
          <button type="button" onClick={() => dispatch({ type: "RESTART" })}>처음부터</button>
        </div>
      </header>
      <div className="report-workspace">
        <section className="document-pane" aria-label="정보 문서">
          <div className="document-scroll">
            <FieldDocument state={state} onOpenAttachment={setOpenAttachment} />
          </div>
        </section>
        <PlanningPanel state={state} dispatch={dispatch} onOpenAttachment={setOpenAttachment} />
      </div>
      {openAttachment && <AttachmentViewer attachment={openAttachment} onClose={() => setOpenAttachment(null)} />}
    </main>
  );
}
