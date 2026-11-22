import { beforeEach, describe, expect, it, vi } from 'vitest'

// 배포(mock)의 근로계약서 예시는 한재훈 님 시연 영상과 같은 실제 응답(분석 9470, 가상 계약서)이다.
// 등록 후 분석·조항·일정 후보·내 계약서·일정·알림·챗봇과 홈 예시가 모두 같은 계약서로 보여야 한다. 보드는 와이어프레임 예시를 그대로 쓴다.
let analyses: typeof import('./analyses')

beforeEach(async () => {
  vi.stubEnv('VITE_API_MODE', 'mock')
  vi.resetModules()
  analyses = await import('./analyses')
})

describe('등록 흐름의 근로계약서 = 시연 영상 데이터', () => {
  it('분석 결과는 영상의 제목과 확인 필요 7개를 보여 준다', async () => {
    const result = await analyses.getAnalysis(1)
    expect(result).toMatchObject({ analysisId: 1, contractId: 1, documentTitle: '근로계약서(안)' })
    expect(result.findings).toHaveLength(7)
    expect(result.findings[0].title).toBe('업무와 근무장소를 회사 필요에 따라 바꿀 수 있어요')
  })

  it('확인 조항을 누르면 영상과 같은 조항 상세가 나온다', async () => {
    const result = await analyses.getAnalysis(1)
    const clause = await analyses.getClause(1, result.findings[0].clauseId)
    expect(clause).toMatchObject({ analysisId: 1, clauseId: 8946, documentTitle: '근로계약서(안)' })
  })

  it('일정 후보는 영상 계약서의 입사일과 연봉계약 종료일이다', async () => {
    const { getScheduleCandidates } = await import('./schedules')
    const set = await getScheduleCandidates(1)
    expect(set.candidates.map(candidate => [candidate.title, candidate.date])).toEqual([['입사일', '2026.10.05'], ['연봉계약 종료일', '2027.03.31']])
  })

  it('내 계약서 목록·상세도 같은 계약서이고, 연결 일정도 같은 날짜다', async () => {
    const { getMyContract, getMyContracts } = await import('./contracts')
    const [list, detail] = await Promise.all([getMyContracts(), getMyContract(1)])
    expect(list.find(contract => contract.contractId === 1)).toMatchObject({ title: '근로계약서(안)', needsCheckCount: 7, missingItemCount: 0 })
    expect(detail.title).toBe('근로계약서(안)')
    expect(detail.schedules.map(schedule => schedule.title)).toEqual(['입사일', '연봉계약 종료일'])
  })

  it('내 일정에는 예전 카페 알바 일정이 남지 않는다', async () => {
    const { getSchedules } = await import('./schedules')
    const titles = (await getSchedules()).filter(schedule => schedule.contractId === 1).map(schedule => `${schedule.title}·${schedule.contractTitle}`)
    expect(titles).toEqual(['연봉계약 종료일·근로계약서(안)', '입사일·근로계약서(안)'])
  })

  it('분석 완료 알림도 같은 계약서와 확인 필요 수를 보여 준다', async () => {
    const { getNotifications } = await import('./notifications')
    expect((await getNotifications()).find(notice => notice.kind === 'ANALYSIS_DONE')?.text).toBe('근로계약서(안) · 확인 필요 7')
  })

  it('영상 속 챗봇 질문에는 영상과 같은 답을 하고, 근거 조항 버튼은 앱의 분석 1번으로 간다', async () => {
    const { askChatQuestion } = await import('./chats')
    const answer = await askChatQuestion({ question: '약정근로가 뭐야?', screen: 'S09', contractId: 1, analysisId: 1, clauseId: 8956 })
    expect(answer.answer).toContain('**약정연장 근로수당 230,000원**')
    expect(answer.actions.map(action => action.to)).toEqual(['/analyses/1/clauses/8948', '/analyses/1/clauses/8956'])
  })

  it('S08 추천 질문은 이 계약서의 분석 결과로만 답한다', async () => {
    const { askChatQuestion } = await import('./chats')
    const answer = await askChatQuestion({ question: '이 계약에서 먼저 확인할 내용은 뭐야?', screen: 'S08', contractId: 1, analysisId: 1 })
    expect(answer.answer).toContain('업무와 근무장소를 회사 필요에 따라 바꿀 수 있어요')
    expect(answer.answer).not.toMatch(/카페|10,000원/)
  })
})

describe('홈 예시 계약서 = 같은 영상 데이터', () => {
  it('예시는 예시 번호로 같은 분석을 보여 주고 조항도 열린다', async () => {
    const sample = await analyses.getSampleAnalysis('EMPLOYMENT')
    expect(sample).toMatchObject({ analysisId: 900001, documentTitle: '근로계약서(안)', isSample: true })
    const clause = await analyses.getClause(sample.analysisId, sample.findings[0].clauseId)
    expect(clause.clauseId).toBe(8946)
  })

  it('예시에는 다른 계약서 날짜를 일정 후보로 지어내지 않는다', async () => {
    const { getScheduleCandidates } = await import('./schedules')
    expect((await getScheduleCandidates(900001)).candidates).toEqual([])
  })
})
