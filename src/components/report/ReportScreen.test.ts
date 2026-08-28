import { describe, expect, it } from "vitest";
import { createInitialState } from "../../game/state";
import { INITIAL_CLOCK_MINUTES, REFRIGERATION_DEADLINE_MINUTES } from "../../game/clock";
import { getDeadlineSummaryItems } from "./ReportScreen";

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
