import type { TaskDefinition } from "../../types/game";

export const TASKS: TaskDefinition[] = [
  {
    id: "powerAnalysis",
    actor: "mira",
    title: "주 발전 계통 상태 분석",
    durationMinutes: 10,
    description: "미라가 주 발전 계통과 생활 구역 전력 기록을 대조한다.",
    result: {
      summary: "주 발전 계통의 정지와 생활 구역 비상 전력 의존 상태를 확인했다.",
      evidenceId: "powerGridStatus",
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
