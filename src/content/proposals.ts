import { getFieldRouteContent } from "./field-mission/routes";
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

export interface ProposalReaction {
  dialogue: DialogueLine[];
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
}

export interface ProposalPresentation {
  seoyunSummary: string;
  miraSummary: string;
  rawDialogue: DialogueLine[];
}

const ALL_EVIDENCE: EvidenceId[] = [
  "powerGridStatus",
  "refrigerationLimit",
  "refrigerationWarmingConfirmed",
  "refrigerationEmergencyMitigation",
  "refrigerationControlDependency",
  "powerTerminalRequirement",
  "motorcycleLightingDependency",
  "powerEntranceStatus",
  "terminalLocation",
  "terminalConfirmed",
];

function evidenceRelationsFor(proposalId: ProposalId): Record<EvidenceId, EvidenceRelation> {
  const relatedEvidenceIds = getFieldRouteContent(proposalId).relatedEvidenceIds;
  return Object.fromEntries(
    ALL_EVIDENCE.map((evidenceId) => [
      evidenceId,
      relatedEvidenceIds.includes(evidenceId) ? "supports" : "irrelevant",
    ]),
  ) as Record<EvidenceId, EvidenceRelation>;
}

export const PROPOSALS: ProposalDefinition[] = [
  {
    id: "power",
    number: "01",
    title: "발전소를 조사한다",
    seoyunSummary: "거기 지금 바로 들어갈 수 있는지도 모르잖아.",
    miraSummary: "주 발전 계통부터요. 여기 살아있는 설비 대부분이 거기 물려 있어요.",
    evidenceRelations: evidenceRelationsFor("power"),
    rawDialogue: [
      mira("주 발전 계통부터요. 여기 살아있는 설비 대부분이 거기 물려 있어요."),
      seoyun("거기 지금 바로 들어갈 수 있는지도 모르잖아."),
      mira("발전소 고치면 냉장고도 조명도 같이 해결돼요. 시간 충분한데요?"),
      seoyun("너 그거 확실해?"),
      mira("지금 가진 정보로는요."),
    ],
  },
  {
    id: "motorcycle",
    number: "02",
    title: "바이크를 확인한다",
    seoyunSummary: "난 바이크부터 보고 싶은데?",
    miraSummary: "아닌데요? 발전소 가봐야 하는데.",
    evidenceRelations: evidenceRelationsFor("motorcycle"),
    rawDialogue: [
      seoyun("난 바이크부터 보고 싶은데?"),
      mira("아닌데요? 발전소 가봐야 하는데."),
      seoyun("내가 나가려면 바이크가 있어야 되잖아."),
      mira("근거는요?"),
      seoyun("필요 없어. 나도 하고 싶으니까."),
    ],
  },
  {
    id: "refrigeration",
    number: "03",
    title: "냉장 시설을 확인한다",
    seoyunSummary: "계속 온도가 오르는 건 좀 걸리는데.",
    miraSummary: "아직 얼마나 급한지는 모르잖아요.",
    evidenceRelations: evidenceRelationsFor("refrigeration"),
    rawDialogue: [
      seoyun("계속 온도가 오르는 건 좀 걸리는데."),
      seoyun("정확히 얼마나 버티는지부터 알아봐야 하지 않아?"),
      mira("발전소부터 살리면 같이 해결될 가능성이 높아요."),
      mira("아직 얼마나 급한지는 모르잖아요."),
    ],
  },
];

export const AUTONOMOUS_PLAN_RULES: { requires: EvidenceId[]; taskIds: TaskId[] }[] = [
  { requires: ["terminalLocation"], taskIds: ["terminalSearch"] },
  { requires: ["powerTerminalRequirement"], taskIds: ["terminalLocationSearch"] },
  { requires: [], taskIds: ["powerAnalysis"] },
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

export function getProposalPresentation(
  state: GameState,
  proposalId: ProposalId,
): ProposalPresentation {
  const proposal = getProposal(proposalId);
  if (
    proposalId !== "refrigeration" ||
    !state.discoveredEvidence.includes("refrigerationLimit")
  ) {
    return proposal;
  }

  return {
    seoyunSummary: "13:20이면 생각보다 여유가 없네.",
    miraSummary: "응급 조치는 지금 할 가치가 있어요.",
    rawDialogue: [
      seoyun("네 시간 안쪽이면 그냥 넘기긴 좀 그런데."),
      seoyun("13:20이면 생각보다 여유가 없네."),
      mira("맞아요. 응급 조치는 지금 할 가치가 있어요."),
      mira("그래도 근본 해결은 발전소가 먼저예요."),
    ],
  };
}

export function getProposalReaction(
  state: GameState,
  proposalId: ProposalId,
  evidenceIds: EvidenceId[],
): ProposalReaction {
  const route = getFieldRouteContent(proposalId);
  const selectedEvidence = [...new Set(evidenceIds)];
  const hasIrrelevantEvidence = selectedEvidence.some(
    (evidenceId) => !route.relatedEvidenceIds.includes(evidenceId),
  );

  if (selectedEvidence.length === 0) {
    return route.reactions.noEvidence;
  }

  // Motorcycle proposals intentionally accept unrelated records as a spoken
  // rationalization. Power and refrigeration reject even a mixed bundle.
  if (hasIrrelevantEvidence) {
    return route.reactions.irrelevant;
  }

  return route.reactions.related;
}

export function getAutonomousTaskIds(state: GameState): TaskId[] {
  const taskIds = AUTONOMOUS_PLAN_RULES.find((rule) =>
    rule.requires.every((evidenceId) => state.discoveredEvidence.includes(evidenceId)),
  )?.taskIds ?? [];
  return taskIds.filter(
    (taskId) =>
      taskId !== "terminalSearch" &&
      (taskId !== "terminalLocationSearch" || state.discoveredTerminalConcept),
  );
}
