import type { EvidenceId } from "../../types/game";

export type AttachmentKind = "trend" | "log" | "photo" | "map";

export interface AttachmentDefinition {
  evidenceId: EvidenceId;
  label: string;
  title: string;
  kind: AttachmentKind;
  caption: string;
}

// These are small viewers for the records already present in the prototype.
// They deliberately do not introduce a new clue or a new location.
export const ATTACHMENTS: Record<EvidenceId, AttachmentDefinition> = {
  refrigerationLimit: {
    evidenceId: "refrigerationLimit",
    label: "냉장 온도 추세 보기",
    title: "냉장 설비 / 출력 추세",
    kind: "trend",
    caption: "비상 전원 출력이 내려가는 추세와 분석된 보존 한계를 겹쳐 본다.",
  },
  powerTerminalRequirement: {
    evidenceId: "powerTerminalRequirement",
    label: "접근 로그 열기",
    title: "주 발전 계통 / 접근 기록",
    kind: "log",
    caption: "원격 접근만으로는 부족하다는 판단이 남은 기록이다.",
  },
  motorcycleCondition: {
    evidenceId: "motorcycleCondition",
    label: "현장 사진 보기",
    title: "보관 구역 / 바이크 기록",
    kind: "photo",
    caption: "서윤이 직접 확인한 외관과 이동 가능성 메모를 위한 자리다.",
  },
  powerEntranceStatus: {
    evidenceId: "powerEntranceStatus",
    label: "발전 구역 지도 보기",
    title: "발전 구역 / 입구 기록",
    kind: "map",
    caption: "입구 셔터와 외부에서 확인할 수 없었던 내부 설비를 표시한다.",
  },
  terminalLocation: {
    evidenceId: "terminalLocation",
    label: "유지보수 기록 열기",
    title: "유지보수 기록 / 후보 위치",
    kind: "map",
    caption: "오래된 기록에 남은 공동 보관실 C-12 후보를 다시 확인한다.",
  },
  terminalConfirmed: {
    evidenceId: "terminalConfirmed",
    label: "단말기 확인 기록 보기",
    title: "공동 보관실 C-12 / 확인 기록",
    kind: "photo",
    caption: "예비 유지보수·인증 단말기를 실제로 확인한 기록이다.",
  },
};
