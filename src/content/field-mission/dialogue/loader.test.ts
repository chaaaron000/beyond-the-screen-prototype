import { describe, expect, it } from "vitest";
import { getDialogue, parseDialogueSource } from "./loader";

describe("dialogue loader", () => {
  it("reads a section and maps speaker names", () => {
    const sections = parseDialogueSource(`# sample.section

PLAYER: 확인해 보자.
SEOYUN: 그래.
MIRA: 잠깐만요.`);

    expect(sections.get("sample.section")).toEqual([
      { speaker: "player", text: "확인해 보자." },
      { speaker: "seoyun", text: "그래." },
      { speaker: "mira", text: "잠깐만요." },
    ]);
  });

  it("throws for a missing section id", () => {
    expect(() => getDialogue("missing.section")).toThrow(
      'Dialogue section "missing.section" was not found.',
    );
  });

  it("preserves Korean text and punctuation", () => {
    const sections = parseDialogueSource(`# punctuation
MIRA: ……지금요? 발전소랑 냉장고 놔두고요?!`);

    expect(sections.get("punctuation")?.[0].text).toBe(
      "……지금요? 발전소랑 냉장고 놔두고요?!",
    );
  });

  it("loads proposal summaries as explicit single-speaker sections", () => {
    expect(getDialogue("power.summary.seoyun")).toEqual([
      {
        speaker: "seoyun",
        text: "거기 지금 바로 들어갈 수 있는지도 모르잖아.",
      },
    ]);
    expect(getDialogue("power.summary.mira")).toEqual([
      {
        speaker: "mira",
        text: "주 발전 계통부터요. 여기 살아있는 설비 대부분이 거기 물려 있어요.",
      },
    ]);
  });
});
