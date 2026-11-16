---
name: create-pr
description: docAi-fe에서 PR을 올리거나 리뷰 의견을 반영할 때 사용한다. "PR 올려줘", "다 했어요", "PR 만들어줘", "PR 의견 반영해줘" 같은 말에 실행한다. check로 점검하고 commit 규칙으로 커밋한 뒤 push하고, PR 템플릿을 채워 dev로 PR을 만든다.
---

# PR 올리기

## 1. 점검
- `check` 스킬 순서대로 검사한다. 통과하지 못한 항목이 있으면 여기서 멈춘다.
- 이슈 체크박스가 다 체크되지 않았으면 묻는다: `○○ 보드가 남았어요. 마저 할까요, 남은 작업으로 적고 올릴까요?`

## 2. 커밋과 push
- 커밋 안 된 변경이 있으면 `commit` 스킬로 커밋한다.
- `git push -u origin <브랜치>`

## 3. PR 만들기
- 제목: 대표 커밋과 같은 형식 `type: 한국어 설명`
- 본문: `.github/pull_request_template.md`의 항목을 모두 채운다.
  - 작업 내용: 끝낸 보드 목록. 남긴 보드가 있으면 따로 적는다
  - 스크린샷: `/dev/boards#<보드 이름>` 주소 목록 (사진은 사람이 붙인다)
  - 고민과 해결 과정: 와이어프레임과 다르게 한 곳, 물어본 것
  - 관련 이슈: 다 끝냈으면 `Closes #N`, 남겼으면 `Refs #N`
  - 맨 끝: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`
- `gh pr create -R EliceAi/docAi-fe --base dev --title "..." --label FEAT --assignee @me --body-file <파일>`
  (설정 작업이면 라벨 `CHORE`, 버그면 `FIX`)

## 4. 알리기
- PR 주소를 보여 주고 이렇게 안내한다: 디스코드에 리뷰 요청 알림이 갔어요. 팀원 1명이 승인하면 PR 화면에서 Merge를 누르면 돼요.
- 마지막 줄: `승인을 기다리는 동안 다음 이슈를 하려면 "다음 이슈 할게요"라고 말해 주세요.`

## 리뷰 의견 반영 ("PR 의견 반영해줘")
1. `gh pr view <번호> --comments`와 `gh api repos/EliceAi/docAi-fe/pulls/<번호>/comments`로 의견을 읽는다.
2. 의견마다 무엇을 고칠지 목록으로 보여 주고 승인받는다.
3. 고친 뒤 `check` → `commit`(`fix: 리뷰 반영 …`) → `git push`.
4. 반영한 의견 목록을 PR에 댓글로 남긴다(`gh pr comment`).
