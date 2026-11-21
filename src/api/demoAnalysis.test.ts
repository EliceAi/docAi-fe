import { beforeEach, describe, expect, it, vi } from 'vitest'

// #48: 배포(mock)에서 보이는 근로계약서 분석은 한재훈 님이 공유한 실제 AI 응답(분석 4037)이다
let analyses: typeof import('./analyses')

beforeEach(async () => {
  vi.stubEnv('VITE_API_MODE', 'mock')
  vi.resetModules()
  analyses = await import('./analyses')
})

describe('배포용 근로계약서 분석 (실제 AI 응답)', () => {
  it('등록한 계약서의 분석 결과는 실제 응답의 제목과 확인 조항 6개를 보여 준다', async () => {
    const result = await analyses.getAnalysis(1)
    expect(result.documentTitle).toBe('근로계약서(안)')
    expect(result.findings).toHaveLength(6)
    expect(result.findings[0].title).toBe('회사 사정으로 업무와 근무장소가 바뀔 수 있어요')
  })

  it('홈의 예시 계약서도 같은 실제 응답이다', async () => {
    const sample = await analyses.getSampleAnalysis('EMPLOYMENT')
    expect(sample.documentTitle).toBe('근로계약서(안)')
  })

  it('확인 조항을 누르면 실제 조항 상세(원문·쉬운 설명)를 보여 준다', async () => {
    const result = await analyses.getAnalysis(1)
    const clause = await analyses.getClause(1, result.findings[0].clauseId)
    expect(clause.title).toBe('담당업무 및 업무수행장소')
    expect(clause.originalText).toContain('업무수행장소')
  })

  it('개인정보는 가린 상태(○○)로만 들어 있다', async () => {
    const text = JSON.stringify(await analyses.getAnalysis(1))
    expect(text).toContain('○○')
    expect(text).not.toMatch(/01[016789]-?\d{3,4}-?\d{4}|\d{6}-[1-4]\d{6}|@/)
  })
})
