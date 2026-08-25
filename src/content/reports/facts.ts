import type { EvidenceId, TaskId } from "../../types/game";

export const KNOWN_FACTS = [
  "주 발전 계통이 오프라인 상태다.",
  "냉장 설비는 고장 난 주 전원 대신 비상 전원으로 버티고 있다.",
  "냉장 설비의 온도가 상승 중이지만 보존 한계 시각은 아직 분석되지 않았다.",
  "서윤의 바이크는 오래 방치되어 현재 상태를 알 수 없다.",
  "발전 구역의 정확한 접근 조건은 아직 확인되지 않았다.",
];

export const EVIDENCE: Record<EvidenceId, {
  title: string;
  source: string;
  detail: string;
}> = {
  powerGridStatus: {
    title: "주 발전 계통 상태",
    source: "미라 / 주 발전 계통 상태 분석",
    detail:
      "주 발전 계통은 오프라인이며 생활 구역 주요 설비가 비상·제한 전력에 의존한다. 이 상태를 장시간 유지하기 어렵다.",
  },
  refrigerationLimit: {
    title: "냉장 보존 한계 추정",
    source: "미라 / 냉장 설비 상태 분석",
    detail:
      "비상 전원 출력이 계속 떨어지고 있다. 현재 추세라면 13:20경 식품 보존 한계에 도달한다.",
  },
  refrigerationWarmingConfirmed: {
    title: "냉장 설비 실제 온도 상승",
    source: "현장 확인 / 지하 1층 · 식당 구역 / 냉장 설비실",
    detail: "현장 센서와 손상된 보관 상태를 대조해 냉장 설비의 실제 온도 상승을 확인했다.",
  },
  refrigerationEmergencyMitigation: {
    title: "냉장 식품 응급 이동",
    source: "현장 확인 / 생활 구역 주거용 냉장고",
    detail: "상하기 쉬운 식품을 작동하는 주거용 냉장고로 옮겼다. 냉장 설비 자체는 아직 복구되지 않았다.",
  },
  refrigerationControlDependency: {
    title: "냉장 설비 제어 단말 의존성",
    source: "현장 확인 / 지하 1층 · 식당 구역",
    detail: "냉장 설비의 온도 제어는 현장 인증 단말을 통해서만 가능하며, 응급 식품 이동만으로는 설비를 정상화할 수 없다.",
  },
  powerTerminalRequirement: {
    title: "발전 구역 현장 인증 조건",
    source: "현장 확인 / 발전 구역 입구",
    detail:
      "발전 구역 입구의 격리 절차는 현장 인증 단말 없이는 해제할 수 없다.",
  },
  motorcycleLightingDependency: {
    title: "보관 구역 조명 단말 의존성",
    source: "현장 확인 / 보관 구역",
    detail: "바이크 현장에서 보관 구역 조명은 현장 유지보수·인증 단말 없이는 켤 수 없다는 점을 확인했다.",
  },
  powerEntranceStatus: {
    title: "발전 구역 입구 현장 기록",
    source: "현장 확인 / 발전 구역 입구",
    detail:
      "입구 셔터는 내려가 있고 외부에서 내부 설비 상태는 확인할 수 없다.",
  },
  terminalLocation: {
    title: "단말기 후보 위치",
    source: "미라 / 현장 단말기 위치 조사",
    detail:
      "오래된 유지보수 기록에 중앙 서비스 구역 공동 보관실 C-12가 후보로 남아 있다.",
  },
  terminalConfirmed: {
    title: "예비 단말기 실물 확인",
    source: "서윤 / 단말기 후보 구역 수색",
    detail:
      "공동 보관실 C-12에서 예비 유지보수·인증 단말기를 실제로 확인했다.",
  },
};

export const TASK_RESULT_LABELS: Record<TaskId, string> = {
  powerAnalysis: "주 발전 계통 상태 분석 완료",
  refrigerationAnalysis: "냉장 설비 분석 완료",
  terminalLocationSearch: "단말기 위치 조사 완료",
  terminalSearch: "단말기 후보 구역 수색 완료",
};
