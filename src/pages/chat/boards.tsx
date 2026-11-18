import type { ReactNode } from 'react'
import { mockChatAnswersByQuestion, mockConversation, mockFailingQuestion, mockGreeting } from '../../api/mocks/chats'
import { Layered } from '../../common/components'
import type { Board } from '../../dev/types'
import { analysisBoards } from '../analysis/boards'
import { comparisonBoards } from '../comparison/boards'
import { contractRegisterBoards } from '../contract-register/boards'
import { homeBoards } from '../home/boards'
import { myContractsBoards } from '../my-contracts/boards'
import { ChatPanelView, ConfirmLeaveDialog } from './ChatPanel'
import { CHAT_FAILED_TEXT, screenContext, SUGGESTED_QUESTIONS } from './chatRules'

// 이 폴더의 와이어프레임 보드. 챗봇은 각 화면 위에 올라오는 패널이라, 다른 폴더 보드의 화면을 바탕으로 깔고 그 위에 패널을 그린다.
const baseOf = (boards: Board[], id: string): ReactNode => boards.find(board => board.id === id)!.render!()

type PanelProps = Parameters<typeof ChatPanelView>[0]
const chatOver = (base: ReactNode, props: PanelProps, ...layers: ReactNode[]) => (
  <Layered base={base} layers={[<ChatPanelView key="chat" {...props} />, ...layers]} />
)

export const chatBoards: Board[] = [
  { id: 'S10_챗봇_처음열기_일반', owner: '김지희', path: '/', render: () => chatOver(baseOf(homeBoards, 'S01_홈_기본'), {
    context: screenContext('S01'), messages: [mockGreeting], chips: SUGGESTED_QUESTIONS.S01, input: '',
  }) },
  { id: 'S10_챗봇_답변_사용법', owner: '김지희', path: '/', render: () => chatOver(baseOf(homeBoards, 'S01_홈_기본'), {
    context: screenContext('S01'), messages: mockConversation('어떤 서류를 올리면 돼?'), chips: SUGGESTED_QUESTIONS.S02, input: '',
  }) },
  { id: 'S10_챗봇_가리기중', owner: '김지희', path: '/', render: () => chatOver(baseOf(contractRegisterBoards, 'S05_가리기_직접가리기'), {
    context: screenContext('S05'), messages: mockConversation('주소도 가려야 해?'), chips: SUGGESTED_QUESTIONS.S05, input: '',
  }) },
  { id: 'S10_챗봇_이동확인', owner: '김지희', path: '/', render: () => chatOver(baseOf(contractRegisterBoards, 'S05_가리기_직접가리기'), {
    context: '지금 화면: 개인정보 가리기', chips: [], input: '',
    messages: [{ role: 'me', text: '주소도 가려야 해?' }, { role: 'ai', text: '주소는 가리는 걸 권해요. 근무 장소는 남겨 두세요.' }],
  }, <ConfirmLeaveDialog key="leave" />) },
  { id: 'S10_챗봇_분석중', owner: '김지희', path: '/', render: () => chatOver(baseOf(analysisBoards, 'S07_분석중_진행'), {
    context: '지금 화면: 분석 중 · 카페 알바 근로계약서 (아직 분석 전이에요)', messages: mockConversation('내 계약 문제없어?'), chips: SUGGESTED_QUESTIONS.S07, input: '',
  }) },
  { id: 'S10_챗봇_분석완료안내', owner: '김지희', path: '/', render: () => chatOver(baseOf(analysisBoards, 'S07_분석중_진행'), {
    context: '지금 화면: 분석 중', banner: { text: '분석이 완료됐어요', actionLabel: '결과 보기' },
    messages: mockConversation('계약서에서 특약이 무슨 뜻이야?'), chips: SUGGESTED_QUESTIONS.S07, input: '',
  }) },
  { id: 'S10_챗봇_내문서답변', owner: '김지희', path: '/', render: () => chatOver(baseOf(analysisBoards, 'S08_분석결과_정상'), {
    linkedDoc: '카페 알바 근로계약서 (11.12 분석)', context: screenContext('S08'), messages: mockConversation('이 계약에서 먼저 확인할 내용은 뭐야?'), chips: SUGGESTED_QUESTIONS.S08, input: '',
  }) },
  { id: 'S10_챗봇_조항맥락', owner: '김지희', path: '/', render: () => chatOver(baseOf(analysisBoards, 'S09_조항상세_기본'), {
    linkedDoc: '카페 알바 근로계약서', context: '보고 있는 조항: 제7조 교육비 반환', messages: mockConversation('왜 주의가 필요해?'), chips: SUGGESTED_QUESTIONS.S09, input: '',
  }) },
  { id: 'S10_챗봇_문서바꾸기', owner: '김지희', path: '/', render: () => chatOver(baseOf(myContractsBoards, 'S15_내계약서_문서상세'), {
    linkedDoc: '카페 알바 근로계약서', onSwap: () => {}, context: '지금 화면: 역삼동 원룸 월세 계약서 상세 · 대화에 연결된 문서와 달라요', chips: SUGGESTED_QUESTIONS.S15, input: '',
    // 연결 문서를 바꾸는 것은 화면 이동이 아니라 패널 안의 동작이라, 이동 주소는 보드에서만 쓰는 자리 표시다
    messages: [{ role: 'me', text: '이 조항을 쉬운 말로 설명해 줘.' }, {
      role: 'ai', text: '지금 대화는 **카페 알바 근로계약서**에 연결돼 있어요. 보고 계신 역삼동 원룸 월세 계약서로 물어보려면 새 대화를 시작해 주세요.',
      actions: [{ label: '이 계약서로 질문하기', to: '/contracts/2' }, { label: '그대로 계속하기', to: '/contracts/1' }],
    }],
  }) },
  { id: 'S10_챗봇_근거부족', owner: '김지희', path: '/', render: () => chatOver(baseOf(analysisBoards, 'S08_분석결과_임대차'), {
    linkedDoc: '역삼동 원룸 월세 계약서 (11.12 분석)', context: screenContext('S08'), messages: mockConversation('보증금 돌려받을 수 있어?'), chips: SUGGESTED_QUESTIONS.S08, input: '',
  }) },
  { id: 'S10_챗봇_비교결과질문', owner: '김지희', path: '/', render: () => chatOver(baseOf(comparisonBoards, 'S12_비교결과_기본'), {
    linkedDoc: '역삼동 원룸 월세 계약서 v1 → v2', context: '지금 화면: 비교 결과 · 이전본 v1(11.05) / 수정본 v2(오늘)', messages: mockConversation('내 부담이 달라지는 부분이 있어?'), chips: SUGGESTED_QUESTIONS.S12, input: '',
  }) },
  { id: 'S10_챗봇_범위밖', owner: '김지희', path: '/', render: () => chatOver(baseOf(homeBoards, 'S01_홈_기본'), {
    context: screenContext('S01'), messages: mockConversation('실손보험 약관도 봐줄 수 있어?'), chips: mockChatAnswersByQuestion['실손보험 약관도 봐줄 수 있어?'].followUps!, input: '',
  }) },
  { id: 'S10_챗봇_응답실패', owner: '김지희', path: '/', render: () => chatOver(baseOf(homeBoards, 'S01_홈_기본'), {
    context: screenContext('S01'), chips: [], input: mockFailingQuestion,
    messages: [{ role: 'me', text: mockFailingQuestion }, { role: 'ai', text: CHAT_FAILED_TEXT, status: 'FAILED', face: 9 }],
  }) },
]
