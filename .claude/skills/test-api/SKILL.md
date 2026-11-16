---
name: test-api
description: docAi-fe에서 백엔드 API가 dev에 머지된 뒤 실제 연결을 확인할 때 사용한다. "○○ API 연결 확인해줘", "API 붙여줘", "백엔드 연결해줘" 같은 말에 실행한다. 로컬 백엔드로 실제 호출해 응답 모양을 mock과 비교하고, 맞으면 READY_APIS에 추가한다.
---

# API 연결 확인

## 1. 준비
- 확인할 API 함수 이름을 정한다(예: `getAnalysis`). `src/api/`에서 함수, 주소, 타입을 찾는다.
- 백엔드가 켜져 있는지: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/users/anonymous -X POST -H "Content-Type: application/json" -d "{}"`
  - 연결이 안 되면 `npm run backend`로 띄운다. 백엔드 코드가 오래됐으면 `git -C ../docAi-be pull` 후 `npm run backend:restart`. 다 켜졌는지는 `npm run backend:logs`의 `Started DocaiApplication`
- 백엔드 `dev`에 그 API가 있는지 `docAi-be` 코드에서 `@GetMapping`/`@PostMapping`으로 확인한다. 없으면 멈춘다.

## 2. 실제 호출
- 익명 토큰을 받는다: `POST /api/users/anonymous` (`deviceId`는 UUID v4)
- 그 토큰으로 대상 API를 `curl`로 호출해 응답 전체를 본다.

## 3. 비교
- 응답의 `data` 모양을 `src/api/<기능>.ts` 타입, `src/api/mocks/<기능>.ts` mock과 비교한다.
- 이름·타입·빠진 필드가 다르면 표로 보여 주고, 타입과 mock을 백엔드 응답에 맞게 고칠지 묻는다. mock은 지우지 않는다(배포는 mock으로만 돌아간다). 실제 응답 모양으로 고쳐 남긴다.
- 화면 코드까지 고쳐야 하면 어느 화면인지 알려 주고 따로 이슈를 제안한다.

## 4. 연결
- `src/api/mock-mode.ts`의 `READY_APIS`에 함수 이름을 추가한다.
- `.env.local`이 `VITE_API_MODE=real`인지 확인하고 화면에서 실제로 불러지는지 확인할 주소를 알려 준다.
- 커밋은 `commit` 스킬로: `feat: ○○ API 실제 연결`
