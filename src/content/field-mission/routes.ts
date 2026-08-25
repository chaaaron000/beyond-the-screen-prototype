import type {
  EvidenceId,
  GameState,
  ProposalId,
  ProposalOutcome,
} from "../../types/game";

export type TerminalEncounterPosition = 1 | 2 | 3;

export interface FieldRouteReaction {
  dialogueId: string;
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
  durationMinutes: number;
  fieldLinkLabel: string;
  fieldLogUpdatedLabel: string;
  relatedEvidenceIds: EvidenceId[];
  reactions: {
    noEvidence: FieldRouteReaction;
    related: FieldRouteReaction;
    irrelevant: FieldRouteReaction;
  };
  fieldEntryDialogueId: string;
  fieldDialogueIds: Record<TerminalEncounterPosition, string>;
  reportResult: FieldRouteResult;
}

export const FIELD_ROUTE_CONTENT: Record<ProposalId, FieldRouteContent> = {
  motorcycle: {
    location: "보관 구역",
    durationMinutes: 20,
    fieldLinkLabel: "FIELD LINK / 바이크 현장",
    fieldLogUpdatedLabel: "FIELD LOG UPDATED / 바이크 현장 기록",
    relatedEvidenceIds: [],
    reactions: {
      noEvidence: {
        outcome: "accepted",
        dialogueId: "motorcycle.proposal.noEvidence",
      },
      related: {
        outcome: "accepted",
        dialogueId: "motorcycle.proposal.related",
      },
      irrelevant: {
        outcome: "accepted",
        dialogueId: "motorcycle.proposal.irrelevant",
      },
    },
    fieldEntryDialogueId: "motorcycle.field.entry",
    fieldDialogueIds: {
      1: "motorcycle.field.terminal.first",
      2: "motorcycle.field.terminal.second",
      3: "motorcycle.field.terminal.third",
    },
    reportResult: {
      summary: "어두운 보관 구역에서는 바이크를 자세히 확인할 수 없었고, 조명에는 현장 단말이 필요하다.",
      fieldNote: "보관 구역 조명을 켜려 했지만 현장 단말 인증이 필요해 바이크를 자세히 확인하지 못했다.",
      facts: [
        "보관 구역 현장 확인을 완료했다.",
        "보관 구역이 어두워 바이크 상태를 자세히 확인할 수 없었다.",
        "보관 구역 조명은 현장 단말 인증에 의존한다.",
      ],
      evidenceIds: ["motorcycleLightingDependency"],
    },
  },
  power: {
    location: "발전 구역",
    durationMinutes: 35,
    fieldLinkLabel: "FIELD LINK / 발전 구역 현장",
    fieldLogUpdatedLabel: "FIELD LOG UPDATED / 발전 구역 접근 기록",
    relatedEvidenceIds: [
      "powerGridStatus",
      "powerTerminalRequirement",
      "powerEntranceStatus",
      "terminalLocation",
      "terminalConfirmed",
    ],
    reactions: {
      noEvidence: {
        outcome: "accepted",
        dialogueId: "power.proposal.noEvidence",
      },
      related: {
        outcome: "accepted",
        dialogueId: "power.proposal.related",
      },
      irrelevant: {
        outcome: "rejected",
        dialogueId: "power.proposal.irrelevant",
      },
    },
    fieldEntryDialogueId: "power.field.entry",
    fieldDialogueIds: {
      1: "power.field.terminal.first",
      2: "power.field.terminal.second",
      3: "power.field.terminal.third",
    },
    reportResult: {
      summary: "발전 구역 접근은 막혀 있고, 현장 인증 단말이 필요하다.",
      fieldNote: "발전 구역 입구의 격리·접근 절차에 막혔고, 현장 인증 단말 없이는 해제할 수 없었다.",
      facts: [
        "발전 구역 입구 현장 확인을 완료했다.",
        "발전 구역 입구는 격리·접근 절차로 막혀 내부 설비에 접근할 수 없다.",
        "발전 구역 접근 절차에는 현장 인증 단말이 필요하다.",
      ],
      evidenceIds: ["powerEntranceStatus", "powerTerminalRequirement"],
    },
  },
  refrigeration: {
    location: "지하 1층 · 식당 구역",
    durationMinutes: 30,
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
        dialogueId: "refrigeration.proposal.noEvidence",
      },
      related: {
        outcome: "accepted",
        dialogueId: "refrigeration.proposal.related",
      },
      irrelevant: {
        outcome: "rejected",
        dialogueId: "refrigeration.proposal.irrelevant",
      },
    },
    fieldEntryDialogueId: "refrigeration.field.entry",
    fieldDialogueIds: {
      1: "refrigeration.field.terminal.first",
      2: "refrigeration.field.terminal.second",
      3: "refrigeration.field.terminal.third",
    },
    reportResult: {
      summary: "냉장 설비의 실제 온도 상승을 확인하고 식품을 작동하는 주거용 냉장고로 옮겼다.",
      fieldNote: "지하 1층 식당 구역에서 따뜻해진 냉장 설비를 확인하고, 상하기 쉬운 식품을 작동하는 주거용 냉장고로 옮겼다. 온도 제어에는 현장 단말이 필요하다.",
      facts: [
        "냉장 설비의 온도 상승이 실제 현장에서 확인됐다.",
        "상하기 쉬운 식품을 작동하는 주거용 냉장고로 옮겼다.",
        "냉장 설비 온도 제어에는 현장 인증 단말이 필요하다.",
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
