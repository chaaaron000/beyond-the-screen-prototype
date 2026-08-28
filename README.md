# 화면 너머의 너 사양 프로토타입

## [배포 URL: https://chaaaron000.github.io/beyond-the-screen-prototype/](https://chaaaron000.github.io/beyond-the-screen-prototype/)

OASIS 생활 구역 03에서 한서윤과 미라가 제한된 시간 안에 시설을 조사하고, 확보한 정보로 다음 행동을 판단하는 비주얼 노벨 프로토타입입니다.

현재 구현 범위는 2막 Day 1의 플레이 가능한 수직 슬라이스입니다. 냉장 설비, 주 발전 계통, 서윤의 바이크를 둘러싼 우선순위 갈등과 조사 흐름을 확인할 수 있습니다.

## 플레이 흐름

1. VN 장면에서 두 사람의 첫 대화를 진행합니다.
2. 대화가 끝나면 OASIS 내부 운영 보고서 화면으로 이동합니다. 왼쪽은 보고서 문서, 오른쪽은 조사 계획 판만 있는 2분할 화면이고, 화면 아래에는 조사 결과 판이 별도로 놓입니다.
3. MIRAGE에게 로그·센서·기록 분석을 맡겨 조사 예정에 넣고 순서를 정합니다.
4. 조사 예정에 넣는 순간에는 작업이나 시간이 시작되지 않습니다. 진행 버튼을 눌렀을 때 각자의 첫 작업이 시작되고, 다음 완료 시점까지 시간이 흐릅니다.
5. 작업이 완료되면 완료 기록이 아래 조사 결과 판에 한 줄씩 쌓입니다. 각 행의 `열기`를 누르면 기존 플로팅 결과 창에서 세부 내용과 첨부 자료를 확인할 수 있습니다. 보고서와 조사 결과 판의 높이, 보고서와 조사 계획 판의 너비는 구분선을 드래그해 조절할 수 있습니다.
6. 확보한 정보에 따라 시작 가능한 조사와 대사 분기가 달라집니다. 제안이 수락되면 한서윤이 실제 현장으로 이동하며, 방문 전체가 콘텐츠에 정의된 세계 시간을 소비합니다. 같은 시간 동안 이미 진행 중인 MIRAGE 조사도 진행되지만 다음 예약 작업은 자동 시작하지 않습니다.
7. 승인된 현장 방문만 FIELD LINK와 FIELD LOG UPDATED 기록을 거칩니다. 거절된 제안은 짧은 fade와 거절 대화 뒤 보고서로 돌아옵니다.
8. 현장 방문이 완료되면 해당 액션의 버튼이 강조된 활성 `결과 확인` 버튼으로 바뀝니다. 버튼을 누르면 경로 세부 내용이 비모달 플로팅 창으로 열리고 새 결과 강조가 해제되며, 완료한 경로는 다시 제안할 수 없습니다.

## Screenshots

![VN scene cleaned](docs/screenshots/vn-scene-cleaned.svg)

![VN scene with the saved light theme isolated](docs/screenshots/vn-theme-isolated-light.svg)

![VN scene with the saved dark theme isolated](docs/screenshots/vn-theme-isolated-dark.svg)

![VN field scene](docs/screenshots/vn-field-scene.svg)

![FIELD LINK transition](docs/screenshots/transition-field-link.svg)

![FIELD LOG transition](docs/screenshots/transition-field-log.svg)

![Proposal dialog cleaned](docs/screenshots/proposal-dialog-cleaned.svg)

![Proposal evidence dialog](docs/screenshots/proposal-evidence-dialog.svg)

![Report shell cleaned](docs/screenshots/report-shell-cleaned.svg)

![Report document top](docs/screenshots/report-document-top.svg)

![Report action debate as document text](docs/screenshots/report-action-debate-document.svg)

![Report document light theme](docs/screenshots/report-document-light.svg)

![Investigation results empty](docs/screenshots/investigation-results-empty.svg)

![Investigation results with a completed task log](docs/screenshots/investigation-results-log.svg)

![Investigation results with resized height](docs/screenshots/investigation-results-resized.svg)

![Investigation results light theme](docs/screenshots/investigation-results-log-light.svg)

![Investigation results resized over the full report](docs/screenshots/investigation-results-resized-full.svg)

![Planning schedule cleaned](docs/screenshots/planning-schedule-cleaned.svg)

![Planning schedule with planned tasks](docs/screenshots/planning-schedule-top.svg)

![Timeline and advance time control](docs/screenshots/planning-schedule-bottom.svg)

![Planning schedule after advancing time](docs/screenshots/planning-schedule-advance.svg)

![Report shell with a planned investigation](docs/screenshots/report-shell-planned.svg)

![Full screen with an unseen field route result button](docs/screenshots/field-result-button-unseen-full.svg)

![Report shell with an unseen field route result button](docs/screenshots/field-result-button-unseen.svg)

![Full screen with the field route result window open](docs/screenshots/field-result-window-full.svg)

![Report shell with the field route result window open](docs/screenshots/field-result-window.svg)

![Non-modal attachment window](docs/screenshots/nonmodal-attachment-window.svg)

![Non-modal result window](docs/screenshots/nonmodal-result-window.svg)

![Non-modal result window over the report](docs/screenshots/nonmodal-result-window-full.svg)

![Non-modal raw-log window](docs/screenshots/nonmodal-raw-log-window.svg)

![Attachment, result, and raw-log non-modal windows](docs/screenshots/floating-nonmodal-windows.svg)

![Dragged attachment window over result and raw-log windows](docs/screenshots/floating-attachment-result-raw-log.svg)

## 실행

```bash
npm install
npm run dev
```

개발 서버를 종료하려면 실행 중인 `npm run dev` 프로세스를 중지합니다.

프로덕션 번들은 다음 명령으로 확인할 수 있습니다.

```bash
npm run build
```

## 대사 수정 방법

1. `src/content/field-mission/dialogue/`에서 공통 또는 장소별 `.txt` 파일을 엽니다.
2. 원하는 `# section.id` 아래의 `SPEAKER: text`를 수정합니다.
3. 저장하면 TypeScript 코드 수정 없이 Vite HMR을 통해 개발 화면에 반영됩니다.

## 주요 구조

- `src/App.tsx` — 게임 상태에 따른 VN/보고서 화면 전환
- `src/components/vn/` — 비주얼 노벨 장면과 대화 UI
- `src/components/report/` — 내부 운영 보고서, 조사 작업, 판단 UI
- `src/game/` — 상태, 리듀서, 시간 계산 로직
- `src/content/field-mission/dialogue/` — 시작·판단·현장·RAW LOG 대사 원고
- `src/content/reports/` — 알려진 사실, 조사 결과, 확보 가능한 근거
- `public/assets/characters/` — 한서윤·미라 스탠딩 이미지
- `public/assets/backgrounds/` — VN 배경 에셋 위치
- `public/assets/ui/` — UI 에셋 위치
- `public/assets/evidence/` — 보고서용 사진·지도·도표 에셋 위치

## 디자인 방향

- VN 모드는 두 캐릭터의 스탠딩 이미지를 중심으로 한 따뜻한 장면과 대화 패널로 구성합니다.
- 보고서 모드는 SaaS 대시보드 대신 내부 운영 문서를 읽는 흐름을 사용합니다.
- 보고서 문서 영역은 Notion 기본 문서처럼 제목, heading, paragraph, blockquote, 단순 목록, 텍스트 링크, 얇은 divider만으로 계층화하고 카드·배지·색 블록 장식을 두지 않습니다.
- 현재 화자는 이름, 색상, 명도 대비로 구분하며 캐릭터 이미지는 확대·축소하지 않습니다.

## 에셋 추가 위치

캐릭터 이미지와 배경·UI·증거 자료는 아래 디렉터리에 추가합니다.

```text
public/assets/
├── characters/
├── backgrounds/
├── ui/
└── evidence/
```
