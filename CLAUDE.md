# docAi-fe

사회초년생이 근로·임대차 계약서를 찍으면 확인할 조항과 일정을 알려 주는 웹앱의 프론트엔드.
화면 기준은 `docs/wireframe.html`, 구조와 결정 이유는 `docs/architecture.md`, API 기준은 팀 Notion API 명세다.

## 실행
- `npm run backend` → 백엔드(docAi-be)와 DB를 Docker로 띄운다. `../docAi-be`에 clone돼 있어야 한다. 끄기 `backend:stop`, 로그 `backend:logs`, 백엔드 코드를 pull한 뒤 `backend:restart`
- `npm run dev` → http://localhost:5173 (보드 모아 보기 `/dev/boards`)
- `npm run dev:phone` → 같은 와이파이의 휴대폰에서 `https://PC주소:5173` (카메라 테스트)
- `npm run build` → PR 전에 반드시 통과
- `.env.local`은 로컬에서 `VITE_API_MODE=real`(머지된 API는 실제 호출, 나머지는 mock). 배포는 mock이다.

## 폴더
- `src/common/` 함께 쓰는 부품·틀·스타일. 공통 컴포넌트 목록은 `src/common/components/index.ts`
- `src/pages/<기능>/` 화면. 폴더마다 `boards.tsx`에 그 폴더의 와이어프레임 보드 목록이 있다
- `src/api/` API 함수와 타입, `src/api/mocks/` 가짜 응답
- `src/dev/` 보드 모아 보기(`/dev/boards`)

## 꼭 지킬 규칙
- 와이어프레임 보드의 문구·순서·구조를 그대로 옮긴다. 바꾸고 싶으면 먼저 묻는다.
- 화면을 만들기 전에 `src/common/components/index.ts`를 읽고 있는 부품을 쓴다. 없으면 만들지 말고 묻는다.
- 클래스 이름은 와이어프레임과 같게 쓴다(`class` → `className`). 색은 `tokens.css` 변수나 `base.css` 클래스로만.
- 화면에서 `fetch`를 쓰지 않는다. 항상 `src/api/` 함수를 부르고, 화면이 열릴 때 받는 데이터는 `src/api/useApiData.ts`로 받는다.
- **mock은 항상 있어야 한다.** 배포(Vercel)는 백엔드 없이 mock으로만 돌아간다. 모든 API 함수에 mock 분기와 `src/api/mocks/` 데이터를 두고, 보드마다 그 상태를 그릴 mock이 있어야 한다. 백엔드에 연결한 뒤에도 mock을 지우지 말고 실제 응답 모양에 맞춰 고친다.
- 이름이 `use`로 시작하는 함수는 React 훅만. 훅이 아닌데 `use…`로 지으면 린트가 오류를 낸다.
- 새 라이브러리를 설치하지 않는다.
- 화면 주소에는 ID만 넣는다. 이름·주소·전화번호 같은 개인정보는 넣지 않는다.
- API 키·토큰을 코드에 쓰지 않는다. `.env.local`은 커밋하지 않는다.

## 수정 범위
- 고쳐도 되는 곳: 이번 이슈 기능의 `src/pages/<기능>/`, `src/api/<기능>.ts`, `src/api/mocks/<기능>.ts`
- 그 밖의 파일(`src/common/`, 다른 `pages` 폴더, `src/router.tsx`, `src/api/request.ts` 등 공통 API, 설정 파일)은 고치지 말고 멈춰서 "○○ 파일을 고쳐야 하는데 괜찮을까요?"라고 묻는다.
- `src/pages/analysis/`는 두 사람이 나눠 쓴다(S07 김지희, S08·S09 구자건). `boards.tsx`는 주석으로 나눈 자기 구역만 고친다.

## 작업 순서와 스킬
| 이럴 때 | 스킬 |
|---|---|
| "N번 이슈 할게요" | `start-issue` 이슈 읽기 → 브랜치 → 계획 → 보드를 하나씩 옮기고 이슈 체크 |
| "확인해줘" | `check` 빌드·와이어프레임 비교·수정 범위 검사 |
| "커밋해줘" | `commit` 형식 `type: 한국어 설명` |
| "PR 올려줘" | `create-pr` check → commit → push → PR |
| "N번 PR 봐줘" | `review-pr` 승인 버튼은 사람이 누른다 |
| 백엔드 API가 `dev`에 머지됐을 때 | `test-api` 실제 연결 확인 후 `READY_APIS`에 추가 |

- 보드 하나를 끝낼 때마다 이슈 본문의 그 보드 체크박스를 체크한다.
- `dev`·`main`에 직접 커밋하지 않는다. 항상 `feat/ELICE-{이슈번호}-{짧은설명}` 브랜치에서 일한다.
- 이슈 완료 = PR이 `dev`에 머지된 것. 내 PC에서 끝난 것은 "아직 완료 아님"이라고 말한다.

## 응답 방식
- 이 저장소를 쓰는 사람 중에는 프론트엔드가 처음인 사람이 있다. 쉬운 말로 짧게 말하고, 처음 나오는 용어(mock, 브랜치, 머지 등)는 한 줄로 풀어 준다. 용어 정리는 `docs/onboarding.md` 0장.
- 무엇을 했는지 → 확인할 주소 → 마지막 줄에 `다음은 "○○"라고 말해 주세요.`
- 확인할 주소는 항상 링크 전체로 준다: 보드는 `http://localhost:5173/dev/boards#<보드 이름>`, 화면은 `http://localhost:5173<주소>`. 사용자가 `/dev/boards`를 모른다고 가정한다.
- 브라우저 콘솔에 붙여 넣을 코드를 줄 때는 한 줄로(문장 사이 `;`), 경로는 `/src/...`로 시작하게 주고, 처음이면 `allow pasting` 입력을 먼저 안내한다.
- 오류가 나면 고치기 전에 원인을 한두 줄로 먼저 설명한다. 서버·백엔드가 꺼져 있을 가능성을 먼저 확인한다(`npm run dev`, `npm run backend`).
