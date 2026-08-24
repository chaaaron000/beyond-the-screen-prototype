import type { Dispatch } from "react";
import { formatClock, formatDuration } from "../../game/clock";
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
    <div className={`work-entry work-entry--${actor}`}>
      <div className="work-entry-heading">
        <span className={`work-actor work-actor--${actor}`}>{ACTOR_LABEL[actor]}</span>
        <span className="work-status">{task ? "진행 중" : "대기 중"}</span>
      </div>
      {task ? (
        <p className="work-entry-detail">
          {getTask(task.taskId).title}
          <strong>{formatDuration(task.remainingMinutes)} 남음</strong>
        </p>
      ) : (
        <p className="work-entry-detail muted">아직 맡은 조사가 없습니다.</p>
      )}
    </div>
  );
}

export function ReportScreen({ state, dispatch }: ReportScreenProps) {
  const availableTasks = getAvailableTasks(state);
  const nextStep = getNextCompletionMinutes(state);
  const nextClock = nextStep === null ? null : state.clockMinutes + nextStep;

  return (
    <main className="report-shell">
      <article className="report-document">
        <header className="document-header">
          <div className="document-header-topline">
            <span className="document-eyebrow">OASIS / SHARED FIELD NOTE</span>
            <button
              className="document-restart"
              type="button"
              onClick={() => dispatch({ type: "RESTART" })}
            >
              처음부터
            </button>
          </div>
          <div className="document-title-row">
            <div>
              <p className="document-date">2120-03-21</p>
              <h1>시설 정보</h1>
              <p className="document-subtitle">
                두 사람이 보내온 자료를 읽고, 다음 행동을 정한다.
              </p>
            </div>
            <time className="document-clock">
              <span>현재 시각</span>
              <strong>{formatClock(state.clockMinutes)}</strong>
            </time>
          </div>
        </header>

        <div className="document-rule" />

        <section className="report-section report-section--situation">
          <div className="report-section-heading">
            <p className="report-section-label">상황</p>
            <h2>현재 상황</h2>
          </div>
          <div className="situation-copy">
            {KNOWN_FACTS.map((fact) => (
              <p key={fact}>{fact}</p>
            ))}
          </div>
        </section>

        <section className="report-section report-section--opinions">
          <div className="report-section-heading">
            <p className="report-section-label">두 사람의 메모</p>
            <h2>각자의 의견</h2>
          </div>
          <div className="opinion-notes">
            <blockquote className="opinion-note opinion-note--mira">
              <p>“주 발전 계통부터요. 여기 살아있는 설비 대부분이 거기 물려 있어요.”</p>
              <cite>미라</cite>
            </blockquote>
            <blockquote className="opinion-note opinion-note--seoyun">
              <p>“난 바이크부터 보고 싶은데?”</p>
              <cite>한서윤</cite>
            </blockquote>
          </div>
        </section>

        <section className="report-section report-section--evidence">
          <div className="report-section-heading">
            <p className="report-section-label">기록</p>
            <h2>확보한 정보</h2>
          </div>
          <div className="evidence-feed" aria-live="polite">
            {state.recentlyCompleted.length > 0 && (
              <div className="new-record-note">
                <span>방금 도착한 기록</span>
                {state.recentlyCompleted.map((taskId) => {
                  const task = getTask(taskId);
                  return (
                    <p key={taskId}>
                      <strong>{TASK_RESULT_LABELS[taskId]}</strong>
                      <br />
                      {task.result.summary}
                    </p>
                  );
                })}
              </div>
            )}
            {state.discoveredEvidence.length === 0 ? (
              <p className="empty-record">아직 추가로 확인한 정보 없음.</p>
            ) : (
              state.discoveredEvidence.map((evidenceId) => {
                const evidence = EVIDENCE[evidenceId];
                return (
                  <article className="evidence-fragment" key={evidenceId}>
                    <p className="evidence-source">{evidence.source}</p>
                    <h3>{evidence.title}</h3>
                    <p>{evidence.detail}</p>
                  </article>
                );
              })
            )}
          </div>
          <p className="section-footnote">
            조사가 완료될 때마다 이 위치에 새로운 문단, 인용 블록 또는 기록 조각이 추가된다.
          </p>
        </section>

        <section className="report-section report-section--investigations">
          <div className="report-section-heading">
            <p className="report-section-label">다음으로 확인할 것</p>
            <h2>조사 가능한 항목</h2>
          </div>
          <div className="task-list">
            {availableTasks.map((task) => (
              <TaskCard key={task.id} task={task} state={state} dispatch={dispatch} />
            ))}
          </div>
        </section>

        <section className="report-section report-section--work">
          <div className="report-section-heading">
            <p className="report-section-label">현재 기록</p>
            <h2>진행 중인 작업</h2>
          </div>
          <div className="work-log">
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
              {nextClock === null ? "진행할 작업이 없습니다" : "다음 작업 완료까지 시간 진행"}
            </span>
            {nextClock !== null && <strong>{formatClock(nextClock)}까지</strong>}
          </button>
          <p className="time-note">작업을 시작하는 순간에는 시각이 바뀌지 않습니다.</p>
        </section>

        <section className="report-section report-section--decision">
          <div className="report-section-heading">
            <p className="report-section-label">당신의 판단</p>
            <h2>어디부터 볼까?</h2>
          </div>
          <p className="decision-intro">읽은 내용을 바탕으로 다음 순서를 정한다.</p>
          <div className="decision-list">
            {OPINIONS.map((opinion) => (
              <button
                className="decision-option"
                type="button"
                key={opinion.id}
                onClick={() => dispatch({ type: "CHOOSE_OPINION", opinion: opinion.id })}
              >
                <span className="decision-arrow" aria-hidden="true">↳</span>
                <span className="decision-copy">
                  <strong>{opinion.label}</strong>
                  <small>{opinion.detail}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      </article>
    </main>
  );
}
