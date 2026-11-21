import { findMockChatAnswer, findMockChatMessages } from './mocks/chats'
import { shouldMock } from './mock-mode'
import { jsonBody, request } from './request'
import { toChatMessage, toChatMessages, type BackendChatMessage } from './backendResponses'

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

/** 답변 아래 이동 버튼. state는 이동할 화면에 넘길 값(예: 고른 문서 종류) */
export type ChatAction = { label: string; to: string; state?: Record<string, unknown> }

export type ChatAnswer = {
  conversationId: number
  status: ChatAnswerStatus
  /** **굵게**와 줄바꿈(\n)만 쓴다 */
  answer: string
  /** 참고한 정보: 내 계약서 · 법령 DB … */
  refs: string[]
  /** 답변 아래 이동 버튼. 누를 때만 이동한다 */
  actions: ChatAction[]
  /** 답변 뒤에 보여 줄 추천 질문. 없으면 지금 화면의 추천 질문을 그대로 둔다 */
  followUps?: string[]
  /** 캐릭터 표정(3 생각 중 등). 없으면 기본 */
  face?: 1 | 3 | 9
}

export type ChatMessage = {
  role: 'me' | 'ai'
  text: string
  refs?: string[]
  actions?: ChatAction[]
  status?: ChatAnswerStatus
  face?: 1 | 3 | 9
}

/** POST /api/chats/messages */
export function askChatQuestion(question: ChatQuestion): Promise<ChatAnswer> {
  if (shouldMock('askChatQuestion')) return findMockChatAnswer(question)
  // AI 질문 응답은 명세 페이지가 비어 있다. 대화 기록 조회의 ASSISTANT 메시지 모양에 대화 번호가 붙어 온다고 가정한다
  return request<BackendChatMessage & { conversationId: number; followUps?: string[] }>('/api/chats/messages', jsonBody('POST', question)).then(data => {
    const message = toChatMessage(data)
    return { conversationId: data.conversationId, status: message.status ?? 'ANSWERED', answer: message.text, refs: message.refs ?? [], actions: message.actions ?? [], ...(data.followUps ? { followUps: data.followUps } : {}) }
  })
}

// 명세: 대화 목록 API는 없다. 앱이 마지막 대화 번호를 기기에 저장해 두고 챗봇을 다시 열 때 쓴다
const LAST_CONVERSATION_KEY = 'docai.chat.lastConversationId'

export function loadLastConversationId(): number | undefined {
  try {
    const value = Number(window.localStorage.getItem(LAST_CONVERSATION_KEY))
    return Number.isSafeInteger(value) && value > 0 ? value : undefined
  } catch { return undefined }
}

export function saveLastConversationId(conversationId: number) {
  try { window.localStorage.setItem(LAST_CONVERSATION_KEY, String(conversationId)) } catch { /* 저장하지 못해도 이번 대화는 계속한다 */ }
}

/** GET /api/chats/{conversationId}/messages */
export function getChatMessages(conversationId: number): Promise<ChatMessage[]> {
  if (shouldMock('getChatMessages')) return findMockChatMessages(conversationId)
  return request<Parameters<typeof toChatMessages>[0]>(`/api/chats/${conversationId}/messages`).then(toChatMessages)
}
