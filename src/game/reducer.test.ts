import { describe, expect, it } from "vitest";
import { getAutonomousTaskIds, getProposalReaction } from "../content/proposals";
import { FIELD_ROUTE_CONTENT } from "../content/field-mission/routes";
import { ATTACHMENTS } from "../content/reports/attachments";
import { EVIDENCE } from "../content/reports/facts";
import { createInitialState } from "./state";
import {
  gameReducer,
  getAvailableTasks,
  getNextCompletionMinutes,
} from "./reducer";
import type { EvidenceId, GameState, ProposalId } from "../types/game";

function openReport(state = createInitialState()): GameState {
  let next = state;
  while (next.view === "vn") {
    next = gameReducer(next, { type: "ADVANCE_DIALOGUE" });
  }
  return next;
}

function finishDialogue(state: GameState): GameState {
  let next = state;
  while (next.view === "vn") {
    next = gameReducer(next, { type: "ADVANCE_DIALOGUE" });
  }
  return next;
}

function completeRoute(
  state: GameState,
  proposalId: ProposalId,
  evidenceIds: EvidenceId[] = [],
): GameState {
  return finishDialogue(
    gameReducer(state, {
      type: "PROPOSE_ACTION",
      proposalId,
      evidenceIds,
    }),
  );
}

describe("first field mission proposal contract", () => {
  it("accepts a motorcycle proposal without evidence", () => {
    const reaction = getProposalReaction(createInitialState(), "motorcycle", []);

    expect(reaction.outcome).toBe("accepted");
  });

  it("accepts irrelevant motorcycle evidence through the rationalization branch", () => {
    const reaction = getProposalReaction(createInitialState(), "motorcycle", ["refrigerationLimit"]);

    expect(reaction.outcome).toBe("accepted");
    const dialogue = reaction.dialogue.map((line) => line.text).join(" ");
    expect(dialogue).toContain("합리화");
    expect(dialogue).toContain("그래도 난 바이크부터 갈래");
  });

  it("accepts power with zero or related evidence, but rejects irrelevant evidence", () => {
    const state = createInitialState();

    expect(getProposalReaction(state, "power", []).outcome).toBe("accepted");
    expect(
      getProposalReaction(state, "power", ["powerTerminalRequirement"]).outcome,
    ).toBe("accepted");
    expect(getProposalReaction(state, "power", ["motorcycleCondition"]).outcome).toBe("rejected");
    expect(
      getProposalReaction(state, "power", ["powerTerminalRequirement", "motorcycleCondition"]).outcome,
    ).toBe("rejected");
  });

  it("rejects refrigeration without evidence, accepts related evidence, and rejects irrelevant evidence", () => {
    const state = createInitialState();

    expect(getProposalReaction(state, "refrigeration", []).outcome).toBe("rejected");
    expect(getProposalReaction(state, "refrigeration", ["refrigerationLimit"]).outcome).toBe("accepted");
    expect(getProposalReaction(state, "refrigeration", ["motorcycleCondition"]).outcome).toBe("rejected");
    expect(
      getProposalReaction(state, "refrigeration", ["refrigerationLimit", "motorcycleCondition"]).outcome,
    ).toBe("rejected");
  });
});

describe("field mission lifecycle", () => {
  it("gates terminal location investigation on internal terminal discovery and keeps stage two hidden", () => {
    const initial = openReport();
    expect(getAvailableTasks(initial).some((task) => task.id === "terminalLocationSearch")).toBe(false);
    expect(getAvailableTasks(initial).some((task) => task.id === "terminalSearch")).toBe(false);
    expect(getAutonomousTaskIds({ ...initial, discoveredEvidence: ["powerTerminalRequirement"] })).not.toContain(
      "terminalLocationSearch",
    );

    const afterRoute = completeRoute(initial, "motorcycle");
    const availableIds = getAvailableTasks(afterRoute).map((task) => task.id);
    expect(availableIds).toContain("terminalLocationSearch");
    expect(availableIds).not.toContain("terminalSearch");
    expect(
      getAvailableTasks(afterRoute).find((task) => task.id === "terminalLocationSearch")?.durationMinutes,
    ).toBe(20);
  });

  it("records the first terminal source once and selects first, second, and third encounters deterministically", () => {
    let state = openReport();
    const firstProposal = gameReducer(state, {
      type: "PROPOSE_ACTION",
      proposalId: "motorcycle",
      evidenceIds: [],
    });
    const firstDialogue = firstProposal.dialogue.map((line) => line.text).join(" ");
    expect(firstDialogue).toContain("보관 구역에 도착");
    expect(firstDialogue).toContain("바이크를 제대로 볼 수가 없어");
    expect(firstDialogue).toContain("단말기?");
    expect(firstDialogue).not.toContain("진짜 죄다 그거네");
    state = finishDialogue(firstProposal);
    expect(state.firstTerminalDiscoverySource).toBe("motorcycle");
    expect(state.discoveredTerminalConcept).toBe(true);

    const secondProposal = gameReducer(state, {
      type: "PROPOSE_ACTION",
      proposalId: "power",
      evidenceIds: [],
    });
    const secondDialogue = secondProposal.dialogue.map((line) => line.text).join(" ");
    expect(secondDialogue).toContain("발전 구역 입구에 도착");
    expect(secondDialogue).toContain("아, 씨발. 또 단말기야?");
    expect(secondDialogue).not.toContain("진짜 죄다 그거네");
    state = finishDialogue(secondProposal);
    expect(state.firstTerminalDiscoverySource).toBe("motorcycle");

    const thirdProposal = gameReducer(state, {
      type: "PROPOSE_ACTION",
      proposalId: "refrigeration",
      evidenceIds: ["refrigerationLimit"],
    });
    const thirdDialogue = thirdProposal.dialogue.map((line) => line.text).join(" ");
    expect(thirdDialogue).toContain("지하 1층 식당 구역에 도착");
    expect(thirdDialogue).toContain("상하기 쉬운 식품");
    expect(thirdDialogue).toContain("주거용 냉장고");
    expect(thirdDialogue).toContain("온도 제어 패널");
    expect(thirdDialogue).toContain("진짜 죄다 그거네");
    state = finishDialogue(thirdProposal);
    expect(state.firstTerminalDiscoverySource).toBe("motorcycle");
    expect(Object.values(state.exploredRoutes).filter(Boolean)).toHaveLength(3);
  });

  it("completes each route once while leaving the other routes available", () => {
    const initial = openReport();
    const rejectedPower = finishDialogue(
      gameReducer(initial, {
        type: "PROPOSE_ACTION",
        proposalId: "power",
        evidenceIds: ["motorcycleCondition"],
      }),
    );
    expect(rejectedPower.exploredRoutes.power).toBe(false);
    expect(rejectedPower.discoveredTerminalConcept).toBe(false);

    const completed = completeRoute(initial, "motorcycle");
    const replay = gameReducer(completed, {
      type: "PROPOSE_ACTION",
      proposalId: "motorcycle",
      evidenceIds: [],
    });

    expect(replay).toBe(completed);
    expect(completed.exploredRoutes.motorcycle).toBe(true);
    expect(completed.exploredRoutes.power).toBe(false);
    expect(completed.exploredRoutes.refrigeration).toBe(false);

    const powerProposal = gameReducer(completed, {
      type: "PROPOSE_ACTION",
      proposalId: "power",
      evidenceIds: [],
    });
    expect(powerProposal.pendingFieldVisit).toBe("power");
    expect(powerProposal.exploredRoutes.motorcycle).toBe(true);
  });

  it("hides the matching legacy field-check task after each route is explored", () => {
    const initial = openReport();
    const initialAvailableIds = getAvailableTasks(initial).map((task) => task.id);
    expect(initialAvailableIds).toEqual(
      expect.arrayContaining(["motorcycleInspection", "powerEntranceInspection"]),
    );

    const afterMotorcycle = completeRoute(initial, "motorcycle");
    const afterMotorcycleIds = getAvailableTasks(afterMotorcycle).map((task) => task.id);
    expect(afterMotorcycleIds).not.toContain("motorcycleInspection");
    expect(afterMotorcycleIds).toContain("powerEntranceInspection");

    const afterPower = completeRoute(afterMotorcycle, "power");
    const afterPowerIds = getAvailableTasks(afterPower).map((task) => task.id);
    expect(afterPowerIds).not.toContain("motorcycleInspection");
    expect(afterPowerIds).not.toContain("powerEntranceInspection");
  });

  it("records refrigeration emergency mitigation and visible route evidence", () => {
    const state = openReport();
    const completed = completeRoute(state, "refrigeration", ["refrigerationLimit"]);

    expect(completed.refrigerationEmergencyMitigated).toBe(true);
    expect(Object.keys(FIELD_ROUTE_CONTENT.refrigeration.reportResult)).toEqual([
      "summary",
      "fieldNote",
      "facts",
      "evidenceIds",
    ]);
    expect(completed.discoveredEvidence).toEqual(
      expect.arrayContaining([
        "refrigerationWarmingConfirmed",
        "refrigerationEmergencyMitigation",
        "refrigerationControlDependency",
      ]),
    );
    expect(completed.discoveredEvidence).not.toContain("powerTerminalRequirement");
    expect(FIELD_ROUTE_CONTENT.refrigeration.reportResult.fieldNote).toContain("주거용 냉장고");
    expect(EVIDENCE.refrigerationControlDependency.source).toContain("지하 1층 · 식당 구역");
    expect(EVIDENCE.refrigerationControlDependency.detail).not.toContain("발전소");
    expect(ATTACHMENTS.refrigerationControlDependency.title).toContain("냉장 제어 단말");
  });

  it("keeps route display locations and storage-area evidence site-specific", () => {
    expect(FIELD_ROUTE_CONTENT.motorcycle.location).toBe("보관 구역");
    expect(FIELD_ROUTE_CONTENT.power.location).toBe("발전 구역");
    expect(FIELD_ROUTE_CONTENT.refrigeration.location).toBe("지하 1층 · 식당 구역");
    expect(EVIDENCE.motorcycleLightingDependency.title).toContain("보관 구역 조명");
    expect(ATTACHMENTS.motorcycleLightingDependency.caption).toContain("보관 구역 조명");
  });

  it("does not advance the clock when an accepted field route completes", () => {
    const state = openReport();
    const completed = completeRoute(state, "motorcycle");

    expect(completed.clockMinutes).toBe(state.clockMinutes);
  });

  it("preserves planning, queue reorder, and time advancement semantics", () => {
    let state = openReport();
    const startClock = state.clockMinutes;
    state = gameReducer(state, { type: "PLAN_TASK", taskId: "motorcycleInspection" });
    state = gameReducer(state, { type: "PLAN_TASK", taskId: "powerEntranceInspection" });
    expect(state.clockMinutes).toBe(startClock);
    expect(state.queuedTasks.seoyun).toEqual([
      "motorcycleInspection",
      "powerEntranceInspection",
    ]);

    state = gameReducer(state, {
      type: "MOVE_PLANNED_TASK",
      actor: "seoyun",
      fromIndex: 1,
      toIndex: 0,
    });
    expect(state.queuedTasks.seoyun).toEqual([
      "powerEntranceInspection",
      "motorcycleInspection",
    ]);
    expect(getNextCompletionMinutes(state)).toBe(35);

    state = gameReducer(state, { type: "ADVANCE_TO_NEXT_COMPLETION" });
    expect(state.clockMinutes).toBe(startClock + 35);
    expect(state.completedTaskIds).toContain("powerEntranceInspection");
    expect(state.activeTasks.seoyun).toBeNull();
    expect(state.queuedTasks.seoyun).toEqual(["motorcycleInspection"]);
  });
});
