import type { ChatAnswer } from '../chats'

// 보드 상태별 응답(범위 밖, 근거 부족, 응답 실패 등)은 화면 담당자가 이 파일에 추가한다
export const mockChatAnswer: ChatAnswer = {
  conversationId: 1,
  status: 'ANSWERED',
  answer: '계약서를 찍거나 올리면 확인할 조항과 일정을 알려 드려요.',
  refs: ['사용 안내'],
  actions: [{ label: '계약서 올리기', to: '/contracts/new' }],
}
