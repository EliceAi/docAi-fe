import { describe, expect, it, vi } from 'vitest'
import { pagesSignature, registerContract } from './registerContract'
import type { RegisteredPage } from './RegisterFlowContext'

const region = { x: 0.1, y: 0.2, width: 0.3, height: 0.1 }
const page = (id: string, masks = [region]): RegisteredPage => ({ id, file: new File(['x'], `${id}.png`, { lastModified: 1 }), masks })

function fakeDeps() {
  return {
    createMaskedImage: vi.fn(async (file: File) => new Blob([file.name])),
    createContract: vi.fn(async (_input: unknown, _key: string) => ({ contractId: 7, documentTypeCode: 'EMPLOYMENT', pageCount: 2, status: 'REGISTERED' })),
    requestAnalysis: vi.fn(async () => ({ analysisId: 31, status: 'IN_PROGRESS' as const })),
  }
}

describe('registerContract', () => {
  it('쪽마다 가린 이미지를 만들어 계약서를 만들고 분석을 요청한다', async () => {
    const deps = fakeDeps()
    const analysisId = await registerContract([page('a', [region, region]), page('b', [])], 'EMPLOYMENT', 'key-1', deps)
    expect(analysisId).toBe(31)
    expect(deps.createContract).toHaveBeenCalledWith(
      { documentTypeCode: 'EMPLOYMENT', pages: [expect.any(Blob), expect.any(Blob)], maskedCounts: [2, 0] }, 'key-1')
    expect(deps.requestAnalysis).toHaveBeenCalledWith(7)
  })
  it('가린 이미지를 만들지 못하면 원본으로 대신 보내지 않고 멈춘다', async () => {
    const deps = fakeDeps()
    deps.createMaskedImage.mockRejectedValueOnce(new Error('canvas'))
    await expect(registerContract([page('a')], 'EMPLOYMENT', 'key-1', deps)).rejects.toThrow('canvas')
    expect(deps.createContract).not.toHaveBeenCalled()
  })
  it('분석 요청만 실패하면 다시 시도할 때 같은 키로 계약서를 요청한다', async () => {
    const deps = fakeDeps()
    deps.requestAnalysis.mockRejectedValueOnce(new Error('network'))
    await expect(registerContract([page('a')], 'EMPLOYMENT', 'key-1', deps)).rejects.toThrow('network')
    await registerContract([page('a')], 'EMPLOYMENT', 'key-1', deps)
    expect(deps.createContract.mock.calls.map(call => call[1])).toEqual(['key-1', 'key-1'])
  })
})

describe('pagesSignature', () => {
  it('같은 쪽·가림이면 같고, 가림이나 사진이 바뀌면 달라진다', () => {
    const base = pagesSignature([page('a'), page('b', [])])
    expect(pagesSignature([page('a'), page('b', [])])).toBe(base)
    expect(pagesSignature([page('a', []), page('b', [])])).not.toBe(base)
    expect(pagesSignature([page('b', []), page('a')])).not.toBe(base)
    expect(pagesSignature([{ ...page('a'), file: new File(['y'], 'a.png', { lastModified: 2 }) }, page('b', [])])).not.toBe(base)
  })
})
