import { beforeEach, describe, expect, it, vi } from 'vitest'

// 배포(mock)의 근로계약서 예시: 홈 "예시 계약서로 먼저 해보기"는 한재훈 님이 공유한 실제 AI 응답(분석 4037)이고,
// 등록 흐름·내 계약서·일정·알림·챗봇은 와이어프레임의 카페 알바 예시로 서로 맞춘다
let analyses: typeof import('./analyses')

beforeEach(async () => {
  vi.stubEnv('VITE_API_MODE', 'mock')
  vi.resetModules()
  analyses = await import('./analyses')
})

describe('홈 예시 계약서 (실제 AI 응답)', () => {
  it('예시는 실제 응답의 제목과 확인 조항 6개를 예시 번호로 보여 준다', async () => {
    const sample = await analyses.getSampleAnalysis('EMPLOYMENT')
    expect(sample).toMatchObject({ analysisId: 900001, documentTitle: '근로계약서(안)', isSample: true })
    expect(sample.findings).toHaveLength(6)
    expect(sample.findings[0].title).toBe('회사 사정으로 업무와 근무장소가 바뀔 수 있어요')
  })

  it('예시를 다시 열거나 새로고침해도 같은 실제 응답이다', async () => {
    expect((await analyses.getAnalysis(900001)).documentTitle).toBe('근로계약서(안)')
  })

  it('예시의 확인 조항을 누르면 실제 조항 상세(원문·쉬운 설명)를 보여 준다', async () => {
    const sample = await analyses.getSampleAnalysis('EMPLOYMENT')
    const clause = await analyses.getClause(sample.analysisId, sample.findings[0].clauseId)
    expect(clause.title).toBe('담당업무 및 업무수행장소')
    expect(clause.originalText).toContain('업무수행장소')
  })

  it('예시에는 다른 계약서의 날짜를 일정 후보로 지어내지 않는다(날짜가 ○○로 가려져 있다)', async () => {
    const { getScheduleCandidates } = await import('./schedules')
    expect((await getScheduleCandidates(900001)).candidates).toEqual([])
  })

  it('개인정보는 가린 상태(○○)로만 들어 있다', async () => {
    const text = JSON.stringify(await analyses.getSampleAnalysis('EMPLOYMENT'))
    expect(text).toContain('○○')
    expect(text).not.toMatch(/01[016789]-?\d{3,4}-?\d{4}|\d{6}-[1-4]\d{6}|@/)
  })
})

describe('등록 흐름의 근로계약서 (와이어프레임 예시)', () => {
  it('등록 후 분석 결과와 내 계약서 상세가 같은 계약서다', async () => {
    const { getMyContract } = await import('./contracts')
    const [analysis, contract] = await Promise.all([analyses.getAnalysis(1), getMyContract(1)])
    expect(analysis.documentTitle).toBe(contract.title)
  })
})
