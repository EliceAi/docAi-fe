import { beforeEach, describe, expect, it, vi } from 'vitest'

let analyses: typeof import('./analyses')
let mockFailedAnalysisId: number

beforeEach(async () => {
  vi.stubEnv('VITE_API_MODE', 'mock')
  vi.resetModules()
  analyses = await import('./analyses')
  mockFailedAnalysisId = (await import('./mocks/analyses')).mockFailedAnalysisId
})

describe('getAnalysisProgress (mock)', () => {
  it('확인할 때마다 한 단계씩 진행되고 네 단계를 끝내면 완료된다', async () => {
    const steps = []
    for (let poll = 0; poll < 5; poll++) steps.push(await analyses.getAnalysisProgress(50))
    expect(steps.map(progress => progress.completedSteps)).toEqual([0, 1, 2, 3, 4])
    expect(steps.map(progress => progress.status)).toEqual(['IN_PROGRESS', 'IN_PROGRESS', 'IN_PROGRESS', 'IN_PROGRESS', 'COMPLETED'])
  })
  it('분석마다 따로 진행되고, 완료된 분석은 다시 열어도 완료로 돌려준다', async () => {
    await analyses.getAnalysisProgress(50)
    expect((await analyses.getAnalysisProgress(51)).completedSteps).toBe(0)
    for (let poll = 0; poll < 6; poll++) await analyses.getAnalysisProgress(52)
    expect((await analyses.getAnalysisProgress(52)).status).toBe('COMPLETED')
  })
  it('번호를 모르는 분석도 분석 중 화면을 그릴 수 있게 기본 정보를 채운다', async () => {
    expect(await analyses.getAnalysisProgress(3)).toMatchObject({ status: 'IN_PROGRESS', documentTypeName: '근로계약서', pageCount: 2 })
  })
  it('실패한 분석은 이유 3가지(흐림·종류 불일치·일시 오류)를 돌려준다', async () => {
    const failed = await analyses.getAnalysisProgress(mockFailedAnalysisId)
    expect(failed.status).toBe('FAILED')
    expect(failed.failures?.map(reason => reason.kind)).toEqual(['BLURRY', 'TYPE_MISMATCH', 'TEMPORARY'])
  })
})
