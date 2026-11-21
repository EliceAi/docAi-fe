import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.fn()
vi.mock('./request', () => ({ request, jsonBody: (method: string, body: unknown) => ({ method, body }) }))

let contracts: typeof import('./contracts')
let analyses: typeof import('./analyses')

beforeEach(async () => {
  request.mockReset()
  vi.stubEnv('VITE_API_MODE', 'real')
  vi.resetModules()
  contracts = await import('./contracts')
  analyses = await import('./analyses')
})

const input = (documentTypeCode: string) => ({ documentTypeCode, pages: [new Blob(['a'])], maskedCounts: [1] })

describe('createContract (real 모드)', () => {
  it('근로·임대차 계약서는 백엔드에 같은 Idempotency-Key로 등록한다', async () => {
    request.mockResolvedValue({ contractId: 7, documentTypeCode: 'EMPLOYMENT', pageCount: 1, status: 'DRAFT' })
    await expect(contracts.createContract(input('EMPLOYMENT'), 'key-1')).resolves.toMatchObject({ contractId: 7 })
    expect(request).toHaveBeenCalledWith('/api/contracts', expect.objectContaining({ method: 'POST', headers: { 'Idempotency-Key': 'key-1' } }))
  })
  it('백엔드가 구현하지 않은 문서 종류는 백엔드에 보내지 않고 mock 계약서를 만든다', async () => {
    const created = await contracts.createContract(input('REGISTRY'), 'key-1')
    expect(request).not.toHaveBeenCalled()
    expect(created).toMatchObject({ documentTypeCode: 'REGISTRY', pageCount: 1 })
    // 이 계약서로 분석을 요청해도 백엔드로 가지 않고 mock 분석이 나온다
    await expect(analyses.requestAnalysis(created.contractId)).resolves.toMatchObject({ status: 'COMPLETED' })
    expect(request).not.toHaveBeenCalled()
  })
})

describe('requestAnalysis (real 모드)', () => {
  it('백엔드의 ANALYZING을 프론트의 IN_PROGRESS로 바꾸고 분석 번호와 상태만 돌려준다', async () => {
    request.mockResolvedValue({ analysisId: 5, contractId: 2, status: 'ANALYZING', progressStep: 'READING_TEXT', readProgress: { done: 0, total: 1 } })
    await expect(analyses.requestAnalysis(2)).resolves.toEqual({ analysisId: 5, status: 'IN_PROGRESS' })
    expect(request).toHaveBeenCalledWith('/api/contracts/2/analyses', { method: 'POST' })
  })
})
