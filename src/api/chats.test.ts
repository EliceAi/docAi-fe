import { beforeEach, describe, expect, it, vi } from 'vitest'

let chats: typeof import('./chats')

beforeEach(async () => {
  vi.stubEnv('VITE_API_MODE', 'mock')
  vi.resetModules()
  chats = await import('./chats')
})

const ask = (question: string, screen = 'S01') => chats.askChatQuestion({ question, screen })

describe('askChatQuestion (mock)', () => {
  it('추천 질문에는 와이어프레임의 답변·참고한 정보·이동 버튼을 돌려준다', async () => {
    const answer = await ask('어떤 서류를 올리면 돼?')
    expect(answer.status).toBe('ANSWERED')
    expect(answer.refs).toEqual(['앱 사용법', '현재 화면'])
    expect(answer.actions.map(action => action.to)).toEqual(['/analyses/1', '/analyses/9'])
  })
  it('법령을 참고한 답변은 참고한 정보에 법령 DB를 포함한다', async () => {
    expect((await ask('계약서에서 특약이 무슨 뜻이야?', 'S07')).refs).toContain('법률 용어 안내')
  })
  it('지원하지 않는 문서는 범위 밖으로 답하고 다음 추천 질문을 바꿔 준다', async () => {
    const answer = await ask('실손보험 약관도 봐줄 수 있어?')
    expect(answer).toMatchObject({ status: 'OUT_OF_SCOPE', followUps: ['근로계약서에서 꼭 볼 것은?', '전세와 월세는 뭐가 달라?'] })
  })
  it('계약서만으로 알 수 없는 질문은 근거 부족으로 답한다', async () => {
    expect((await ask('보증금 돌려받을 수 있어?', 'S08')).status).toBe('NOT_ENOUGH')
  })
  it('답이 없는 질문도 막다른 화면 없이 기본 안내로 답한다', async () => {
    expect(await ask('아무 말이나')).toMatchObject({ status: 'NOT_ENOUGH', actions: [], followUps: expect.any(Array) })
  })
  it('시연에서 자유 질문을 입력해도 인위적인 실패를 만들지 않는다', async () => {
    await expect(ask('수습기간에도 최저임금 다 받아?')).resolves.toMatchObject({ status: 'NOT_ENOUGH' })
  })
  it('답변에 위법 확정·무조건 안전 같은 단정 표현이 없다', async () => {
    const texts = await Promise.all(['어떤 서류를 올리면 돼?', '이 계약에서 먼저 확인할 내용은 뭐야?', '왜 주의가 필요해?', '보증금 돌려받을 수 있어?'].map(question => ask(question, 'S08')))
    for (const { answer } of texts) expect(answer).not.toMatch(/위법\s*확정|무조건\s*안전/)
  })
})
