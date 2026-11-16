# 문서AI 프론트엔드 구조와 결정

> 작성 2026-11-16 · 김지희

## 1. 목표와 범위

- **11/18까지** 와이어프레임(`docs/wireframe.html`) 화면 보드 60개를 **전부** 구현한다.
- 와이어프레임의 `C01_공통요소` 보드는 화면이 아니라 공통 컴포넌트의 기준으로 쓴다.
- 화면 기준은 와이어프레임이다. Notion API 명세에 없는 동작도 와이어프레임에 있으면 구현한다.
- 웹앱 하나로 만든다.
  - **PC로 열면** 가운데 휴대폰 틀 안에서 앱이 동작하고, 옆에 소개·영상 버튼·QR이 나온다.
  - **휴대폰으로 열면** 틀 없이 화면을 꽉 채운 앱으로 보인다.

## 2. 기술

| 항목 | 선택 | 이유 |
|---|---|---|
| 빌드 | Vite + React + TypeScript | 카메라, 가리기 canvas, 흐림 검사, 토큰 저장이 모두 브라우저에서만 돈다. 서버 렌더링이 필요 없다 |
| 주소 | React Router | 모든 주소를 `src/router.tsx` 한 파일에서 관리한다 |
| 스타일 | 와이어프레임 CSS를 그대로 옮긴 일반 CSS | 와이어프레임과 똑같이 만드는 게 목표라, UI 라이브러리를 쓰지 않는다 |
| 휴대폰 테스트 | `@vitejs/plugin-basic-ssl` (필수) | 휴대폰 브라우저는 https가 아니면 카메라를 막는다 |
| 배포 | Vercel (`main` 자동 배포, PR 미리보기) | 무료이고, https 주소라서 QR로 열어도 카메라가 동작한다 |

**Next.js를 쓰지 않는 이유**
- 서버(Spring)가 이미 있어서 Next.js 서버가 따로 필요 없다.
- Next.js는 화면 코드를 서버에서도 실행한다. 그래서 `window`나 `localStorage`를 쓰면 hydration 오류가 나는데, 처음 하는 사람에게 이 오류는 해결하기 어렵다.
- 나중에 Capacitor로 앱을 감쌀 때, Vite 빌드 결과(정적 파일)는 그대로 감쌀 수 있다.

라이브러리는 `react`, `react-router-dom`, `@vitejs/plugin-basic-ssl` 세 개만 쓴다. 그 밖의 라이브러리는 팀이 합의한 뒤에만 추가한다.

## 3. 폴더 구조

```
docAi-fe/
├─ CLAUDE.md · README.md · .env.example · vite.config.ts · vercel.json
├─ .claude/skills/   start-issue · check · create-pr · review-pr · test-api
├─ .github/          이슈·PR 템플릿, 디스코드 알림(기존) + workflows/build.yml
├─ docs/             wireframe.html · architecture.md · onboarding.md
├─ public/           파비콘, 캐릭터, QR 이미지
└─ src/
   ├─ main.tsx · router.tsx
   ├─ common/        함께 쓰는 곳
   │  ├─ styles/     tokens.css · base.css
   │  ├─ layout/     AppFrame(PC 틀/휴대폰 판단) · PcIntro · Header · BottomTab
   │  └─ components/ index.ts(공통 컴포넌트 목록) · Button · Card · Chip · BottomSheet
   │                 · Toast · StepBar · Disclaimer · LawSourceLink
   ├─ pages/         화면. 기능별 폴더마다 boards.tsx(그 폴더의 보드 목록)가 있다
   │  ├─ home/               S00 스플래시 · S01 홈
   │  ├─ contract-register/  S02~S06 · RegisterFlowContext · masking.ts · blurCheck.ts
   │  ├─ analysis/           S07~S09
   │  ├─ chat/               S10 챗봇 패널(ChatPanel)
   │  ├─ notifications/      P01 알림
   │  ├─ comparison/         S11~S12
   │  ├─ schedule/           S13~S14
   │  └─ my-contracts/       S15
   ├─ api/           request.ts · mock-mode.ts · 기능별 API 함수 · mocks/
   └─ dev/           boards.ts(폴더별 보드 목록 모음) · BoardsPage.tsx
```

- S10 챗봇은 와이어프레임에서 "모든 화면 공통 패널"이다. 닫으면 하던 화면으로 돌아가야 해서 주소를 따로 두지 않고, `common/layout/AppPanels`가 패널을 연다. 패널 안 내용은 `pages/chat/ChatPanel.tsx`.
- `RegisterFlowContext`: S02~S06 다섯 화면이 함께 쓰는 값(고른 문서 종류, 찍은 사진, 가린 곳)을 담아 둔다. 화면이 바뀌어도 값이 유지된다.
- `common/components/index.ts`: 모든 공통 컴포넌트를 여기서 내보내고, 컴포넌트마다 한 줄 주석을 단다. 이 파일이 곧 공통 컴포넌트 목록이라 따로 문서를 두지 않는다.

## 4. 화면 주소

주소 이름은 백엔드 API와 같은 규칙(복수형 명사)으로 짓는다. 화면 주소는 브라우저 안에서 화면을 고르는 데만 쓰고, 데이터는 `/api/...`로 따로 받는다.

| 와이어프레임 | 주소 |
|---|---|
| S00 스플래시 | 앱을 처음 열 때만 표시 (주소 없음) |
| S01 홈 | `/` |
| S02 문서 선택 | `/contracts/new` |
| S03 입력 방식·촬영 | `/contracts/new/capture` |
| S04 미리보기 | `/contracts/new/preview` |
| S05 가리기 | `/contracts/new/mask` |
| S06 최종 확인 | `/contracts/new/confirm` |
| S07 분석 중·실패 | `/analyses/:analysisId/progress` |
| S08 분석 결과 | `/analyses/:analysisId` |
| S09 조항 상세 | `/analyses/:analysisId/clauses/:clauseId` |
| S10 챗봇 | 주소 없음. 어느 화면에서든 헤더 "AI에게 질문"으로 지금 화면 위에 패널로 연다(`openChat()`) |
| P01 알림 | `/notifications` |
| S11 비교 준비 | `/comparisons/new` |
| S12 비교 결과 | `/comparisons/:comparisonId` |
| S13 일정 등록 | `/schedules/new` |
| S14 내 일정·상세 | `/schedules` · `/schedules/:scheduleId` |
| S15 내 계약서·상세 | `/contracts` · `/contracts/:contractId` |
| 보드 모아 보기 | `/dev/boards` (`VITE_SHOW_BOARDS=true`일 때만) |

- 화면 주소에는 ID만 넣고, 이름·주소·전화번호 같은 개인정보는 넣지 않는다.
- 남의 계약서를 보지 못하게 막는 일은 백엔드의 소유자 확인이 담당한다. 화면 주소를 바꾼다고 막아지지 않는다.

## 5. API 계층과 mock

화면에서는 `fetch`를 직접 쓰지 않는다. 항상 `src/api/`의 함수만 부른다. 그래서 화면 코드는 응답이 mock인지 실제인지 모른다.

```ts
// src/api/mock-mode.ts — 백엔드 dev에 머지되고 test-api로 확인한 API만 추가한다
const READY_APIS = ['issueAnonymousUser'];

export function shouldMock(api: string) {
  if (import.meta.env.VITE_API_MODE === 'mock') return true;
  return !READY_APIS.includes(api);
}
```

| 상황 | `.env.local` | 동작 |
|---|---|---|
| 백엔드 없이 화면만 만들 때 | `VITE_API_MODE=mock` | 모든 API가 mock. Node만 있으면 된다 |
| 실제 연결을 확인할 때 | `VITE_API_MODE=real` | `READY_APIS`에 있는 API는 실제 호출, 나머지는 mock |
| Vercel 배포판 | `mock` + "시연 모드" 표시 | 백엔드가 https로 배포되기 전까지는 mock |

- `request.ts`가 공통으로 처리하는 것
  - 공통 응답 `{status, code, message, data}`에서 `data`를 꺼낸다.
  - 모든 요청에 `Authorization: Bearer` 헤더를 붙인다.
  - 401이 오면 저장된 `deviceId`로 토큰을 다시 받고, 실패한 요청을 한 번 더 보낸다.
- 백엔드에 CORS 설정이 없다. 그래서 로컬에서는 Vite 프록시(`/api` → `http://localhost:8080`)로 호출한다.
- 명세 30개(예시 행 제외)와, 명세에는 없지만 와이어프레임에 필요한 API의 함수·타입·mock을 **기반 작업에서 한 번에 만든다**. 명세에 없는 함수에는 `// 명세 없음: 백엔드 추가 요청` 주석을 단다.

**2026-11-16 기준 백엔드 상태**

| API | 상태 |
|---|---|
| `POST /api/users/anonymous` | `dev`에 머지됨. 첫 실제 연결 대상 |
| `POST /api/contracts` | 민서 님 브랜치 `feat/ELICE-12-contract-registration`에 있음. PR은 아직 없음 |
| 나머지 28개 | 아직 없음 |

## 6. 보드 모아 보기 (`/dev/boards`)

- 화면 폴더마다 있는 `boards.tsx`에 그 폴더의 보드 이름을 미리 다 적어 두고, 처음에는 모두 "미구현"으로 둔다.
- 화면을 만들면 그 보드에 실제 화면 컴포넌트와 mock 데이터를 연결한다.
- **흐름 지도형**으로 보여 준다.
  - 맨 위에 진행률(예: 38 / 60)과 담당자별 숫자를 띄운다.
  - 흐름별로 줄을 나누고, 보드 하나를 칸 하나로 그린다. 파란 칸은 구현됨, 회색 칸은 미구현이다.
- 칸을 누르면 오른쪽에 휴대폰 크기로 **그 보드 상태 그대로** 크게 보여 준다. 그 아래 두 버튼을 둔다.
  - **앱에서 열기:** 실제 주소로 이동해서 처음부터 눌러 보며 확인한다.
  - **와이어프레임 원본:** 같은 보드의 와이어프레임을 새 탭으로 연다.
- PR이 `dev`에 머지되면, 그 코드를 받은 사람의 화면에서 해당 칸이 저절로 "구현됨"으로 바뀐다. 따로 자동화하지 않는다.
- `.env.local`에 `VITE_SHOW_BOARDS=true`가 있을 때만 열린다. Vercel에는 이 값을 넣지 않는다.

## 7. 수정 범위 (충돌 방지)

기반 작업에서 아래를 **미리** 만들어 둔다. 그러면 화면 담당자는 자기 폴더 밖을 건드릴 일이 없고, 두 사람이 같은 파일을 고쳐 생기는 충돌도 막을 수 있다.
- 모든 주소를 `router.tsx`에 등록해 둔다. 아직 안 만든 화면은 빈 파일로 둔다.
- 폴더별 `boards.tsx`에 보드 이름을 모두 적어 둔다.
- `api/mocks/`에 기능별 파일을 만들어 둔다.

| 구분 | 파일 |
|---|---|
| 고쳐도 됨 | 이번 이슈 기능의 `pages/<기능>/`, `api/<기능>.ts`(응답 상세가 명세에 없어 화면을 만들며 타입을 맞춘다), `api/mocks/<기능>.ts` |
| 먼저 묻기 | `common/`, `api/`의 함수·타입, 다른 `pages/` 폴더, `router.tsx`, 설정 파일 |

`check` 스킬이 `git diff --name-only dev`로 바뀐 파일을 보고 범위 밖 수정을 찾아 알려 준다.

## 8. Claude Code 구성

**CLAUDE.md** (60줄 안쪽, 자세한 절차는 스킬에 둔다)
1. 프로젝트 한 줄 소개와 기준 문서
2. 실행 명령 (`dev`, `dev:phone`, `build`)
3. 폴더 4줄 요약
4. 꼭 지킬 규칙
   - 와이어프레임 문구와 구조를 그대로 쓴다.
   - 화면을 만들기 전에 `common/components/index.ts`를 먼저 확인한다.
   - 색과 간격은 토큰 값만 쓴다.
   - 화면에서 `fetch`를 쓰지 않는다.
   - 수정 범위 밖 파일은 고치기 전에 묻는다.
   - 새 라이브러리를 설치하지 않는다.
   - 화면 주소에 개인정보를 넣지 않는다.
   - 키와 토큰을 코드에 쓰지 않는다.
5. 작업 순서와 스킬
   - 이슈 시작 → `start-issue`
   - 확인 → `check`
   - PR → `create-pr`
   - 리뷰 → `review-pr`
   - 백엔드 API가 `dev`에 머지됐을 때 → `test-api`
   - 커밋 → `commit` (형식 `type: 한국어 설명`)
6. 응답 방식
   - 쉬운 말로 짧게 말한다.
   - 끝에 "다음은 '○○'라고 말해 주세요"를 붙인다.
   - 오류가 나면 원인부터 설명한다.

**스킬** (`.claude/skills/<이름>/SKILL.md`, 각 30~50줄. 말로 부르면 자동으로 실행된다)

| 스킬 | 이렇게 말하면 | 하는 일 |
|---|---|---|
| start-issue | "N번 이슈 할게요" | 이슈 읽기 → 담당자 지정 → `dev` 최신으로 받기 → `feat/ELICE-N-설명` 브랜치 → 계획 보여 주고 승인 받기 → 보드를 하나씩 옮기고 `boards.tsx`에 연결, 이슈 체크 → "다음 보드 할까요?" |
| check | "확인해줘" | `npm run build` → 와이어프레임 보드와 문구·버튼·이동 경로 비교 → 규칙 위반과 수정 범위 검사 → 빠진 것 목록과 확인 주소 |
| commit | "커밋해줘" | 바뀐 내용 확인 → 범위 밖 파일·`.env.local`·비밀값 검사 → 한 가지 일 단위로 메시지 작성 → 보여 주고 승인 후 커밋 |
| create-pr | "PR 올려줘" | check 통과 확인 → commit → push → PR 템플릿 채워서 생성(`Closes #N`) → 주소 안내. 리뷰 의견이 오면 반영 |
| review-pr | "N번 PR 봐줘" | `gh pr checkout` → build + check → 결과 요약. 승인 버튼은 사람이 직접 누른다 |
| test-api | "○○ API 연결 확인해줘" | 백엔드가 켜져 있는지 확인 → 실제 호출 → mock과 응답 모양 비교 → `READY_APIS`에 추가 |

개인 PC에 있는 스킬(code-planner 등)은 공유하지 않는다. 저장소의 스킬만 팀 공통으로 쓴다.

## 9. 협업 규칙

- 브랜치: `feat/ELICE-{이슈번호}-{짧은설명}`. 백엔드와 같은 형식이다.
- 이슈 제목: `[ELICE-N][FE] …`. 백엔드 이슈와 번호가 겹치므로 `[FE]`로 구분한다.
- 커밋 메시지와 PR 제목: `type: 한국어 설명` (Conventional Commits 형식, 백엔드와 같은 type)
  - type: `feat` 기능 · `fix` 버그 · `style` CSS만 · `refactor` 동작은 같고 구조만 · `docs` 문서 · `chore` 설정·패키지
  - 설명은 한 줄 50자 안쪽, 마침표 없음. 본문은 이유가 필요할 때만 1~3줄
  - 예: `feat: S15 내 계약서 목록과 빈 상태 화면 추가`, `fix: 분석 결과 조항 링크 이동 오류 수정`
  - 설명을 한국어로 쓰는 이유: 화면 이름과 와이어프레임 용어를 그대로 쓸 수 있고, 처음 하는 팀원도 읽고 확인할 수 있다.
- PR은 `dev`로 올린다. 팀원 아무나 1명이 승인하면 머지할 수 있다(기존 규칙 유지).
- PR마다 `build.yml`이 `npm run build`를 돌리고, 실패하면 머지할 수 없다.
- 디스코드 알림은 PR 열림, 승인, 머지 때 간다(기존 설정).

## 10. 이슈와 담당

**1단계: 기반 작업 (지희, 11/17 20시 회의 전에 `dev`에 머지)**
1. [CHORE] 프로젝트 세팅
   - Vite, 라우터, 폴더 구조, CSS 옮기기
   - wireframe.html 복사, vercel.json, build.yml, .env.example, https 플러그인
2. [CHORE] Claude Code 규칙: CLAUDE.md, 스킬 5개, onboarding.md, architecture.md
3. [FEAT] 공통 레이아웃·컴포넌트
   - PC 틀과 휴대폰 화면, 공통 컴포넌트
   - 빈 화면 파일 전부, 폴더별 boards.tsx, `/dev/boards`
4. [FEAT] API 계층·익명 인증
   - request.ts와 mock 스위치
   - API 함수·타입·mock 전부
   - 익명 인증 실제 연결

**2단계: 화면 (11/17 20시 ~ 11/18, 동시에 진행)**

| 지희 (보드 24) | 구자건 (보드 36) |
|---|---|
| S00·S01 스플래시·홈 (3) | S08 분석 결과 (4) |
| S02 문서 선택 (3) | S09 조항 상세 (1) |
| S03 입력 방식·촬영·권한 없음 (3) | S10 챗봇 (13) |
| S04 미리보기·흐림 검사 (3) | S11 비교 준비 (3) |
| S05 가리기 (8) | S12 비교 결과 (4) |
| S06 최종 확인 (2) | S13 일정 등록 (4) |
| S07 분석 중·실패 (2) | S14 내 일정 (4) |
| | S15 내 계약서 (3) ← 첫 이슈로 추천 |

**3단계: 연결과 배포 (11/19 ~ 11/22, 지희)**
- 백엔드 API가 머지될 때마다 [FEAT] API 연결 이슈를 만들고 `test-api`로 확인한다.
- [CHORE] Vercel 배포와 시연 모드: mock 모드, "시연 모드" 표시, QR 주소

## 11. 구자건 님 진행 순서

1. 첫날(11/17 20시)
   - Node.js LTS, Git, Claude Code를 설치하고 EliceAi 조직 초대를 수락한다.
   - `git clone`, `.env.local` 만들기, `npm install`, `npm run dev`
   - `localhost:5173/dev/boards`가 열리는지 확인한다.
2. 이슈마다 반복
   - "N번 이슈 할게요" → 계획 확인 → 보드를 하나씩 옮긴다
   - "확인해줘" → "PR 올려줘"
   - 리뷰 의견이 오면 "PR 의견 반영해줘"
   - 머지되면 "다음 이슈 할게요"

## 12. 아직 정하지 않은 것

- 백엔드에 물어볼 것 (`메모/재훈님_질문.md`)
  - 일정 등록 API
  - 일정 변경을 반영하는 방식
  - 분석 진행 상태를 확인하는 방식
  - 계약서 ID의 소유자 확인
- 팀 이름: PC 소개 배지에는 "엘리스 AI 챌린지"만 쓴다.
- Vercel 무료 요금제로 조직 저장소를 연결할 수 있는지는 연결할 때 확인한다. 안 되면 Netlify나 Cloudflare Pages를 쓴다.
