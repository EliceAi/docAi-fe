import { beforeEach, describe, expect, it, vi } from 'vitest'

let api: typeof import('./comparisons')
beforeEach(async () => { vi.resetModules(); api = await import('./comparisons') })

describe('S11 비교 준비', () => {
  it('S08에서 넘긴 이전 v1과 현재 v2를 정확한 ID로 조회한다', async () => {
    const [before, after] = await api.getComparisonDocuments(4, 2)
    expect(before).toMatchObject({ contractId: 4, version: 1, pageCount: 2, analyzedAt: '11.05' })
    expect(after).toMatchObject({ contractId: 2, version: 2, pageCount: 3, uploaded: true })
  })

  it('문서 순서에 따라 쪽 수와 추가·이전본 내용 안내가 달라진다', async () => {
    expect(await api.previewComparison(4, 2)).toMatchObject({ comparability: 'PARTIAL', reason: expect.stringContaining('"추가된 내용"') })
    expect(await api.previewComparison(2, 4)).toMatchObject({ comparability: 'PARTIAL', reason: expect.stringContaining('"이전본에만 있는 내용"') })
    expect((await api.previewComparison(2, 4)).reason).toContain('이전본은 3쪽, 수정본은 2쪽')
  })

  it('종류가 다르거나 원문 정보가 없는 문서는 비교를 만들지 않는다', async () => {
    expect((await api.previewComparison(4, 1)).comparability).toBe('NONE')
    expect((await api.previewComparison(4, 3)).comparability).toBe('NONE')
    await expect(api.createComparison(4, 1)).rejects.toThrow()
    await expect(api.createComparison(4, 3)).rejects.toThrow()
  })

  it('결과에 비교 요청의 ID·순서를 유지하고 동일 요청은 중복 생성하지 않는다', async () => {
    const first = await api.createComparison(4, 2)
    expect(await api.createComparison(4, 2)).toEqual(first)
    expect(await api.getComparison(first.comparisonId)).toMatchObject({ previousContractId: 4, currentContractId: 2 })
    const reversed = await api.createComparison(2, 4)
    expect(reversed.comparisonId).not.toBe(first.comparisonId)
    expect(await api.getComparison(reversed.comparisonId)).toMatchObject({ previousContractId: 2, currentContractId: 4 })
  })

  it('같은 문서·잘못된 ID·없는 문서를 거절한다', async () => {
    for (const [before, after] of [[4, 4], [0, 2], [-1, 2], [1.5, 2], [NaN, 2], [999, 2]]) {
      await expect(api.getComparisonDocuments(before, after)).rejects.toThrow()
      await expect(api.previewComparison(before, after)).rejects.toThrow()
      await expect(api.createComparison(before, after)).rejects.toThrow()
    }
  })

  it('나머지 21종은 실제 연결이 켜져도 비교 API를 실제로 호출하지 않는다', async () => {
    const mode = await import('./mock-mode')
    const request = await import('./request')
    const { mockGeneralAnalyses } = await import('./mocks/analyses')
    const ready = vi.spyOn(mode, 'shouldMock').mockReturnValue(false)
    const network = vi.spyOn(request, 'request').mockRejectedValue(new Error('실제 API 호출 금지'))
    try {
      expect(mockGeneralAnalyses).toHaveLength(21)
      for (const [index, analysis] of mockGeneralAnalyses.entries()) {
        const other = mockGeneralAnalyses[(index + 1) % 21]
        expect((await api.getComparisonDocuments(analysis.contractId, other.contractId))[0].documentTypeCode).toBe(analysis.documentTypeCode)
        expect((await api.previewComparison(analysis.contractId, 4)).comparability).toBe('NONE')
        await expect(api.createComparison(analysis.contractId, 4)).rejects.toThrow()
        const current = analysis.contractId + 1000
        expect((await api.getComparisonDocuments(analysis.contractId, current))[1]).toMatchObject({
          documentTypeCode: analysis.documentTypeCode, version: 2, pageCount: 1,
        })
        expect((await api.previewComparison(analysis.contractId, current)).comparability).toBe('FULL')
        const result = await api.createComparison(analysis.contractId, current)
        expect(await api.getComparison(result.comparisonId)).toMatchObject({
          previousContractId: analysis.contractId, currentContractId: current,
        })
      }
      expect(network).not.toHaveBeenCalled()
    } finally { ready.mockRestore(); network.mockRestore() }
  })

  it('23종 모두 같은 종류의 이전본·수정본을 mock으로 비교할 수 있다', async () => {
    const { mockDocumentTypes } = await import('./mocks/documentTypes')
    const { mockComparisonDocuments } = await import('./mocks/comparisons')
    expect(mockDocumentTypes).toHaveLength(23)
    for (const type of mockDocumentTypes) {
      const documents = mockComparisonDocuments.filter(document => document.documentTypeCode === type.code)
      const previous = documents.find(document => document.version === 1 && document.pageCount)!
      const current = documents.find(document => document.version === 2 && document.pageCount)!
      expect(previous, type.code).toBeDefined()
      expect(current, type.code).toBeDefined()
      expect((await api.previewComparison(previous.contractId, current.contractId)).comparability).not.toBe('NONE')
      const result = await api.createComparison(previous.contractId, current.contractId)
      expect(await api.getComparison(result.comparisonId)).toMatchObject({
        previousContractId: previous.contractId, currentContractId: current.contractId,
      })
    }
  })
})
