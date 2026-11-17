# docAi-fe (Codex 등 다른 AI 도구용 안내)

이 저장소의 규칙은 `CLAUDE.md`에 있다. 작업 전에 반드시 `CLAUDE.md`를 읽고 그대로 따른다.
처음 오는 사람을 위한 설명은 `docs/onboarding.md`, 구조와 결정 이유는 `docs/architecture.md`에 있다.

사용자가 아래처럼 말하면, 오른쪽 파일을 처음부터 끝까지 읽고 그 순서대로 진행한다. 규칙과 절차를 이 파일에 복사하지 않는다(한 곳만 고치면 Claude와 Codex가 같이 따르게).

| 이렇게 말하면 | 따를 절차 |
|---|---|
| "N번 이슈 할게요", "다음 이슈 할게요", "내 이슈 보여줘" | `.claude/skills/start-issue/SKILL.md` |
| "확인해줘" | `.claude/skills/check/SKILL.md` |
| "커밋해줘" | `.claude/skills/commit/SKILL.md` |
| "PR 올려줘", "PR 의견 반영해줘" | `.claude/skills/create-pr/SKILL.md` |
| "N번 PR 봐줘" | `.claude/skills/review-pr/SKILL.md` |
| "○○ API 연결 확인해줘" | `.claude/skills/test-api/SKILL.md` |

- 절차 안의 "○○ 스킬로"는 위 표의 해당 파일을 따른다는 뜻이다.
- 커밋 메시지 마지막 줄의 `Co-Authored-By: Claude …`는 쓰지 않는다.
- 절차에 사용자 승인이 필요하다고 적힌 곳(계획, 커밋, 수정 범위 밖 파일)에서는 반드시 멈추고 묻는다.
- `gh`, `git`, `npm` 명령은 터미널에서 직접 실행한다. `gh` 로그인(`gh auth login`)은 사용자가 직접 한다.
