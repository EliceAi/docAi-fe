import { mockChatAnswer } from './mocks/chats'
import { mockResponse, shouldMock } from './mock-mode'
import { jsonBody, request } from './request'

// 응답 상세는 API 명세에 아직 없다. 와이어프레임 S10 챗봇 기준으로 정했고, 실제 연결 때 test-api로 맞춘다.

/** ANSWERED 답변 · OUT_OF_SCOPE 범위 밖 · NOT_ENOUGH 근거 부족 · FAILED 응답 실패 */
export type ChatAnswerStatus = 'ANSWERED' | 'OUT_OF_SCOPE' | 'NOT_ENOUGH' | 'FAILED'

export type ChatQuestion = {
  conversationId?: number
  /** 연결한 내 계약서. 없으면 일반 질문 */
  contractId?: number
  /** 질문한 화면 코드(S01~S15) */
  screen?: string
  question: string
}

export type ChatAnswer = {
  conversationId: number
  status: ChatAnswerStatus
  answer: string
  /** 참고한 정보: 내 계약서 · 법령 DB … */
  refs: string[]
  /** 답변 아래 이동 버튼 */
  actions: { label: string; to: string }[]
}

export type ChatMessage = { role: 'me' | 'ai'; text: string; refs?: string[] }

/** POST /api/chats/messages */
export function askChatQuestion(question: ChatQuestion): Promise<ChatAnswer> {
  if (shouldMock('askChatQuestion')) return mockResponse(mockChatAnswer)
  return request('/api/chats/messages', jsonBody('POST', question))
}

/** GET /api/chats/{conversationId}/messages */
export function getChatMessages(conversationId: number): Promise<ChatMessage[]> {
  if (shouldMock('getChatMessages')) return mockResponse([{ role: 'ai', text: mockChatAnswer.answer, refs: mockChatAnswer.refs }])
  return request(`/api/chats/${conversationId}/messages`)
}
