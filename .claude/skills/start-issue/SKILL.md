---
name: start-issue
description: docAi-fe 이슈를 시작하거나 이어서 할 때 사용한다. "N번 이슈 할게요", "ELICE-N 시작", "다음 이슈 할게요", "이슈 이어서 할게요", "내 이슈 보여줘" 같은 말에 실행한다. 이슈를 읽고 브랜치를 만든 뒤 계획을 보여 주고, 와이어프레임 보드를 하나씩 React 화면으로 옮기며 이슈 체크박스를 체크한다.
---

# 이슈 시작

## 0. 어떤 이슈인지 정하기
- 이슈는 이미 만들어져 있다. 새로 만들지 않는다.
- "내 이슈 보여줘": `gh issue list -R EliceAi/docAi-fe --assignee @me --state open`을 번호 순으로 보여 주고, 각 이슈의 보드 체크 개수(예: 1/3)를 붙인다.
- "다음 이슈 할게요"(번호 없음): 내 담당 이슈 중 열려 있는 가장 작은 번호를 고르되, 이미 PR이 올라가 승인을 기다리는 이슈(`gh pr list --author @me`의 `Closes #N`)는 건너뛴다. 고른 번호와 제목을 보여 주고 `이 이슈로 시작할까요?`라고 묻는다.

## 1. 이슈 읽기
- `gh issue view N -R EliceAi/docAi-fe`로 제목, 브랜치 이름, 폴더, 주소, 관련 API, 보드 체크리스트를 읽는다.
- 이미 닫힌 이슈면 멈추고 알린다.
- 담당자가 비어 있으면 `gh issue edit N --add-assignee @me`.

## 2. 브랜치 준비
- 지금 바뀐 파일이 있으면(`git status`) 멈추고 어떻게 할지 묻는다.
- `git checkout dev && git pull`
- 머지가 끝난 로컬 브랜치를 정리한다: `git branch --merged dev`에서 `dev`·`main`을 뺀 것을 `git branch -d`.
- 사용자가 여러 이슈를 지금 브랜치에서 이어서 하자고 했으면 브랜치를 바꾸지 않는다(위 두 줄도 건너뛴다).
- 이슈에 적힌 브랜치가 원격에 있으면 `git checkout <브랜치> && git pull`, 없으면 `git checkout -b <브랜치>`.

## 3. 계획 보여 주기 (승인 전에는 코드를 쓰지 않는다)
아직 체크 안 된 보드만 대상으로, 아래를 짧게 보여 준다.
- 보드 순서 (와이어프레임에서 먼저 나오는 상태부터)
- 만들 파일 (`src/pages/<기능>/` 안)
- 쓸 공통 부품: `src/common/components/index.ts`에서 고른다
- 쓸 API 함수와 mock: `src/api/<기능>.ts`, `src/api/mocks/<기능>.ts`
- 수정 범위 밖 파일을 고쳐야 할 것 같으면 여기서 미리 말한다
- 마지막 줄: `이대로 진행할까요?`

## 4. 보드 하나씩 옮기기
보드마다 아래를 반복한다.
1. `docs/wireframe.html`에서 `addBoard('<보드 이름>'`을 찾고, 그 보드를 만드는 함수(`homeScreen`, `chatPanel` 등)를 읽는다.
   메모(`in`, `btn`, `back`, `scroll`, `deal`)도 읽는다. `btn`이 버튼마다 이동할 곳이다.
2. HTML을 JSX로 옮긴다.
   - `class` → `className`, 클래스 이름은 그대로. 인라인 `style="a:b"` → `style={{ a: 'b' }}`
   - 와이어프레임 함수는 같은 이름의 공통 부품으로: `header` → `Header`, `button` → `Button`, `icon` → `Icon`, `mascot` → `Mascot`, `screen` → `Screen`
   - `data-go="보드 이름"` → 그 보드의 주소로 이동(`src/router.tsx`에서 주소 확인). `data-act` → 화면 안 동작(지금은 할 일만 주석 없이 함수 이름으로)
   - 문구는 한 글자도 바꾸지 않는다. 예시 데이터는 mock으로 옮긴다.
3. 데이터는 `src/api/` 함수로 받는다. 이 보드 상태에 맞는 mock이 없으면 `src/api/mocks/<기능>.ts`에 추가한다. 배포는 mock으로만 돌아가므로, 보드의 예시 문구·숫자는 mock에 그대로 옮겨 배포 화면에서도 와이어프레임과 같게 보이게 한다.
4. 그 폴더의 `boards.tsx`에서 보드에 `render`를 연결한다(그 상태의 mock 데이터로 그리기).
5. `npm run build`가 통과하는지 확인한다.
6. 이슈 체크박스를 체크한다: 본문을 받아 해당 줄의 `- [ ]`를 `- [x]`로 바꾸고 `gh issue edit N --body-file`.
7. 알린다: `S15_내계약서_목록 완료 (1/3). 확인: http://localhost:5173/dev/boards#S15_내계약서_목록`
   마지막 줄: `다음 보드 할까요?` (마지막 보드였으면 `다음은 "확인해줘"라고 말해 주세요.`)

## 막혔을 때
- 공통 부품이 없거나 고쳐야 하면: 만들지 말고 멈춰서 묻는다.
- 와이어프레임만으로 동작이 애매하면: 추측하지 말고 보드 메모를 인용해 묻는다.
