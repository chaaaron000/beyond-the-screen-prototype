import { formatClock, formatRemainingPreservation, REFRIGERATION_DEADLINE_MINUTES } from "../../game/clock";
import type { DialogueLine, GameState, Opinion } from "../../types/game";

const player = (text: string): DialogueLine => ({ speaker: "player", text });
const mira = (text: string): DialogueLine => ({ speaker: "mira", text });
const seoyun = (text: string): DialogueLine => ({ speaker: "seoyun", text });

function hasEvidence(state: GameState, id: GameState["discoveredEvidence"][number]): boolean {
  return state.discoveredEvidence.includes(id);
}

export function getOpinionDialogue(state: GameState, opinion: Opinion): DialogueLine[] {
  const knowsFridge = hasEvidence(state, "refrigerationLimit");
  const knowsPowerAccess = hasEvidence(state, "powerTerminalRequirement");
  const knowsBike = hasEvidence(state, "motorcycleCondition");
  const knowsTerminalLocation = hasEvidence(state, "terminalLocation");
  const knowsTerminal = hasEvidence(state, "terminalConfirmed");

  if (opinion === "investigate") {
    return [
      player("조금 더 조사하고 결정하자."),
      mira("결정을 미루는 건 자유인데, 시간은 작업을 진행할 때만 줄어들어요."),
      seoyun("그럼 뭘 더 볼지 골라. 생각만 하는 건 공짜니까."),
    ];
  }

  if (opinion === "motorcycle") {
    return [
      player("바이크부터 보자."),
      seoyun(
        knowsBike ? "오. 직접 보니까 생각보다 멀쩡하지?" : "오. 내 편.",
      ),
      mira("근거는요?"),
      seoyun(
        knowsBike
          ? "이건 내가 확인했으니까 알아."
          : "필요 없어. 나도 하고 싶으니까.",
      ),
      ...(knowsFridge
        ? [mira("냉장 쪽 한계가 가까워도, 바이크를 먼저 보겠다는 거네요.")]
        : []),
    ];
  }

  if (opinion === "power") {
    if (!knowsPowerAccess) {
      return [
        player("발전소부터 보자."),
        mira("그렇죠? 주 전원만 돌아오면 여러 문제가 한꺼번에 풀리니까."),
        seoyun("근데 입구부터 확인해야 하는 거 아냐?"),
        mira("지금 가진 정보로는, 가서 보면 된다는 쪽이에요."),
      ];
    }

    return [
      player("발전소부터 보자."),
      mira("……처음엔 바로 복구할 수 있을 줄 알았는데요."),
      mira(
        knowsTerminal
          ? "단말기는 찾았어요. 이제 현장 인증을 하고 발전소로 갈 수 있겠네요."
          : knowsTerminalLocation
            ? "단말기 후보는 찾았지만, 아직 실물이 있는지는 몰라요."
            : "원격으로 못 들어가요. 현장 유지보수·인증 단말이 필요해요.",
      ),
      seoyun(
        knowsTerminal
          ? "그럼 이번엔 진짜 발전소를 보러 가자."
          : "그럼 단말기부터 찾아야겠네.",
      ),
    ];
  }

  if (knowsFridge && knowsPowerAccess) {
    const remaining = Math.max(0, REFRIGERATION_DEADLINE_MINUTES - state.clockMinutes);
    return [
      player("냉장 설비부터 보자."),
      mira("……그럼 냉장고부터 보는 게 맞네요."),
      seoyun(`지금 ${formatRemainingPreservation(remaining)} 남은 거야?`),
      mira(`분석 기준 보존 한계는 ${formatClock(REFRIGERATION_DEADLINE_MINUTES)}예요.`),
      seoyun("오케이. 그럼 이쪽부터."),
    ];
  }

  if (knowsFridge) {
    return [
      player("냉장 설비부터 보자."),
      seoyun("네 시간 안쪽이면 그냥 넘기긴 좀 그런데."),
      mira("발전소가 바로 되면 더 빠르긴 해요."),
      seoyun("그러니까 확인만 먼저 해보자고."),
    ];
  }

  return [
    player("냉장 설비부터 보자."),
    mira("왜요?"),
    seoyun("뭐 발견한 거 있어?"),
    mira("없으면 전 발전소 쪽 볼 건데요."),
    seoyun("난 바이크."),
  ];
}
