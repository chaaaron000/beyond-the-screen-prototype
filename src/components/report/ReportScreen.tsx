import type { Dispatch } from "react";
import {
  formatClock,
  formatDuration,
  formatRemainingPreservation,
  REFRIGERATION_DEADLINE_MINUTES,
} from "../../game/clock";
import {
  getAvailableTasks,
  getNextCompletionMinutes,
  getTask,
} from "../../game/reducer";
import { EVIDENCE, KNOWN_FACTS, TASK_RESULT_LABELS } from "../../content/reports/facts";
import { TaskCard } from "./TaskCard";
import type { Actor, GameAction, GameState, Opinion } from "../../types/game";

interface ReportScreenProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

const ACTOR_LABEL: Record<Actor, string> = {
  mira: "미라",
  seoyun: "한서윤",
};

const OPINIONS: { id: Opinion; label: string; detail: string }[] = [
  { id: "power", label: "발전소부터 보자.", detail: "주 전원을 먼저 확인한다" },
  { id: "motorcycle", label: "바이크부터 보자.", detail: "서윤의 이동 수단을 먼저 확인한다" },
  { id: "refrigeration", label: "냉장 설비부터 보자.", detail: "비상 전원에 의존하는 냉장 설비를 먼저 본다" },
  { id: "investigate", label: "조금 더 조사하고 결정하자.", detail: "판단 전에 새 정보를 요청한다" },
];

function ActiveTaskRow({ actor, state }: { actor: Actor; state: GameState }) {
  const task = state.activeTasks[actor];
  return (
    <div className="active-task-row">
      <span className={`actor-mark actor-mark--${actor}`}>{ACTOR_LABEL[actor]}</span>
      {task ? (
        <span>
          {getTask(task.taskId).title} <strong>{formatDuration(task.remainingMinutes)} 남음</strong>
        </span>
      ) : (
        <span className="muted">대기 중</span>
      )}
    </div>
  );
}

export function ReportScreen({ state, dispatch }: ReportScreenProps) {
  const availableTasks = getAvailableTasks(state);
  const nextStep = getNextCompletionMinutes(state);
  const knowsFridgeDeadline = state.discoveredEvidence.includes("refrigerationLimit");
  const nextClock = nextStep === null ? null : state.clockMinutes + nextStep;

  return (
    <main className="report-shell">
      <header className="report-header">
        <div>
          <p className="eyebrow">OASIS / INTERNAL BRIEF / 2120-03-21</p>
          <h1>시설 정보</h1>
          <p className="report-subtitle">판단에 필요한 기록을 모으고, 다음 행동을 함께 정한다.</p>
        </div>
        <div className="report-header-actions">
          <div className="clock-readout">
            <span>현재 시각</span>
            <strong>{formatClock(state.clockMinutes)}</strong>
          </div>
          <button
            className="quiet-button quiet-button--dark"
            type="button"
            onClick={() => dispatch({ type: "RESTART" })}
          >
            처음부터
          </button>
        </div>
      </header>

      <section className="status-strip" aria-label="현재 상황 요약">
        <div className="status-card">
          <span className="status-kicker">냉장 설비</span>
          <strong>{knowsFridgeDeadline ? "비상 전원 운전 중" : "상태 분석 전"}</strong>
          <small>
            {knowsFridgeDeadline
              ? `${formatClock(REFRIGERATION_DEADLINE_MINUTES)} · ${formatRemainingPreservation(
                  REFRIGERATION_DEADLINE_MINUTES - state.clockMinutes,
                )}`
              : "온도 상승 기록만 확인됨"}
          </small>
        </div>
        <div className="status-card">
          <span className="status-kicker">주 발전 계통</span>
          <strong>오프라인</strong>
          <small>고장 원인과 접근 조건 미확인</small>
        </div>
        <div className="status-card">
          <span className="status-kicker">작업 진행</span>
          <strong>{nextStep === null ? "예약된 작업 없음" : "명시적 진행 대기"}</strong>
          <small>읽기와 생각만으로는 시간이 줄지 않음</small>
        </div>
      </section>

      <div className="report-grid">
        <section className="report-column report-column--facts">
          <div className="section-heading">
            <div>
              <p className="section-kicker">01 / 상황</p>
              <h2>현재 알고 있는 것</h2>
            </div>
            <span className="section-rule" />
          </div>
          <ul className="fact-list">
            {KNOWN_FACTS.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>

          <div className="section-heading section-heading--evidence">
            <div>
              <p className="section-kicker">02 / 기록</p>
              <h2>확보한 추가 정보</h2>
            </div>
            <span className="section-rule" />
          </div>
          <div className="evidence-list">
            {state.discoveredEvidence.length === 0 ? (
              <p className="empty-state">아직 별도로 확보한 정보가 없습니다.</p>
            ) : (
              state.discoveredEvidence.map((evidenceId) => {
                const evidence = EVIDENCE[evidenceId];
                return (
                  <article className="evidence-card" key={evidenceId}>
                    <div className="evidence-card-topline">
                      <span className="evidence-pin" />
                      <span>{evidence.source}</span>
                    </div>
                    <h3>{evidence.title}</h3>
                    <p>{evidence.detail}</p>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="report-column report-column--work">
          <div className="section-heading">
            <div>
              <p className="section-kicker">03 / 진행 중</p>
              <h2>두 사람의 작업</h2>
            </div>
            <span className="section-rule" />
          </div>
          <div className="active-task-list">
            <ActiveTaskRow actor="mira" state={state} />
            <ActiveTaskRow actor="seoyun" state={state} />
          </div>
          <button
            className="advance-time-button"
            type="button"
            disabled={nextStep === null}
            onClick={() => dispatch({ type: "ADVANCE_TO_NEXT_COMPLETION" })}
          >
            <span>
              {nextClock === null
                ? "진행할 작업이 없습니다"
                : "다음 작업 완료까지 시간 진행"}
            </span>
            {nextClock !== null && <strong>{formatClock(nextClock)}까지</strong>}
          </button>
          <p className="time-note">작업을 시작하는 순간에는 시각이 바뀌지 않습니다.</p>

          <div className="section-heading section-heading--investigations">
            <div>
              <p className="section-kicker">04 / 조사 요청</p>
              <h2>새 정보 요청하기</h2>
            </div>
            <span className="section-rule" />
          </div>
          <div className="task-list">
            {availableTasks.map((task) => (
              <TaskCard key={task.id} task={task} state={state} dispatch={dispatch} />
            ))}
          </div>
        </section>
      </div>

      {state.recentlyCompleted.length > 0 && (
        <section className="completion-notice" aria-live="polite">
          <span className="notice-mark">새 기록</span>
          <div>
            {state.recentlyCompleted.map((taskId) => {
              const task = getTask(taskId);
              return (
                <p key={taskId}>
                  <strong>{TASK_RESULT_LABELS[taskId]}</strong> · {task.result.summary}
                </p>
              );
            })}
          </div>
        </section>
      )}

      <section className="opinion-section">
        <div className="section-heading">
          <div>
            <p className="section-kicker">05 / 판단</p>
            <h2>어느 쪽을 먼저 볼까?</h2>
          </div>
          <p className="opinion-note">의견은 언제나 말할 수 있습니다. 두 사람이 납득하는지는 별개의 일입니다.</p>
        </div>
        <div className="opinion-grid">
          {OPINIONS.map((opinion) => (
            <button
              className="opinion-button"
              type="button"
              key={opinion.id}
              onClick={() => dispatch({ type: "CHOOSE_OPINION", opinion: opinion.id })}
            >
              <strong>{opinion.label}</strong>
              <span>{opinion.detail}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
