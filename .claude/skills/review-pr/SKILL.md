---
name: review-pr
description: docAi-fe에서 팀원의 PR을 확인할 때 사용한다. "N번 PR 봐줘", "PR 리뷰해줘", "이 PR 승인해도 돼?" 같은 말에 실행한다. PR 브랜치를 받아 빌드와 check를 돌리고 결과를 요약한다. 승인 버튼은 사람이 직접 누른다.
---

# PR 확인

## 1. 받기
- 지금 바뀐 파일이 있으면 멈추고 묻는다.
- `gh pr view N -R EliceAi/docAi-fe`로 제목, 작성자, 관련 이슈를 읽는다.
- `gh pr checkout N`

## 2. 검사
- `npm install` (package.json이 바뀌었을 때만)
- `check` 스킬 1~5번을 그대로 돌린다.

## 3. 결과 요약
- 무엇이 바뀌었는지 보드 단위로 세 줄 안쪽
- check 결과 표
- 확인 주소: `http://localhost:5173/dev/boards#<보드 이름>` (`npm run dev`가 켜져 있어야 한다)
- 걸리는 점이 있으면 PR에 남길 댓글 문장을 제안한다. 댓글은 사람이 승인하면 `gh pr review N --comment -b "..."`로 남긴다.

## 4. 승인은 사람이
- 승인 버튼(`Approve`)은 누르지 않는다. 이렇게 안내한다: 화면을 직접 보고 괜찮으면 PR 화면 → Files changed → Review changes → Approve를 눌러 주세요.
- 끝나면 원래 브랜치로 돌아간다: `git checkout -`
