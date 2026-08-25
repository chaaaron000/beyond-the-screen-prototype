import type {
  DialogueLine,
  EvidenceId,
  GameState,
  ProposalId,
  ProposalOutcome,
} from "../../types/game";

export type TerminalEncounterPosition = 1 | 2 | 3;

export interface FieldRouteReaction {
  dialogue: DialogueLine[];
  outcome: ProposalOutcome;
}

export interface FieldRouteResult {
  summary: string;
  fieldNote: string;
  facts: string[];
  evidenceIds: EvidenceId[];
}

export interface FieldRouteContent {
  location: string;
  fieldLinkLabel: string;
  fieldLogUpdatedLabel: string;
  relatedEvidenceIds: EvidenceId[];
  reactions: {
    noEvidence: FieldRouteReaction;
    related: FieldRouteReaction;
    irrelevant: FieldRouteReaction;
  };
  fieldDialogue: Record<TerminalEncounterPosition, DialogueLine[]>;
  reportResult: FieldRouteResult;
}

const mira = (text: string): DialogueLine => ({ speaker: "mira", text });
const seoyun = (text: string): DialogueLine => ({ speaker: "seoyun", text });
const player = (text: string): DialogueLine => ({ speaker: "player", text });

function composeFieldDialogue(
  routeBeats: DialogueLine[],
  terminalDiscovery: Record<TerminalEncounterPosition, DialogueLine[]>,
): Record<TerminalEncounterPosition, DialogueLine[]> {
  return {
    1: [...routeBeats, ...terminalDiscovery[1]],
    2: [...routeBeats, ...terminalDiscovery[2]],
    3: [...routeBeats, ...terminalDiscovery[3]],
  };
}

export const FIELD_ROUTE_CONTENT: Record<ProposalId, FieldRouteContent> = {
  motorcycle: {
    location: "보관 구역",
    fieldLinkLabel: "FIELD LINK / 바이크 현장",
    fieldLogUpdatedLabel: "FIELD LOG UPDATED / 바이크 현장 기록",
    relatedEvidenceIds: ["motorcycleCondition"],
    reactions: {
      noEvidence: {
        outcome: "accepted",
        dialogue: [
          player("바이크부터 보자."),
          seoyun("오. 너도? 바이크부터 보자는 쪽이야?"),
          mira("……지금요? 발전소랑 냉장고 놔두고요?"),
        ],
      },
      related: {
        outcome: "accepted",
        dialogue: [
          player("바이크부터 보자."),
          seoyun("바이크 상태 기록도 있으니까, 직접 확인해 보자."),
          mira("그 기록이면 현장 확인부터 해볼 만하네요. 그래도 발전소가 우선이긴 해요."),
        ],
      },
      irrelevant: {
        outcome: "accepted",
        dialogue: [
          player("바이크부터 보자."),
          mira("선배, 그 기록은 바이크랑 아무 상관도 없는데요. 그냥 타고 싶다는 걸 합리화하는 거죠?"),
          seoyun("맞아, 합리화일 수도 있지. 그래도 난 바이크부터 갈래."),
        ],
      },
    },
    fieldDialogue: composeFieldDialogue(
      [
        player("보관 구역에 도착했는데, 안이 너무 어둡다."),
        seoyun("이래서는 바이크를 제대로 볼 수가 없어. 조명부터 켜야 하는데… 이거 어떻게 켜?"),
        mira("잠깐, 제어반이랑 스위치를 확인해 볼게요."),
        mira("스위치만으로는 안 켜져요. 보관 구역 조명은 현장 제어를 거쳐야 해요."),
      ],
      {
        1: [
          seoyun("단말기? 조명 켜는 데도 단말기가 필요해?"),
          mira("응. 현장 단말 인증 없이는 보관 구역 조명 자체를 켤 수 없어요."),
        ],
        2: [
          seoyun("아, 씨발. 또 단말기야? 지난번에도 이랬잖아."),
          mira("이번에도 보관 구역 조명이 현장 단말 인증에 묶여 있어요."),
        ],
        3: [
          seoyun("진짜 죄다 그거네. 바이크 보러 왔는데 조명도 단말기 없이는 못 켜."),
          mira("시설 전체가 현장 단말 제어를 요구한다는 게 확실해졌어요."),
        ],
      },
    ),
    reportResult: {
      summary: "어두운 보관 구역에서는 바이크를 자세히 확인할 수 없었고, 조명에는 현장 단말이 필요하다.",
      fieldNote: "보관 구역 조명을 켜려 했지만 현장 단말 인증이 필요해 바이크를 자세히 확인하지 못했다.",
      facts: [
        "보관 구역이 어두워 바이크 상태를 자세히 확인할 수 없었다.",
        "보관 구역 조명은 현장 단말 인증에 의존한다.",
      ],
      evidenceIds: ["motorcycleLightingDependency"],
    },
  },
  power: {
    location: "발전 구역",
    fieldLinkLabel: "FIELD LINK / 발전 구역 현장",
    fieldLogUpdatedLabel: "FIELD LOG UPDATED / 발전 구역 접근 기록",
    relatedEvidenceIds: [
      "powerTerminalRequirement",
      "powerEntranceStatus",
      "terminalLocation",
      "terminalConfirmed",
    ],
    reactions: {
      noEvidence: {
        outcome: "accepted",
        dialogue: [
          player("발전소부터 보자."),
          mira("그게 맞죠! 선배 최고. 주 전원이 살아야 나머지도 살릴 수 있어요."),
          seoyun("……알겠어. 발전소부터 확인하자."),
        ],
      },
      related: {
        outcome: "accepted",
        dialogue: [
          player("발전소부터 보자."),
          seoyun("이 기록까지 있으면 발전소부터 보는 게 맞겠네. 인정할게."),
          mira("그렇죠? 제가 뭐랬어요. 선배, 이제야 제 말 듣네요."),
        ],
      },
      irrelevant: {
        outcome: "rejected",
        dialogue: [
          player("발전소부터 보자."),
          mira("엥? 그게 발전소 접근이랑 무슨 상관이에요?"),
          seoyun("그 기록으로는 입구를 열 수 없어. 다른 근거가 필요해."),
        ],
      },
    },
    fieldDialogue: composeFieldDialogue(
      [
        player("발전 구역 입구에 도착했다."),
        seoyun("입구가 닫혀 있어. 이 격리·접근 지점에서 막혔네."),
        mira("문과 접근 절차 안내를 확인해 볼게요."),
        mira("문 자체가 고장 난 게 아니라 격리 절차가 걸려 있어요. 해제 조건을 더 확인해 볼게요."),
      ],
      {
        1: [
          seoyun("단말기? 발전 구역 입구를 여는 데 현장 단말이 필요하다고?"),
          mira("절차서에도 로컬 인증 단말 없이는 격리를 해제할 수 없다고 되어 있어요."),
        ],
        2: [
          seoyun("아, 씨발. 또 단말기야? 문 하나 확인하는 데도?"),
          mira("이번엔 발전 구역 접근 절차가 단말 인증에 묶인 거예요."),
        ],
        3: [
          seoyun("진짜 죄다 그거네. 발전소도 단말기 없이는 시작도 못 해."),
          mira("입구와 설비가 모두 같은 현장 제어망을 타고 있어요."),
        ],
      },
    ),
    reportResult: {
      summary: "발전 구역 접근은 막혀 있고, 현장 인증 단말이 필요하다.",
      fieldNote: "발전 구역 입구의 격리·접근 절차에 막혔고, 현장 인증 단말 없이는 해제할 수 없었다.",
      facts: [
        "발전 구역 입구는 격리·접근 절차로 막혀 내부 설비에 접근할 수 없다.",
        "발전 구역 접근 절차에는 현장 인증 단말이 필요하다.",
      ],
      evidenceIds: ["powerEntranceStatus", "powerTerminalRequirement"],
    },
  },
  refrigeration: {
    location: "지하 1층 · 식당 구역",
    fieldLinkLabel: "FIELD LINK / 냉장 설비 현장",
    fieldLogUpdatedLabel: "FIELD LOG UPDATED / 냉장 설비 현장 기록",
    relatedEvidenceIds: [
      "refrigerationLimit",
      "powerTerminalRequirement",
      "powerEntranceStatus",
    ],
    reactions: {
      noEvidence: {
        outcome: "rejected",
        dialogue: [
          player("냉장 설비부터 보자."),
          mira("엥? 냉장 설비를 지금 먼저요?"),
          seoyun("그게 무슨 상관인데? 보존 한계부터 확인하지 않으면 움직일 수 없어."),
        ],
      },
      related: {
        outcome: "accepted",
        dialogue: [
          player("냉장 설비부터 보자."),
          seoyun("보존 한계가 이 정도면 냉장 설비부터 확인해야 해. 당장 식품을 지키는 데 가치가 있어."),
          mira("맞아요. 응급 조치는 지금 할 가치가 있어요. 그래도 근본 해결은 발전소가 먼저예요."),
        ],
      },
      irrelevant: {
        outcome: "rejected",
        dialogue: [
          player("냉장 설비부터 보자."),
          mira("엥? 그 기록이 냉장 설비랑 무슨 상관이에요?"),
          seoyun("그걸로는 식품을 옮길 이유가 안 돼. 보존 상태부터 봐야 해."),
        ],
      },
    },
    fieldDialogue: composeFieldDialogue(
      [
        player("지하 1층 식당 구역에 도착했다."),
        seoyun("냉장 설비실 문을 찾아서 열어 보자."),
        mira("……왜 이렇게 따뜻해? 손으로 느껴질 정도인데."),
        seoyun("뭐? 안 돼, 상하기 쉬운 식품부터 골라서 옮기자."),
        mira("이것부터 작동하는 주거용 냉장고로 가져가요."),
        seoyun("식품은 옮겼어. 그런데 온도 제어 패널이 반응하지 않아."),
        mira("응급 이동은 했지만, 냉장 설비 자체는 아직 정상으로 돌아오지 않았어요."),
      ],
      {
        1: [
          seoyun("단말기? 냉장 설비 온도도 현장 단말로 조절해?"),
          mira("절차를 보니 로컬 인증 단말이 있어야 온도 제어를 넘길 수 있어요."),
        ],
        2: [
          seoyun("아, 씨발. 또 단말기야? 식품은 옮겼는데 이것도?"),
          mira("냉장 설비도 예외가 아니네요. 온도 제어가 현장 단말 인증에 묶여 있어요."),
        ],
        3: [
          seoyun("진짜 죄다 그거네. 냉장 설비 온도까지 단말기 없이는 못 바꿔."),
          mira("이제 시설 전체가 같은 단말 제어에 의존한다는 결론을 피할 수 없어요."),
        ],
      },
    ),
    reportResult: {
      summary: "냉장 설비의 실제 온도 상승을 확인하고 식품을 작동하는 주거용 냉장고로 옮겼다.",
      fieldNote: "지하 1층 식당 구역에서 따뜻해진 냉장 설비를 확인하고, 상하기 쉬운 식품을 작동하는 주거용 냉장고로 옮겼다. 온도 제어에는 현장 단말이 필요하다.",
      facts: [
        "냉장 설비의 온도 상승이 실제 현장에서 확인됐다.",
        "상하기 쉬운 식품을 작동하는 주거용 냉장고로 옮겼다.",
        "응급 조치는 끝났지만 냉장 설비는 완전히 복구되지 않았다.",
      ],
      evidenceIds: [
        "refrigerationWarmingConfirmed",
        "refrigerationEmergencyMitigation",
        "refrigerationControlDependency",
      ],
    },
  },
};

export function getFieldRouteContent(proposalId: ProposalId): FieldRouteContent {
  return FIELD_ROUTE_CONTENT[proposalId];
}

export function getNextTerminalEncounterPosition(
  state: GameState,
): TerminalEncounterPosition {
  const completedRoutes = Object.values(state.exploredRoutes).filter(Boolean).length;
  return Math.min(3, completedRoutes + 1) as TerminalEncounterPosition;
}
