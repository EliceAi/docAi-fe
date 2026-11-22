import type { ChatAnswer, ChatMessage, ChatQuestion } from '../chats'
import { mockResponse } from '../mock-mode'
import { toChatMessage, type BackendChatMessage } from '../backendResponses'
import { mockVideoEmploymentAnalysis, mockVideoEmploymentClauseDetails, VIDEO_ANALYSIS_ID, VIDEO_CONTRACT_ID } from './analyses'
import { videoChatMessagesResponse } from './real/videoEmployment'
import { answerDemoQuestion } from './demoChat'
import { SUGGESTED_QUESTIONS } from '../chatSuggestions'

type MockAnswer = Omit<ChatAnswer, 'conversationId'>

// 시연 영상 계약서(분석 1번)에 대한 답. 영상 속 대화(대화 246)는 그대로 쓰고, 추천 질문은 이 계약서의 분석 결과 문장으로만 답한다.
// 영상 서버의 분석 번호(9470)로 오는 근거 조항 버튼은 앱의 분석 1번으로 연다
const videoConversationAnswers = new Map<string, MockAnswer>()
const videoMessages = (videoChatMessagesResponse as { messages: BackendChatMessage[] }).messages
videoMessages.forEach((message, index) => {
  const reply = videoMessages[index + 1]
  if (message.role !== 'USER' || reply?.role !== 'ASSISTANT') return
  const converted = toChatMessage({ ...reply, actions: reply.actions?.map(action => ({ ...action, params: { ...action.params, ...(action.params.analysisId ? { analysisId: VIDEO_ANALYSIS_ID } : {}) } })) })
  videoConversationAnswers.set(message.content.trim(), { status: converted.status ?? 'ANSWERED', answer: converted.text, refs: converted.refs ?? [], actions: converted.actions ?? [] })
})

function videoContractAnswer(question: ChatQuestion): MockAnswer | undefined {
  const fromVideo = videoConversationAnswers.get(question.question.trim())
  if (fromVideo) return fromVideo
  const analysis = mockVideoEmploymentAnalysis
  const clause = mockVideoEmploymentClauseDetails.find(detail => detail.clauseId === question.clauseId)
  const fromScreen = (answer: string, refs = ['내 문서', '현재 화면']): MockAnswer => ({ status: 'ANSWERED', answer, refs, actions: [] })
  switch (question.question) {
    case '이 계약에서 먼저 확인할 내용은 뭐야?':
      return { ...fromScreen(`확인이 필요한 조항이 ${analysis.findings.length}개예요.\n${analysis.findings.map((finding, index) => `${index + 1}. ${finding.title}`).join('\n')}`),
        actions: [{ label: '첫 조항 자세히 보기', to: `/analyses/${VIDEO_ANALYSIS_ID}/clauses/${analysis.findings[0].clauseId}` }] }
    case '중요한 조건을 쉽게 정리해 줘.':
      return fromScreen(analysis.keyTerms.map(term => `**${term.label}** ${term.value ?? '확인 필요'}`).join('\n'), ['내 문서'])
    case '아직 확인되지 않은 정보가 있어?':
      return fromScreen(`${analysis.missingItems.length ? `빠진 항목: ${analysis.missingItems.map(item => item.title).join(', ')}` : '계약서에서 빠진 필수 항목은 없어요.'}\n서명 전에 상대방에게 확인해 보세요.\n${(analysis.questions ?? []).slice(0, 3).join('\n')}`, ['내 문서'])
    case '이 조항을 쉬운 말로 설명해 줘.':
      return clause && fromScreen(clause.easyExplanation)
    case '이 조항이 나에게 어떤 영향을 줘?':
      return clause && fromScreen(clause.checkReason || clause.easyExplanation)
    case '상대방에게 무엇을 확인하면 돼?':
      return clause && fromScreen(clause.question)
  }
  return undefined
}

const isVideoContract = (question: ChatQuestion) => question.analysisId === VIDEO_ANALYSIS_ID || question.contractId === VIDEO_CONTRACT_ID

// 질문 문구가 같으면 와이어프레임 S10 보드의 답변을 그대로 돌려준다. 문구는 보드와 한 글자도 다르게 쓰지 않는다.
// 보드의 예시는 근로(카페 알바)·임대차(역삼동 원룸) 계약서이고, 나머지 문서 종류는 연결 문서 없는 일반 답변으로 끝까지 동작한다.
export const mockChatAnswersByQuestion: Record<string, MockAnswer> = {
  '어떤 서류를 올리면 돼?': {
    status: 'ANSWERED',
    answer: '지금 어떤 상황인지에 따라 달라요. 알바·취업을 앞두고 있다면 **근로계약서**, 집을 구하는 중이라면 **임대차계약서**부터 확인해 보세요.',
    refs: ['앱 사용법', '현재 화면'],
    actions: [
      { label: '근로계약서 선택하기', to: '/contracts/new/capture', state: { documentTypeCode: 'EMPLOYMENT' } },
      { label: '임대차계약서 선택하기', to: '/contracts/new/capture', state: { documentTypeCode: 'LEASE' } },
      { label: '다른 문서 둘러보기', to: '/contracts/new' },
    ],
  },
  '주소도 가려야 해?': {
    status: 'ANSWERED',
    answer: '주소는 나를 알아볼 수 있는 정보라 가리는 걸 권해요. 다만 **근무 장소**는 점검에 필요할 수 있으니 내 집 주소만 가려 주세요.',
    refs: ['현재 화면', '앱 사용법'],
    actions: [
      { label: '가린 곳 목록 보기', to: '/contracts/new/mask' },
      { label: '계약서 종류 다시 고르기', to: '/contracts/new' },
    ],
  },
  '내 계약 문제없어?': {
    status: 'ANSWERED',
    face: 3,
    answer: '아직 분석이 끝나지 않아서 계약 내용으로는 답할 수 없어요. 끝나면 확인할 조항을 짚어 드릴게요.\n그동안 근로계약서에서 보통 확인하는 항목을 알려 드릴까요?',
    refs: ['앱 사용법'],
    actions: [],
  },
  '계약서에서 특약이 무슨 뜻이야?': {
    status: 'ANSWERED',
    answer: '특약은 표준 내용 말고 **두 사람이 따로 정한 약속**이에요. 일반 조항보다 나에게 불리한 내용이 들어가기 쉬워서 꼭 읽어 보세요.',
    refs: ['법령 DB'],
    actions: [],
  },
  '이 계약에서 먼저 확인할 내용은 뭐야?': {
    status: 'ANSWERED',
    answer: '두 가지를 먼저 보세요.\n① 시급 10,000원이 2026년 최저임금 10,320원보다 낮아요 (1쪽 제4조).\n② 1년 안에 퇴사하면 교육비 30만 원을 돌려줘야 한다는 조항(2쪽 제7조)은 법에 어긋날 수 있어요.',
    refs: ['내 문서', '법령 DB', '현재 화면'],
    actions: [
      { label: '근거 조항 보기 (제7조)', to: '/analyses/1/clauses/1' },
      { label: '일정 등록 화면으로', to: '/schedules/new?analysisId=1' },
    ],
  },
  '왜 주의가 필요해?': {
    status: 'ANSWERED',
    answer: '근로기준법 제20조는 근로계약을 지키지 않을 때의 위약금이나 손해배상액을 **미리 정하는 것**을 금지해요. 이 조항은 퇴사하면 교육비를 돌려주도록 미리 정해 두어서 문제가 될 수 있어요. 다만 교육비의 실제 성격에 따라 판단이 달라질 수 있어요.',
    refs: ['현재 화면', '내 문서', '법령 DB'],
    actions: [],
  },
  '보증금 돌려받을 수 있어?': {
    status: 'NOT_ENOUGH',
    answer: '**계약서로 확인한 것**\n보증금 1,000만 원, 계약 종료 2028.11.30\n**확인할 수 없는 것**\n집에 근저당이 있는지, 집주인의 다른 빚은 이 계약서만으로 알 수 없어요. 등기부등본에서 소유자와 근저당을 확인해 보세요.',
    refs: ['내 문서', '법령 DB'],
    actions: [],
  },
  '실손보험 약관도 봐줄 수 있어?': {
    status: 'OUT_OF_SCOPE',
    answer: '지금은 **집과 일에 관한 문서 23종**을 도와드려요. 보험 약관은 아직 지원하지 않아요.',
    refs: ['앱 사용법'],
    actions: [{ label: '지원하는 문서 보기', to: '/contracts/new' }],
    followUps: ['근로계약서에서 꼭 볼 것은?', '전세와 월세는 뭐가 달라?'],
  },
  '내 부담이 달라지는 부분이 있어?': {
    status: 'ANSWERED',
    answer: '네. 월세가 55만 원에서 **58만 원**으로 매달 3만 원 늘어요 (2년이면 72만 원). 반려동물 금지 특약도 새로 생겼어요.\n수정본 2쪽 아래 칸은 글자가 흐려서 비교하지 못했어요. 그 쪽을 다시 찍거나 직접 입력해 주세요.',
    refs: ['내 문서', '현재 화면'],
    actions: [{ label: '바뀐 일정 보기', to: '/schedules/new?comparisonId=1' }],
  },
}

// 기본 답변: 위에 없는 질문에도 막다른 화면 없이 안내한다
export const mockChatAnswer: ChatAnswer = {
  conversationId: 1,
  status: 'ANSWERED',
  answer: '계약서를 찍거나 올리면 확인할 조항과 일정을 알려 드려요.',
  refs: ['사용 안내'],
  actions: [{ label: '계약서 올리기', to: '/contracts/new' }],
}

/** 실패 보드를 그릴 때만 쓰는 질문. 실제 시연 응답은 인위적으로 실패시키지 않는다. */
export const mockFailingQuestion = '수습기간에도 최저임금 다 받아?'

// mock 대화 기록: 대화 번호별로 주고받은 메시지를 기억해 "대화 기록 조회"로 돌려준다
const mockConversations = new Map<number, ChatMessage[]>()
let nextConversationId = Date.now()

export async function findMockChatAnswer(question: ChatQuestion): Promise<ChatAnswer> {
  const videoAnswer = isVideoContract(question) ? videoContractAnswer(question) : undefined
  const suggested = SUGGESTED_QUESTIONS[question.screen ?? 'S01']?.includes(question.question.trim())
  const generalQuestion = question.question === '계약서에서 특약이 무슨 뜻이야?' || question.question === '실손보험 약관도 봐줄 수 있어?'
    || question.question === '보증금 돌려받을 수 있어?' && (!question.contractId && !question.analysisId || question.contractId === 2 || question.analysisId === 2)
  const generalAnswer = !suggested && generalQuestion ? mockChatAnswersByQuestion[question.question] : undefined
  const response = videoAnswer ?? generalAnswer ?? await answerDemoQuestion(question)
  const answer: ChatAnswer = { ...response, conversationId: question.conversationId ?? nextConversationId++,
    actions: response.actions.map(action => action.to.startsWith('/contracts/new')
      ? { label: '예시 계약서 보기', to: '/contracts' } : action) }
  mockConversations.set(answer.conversationId, [...(mockConversations.get(answer.conversationId) ?? []),
    { role: 'me', text: question.question },
    { role: 'ai', text: answer.answer, refs: answer.refs, actions: answer.actions, status: answer.status, face: answer.face }])
  return mockResponse(answer)
}

export function findMockChatMessages(conversationId: number): Promise<ChatMessage[]> {
  return mockResponse(mockConversations.get(conversationId) ?? [])
}

/** 패널을 처음 열면 보이는 인사 */
export const mockGreeting: ChatMessage = {
  role: 'ai',
  text: '안녕하세요! 계약서 내용, 법률 용어, 앱 사용법을 물어보세요.\n**계약서를 올리지 않아도** 질문할 수 있어요.',
  refs: ['앱 사용법'],
}

/** 보드용: 질문 하나와 그 답변이 쌓인 대화 */
export function mockConversation(question: string): ChatMessage[] {
  const answer = mockChatAnswersByQuestion[question]
  return [
    { role: 'me', text: question },
    { role: 'ai', text: answer.answer, refs: answer.refs, actions: answer.actions, status: answer.status, face: answer.face },
  ]
}
