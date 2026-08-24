import { formatClock, formatRemainingPreservation, REFRIGERATION_DEADLINE_MINUTES } from "../game/clock";
import type {
  DialogueLine,
  EvidenceId,
  EvidenceRelation,
  GameState,
  ProposalId,
  ProposalOutcome,
  TaskId,
} from "../types/game";

const mira = (text: string): DialogueLine => ({ speaker: "mira", text });
const seoyun = (text: string): DialogueLine => ({ speaker: "seoyun", text });
const player = (text: string): DialogueLine => ({ speaker: "player", text });

export interface ProposalReaction {
  dialogue: DialogueLine[];
  outcome: ProposalOutcome;
}

interface ProposalReactionRule {
  evidenceIds: EvidenceId[];
  dialogue: (state: GameState) => DialogueLine[];
  outcome: ProposalOutcome;
}

export interface ProposalDefinition {
  id: ProposalId;
  number: string;
  title: string;
  seoyunSummary: string;
  miraSummary: string;
  rawDialogue: DialogueLine[];
  evidenceRelations: Record<EvidenceId, EvidenceRelation>;
  reactions: {
    noEvidence: (state: GameState) => DialogueLine[];
    supports: (state: GameState) => DialogueLine[];
    complicates: (state: GameState) => DialogueLine[];
    irrelevant: (state: GameState) => DialogueLine[];
  };
  reactionRules: ProposalReactionRule[];
}

const ALL_EVIDENCE: EvidenceId[] = [
  "refrigerationLimit",
  "powerTerminalRequirement",
  "motorcycleCondition",
  "powerEntranceStatus",
  "terminalLocation",
  "terminalConfirmed",
];

const relations = (
  relation: EvidenceRelation,
  overrides: Partial<Record<EvidenceId, EvidenceRelation>>,
): Record<EvidenceId, EvidenceRelation> =>
  Object.fromEntries(
    ALL_EVIDENCE.map((evidenceId) => [evidenceId, overrides[evidenceId] ?? relation]),
  ) as Record<EvidenceId, EvidenceRelation>;

export const PROPOSALS: ProposalDefinition[] = [
  {
    id: "power",
    number: "01",
    title: "발전소를 조사한다",
    seoyunSummary: "거기 지금 바로 들어갈 수 있는지도 모르잖아.",
    miraSummary: "주 발전 계통부터요. 여기 살아있는 설비 대부분이 거기 물려 있어요.",
    rawDialogue: [
      mira("주 발전 계통부터요. 여기 살아있는 설비 대부분이 거기 물려 있어요."),
      seoyun("거기 지금 바로 들어갈 수 있는지도 모르잖아."),
      mira("발전소 고치면 냉장고도 조명도 같이 해결돼요. 시간 충분한데요?"),
      seoyun("너 그거 확실해?"),
      mira("지금 가진 정보로는요."),
    ],
    evidenceRelations: relations("complicates", {
      terminalLocation: "supports",
      terminalConfirmed: "supports",
      motorcycleCondition: "irrelevant",
    }),
    reactions: {
      noEvidence: () => [
        player("발전소부터 보자."),
        mira("그렇죠? 주 전원만 돌아오면 여러 문제가 한꺼번에 풀리니까."),
        seoyun("근데 입구부터 확인해야 하는 거 아냐?"),
        mira("지금 가진 정보로는, 가서 보면 된다는 쪽이에요."),
      ],
      supports: () => [
        player("발전소부터 보자."),
        mira("단말기는 찾았어요. 이제 현장 인증을 하고 발전소로 갈 수 있겠네요."),
        seoyun("그럼 이번엔 진짜 발전소를 보러 가자."),
      ],
      complicates: () => [
        player("발전소부터 보자."),
        mira("……처음엔 바로 복구할 수 있을 줄 알았는데요."),
        mira("원격으로 못 들어가요. 현장 유지보수·인증 단말이 필요해요."),
        seoyun("그럼 단말기부터 찾아야겠네."),
      ],
      irrelevant: () => [
        player("발전소부터 보자."),
        mira("그래서 이 기록이 발전소랑 무슨 상관인데요?"),
        seoyun("아니, 그걸 근거라고 가져온 거야?"),
      ],
    },
    reactionRules: [
      {
        evidenceIds: ["terminalConfirmed"],
        outcome: "accepted",
        dialogue: () => [
          player("발전소부터 보자."),
          mira("단말기는 찾았어요. 이제 현장 인증을 하고 발전소로 갈 수 있겠네요."),
          seoyun("그럼 이번엔 진짜 발전소를 보러 가자."),
        ],
      },
      {
        evidenceIds: ["terminalLocation"],
        outcome: "considering",
        dialogue: () => [
          player("발전소부터 보자."),
          mira("단말기 후보는 찾았지만, 아직 실물이 있는지는 몰라요."),
          seoyun("그럼 단말기부터 찾아야겠네."),
        ],
      },
    ],
  },
  {
    id: "motorcycle",
    number: "02",
    title: "바이크를 확인한다",
    seoyunSummary: "난 바이크부터 보고 싶은데?",
    miraSummary: "아닌데요? 발전소 가봐야 하는데.",
    rawDialogue: [
      seoyun("난 바이크부터 보고 싶은데?"),
      mira("아닌데요? 발전소 가봐야 하는데."),
      seoyun("내가 나가려면 바이크가 있어야 되잖아."),
      mira("근거는요?"),
      seoyun("필요 없어. 나도 하고 싶으니까."),
    ],
    evidenceRelations: relations("irrelevant", {
      motorcycleCondition: "supports",
    }),
    reactions: {
      noEvidence: () => [
        player("바이크부터 보자."),
        seoyun("오. 너도?"),
        mira("근거는요?"),
        seoyun("필요 없어. 나도 하고 싶으니까."),
      ],
      supports: () => [
        player("바이크부터 보자."),
        seoyun("오. 직접 보니까 생각보다 멀쩡하지?"),
        mira("이건 서윤 씨가 직접 확인했으니까, 근거는 있네요."),
      ],
      complicates: () => [
        player("바이크부터 보자."),
        seoyun("오. 너도?"),
        mira("그 기록이 바이크를 먼저 봐야 한다는 뜻은 아닌데요."),
      ],
      irrelevant: () => [
        player("바이크부터 보자."),
        seoyun("오. 너도?"),
        mira("선배. 별 같잖은 이유까지 붙여가면서 언니 의견 따르고 싶어요?"),
      ],
    },
    reactionRules: [
      {
        evidenceIds: ["motorcycleCondition"],
        outcome: "accepted",
        dialogue: () => [
          player("바이크부터 보자."),
          seoyun("오. 직접 보니까 생각보다 멀쩡하지?"),
          mira("이건 서윤 씨가 직접 확인했으니까, 근거는 있네요."),
        ],
      },
    ],
  },
  {
    id: "refrigeration",
    number: "03",
    title: "냉장 시설을 확인한다",
    seoyunSummary: "네 시간 안쪽이면 그냥 넘기긴 좀 그런데.",
    miraSummary: "발전소가 바로 되면 더 빠르긴 해요.",
    rawDialogue: [
      mira("발전소 고치면 냉장고도 조명도 같이 해결돼요. 시간 충분한데요?"),
      seoyun("너 그거 확실해?"),
      mira("지금 가진 정보로는요."),
      seoyun("네 시간 안쪽이면 그냥 넘기긴 좀 그런데."),
      mira("발전소가 바로 되면 더 빠르긴 해요."),
      seoyun("그러니까 확인만 먼저 해보자고."),
    ],
    evidenceRelations: relations("complicates", {
      refrigerationLimit: "supports",
      powerTerminalRequirement: "supports",
      powerEntranceStatus: "supports",
      motorcycleCondition: "irrelevant",
    }),
    reactions: {
      noEvidence: () => [
        player("냉장 설비부터 보자."),
        mira("왜요?"),
        seoyun("뭐 발견한 거 있어?"),
        mira("없으면 전 발전소 쪽 볼 건데요."),
        seoyun("난 바이크."),
      ],
      supports: (state) => [
        player("냉장 설비부터 보자."),
        seoyun("네 시간 안쪽이면 그냥 넘기긴 좀 그런데."),
        mira("발전소가 바로 되면 더 빠르긴 해요."),
        seoyun("그러니까 확인만 먼저 해보자고."),
        ...(state.discoveredEvidence.includes("refrigerationLimit")
          ? [mira(`분석 기준 보존 한계는 ${formatClock(REFRIGERATION_DEADLINE_MINUTES)}예요.`)]
          : []),
      ],
      complicates: () => [
        player("냉장 설비부터 보자."),
        mira("발전소부터 해결하면 냉장도 같이 해결될 가능성이 있다고 봤는데요."),
        seoyun("그 발전소가 바로 되는 게 아니라며."),
        mira("……그럼 냉장고부터 보는 게 맞네요."),
      ],
      irrelevant: () => [
        player("냉장 설비부터 보자."),
        mira("잠깐. 냉장고 얘기하다가 바이크는 왜 나오는데요?"),
        seoyun("나도 그건 좀 모르겠는데."),
      ],
    },
    reactionRules: [
      {
        evidenceIds: ["refrigerationLimit", "powerTerminalRequirement"],
        outcome: "accepted",
        dialogue: (state) => [
          player("냉장 설비부터 보자."),
          seoyun(`지금 ${formatRemainingPreservation(Math.max(0, REFRIGERATION_DEADLINE_MINUTES - state.clockMinutes))} 남은 거야?`),
          mira("발전소가 바로 되면 더 빠르긴 했는데, 원격으로 복구할 수 없다면 냉장고부터 보는 게 맞네요."),
          seoyun("그러니까 확인만 먼저 해보자고."),
        ],
      },
      {
        evidenceIds: ["refrigerationLimit"],
        outcome: "considering",
        dialogue: (state) => [
          player("냉장 설비부터 보자."),
          seoyun(`지금 ${formatRemainingPreservation(Math.max(0, REFRIGERATION_DEADLINE_MINUTES - state.clockMinutes))} 남은 거야?`),
          mira(`분석 기준 보존 한계는 ${formatClock(REFRIGERATION_DEADLINE_MINUTES)}예요.`),
          seoyun("오케이. 그럼 이쪽부터."),
        ],
      },
    ],
  },
];

export const AUTONOMOUS_PLAN_RULES: { requires: EvidenceId[]; taskIds: TaskId[] }[] = [
  { requires: ["terminalLocation"], taskIds: ["terminalSearch", "powerEntranceInspection"] },
  { requires: ["powerTerminalRequirement"], taskIds: ["terminalLocationSearch", "powerEntranceInspection"] },
  { requires: [], taskIds: ["powerAnalysis", "powerEntranceInspection"] },
];

export const AUTONOMOUS_TAKEOVER_DIALOGUE: DialogueLine[] = [
  mira("됐어요."),
  seoyun("야."),
  mira("이러다 진짜 시간 다 가요. 언니, 우리 그냥 하죠."),
  seoyun("……그래. 일단 움직이자."),
];

export function getProposal(proposalId: ProposalId): ProposalDefinition {
  return PROPOSALS.find((proposal) => proposal.id === proposalId)!;
}

function sameEvidence(left: EvidenceId[], right: EvidenceId[]): boolean {
  return left.length === right.length && left.every((evidenceId) => right.includes(evidenceId));
}

function includesEvidence(selected: EvidenceId[], required: EvidenceId[]): boolean {
  return required.every((evidenceId) => selected.includes(evidenceId));
}

export function getProposalReaction(
  state: GameState,
  proposalId: ProposalId,
  evidenceIds: EvidenceId[],
): ProposalReaction {
  const proposal = getProposal(proposalId);
  const selectedRelations = evidenceIds.map((evidenceId) => proposal.evidenceRelations[evidenceId]);

  // A mixed bundle should be called out even when one useful record is present.
  if (selectedRelations.includes("irrelevant")) {
    return { dialogue: proposal.reactions.irrelevant(state), outcome: "rejected" };
  }

  const exactRule = proposal.reactionRules.find((rule) => sameEvidence(rule.evidenceIds, evidenceIds));
  if (exactRule) {
    return { dialogue: exactRule.dialogue(state), outcome: exactRule.outcome };
  }

  const containsRule = [...proposal.reactionRules]
    .sort((left, right) => right.evidenceIds.length - left.evidenceIds.length)
    .find((rule) => rule.evidenceIds.length > 0 && includesEvidence(evidenceIds, rule.evidenceIds));
  if (containsRule) {
    return { dialogue: containsRule.dialogue(state), outcome: containsRule.outcome };
  }

  if (evidenceIds.length === 0) {
    const outcome: ProposalOutcome = proposalId === "refrigeration" && !state.discoveredEvidence.includes("refrigerationLimit")
      ? "rejected"
      : "considering";
    return { dialogue: proposal.reactions.noEvidence(state), outcome };
  }

  if (selectedRelations.includes("complicates")) {
    return { dialogue: proposal.reactions.complicates(state), outcome: "considering" };
  }
  return { dialogue: proposal.reactions.supports(state), outcome: "considering" };
}

export function getAutonomousTaskIds(state: GameState): TaskId[] {
  return AUTONOMOUS_PLAN_RULES.find((rule) =>
    rule.requires.every((evidenceId) => state.discoveredEvidence.includes(evidenceId)),
  )?.taskIds ?? [];
}
