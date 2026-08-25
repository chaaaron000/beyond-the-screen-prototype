import type { Dispatch } from "react";
import type { GameAction, GameState, Speaker } from "../../types/game";

interface VNSceneProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  onAdvanceDialogue?: () => void;
  disabled?: boolean;
}

function speakerLabel(speaker: Speaker): string {
  switch (speaker) {
    case "mira":
      return "MIRA / MIRAGE";
    case "seoyun":
      return "한서윤";
    case "player":
      return "당신";
    default:
      return "OASIS 기록";
  }
}

export function VNScene({ state, dispatch, onAdvanceDialogue, disabled = false }: VNSceneProps) {
  const line = state.dialogue[state.dialogueIndex];
  const isLastLine = state.dialogueIndex >= state.dialogue.length - 1;
  const activeSpeaker = line?.speaker ?? "narrator";
  const assetBaseUrl = import.meta.env.BASE_URL;

  return (
    <main className="vn-shell">
      <header className="vn-topbar">
        <div>
          <p className="eyebrow">OASIS / ACT 02 / DAY 01</p>
          <h1>화면 너머의 너</h1>
        </div>
        <button
          className="quiet-button"
          type="button"
          disabled={disabled}
          onClick={() => dispatch({ type: "RESTART" })}
        >
          시나리오 다시 시작
        </button>
      </header>

      <section className={`vn-stage vn-stage--${activeSpeaker}`} aria-label="비주얼 노벨 장면">
        <div className="stage-label">OASIS · 생활 구역 03</div>
        <div className="stage-window" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div
          className={`character character--mira ${
            activeSpeaker === "mira" ? "character--active" : "character--resting"
          }`}
        >
          <img src={`${assetBaseUrl}assets/characters/미라.png`} alt="미라" />
        </div>
        <div
          className={`character character--seoyun ${
            activeSpeaker === "seoyun" ? "character--active" : "character--resting"
          }`}
        >
          <img src={`${assetBaseUrl}assets/characters/서윤.png`} alt="한서윤" />
        </div>
        <div className="stage-floor" aria-hidden="true" />
      </section>

      <div className="dialogue-layer">
        <div className={`dialogue-box dialogue-box--${activeSpeaker}`}>
          <div className="dialogue-heading">
            <span className={`speaker-dot speaker-dot--${line?.speaker ?? "narrator"}`} />
            <span>{speakerLabel(line?.speaker ?? "narrator")}</span>
            <span className="dialogue-progress">
              {state.dialogueIndex + 1} / {state.dialogue.length}
            </span>
          </div>
          <p className="dialogue-text">{line?.text}</p>
          <button
            className="continue-button"
            type="button"
            disabled={disabled}
            onClick={onAdvanceDialogue ?? (() => dispatch({ type: "ADVANCE_DIALOGUE" }))}
          >
            {isLastLine ? "보고서 열기" : "계속"}
            <span aria-hidden="true">→</span>
          </button>
        </div>
        <aside className="stage-controls" aria-label="장면 조작 안내">
          <div className="control-row">
            <span>대사록</span>
            <kbd>◐</kbd>
          </div>
          <div className="control-row">
            <span>숨기기</span>
            <kbd>◒</kbd>
          </div>
          <div className="control-row">
            <span>메뉴창</span>
            <kbd>Esc</kbd>
          </div>
          <div className="control-row">
            <span>빨리 감기</span>
            <kbd>Ctrl</kbd>
          </div>
          <div className="control-row">
            <span>오토 모드</span>
            <kbd>F10</kbd>
          </div>
        </aside>
      </div>
    </main>
  );
}
