import { beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => { vi.stubEnv('VITE_API_MODE', 'mock'); vi.resetModules() })

describe('임대차 영상 데이터 체험', () => {
  it('분석 9473의 18개 조항과 확인 필요 3개를 앱 분석 9번으로 조회한다', async () => {
    const { getAnalysis, getClause } = await import('./analyses')
    const analysis = await getAnalysis(9)
    expect(analysis).toMatchObject({ analysisId: 9, contractId: 9, documentTitle: '표준임대차계약서', checkCount: 3, dateCount: 4 })
    expect(analysis.clauses).toHaveLength(18)
    expect(analysis.questions).toHaveLength(5)
    for (const clause of analysis.clauses) expect(await getClause(9, clause.clauseId)).toMatchObject({ analysisId: 9, contractId: 9, clauseId: clause.clauseId })
  })

  it('영상의 금액과 과거 날짜를 계약서·일정에서 그대로 유지하고 저장도 된다', async () => {
    const contracts = await import('./contracts')
    const schedules = await import('./schedules')
    const detail = await contracts.getMyContract(9)
    expect(detail.pageCount).toBe(6)
    expect(detail.keyTerms.find(term => term.label === '보증금')?.value).toContain('30,000,000')
    expect(detail.keyTerms.find(term => term.label === '월세')?.value).toContain('680,000')
    const candidates = await schedules.getScheduleCandidates(9)
    expect(candidates.candidates.map(candidate => candidate.date)).toEqual(['2022.02.12', '2023.02.12', '2022.02.12', '2023.02.12'])
    await contracts.archiveContract(9, candidates.candidates.map(candidate => ({ candidateId: candidate.candidateId, title: candidate.title, date: candidate.date!.replaceAll('.', '-'), source: 'WRITTEN' })), 'lease-video')
    expect((await contracts.getMyContract(9)).schedules).toHaveLength(4)
    expect((await schedules.getSchedules()).filter(schedule => schedule.contractId === 9)).toHaveLength(4)
  })

  it('녹화 대화가 없는 임대차는 이 계약서의 분석과 조항으로만 답한다', async () => {
    const { findMockChatAnswer } = await import('./mocks/chats')
    const summary = await findMockChatAnswer({ screen: 'S08', analysisId: 9, contractId: 9, question: '중요한 조건을 쉽게 정리해 줘.' })
    expect(summary.answer).toContain('30,000,000')
    expect(summary.answer).toContain('680,000')
    expect(summary.answer).not.toMatch(/1,000만|58만|카페/)
    const clause = await findMockChatAnswer({ screen: 'S09', analysisId: 9, contractId: 9, clauseId: 9009, question: '이 조항이 나에게 어떤 영향을 줘?' })
    expect(clause.answer).toMatch(/수선|보수/)
  })
})
