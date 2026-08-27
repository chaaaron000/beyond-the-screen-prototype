import type { Dispatch, MouseEvent } from "react";
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
  const activeSpeaker = line?.speaker ?? "narrator";
  const assetBaseUrl = import.meta.env.BASE_URL;
  const advanceDialogue = onAdvanceDialogue ?? (() => dispatch({ type: "ADVANCE_DIALOGUE" }));

  const handleScreenClick = (event: MouseEvent<HTMLElement>) => {
    if (disabled || (event.target as Element).closest("button, .stage-controls")) return;
    advanceDialogue();
  };

  return (
    <main className="vn-shell" onClick={handleScreenClick}>
      <header className="vn-topbar">
        <div>
          <p className="stage-label">OASIS · 생활 구역 03</p>
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

      <section
        className={`vn-stage vn-stage--${activeSpeaker}`}
        aria-label="비주얼 노벨 장면"
        style={{
          backgroundImage: `linear-gradient(rgba(8, 13, 16, 0.5), rgba(8, 13, 16, 0.5)), url("${assetBaseUrl}assets/backgrounds/oasis-living-area-03.png")`,
        }}
      >
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
      </section>

      <div className="dialogue-layer">
        <div className={`dialogue-box dialogue-box--${activeSpeaker}`}>
          <div className="dialogue-heading">
            <span>{speakerLabel(line?.speaker ?? "narrator")}</span>
          </div>
          <p className="dialogue-text">{line?.text}</p>
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
