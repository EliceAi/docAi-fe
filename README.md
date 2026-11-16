# docAi-fe

문서AI 프론트엔드. 사회초년생이 근로·임대차 계약서를 찍으면 확인할 조항과 일정을 알려 주는 웹앱 (엘리스 AI 챌린지 출품작).

PC로 열면 가운데 휴대폰 틀 안에서, 휴대폰으로 열면 전체 화면 앱으로 보인다.

## 실행

1. `.env.example`을 복사해 `.env.local`을 만든다.
2. `npm install`
3. `npm run dev` → http://localhost:5173
   - 보드 모아 보기: http://localhost:5173/dev/boards
   - 휴대폰 테스트: `npm run dev:phone` → 같은 와이파이에서 휴대폰으로 `https://PC주소:5173` (카메라는 https에서만 켜진다)
4. 백엔드와 연결할 때는 `docAi-be`를 `localhost:8080`에 띄우고 `.env.local`의 `VITE_API_MODE=real`로 바꾼다.

## 문서

- 처음이라면: `docs/onboarding.md`
- 구조와 결정 이유: `docs/architecture.md`
- 화면 기준: `docs/wireframe.html` (브라우저로 열기)
- API 기준: 팀 Notion API 명세

## 협업

- 브랜치: `feat/ELICE-{이슈번호}-{짧은설명}` → `dev`로 PR (팀원 1명 승인) → `main`
- PR마다 `npm run build`가 자동으로 돌고, 실패하면 머지할 수 없다.
