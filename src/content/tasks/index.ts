import type { TaskDefinition } from "../../types/game";

export const TASKS: TaskDefinition[] = [
  {
    id: "powerAnalysis",
    actor: "mira",
    title: "발전소 상태 / 접근 조건 분석",
    durationMinutes: 10,
    description: "미라가 로컬 설비 기록과 접근 로그를 대조한다.",
    result: {
      summary: "원격 복구만으로는 부족한 조건이 분석 기록에서 드러났다.",
      evidenceId: "powerTerminalRequirement",
    },
  },
  {
    id: "refrigerationAnalysis",
    actor: "mira",
    title: "냉장 설비 상태 분석",
    durationMinutes: 15,
    description: "미라가 비상 전원 출력과 냉장 센서 추세를 분석한다.",
    result: {
      summary: "비상 전원 출력 추세와 식품 보존 한계 시각을 확보했다.",
      evidenceId: "refrigerationLimit",
    },
  },
  {
    id: "motorcycleInspection",
    actor: "seoyun",
    title: "바이크 현장 확인",
    durationMinutes: 20,
    description: "서윤이 보관 구역으로 가서 자신의 바이크를 직접 살핀다.",
    result: {
      summary: "바이크의 외관과 이동 가능성을 직접 확인했다.",
      evidenceId: "motorcycleCondition",
    },
  },
  {
    id: "powerEntranceInspection",
    actor: "seoyun",
    title: "발전 구역 입구 현장 확인",
    durationMinutes: 35,
    description: "서윤이 발전 구역 입구까지 가서 현장 상태를 확인한다.",
    result: {
      summary: "입구에서 확인할 수 있는 현장 상태를 기록했다.",
      evidenceId: "powerEntranceStatus",
    },
  },
  {
    id: "terminalLocationSearch",
    actor: "mira",
    title: "현장 단말기 위치 조사",
    durationMinutes: 20,
    description: "미라가 오래된 유지보수 기록에서 단말기 후보 위치를 추적한다.",
    result: {
      summary: "오래된 기록에서 단말기 후보 구역 하나를 좁혔다.",
      evidenceId: "terminalLocation",
    },
  },
  {
    id: "terminalSearch",
    actor: "seoyun",
    title: "단말기 후보 구역 수색",
    durationMinutes: 40,
    description: "서윤이 중앙 서비스 구역 공동 보관실 C-12를 직접 수색한다.",
    requires: ["terminalLocation"],
    result: {
      summary: "기록에 남은 예비 단말기의 실물을 확인했다.",
      evidenceId: "terminalConfirmed",
    },
  },
];
