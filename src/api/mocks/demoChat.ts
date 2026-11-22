import type { ChatAnswer, ChatQuestion } from '../chats'
import { SUGGESTED_QUESTIONS } from '../chatSuggestions'
import { getAnalysis, getClause } from '../analyses'
import { getMyContract } from '../contracts'
import { getComparison } from '../comparisons'
import { getScheduleCandidates, getScheduleChanges, getSchedules } from '../schedules'

type DemoAnswer = Omit<ChatAnswer, 'conversationId'>
const examples = [
  { label: '근로계약서 예시 보기', to: '/analyses/1' },
  { label: '임대차계약서 예시 보기', to: '/analyses/9' },
]

const guidance: Record<string, string> = {
  '어떤 도움을 받을 수 있어?': '계약서의 주요 조건과 확인할 조항을 읽고, 날짜를 골라 내 일정에 저장할 수 있어요. 시연에서는 준비된 예시로 직접 확인해 보세요.',
  '계약하기 전에 무엇부터 확인해야 해?': '금액과 지급일, 계약기간, 추가로 부담할 의무를 먼저 살펴보세요. 확인이 필요한 조항에서 원문과 근거를 보고 상대방에게 물어볼 내용을 확인할 수 있어요.',
  '어떤 서류를 올리면 돼?': '일을 시작할 때는 근로계약서, 집을 구할 때는 임대차계약서를 확인해요. 시연에서는 새 문서를 올리는 대신 아래 예시를 선택해 주세요.',
  '이 서류가 어떤 계약서인지 모르겠어.': '일하는 조건을 정했다면 근로계약서, 집을 빌리는 조건을 정했다면 임대차계약서예요. 아래 예시에서 주요 조건을 비교해 보세요.',
  '아르바이트 계약서는 무엇을 선택해?': '아르바이트도 근로계약서를 선택해요. 시연의 근로 예시에서 근무시간, 월급, 휴일과 확인할 조항을 살펴볼 수 있어요.',
  '전세·월세 계약서는 무엇을 선택해?': '전세와 월세는 임대차계약서를 선택해요. 시연의 임대차 예시에서 보증금, 월세, 계약기간과 특약을 확인할 수 있어요.',
  '계약서가 여러 장인데 어떻게 올려?': '실제 등록에서는 계약서의 모든 쪽을 순서대로 올려요. 시연은 새 업로드가 제한되어 있으며, 4쪽을 분석한 근로계약서 예시를 제공해요.',
  '사진을 어떻게 찍어야 잘 읽혀?': '종이의 네 모서리가 보이도록 밝은 곳에서 찍고 글자가 흐리거나 잘리지 않았는지 확인해요. 시연에서는 준비된 예시 분석을 확인해 주세요.',
  '어떤 파일을 올릴 수 있어?': '실제 등록의 파일 선택 안내에서 지원 형식을 확인할 수 있어요. 현재 시연은 새 파일을 받지 않고 준비된 계약서로 동작해요.',
  '빠진 페이지가 없는지 어떻게 확인해?': '계약서의 쪽 번호와 마지막 서명란을 확인하고 올린 순서를 비교해요. 시연에서는 근로 예시의 4쪽 분석 결과를 확인할 수 있어요.',
  '글자가 흐린데 다시 찍어야 해?': '읽기 어려운 글자는 분석 전에 선명하게 다시 찍는 것이 좋아요. 시연에서는 재촬영 대신 준비된 예시 분석 결과를 확인할 수 있어요.',
  '잘못 올린 페이지는 어떻게 바꿔?': '실제 등록에서는 올린 페이지를 확인하고 잘못된 쪽을 교체해요. 현재 시연에서는 새 업로드 없이 준비된 예시로 확인해 주세요.',
  '어떤 개인정보를 가리면 돼?': '이름, 주민등록번호, 연락처와 개인 주소처럼 나를 식별하는 정보를 가려요. 시연의 근로계약서는 가상 정보로 만든 계약서예요.',
  '금액이나 날짜도 가려야 해?': '금액과 날짜는 계약 조건과 일정 확인에 필요하므로 남겨 두는 편이 좋아요. 이름과 연락처 등 식별 정보는 가려 주세요.',
  '잘못 가린 부분은 어떻게 되돌려?': '실제 등록에서는 가리기 화면에서 해당 가림을 지우고 다시 확인해요. 시연은 새 계약서 가리기 대신 가상 정보의 분석 예시를 제공해요.',
  '분석 전에 마지막으로 무엇을 확인해?': '모든 쪽이 들어 있는지, 글자가 선명한지, 개인정보를 가렸는지 확인해요. 금액과 날짜는 읽을 수 있어야 조건과 일정을 확인할 수 있어요.',
  'AI에는 어떤 문서가 전달돼?': '실제 분석에는 사용자가 개인정보를 가린 이미지가 전달돼요. 이 시연은 준비된 분석 결과를 사용하며 새 문서를 AI에 보내지 않아요.',
  '개인정보를 더 가리려면 어떻게 해?': '실제 등록에서는 보내기 전에 가리기 단계로 돌아가 수정해요. 시연에서는 추가 업로드나 분석 요청 없이 예시 결과를 확인할 수 있어요.',
  '분석 결과에는 어떤 내용이 나와?': '주요 조건, 확인이 필요한 조항, 근거 법령, 상대방에게 물어볼 질문과 일정 후보를 보여 드려요. 아래 예시에서 직접 눌러 보세요.',
  '분석이 실패하면 어떻게 해야 해?': '실제 분석에서는 실패 안내에 따라 흐린 쪽을 다시 찍거나 다시 시도해요. 시연에서는 AI를 새로 호출하지 않고 준비된 예시 결과를 보여 드려요.',
  '계약서에서 특약이 무슨 뜻이야?': '특약은 기본 계약 내용 외에 당사자들이 따로 정한 약속이에요. 임대차 예시에서 도배·장판 비용 부담처럼 추가로 정한 조건을 확인할 수 있어요.',
  '어떤 문서끼리 비교해야 해?': '같은 계약의 이전본과 수정본을 비교해요. 시연에서는 준비된 역삼동 원룸 월세 계약서의 두 버전을 비교할 수 있어요.',
  '이전본과 수정본은 어떻게 구분해?': '이전본은 바뀌기 전 계약서, 수정본은 변경된 조건이 담긴 계약서예요. 비교 화면의 제목과 버전을 확인하고 필요하면 순서를 바꿔 보세요.',
  '페이지가 빠져 있어도 비교할 수 있어?': '짝이 있는 쪽만 비교할 수 있어요. 시연의 임대차 예시는 두 버전의 쪽 수가 달라 안내를 확인한 뒤 이대로 비교를 선택할 수 있어요.',
  '종료일과 갱신 관련 기한은 어떻게 달라?': '종료일은 계약이 끝나는 날짜이고, 갱신 관련 기한은 갱신 여부를 알리는 등 별도 행동이 필요한 날짜예요. 날짜가 적혀 있는지 원문을 확인해 주세요.',
  '날짜가 없으면 직접 입력할 수 있어?': '일정 확인·등록에서 날짜를 수정하거나 일정을 직접 추가할 수 있어요. 입력하고 저장하면 내 일정에서 확인할 수 있어요.',
  '보관된 문서는 어디에서 찾아?': '아래 내 계약서 보기를 누르면 보관된 예시 계약서가 나와요. 문서를 선택하면 분석 결과와 연결된 일정을 확인할 수 있어요.',
  '휴대폰 알림도 받을 수 있어?': '휴대폰 푸시 알림은 아직 지원하지 않아요. 저장된 일정은 내 일정의 목록과 달력에서 확인할 수 있어요.',
  '보관한 계약서끼리 비교할 수 있어?': '시연에서는 준비된 임대차계약서의 이전본과 수정본을 비교할 수 있어요. 바뀐 조건을 확인하고 일정 변경까지 저장해 보세요.',
}

export async function answerDemoQuestion(question: ChatQuestion): Promise<DemoAnswer> {
  const text = question.question.trim()
  const screen = question.screen ?? 'S01'
  const followUps = SUGGESTED_QUESTIONS[screen] ?? SUGGESTED_QUESTIONS.S01
  const reply = (answer: string, actions: DemoAnswer['actions'] = [], refs = ['현재 화면', '예시 데이터']): DemoAnswer => ({ status: 'ANSWERED', answer, refs, actions })
  if (guidance[text]) {
    const actions = ['S11', 'S12'].includes(screen) || text === '보관한 계약서끼리 비교할 수 있어?'
      ? [{ label: '임대차 비교 예시 보기', to: '/comparisons/new' }]
      : ['S14', 'S15'].includes(screen) ? [{ label: '내 계약서 보기', to: '/contracts' }, { label: '내 일정 보기', to: '/schedules' }] : examples
    return reply(guidance[text], actions, text === '계약서에서 특약이 무슨 뜻이야?' ? ['법률 용어 안내'] : ['앱 사용법', '현재 화면'])
  }

  if (!followUps.includes(text)) return {
    status: 'NOT_ENOUGH',
    answer: '이 시연은 준비된 질문과 예시 계약서로 답변 과정을 보여 드려요. 자유 질문에 대한 새 AI 답변은 생성하지 않아요. 아래 추천 질문을 선택해 주세요.',
    refs: ['시연 안내'], actions: [], followUps,
  }

  if (screen === 'S12') {
    const comparison = await getComparison(question.comparisonId ?? 1)
    const selected = text === '바뀐 금액과 날짜만 정리해 줘.' ? comparison.changes.filter(change => change.kind === 'amount' || change.kind === 'date')
      : text === '추가된 조항에서 무엇을 확인해야 해?' ? comparison.changes.filter(change => change.kind === 'added') : comparison.changes
    return reply(`${comparison.documentTitle}의 비교 예시예요.\n${selected.length ? selected.map(change => `**${change.label}** ${change.before ?? '없음'} → ${change.after ?? '없음'}${change.note ? `\n${change.note}` : ''}`).join('\n') : '이 비교 결과에 해당하는 변경 항목은 없어요.'}`,
      [{ label: '바뀐 일정 보기', to: `/schedules/new?comparisonId=${comparison.comparisonId}` }])
  }
  if (screen === 'S13') {
    if (question.comparisonId) {
      const changes = await getScheduleChanges(question.comparisonId)
      return reply(`비교 결과에서 날짜가 바뀐 일정이에요.\n${changes.changes.map(change => `${change.title}: ${change.beforeDate ?? '없음'} → ${change.afterDate ?? '없음'}`).join('\n') || '바꿀 일정이 없어요.'}`)
    }
    const candidates = await getScheduleCandidates(question.analysisId ?? 1)
    return reply(`${candidates.contractTitle}의 일정 후보예요.\n${candidates.candidates.map(candidate => `${candidate.title}: ${candidate.date ?? '직접 입력 필요'}${candidate.where ? `\n${candidate.where}` : ''}`).join('\n') || '적힌 날짜 후보가 없어 직접 추가할 수 있어요.'}`)
  }
  if (screen === 'S14') {
    const schedules = (await getSchedules()).filter(schedule => !question.contractId || schedule.contractId === question.contractId)
    return reply(`현재 저장된 일정이에요.\n${schedules.map(schedule => `${schedule.title} · ${schedule.date} · ${schedule.contractTitle}`).join('\n') || '저장된 일정이 없어요. 예시 분석에서 일정을 선택해 저장해 보세요.'}`,
      [...new Map(schedules.map(schedule => [schedule.contractId, { label: `${schedule.contractTitle} 보기`, to: `/contracts/${schedule.contractId}` }])).values()])
  }
  if (screen === 'S15') {
    if (!question.contractId) return reply('내 계약서에서 문서를 선택한 뒤 AI에게 질문을 누르면 해당 문서를 연결해요. 근로·임대차 예시에서 분석 결과를 다시 확인할 수 있어요.', examples)
    const contract = await getMyContract(question.contractId)
    return reply(`지금 연결된 문서는 **${contract.title} · v${contract.version}**예요.\n${contract.keyTerms.map(term => `${term.label}: ${term.value}`).join('\n')}`,
      [{ label: '이 문서의 분석 결과 보기', to: `/analyses/${contract.analysisId}` }])
  }
  const contract = question.contractId ? await getMyContract(question.contractId) : null
  const analysis = await getAnalysis(question.analysisId ?? contract?.analysisId ?? 1)
  if (screen === 'S09') {
    const clauseId = question.clauseId ?? analysis.findings[0]?.clauseId
    if (!clauseId) return reply('이 예시에는 조항 상세가 없어요. 분석 결과에서 공통 확인 항목을 살펴보세요.', [{ label: '분석 결과 보기', to: `/analyses/${analysis.analysisId}` }])
    const clause = await getClause(analysis.analysisId, clauseId)
    return reply(text === '상대방에게 무엇을 확인하면 돼?' ? clause.question || '해당 조항의 적용 범위와 조건을 상대방에게 확인해 주세요.'
      : text === '이 조항이 나에게 어떤 영향을 줘?' ? clause.checkReason || clause.easyExplanation : clause.easyExplanation)
  }
  if (text === '중요한 조건을 쉽게 정리해 줘.') return reply(`**${analysis.documentTitle}**\n${analysis.keyTerms.map(term => `${term.label}: ${term.value ?? '확인 필요'}`).join('\n')}`)
  if (text === '아직 확인되지 않은 정보가 있어?') return reply(`${analysis.missingItems.length ? analysis.missingItems.map(item => `${item.title}: ${item.explanation}`).join('\n') : '이 예시에서 별도로 표시된 빠진 항목은 없어요.'}\n${analysis.unknowns?.explanation ?? '상대방에게 물어볼 질문과 조항 원문도 함께 확인해 주세요.'}`)
  return reply(`**${analysis.documentTitle}**에서 확인할 내용이에요.\n${analysis.findings.map(finding => `${finding.title}\n${finding.summary}`).join('\n') || analysis.unknowns?.explanation || '이 예시에는 별도로 짚은 조항이 없어요.'}`,
    analysis.findings.length ? [{ label: '첫 조항 자세히 보기', to: `/analyses/${analysis.analysisId}/clauses/${analysis.findings[0].clauseId}` }] : [])
}
