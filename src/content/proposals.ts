import { getFieldRouteContent } from "./field-mission/routes";
import type {
  EvidenceId,
  EvidenceRelation,
  GameState,
  ProposalId,
  ProposalOutcome,
  TaskId,
} from "../types/game";

export interface ProposalReaction {
  dialogueId: string;
  outcome: ProposalOutcome;
}

export interface ProposalDefinition {
  id: ProposalId;
  number: string;
  title: string;
  rawDialogueId: string;
  summaryLineIndices: Record<"seoyun" | "mira", number>;
  evidenceRelations: Record<EvidenceId, EvidenceRelation>;
}

export interface ProposalPresentation {
  rawDialogueId: string;
  summaryLineIndices: Record<"seoyun" | "mira", number>;
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
    evidenceRelations: evidenceRelationsFor("power"),
    rawDialogueId: "power.rawLog.default",
    summaryLineIndices: { seoyun: 1, mira: 0 },
  },
  {
    id: "motorcycle",
    number: "02",
    title: "바이크를 확인한다",
    evidenceRelations: evidenceRelationsFor("motorcycle"),
    rawDialogueId: "motorcycle.rawLog.default",
    summaryLineIndices: { seoyun: 0, mira: 1 },
  },
  {
    id: "refrigeration",
    number: "03",
    title: "냉장 시설을 확인한다",
    evidenceRelations: evidenceRelationsFor("refrigeration"),
    rawDialogueId: "refrigeration.rawLog.default",
    summaryLineIndices: { seoyun: 0, mira: 3 },
  },
];

export const AUTONOMOUS_PLAN_RULES: { requires: EvidenceId[]; taskIds: TaskId[] }[] = [
  { requires: ["terminalLocation"], taskIds: ["terminalSearch"] },
  { requires: ["powerTerminalRequirement"], taskIds: ["terminalLocationSearch"] },
  { requires: [], taskIds: ["powerAnalysis"] },
];

export const AUTONOMOUS_TAKEOVER_DIALOGUE_ID = "common.autonomousTakeover";

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
    rawDialogueId: "refrigeration.rawLog.deadlineAware",
    summaryLineIndices: { seoyun: 1, mira: 2 },
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
