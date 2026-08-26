import { describe, expect, it } from "vitest";
import { FIELD_ROUTE_CONTENT } from "../content/field-mission/routes";
import { getDialogue } from "../content/field-mission/dialogue/loader";
import {
  getAutonomousTaskIds,
  getProposalPresentation,
  getProposalReaction,
} from "../content/proposals";
import { ATTACHMENTS } from "../content/reports/attachments";
import { EVIDENCE } from "../content/reports/facts";
import { createInitialState } from "./state";
import {
  gameReducer,
  getAvailableTasks,
  getNextCompletionMinutes,
  getNextCompletionTaskIds,
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
    gameReducer(state, { type: "PROPOSE_ACTION", proposalId, evidenceIds }),
  );
}

function completeTask(state: GameState, taskId: "powerAnalysis" | "refrigerationAnalysis") {
  const planned = gameReducer(state, { type: "PLAN_TASK", taskId });
  return gameReducer(planned, { type: "ADVANCE_TO_NEXT_COMPLETION" });
}

describe("first field mission investigation contract", () => {
  it("keeps terminal knowledge hidden after power analysis", () => {
    const completed = completeTask(openReport(), "powerAnalysis");

    expect(completed.discoveredEvidence).toContain("powerGridStatus");
    expect(completed.discoveredEvidence).not.toContain("powerTerminalRequirement");
    expect(completed.discoveredTerminalConcept).toBe(false);
    expect(getAvailableTasks(completed).map((task) => task.id)).not.toContain(
      "terminalLocationSearch",
    );
    expect(EVIDENCE.powerGridStatus.detail).not.toMatch(/단말|인증|접근/);
    expect(ATTACHMENTS.powerGridStatus.caption).not.toMatch(/단말|인증|접근/);
  });

  it("discovers terminal requirements only at the power field route", () => {
    const completed = completeRoute(openReport(), "power");

    expect(completed.discoveredEvidence).toEqual(
      expect.arrayContaining(["powerEntranceStatus", "powerTerminalRequirement"]),
    );
    expect(completed.discoveredTerminalConcept).toBe(true);
    expect(getAvailableTasks(completed).map((task) => task.id)).toContain(
      "terminalLocationSearch",
    );
  });

  it("does not expose legacy Seoyun field checks as investigation tasks", () => {
    const availableIds = getAvailableTasks(openReport()).map((task) => task.id as string);

    expect(availableIds).not.toContain("motorcycleInspection");
    expect(availableIds).not.toContain("powerEntranceInspection");
    expect(availableIds).toEqual(
      expect.arrayContaining(["powerAnalysis", "refrigerationAnalysis"]),
    );
  });

  it("never opens terminal location work from analysis evidence alone", () => {
    const state = {
      ...openReport(),
      discoveredEvidence: ["powerGridStatus"] as EvidenceId[],
    };

    expect(getAutonomousTaskIds(state)).not.toContain("terminalLocationSearch");
    expect(getAvailableTasks(state).map((task) => task.id)).not.toContain(
      "terminalLocationSearch",
    );
  });
});

describe("proposal contract", () => {
  it("accepts a motorcycle proposal without evidence", () => {
    expect(getProposalReaction(createInitialState(), "motorcycle", []).outcome).toBe(
      "accepted",
    );
  });

  it("accepts any motorcycle evidence only as rationalization", () => {
    const reaction = getProposalReaction(createInitialState(), "motorcycle", [
      "powerGridStatus",
    ]);
    const dialogue = getDialogue(reaction.dialogueId).map((line) => line.text).join(" ");

    expect(reaction.outcome).toBe("accepted");
    expect(dialogue).toContain("아무 상관도 없는데요");
    expect(dialogue).toContain("그래도 난 바이크부터 갈래");
    expect(FIELD_ROUTE_CONTENT.motorcycle.relatedEvidenceIds).toEqual([]);
  });

  it("accepts power with no evidence or grid status and rejects unrelated evidence", () => {
    const state = createInitialState();

    expect(getProposalReaction(state, "power", []).outcome).toBe("accepted");
    expect(getProposalReaction(state, "power", ["powerGridStatus"]).outcome).toBe(
      "accepted",
    );
    expect(
      getProposalReaction(state, "power", ["refrigerationLimit"]).outcome,
    ).toBe("rejected");
  });

  it("uses deadline-neutral refrigeration copy before analysis", () => {
    const presentation = getProposalPresentation(createInitialState(), "refrigeration");
    const rawDialogue = getDialogue(presentation.rawDialogueId);
    const copy = [
      ...getDialogue(presentation.summaryDialogueIds.seoyun).map((line) => line.text),
      ...getDialogue(presentation.summaryDialogueIds.mira).map((line) => line.text),
      ...rawDialogue.map((line) => line.text),
    ].join(" ");

    expect(copy).not.toMatch(/13:20|네 시간|\d+시간/);
    expect(copy).toContain("정확히 얼마나 버티는지");
  });

  it("uses deadline-aware refrigeration copy after analysis", () => {
    const state = {
      ...createInitialState(),
      discoveredEvidence: ["refrigerationLimit"] as EvidenceId[],
    };
    const presentation = getProposalPresentation(state, "refrigeration");
    const rawDialogue = getDialogue(presentation.rawDialogueId);
    const copy = [
      ...getDialogue(presentation.summaryDialogueIds.seoyun).map((line) => line.text),
      ...rawDialogue.map((line) => line.text),
    ].join(" ");

    expect(copy).toContain("13:20");
    expect(copy).toContain("네 시간");
  });

  it("rejects refrigeration without evidence and leaves no field result", () => {
    const state = openReport();
    const proposed = gameReducer(state, {
      type: "PROPOSE_ACTION",
      proposalId: "refrigeration",
      evidenceIds: [],
    });
    const completed = finishDialogue(proposed);

    expect(proposed.pendingFieldVisit).toBeNull();
    expect(completed.clockMinutes).toBe(state.clockMinutes);
    expect(completed.exploredRoutes.refrigeration).toBe(false);
    expect(completed.refrigerationEmergencyMitigated).toBe(false);
  });

  it("blocks a field proposal while Seoyun has active work", () => {
    const state: GameState = {
      ...openReport(),
      activeTasks: {
        mira: null,
        seoyun: {
          actor: "seoyun",
          taskId: "terminalSearch",
          remainingMinutes: 10,
        },
      },
    };

    expect(
      gameReducer(state, {
        type: "PROPOSE_ACTION",
        proposalId: "motorcycle",
        evidenceIds: [],
      }),
    ).toBe(state);
  });
});

describe("field route time and lifecycle", () => {
  it("advances the clock by the motorcycle route duration", () => {
    const state = openReport();
    const completed = completeRoute(state, "motorcycle");

    expect(FIELD_ROUTE_CONTENT.motorcycle.durationMinutes).toBe(20);
    expect(completed.clockMinutes).toBe(
      state.clockMinutes + FIELD_ROUTE_CONTENT.motorcycle.durationMinutes,
    );
  });

  it("advances refrigeration time and records emergency mitigation", () => {
    const state = openReport();
    const completed = completeRoute(state, "refrigeration", [
      "refrigerationLimit",
    ]);

    expect(completed.clockMinutes).toBe(
      state.clockMinutes + FIELD_ROUTE_CONTENT.refrigeration.durationMinutes,
    );
    expect(completed.refrigerationEmergencyMitigated).toBe(true);
    expect(completed.discoveredEvidence).toEqual(
      expect.arrayContaining([
        "refrigerationWarmingConfirmed",
        "refrigerationEmergencyMitigation",
        "refrigerationControlDependency",
      ]),
    );
    expect(completed.discoveredEvidence).not.toContain("powerTerminalRequirement");
  });

  it("progresses an active MIRAGE task during a field visit", () => {
    const state: GameState = {
      ...openReport(),
      activeTasks: {
        mira: {
          actor: "mira",
          taskId: "refrigerationAnalysis",
          remainingMinutes: 15,
        },
        seoyun: null,
      },
    };
    const completed = completeRoute(state, "motorcycle");

    expect(completed.clockMinutes).toBe(state.clockMinutes + 20);
    expect(completed.activeTasks.mira).toBeNull();
    expect(completed.completedTaskIds).toContain("refrigerationAnalysis");
    expect(completed.discoveredEvidence).toContain("refrigerationLimit");
    expect(completed.recentlyCompleted).toContain("refrigerationAnalysis");
  });

  it("does not auto-start MIRAGE queued work during a longer field visit", () => {
    const state: GameState = {
      ...openReport(),
      activeTasks: {
        mira: {
          actor: "mira",
          taskId: "refrigerationAnalysis",
          remainingMinutes: 10,
        },
        seoyun: null,
      },
      queuedTasks: { mira: ["powerAnalysis"], seoyun: [] },
    };
    const completed = completeRoute(state, "motorcycle");

    expect(completed.activeTasks.mira).toBeNull();
    expect(completed.queuedTasks.mira).toEqual(["powerAnalysis"]);
    expect(completed.completedTaskIds).not.toContain("powerAnalysis");
  });

  it("records the first terminal source once across all three encounters", () => {
    let state = completeRoute(openReport(), "motorcycle");
    expect(state.firstTerminalDiscoverySource).toBe("motorcycle");

    state = completeRoute(state, "power");
    expect(state.firstTerminalDiscoverySource).toBe("motorcycle");

    state = completeRoute(state, "refrigeration", ["refrigerationLimit"]);
    expect(state.firstTerminalDiscoverySource).toBe("motorcycle");
    expect(Object.values(state.exploredRoutes).filter(Boolean)).toHaveLength(3);
  });

  it("selects first, second, and third encounter dialogue deterministically", () => {
    let state = openReport();
    let proposal = gameReducer(state, {
      type: "PROPOSE_ACTION",
      proposalId: "motorcycle",
      evidenceIds: [],
    });
    expect(proposal.dialogue.map((line) => line.text).join(" ")).toContain("단말기?");
    state = finishDialogue(proposal);

    proposal = gameReducer(state, {
      type: "PROPOSE_ACTION",
      proposalId: "power",
      evidenceIds: [],
    });
    expect(proposal.dialogue.map((line) => line.text).join(" ")).toContain(
      "또 단말기야?",
    );
    state = finishDialogue(proposal);

    proposal = gameReducer(state, {
      type: "PROPOSE_ACTION",
      proposalId: "refrigeration",
      evidenceIds: ["refrigerationLimit"],
    });
    expect(proposal.dialogue.map((line) => line.text).join(" ")).toContain(
      "진짜 죄다 그거네",
    );
  });

  it("does not allow a completed route to be revisited", () => {
    const completed = completeRoute(openReport(), "motorcycle");

    expect(
      gameReducer(completed, {
        type: "PROPOSE_ACTION",
        proposalId: "motorcycle",
        evidenceIds: [],
      }),
    ).toBe(completed);
  });

  it("keeps MIRAGE remote sensing separate from Seoyun physical perception", () => {
    const route = FIELD_ROUTE_CONTENT.refrigeration;
    const dialogue = [
      ...getDialogue(route.fieldEntryDialogueId),
      ...getDialogue(route.fieldDialogueIds[1]),
    ]
      .map((line) => `${line.speaker}:${line.text}`)
      .join(" ");

    expect(dialogue).toContain("seoyun:……야. 여기 생각보다 하나도 안 차가운데.");
    expect(dialogue).toContain("mira:잠깐. 센서값도 생각보다 훨씬 올라갔는데요.");
    expect(dialogue).not.toContain("mira:……왜 이렇게 따뜻해?");
  });
});

describe("planning and explicit time advancement", () => {
  it("keeps PLAN_TASK free and preserves queue reorder", () => {
    let state = openReport();
    const startClock = state.clockMinutes;
    state = gameReducer(state, { type: "PLAN_TASK", taskId: "powerAnalysis" });
    state = gameReducer(state, {
      type: "PLAN_TASK",
      taskId: "refrigerationAnalysis",
    });

    expect(state.clockMinutes).toBe(startClock);
    expect(state.queuedTasks.mira).toEqual([
      "powerAnalysis",
      "refrigerationAnalysis",
    ]);

    state = gameReducer(state, {
      type: "MOVE_PLANNED_TASK",
      actor: "mira",
      fromIndex: 1,
      toIndex: 0,
    });
    expect(state.queuedTasks.mira).toEqual([
      "refrigerationAnalysis",
      "powerAnalysis",
    ]);
    expect(getNextCompletionMinutes(state)).toBe(15);
  });

  it("ADVANCE_TO_NEXT_COMPLETION starts one planned task and not the next", () => {
    let state = openReport();
    state = gameReducer(state, { type: "PLAN_TASK", taskId: "powerAnalysis" });
    state = gameReducer(state, {
      type: "PLAN_TASK",
      taskId: "refrigerationAnalysis",
    });
    const startClock = state.clockMinutes;

    state = gameReducer(state, { type: "ADVANCE_TO_NEXT_COMPLETION" });

    expect(state.clockMinutes).toBe(startClock + 10);
    expect(state.completedTaskIds).toContain("powerAnalysis");
    expect(state.activeTasks.mira).toBeNull();
    expect(state.queuedTasks.mira).toEqual(["refrigerationAnalysis"]);
  });

  it("reports the tasks completing at the next advancement", () => {
    let state = openReport();
    state = gameReducer(state, { type: "PLAN_TASK", taskId: "powerAnalysis" });
    state = gameReducer(state, {
      type: "PLAN_TASK",
      taskId: "refrigerationAnalysis",
    });

    expect(getNextCompletionTaskIds(state)).toEqual(["powerAnalysis"]);

    state = gameReducer(state, { type: "ADVANCE_TO_NEXT_COMPLETION" });
    expect(getNextCompletionTaskIds(state)).toEqual(["refrigerationAnalysis"]);
  });

  it("reports both tasks when they complete at the same time", () => {
    let state = openReport();
    state = gameReducer(state, { type: "PLAN_TASK", taskId: "powerAnalysis" });
    state = gameReducer(state, { type: "PLAN_TASK", taskId: "refrigerationAnalysis" });
    state = gameReducer(state, { type: "ADVANCE_TO_NEXT_COMPLETION" });

    state = gameReducer(state, {
      type: "PLAN_TASK",
      taskId: "powerAnalysis",
    });
    expect(getNextCompletionTaskIds(state)).toEqual(["refrigerationAnalysis"]);
  });

  it("returns empty list when nothing is scheduled", () => {
    expect(getNextCompletionTaskIds(openReport())).toEqual([]);
    expect(getNextCompletionMinutes(openReport())).toBeNull();
  });
});
