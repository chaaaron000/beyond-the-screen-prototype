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
  refrigerationLimit: {
    title: "냉장 보존 한계 추정",
    source: "미라 / 냉장 설비 상태 분석",
    detail:
      "비상 전원 출력이 계속 떨어지고 있다. 현재 추세라면 13:20경 식품 보존 한계에 도달한다.",
  },
  powerTerminalRequirement: {
    title: "주 발전 계통 접근 조건",
    source: "미라 / 발전소 상태·접근 조건 분석",
    detail:
      "주 발전소는 원격 접근만으로 복구할 수 없다. 현장 유지보수·인증 단말이 필요하다.",
  },
  motorcycleCondition: {
    title: "바이크 상태 확인",
    source: "서윤 / 바이크 현장 확인",
    detail:
      "외관은 예상보다 멀쩡하다. 장기 방치 흔적은 있지만 이동 수단으로 살려볼 여지가 있다.",
  },
  powerEntranceStatus: {
    title: "발전 구역 입구 현장 기록",
    source: "서윤 / 발전 구역 입구 현장 확인",
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
  powerAnalysis: "발전소 상태 분석 완료",
  refrigerationAnalysis: "냉장 설비 분석 완료",
  motorcycleInspection: "바이크 현장 확인 완료",
  powerEntranceInspection: "발전 구역 입구 확인 완료",
  terminalLocationSearch: "단말기 위치 조사 완료",
  terminalSearch: "단말기 후보 구역 수색 완료",
};
