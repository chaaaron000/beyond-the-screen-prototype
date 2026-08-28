import { describe, expect, it } from "vitest";
import { createInitialState } from "../../game/state";
import { INITIAL_CLOCK_MINUTES, REFRIGERATION_DEADLINE_MINUTES, formatClock } from "../../game/clock";
import { gameReducer } from "../../game/reducer";
import { clampResultsPercent, getDeadlineSummaryItems, getResultRows, getResultsHeightPercent } from "./ReportScreen";

describe("planning deadline summary", () => {
  it("shows the three scenario constraints without inventing extra gameplay deadlines", () => {
    const items = getDeadlineSummaryItems(createInitialState(), INITIAL_CLOCK_MINUTES);

    expect(items.map(({ title, detailLabel, statusLabel }) => ({ title, detailLabel, statusLabel }))).toEqual([
      { title: "냉장 시설", detailLabel: "보존 한계 미확인", statusLabel: "분석 필요" },
      { title: "주 발전 계통", detailLabel: "복구 시각 추정 16:40", statusLabel: "남은 04:00" },
      { title: "서윤의 바이크", detailLabel: "복귀 시각 미정", statusLabel: "확인 필요" },
    ]);
    expect(items.map((item) => item.deadlineMinutes)).toEqual([null, null, null]);
  });

  it("connects only the discovered refrigeration limit to the real deadline", () => {
    const state = {
      ...createInitialState(),
      discoveredEvidence: ["refrigerationLimit" as const],
    };
    const items = getDeadlineSummaryItems(state, INITIAL_CLOCK_MINUTES);

    expect(items[0]).toMatchObject({
      deadlineMinutes: REFRIGERATION_DEADLINE_MINUTES,
      detailLabel: "보존 한계 13:20",
      statusLabel: "4시간 남음",
    });
    expect(items.slice(1).every((item) => item.deadlineMinutes === null)).toBe(true);
  });
});

function stateWithCompletions() {
  let state = gameReducer(createInitialState(), { type: "PLAN_TASK", taskId: "powerAnalysis" });
  state = gameReducer(state, { type: "ADVANCE_TO_NEXT_COMPLETION" });
  state = gameReducer(state, { type: "PLAN_TASK", taskId: "refrigerationAnalysis" });
  state = gameReducer(state, { type: "ADVANCE_TO_NEXT_COMPLETION" });
  return state;
}

describe("results row projection", () => {
  it("projects an empty completion log to no rows", () => {
    expect(getResultRows(createInitialState())).toEqual([]);
  });

  it("projects one row per completion record in append order with labels and clock times", () => {
    const state = stateWithCompletions();
    const startClock = createInitialState().clockMinutes;

    expect(getResultRows(state)).toEqual([
      {
        taskId: "powerAnalysis",
        title: "주 발전 계통 상태 분석",
        actorLabel: "미라",
        startedAtMinutes: startClock,
        completedAtMinutes: startClock + 10,
      },
      {
        taskId: "refrigerationAnalysis",
        title: "냉장 설비 상태 분석",
        actorLabel: "미라",
        startedAtMinutes: startClock + 10,
        completedAtMinutes: startClock + 10 + 15,
      },
    ]);
  });

  it("renders formatted times matching formatClock values", () => {
    const state = stateWithCompletions();
    const rows = getResultRows(state);

    expect(formatClock(rows[0].startedAtMinutes)).toBe("09:20");
    expect(formatClock(rows[0].completedAtMinutes)).toBe("09:30");
    expect(formatClock(rows[1].completedAtMinutes)).toBe("09:45");
  });
});

describe("results resize clamp", () => {
  it("keeps percentages inside the 22–58 range", () => {
    expect(clampResultsPercent(10)).toBe(22);
    expect(clampResultsPercent(38)).toBe(38);
    expect(clampResultsPercent(70)).toBe(58);
  });

  it("maps separator drag positions to a bottom-anchored clamped percentage", () => {
    // Dragging the separator up (smaller clientY) grows the results pane.
    expect(getResultsHeightPercent(200, 800, 200)).toBe(58);
    // 38% of an 800px workspace above the half-separator line
    // (1000 - 304 - 5 = 691 clientY); the divider center tracks the pointer.
    expect(getResultsHeightPercent(200, 800, 691)).toBe(38);
    // Dragging far down shrinks it to the minimum.
    expect(getResultsHeightPercent(200, 800, 1000)).toBe(22);
  });

  it("falls back to the default height for degenerate workspace sizes", () => {
    expect(getResultsHeightPercent(0, 0, 100)).toBe(38);
  });
});
