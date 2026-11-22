import { beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => { vi.stubEnv('VITE_API_MODE', 'mock'); vi.resetModules() })

describe('최종 검토의 정보 일관성', () => {
  it('화면의 관리비 미기재를 챗봇도 확인되지 않은 정보로 답한다', async () => {
    const { answerDemoQuestion } = await import('./mocks/demoChat')
    const reply = await answerDemoQuestion({ screen: 'S08', analysisId: 9, contractId: 9, question: '아직 확인되지 않은 정보가 있어?' })
    expect(reply.answer).toContain('관리비')
    expect(reply.answer).toContain('적혀 있지 않아요')
    expect(reply.answer).not.toContain('빠진 항목은 없어요')
  })

  it('간단한 금액 질문은 현재 예시 값만 답하고 미기재 금액은 만들지 않는다', async () => {
    const { answerDemoQuestion } = await import('./mocks/demoChat')
    expect(await answerDemoQuestion({ screen: 'S08', analysisId: 9, question: '보증금은 얼마야?' }))
      .toMatchObject({ status: 'ANSWERED', answer: expect.stringContaining('30,000,000') })
    const missing = await answerDemoQuestion({ screen: 'S08', analysisId: 9, question: '관리비는 얼마야?' })
    expect(missing.answer).toContain('적혀 있지 않아요')
    expect(missing.answer).not.toMatch(/무료|0원/)
  })

  it('원문 정보 부족과 공통 확인 예시는 검토 완료 상태와 구분한다', async () => {
    const { getMyContract, getMyContracts, archiveContract } = await import('./contracts')
    expect((await getMyContract(3)).reviewState).toBe('insufficient')
    expect((await getMyContracts()).find(doc => doc.contractId === 3)?.reviewState).toBe('insufficient')
    await archiveContract(100, [], 'final-review-guide')
    expect((await getMyContracts()).find(doc => doc.contractId === 100)?.reviewState).toBe('guide')
    expect((await getMyContract(1)).reviewState).toBeUndefined()
  })
})
