import { afterEach, describe, expect, it, vi } from 'vitest'
import { askChatQuestion } from './chats'
import { toChatMessage, type BackendChatMessage } from './backendResponses'
import * as users from './users'

// 2026-11-21 로컬 백엔드에서 받은 실제 응답 모양 (POST /api/chats/messages)
const realAnswer = {
  conversationId: 1,
  messageId: 2,
  answerType: 'PARTIAL',
  answer: '현재 계약서에서는 <b>휴일 항목이 빠져 있어요</b>.',
  linkedDocument: { contractId: 6, title: '표준근로계약서', analyzedAt: '2026-11-21T16:47:21+09:00' },
  references: [{ type: 'MY_DOCUMENT', label: '표준근로계약서' }],
  partial: { confirmed: ['계약서에 휴일 항목이 없습니다.'], unknown: ['주휴수당 기준은 확인할 수 없습니다.'] },
  actions: [{ type: 'OPEN_SCREEN', label: '분석 결과 보기', params: { screen: 'S08', analysisId: 7 } }],
}

function stubBackend() {
  vi.stubEnv('VITE_API_MODE', 'real')
  vi.spyOn(users, 'getAccessToken').mockResolvedValue('token-1')
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ status: 201, code: null, message: null, data: realAnswer }), { status: 201 }))
  vi.stubGlobal('fetch', fetchMock)
  return () => JSON.parse(String((fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit])[1].body))
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('askChatQuestion (실제 백엔드)', () => {
  it('질문은 message로, 화면 번호와 화면 맥락 번호를 함께 보낸다', async () => {
    const sentBody = stubBackend()
    await askChatQuestion({ question: '주휴수당이 뭐예요?', screen: 'S09', contractId: 6, analysisId: 7, clauseId: 3 })
    expect(sentBody()).toEqual({ message: '주휴수당이 뭐예요?', screen: 'S09', contractId: 6, analysisId: 7, clauseId: 3 })
  })

  it('화면 번호가 없으면 홈(S01)으로 보낸다', async () => {
    const sentBody = stubBackend()
    await askChatQuestion({ question: '사용법 알려줘' })
    expect(sentBody().screen).toBe('S01')
  })

  it('답변 본문은 answer 필드에서 읽는다', async () => {
    stubBackend()
    const answer = await askChatQuestion({ question: '주휴수당이 뭐예요?', screen: 'S08' })
    expect(answer.conversationId).toBe(1)
    expect(answer.answer).toContain('**휴일 항목이 빠져 있어요**')
  })
})

describe('toChatMessage', () => {
  const assistant = (fields: Partial<BackendChatMessage>): BackendChatMessage =>
    ({ messageId: 2, role: 'ASSISTANT', content: '', createdAt: '2026-11-21T16:48:42+09:00', ...fields })

  it('<b> 태그는 굵게 표시(**)로 바꾸고 다른 태그는 지운다', () => {
    const message = toChatMessage(assistant({ content: '<b>위약금</b>은 <i>금지</i>돼요<script>x</script>' }))
    expect(message.text).toBe('**위약금**은 금지돼요x')
  })

  it('일부만 답한 답변(PARTIAL)은 근거 부족 표시와 확인한 것·확인할 수 없는 것을 함께 보여 준다', () => {
    const message = toChatMessage(assistant({ content: '답변', answerType: 'PARTIAL', partial: realAnswer.partial }))
    expect(message.status).toBe('NOT_ENOUGH')
    expect(message.text).toBe('답변\n**계약서로 확인한 것**\n계약서에 휴일 항목이 없습니다.\n**확인할 수 없는 것**\n주휴수당 기준은 확인할 수 없습니다.')
  })

  it('화면 이동 버튼을 앱 주소로 바꾼다', () => {
    const message = toChatMessage(assistant({ actions: [
      { type: 'OPEN_SCREEN', label: '분석 결과 보기', params: { screen: 'S08', analysisId: 7 } },
      { type: 'OPEN_SCREEN', label: '일정 등록', params: { screen: 'S13', analysisId: 7 } },
      { type: 'OPEN_SCREEN', label: '비교 결과', params: { screen: 'S12', comparisonId: 4 } },
      { type: 'OPEN_SCREEN', label: '내 일정', params: { screen: 'S14' } },
      { type: 'OPEN_SCREEN', label: '내 계약서', params: { screen: 'S15' } },
      { type: 'OPEN_SCREEN', label: '홈', params: { screen: 'S01' } },
      { type: 'OPEN_DOCUMENT_TYPE', label: '문서 종류 고르기', params: {} },
      { type: 'OPEN_CLAUSE', label: '근거 조항 보기', params: { analysisId: 7, clauseId: 3 } },
    ] }))
    expect(message.actions?.map(action => action.to)).toEqual([
      '/analyses/7', '/schedules/new?analysisId=7', '/comparisons/4', '/schedules', '/contracts', '/', '/contracts/new', '/analyses/7/clauses/3',
    ])
  })
})
