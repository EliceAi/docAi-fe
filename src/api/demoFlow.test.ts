import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SUGGESTED_QUESTIONS } from '../pages/chat/chatRules'

beforeEach(() => {
  vi.stubEnv('VITE_API_MODE', 'mock')
  vi.resetModules()
})

describe('예시 데이터 전체 체험', () => {
  it('모든 화면의 추천 질문에 답하고 등록으로 보내는 버튼을 만들지 않는다', async () => {
    const { answerDemoQuestion } = await import('./mocks/demoChat')
    const { getAnalysis, getClause } = await import('./analyses')
    const { getMyContract } = await import('./contracts')
    for (const contractId of [1, 2, 9]) {
      const analysis = await getAnalysis(contractId)
      for (const [screen, questions] of Object.entries(SUGGESTED_QUESTIONS)) {
        for (const question of questions) {
          const answer = await answerDemoQuestion({ question, screen, contractId, analysisId: contractId, clauseId: analysis.findings[0].clauseId, comparisonId: 1 })
          expect(answer.status, `${screen}: ${question}`).toBe('ANSWERED')
          expect(answer.answer.length).toBeGreaterThan(15)
          for (const action of answer.actions) {
            expect(action.to).not.toMatch(/^\/contracts\/new/)
            const clause = action.to.match(/^\/analyses\/(\d+)\/clauses\/(\d+)/)
            const result = action.to.match(/^\/analyses\/(\d+)$/)
            const contract = action.to.match(/^\/contracts\/(\d+)$/)
            if (clause) await expect(getClause(Number(clause[1]), Number(clause[2]))).resolves.toBeDefined()
            else if (result) await expect(getAnalysis(Number(result[1]))).resolves.toBeDefined()
            else if (contract) await expect(getMyContract(Number(contract[1]))).resolves.toBeDefined()
          }
        }
      }
    }
  })

  it('일정을 수정하거나 삭제한 뒤 챗봇도 현재 예시 일정을 안내한다', async () => {
    const { answerDemoQuestion } = await import('./mocks/demoChat')
    const schedules = await import('./schedules')
    const selected = (await schedules.getSchedules()).find(schedule => schedule.contractId === 1)!
    await schedules.updateSchedule(selected.scheduleId, { title: '입사일 확인', date: '2026-12-10' })
    const changed = await answerDemoQuestion({ question: '일정과 연결된 계약서를 보고 싶어.', screen: 'S14', contractId: 1 })
    expect(changed.answer).toContain('입사일 확인')
    expect(changed.answer).toContain('2026.12.10')
    await schedules.deleteSchedule(selected.scheduleId)
    const deleted = await answerDemoQuestion({ question: '일정과 연결된 계약서를 보고 싶어.', screen: 'S14', contractId: 1 })
    expect(deleted.answer).not.toContain('입사일 확인')
  })

  it('지원하지 않는 자유 질문은 한계를 밝히고 현재 화면의 추천 질문을 제공한다', async () => {
    const { answerDemoQuestion } = await import('./mocks/demoChat')
    const result = await answerDemoQuestion({ question: '아무 말이나', screen: 'S08', analysisId: 1 })
    expect(result.status).toBe('NOT_ENOUGH')
    expect(result.answer).toContain('시연')
    expect(result.followUps).toEqual(SUGGESTED_QUESTIONS.S08)
  })
})
