import { beforeEach, describe, expect, it, vi } from 'vitest'

let api: typeof import('../../api/comparisons')
beforeEach(async () => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.resetModules()
  api = await import('../../api/comparisons')
})

const field = '제5조 관리비 포함 항목'

describe('S12 비교 결과', () => {
  it('설계도의 실제 수정 금액·기간과 읽지 못한 칸을 보존한다', async () => {
    const result = await api.getComparison(1)
    expect(result).toMatchObject({ previousContractId: 4, currentContractId: 2, documentTypeCode: 'LEASE' })
    expect(result.changes).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: '월세', before: '월 55만 원', after: '월 58만 원' }),
      expect.objectContaining({ label: '계약 기간', after: '2026.12.01 ~ 2028.11.30' }),
    ]))
    expect(result.unreadLabels).toEqual([field])
    expect(result.changes.some(change => change.label === field)).toBe(false)
  })

  it('입력한 문장만 반영하고 직접 입력 출처를 유지한다', async () => {
    const result = await api.submitComparisonInputs(1, [{ label: field, value: '  관리비에는 수도 요금만 포함된다.  ' }])
    expect(result.changes.at(-1)).toMatchObject({ label: field, after: '"관리비에는 수도 요금만 포함된다."', source: 'typed', kind: 'manual' })
    expect(result.unreadLabels).toEqual([])
    expect(result.unreadFields).toEqual([])
    expect(await api.getComparison(1)).toEqual(result)
    const { mockComparison } = await import('../../api/mocks/comparisons')
    expect(mockComparison.unreadLabels).toEqual([field])
    expect(mockComparison.changes).toHaveLength(3)
  })

  it('같은 입력의 재요청은 중복 조항을 만들지 않는다', async () => {
    const inputs = [{ label: field, value: '관리비에는 수도 요금이 포함된다.' }]
    await api.submitComparisonInputs(1, inputs)
    await api.submitComparisonInputs(1, inputs)
    const result = await api.submitComparisonInputs(1, [{ label: field, value: '수도 요금은 별도다.' }])
    expect(result.changes.filter(change => change.source === 'typed')).toHaveLength(1)
    expect(result.changes.at(-1)?.after).toBe('"수도 요금은 별도다."')
  })

  it('빈 값·잘못된 칸·중복 칸은 기존 비교를 바꾸지 않는다', async () => {
    const before = await api.getComparison(1)
    for (const inputs of [[], [{ label: field, value: '  ' }], [{ label: '없는 조항', value: '내용' }],
      [{ label: field, value: '첫 값' }, { label: field, value: '둘째 값' }]]) {
      await expect(api.submitComparisonInputs(1, inputs)).rejects.toThrow()
      expect(await api.getComparison(1)).toEqual(before)
    }
  })

  it('불러온 결과를 외부에서 바꿔도 저장한 입력과 예시는 바뀌지 않는다', async () => {
    const result = await api.getComparison(1)
    result.changes[0].after = '잘못된 수정'
    result.unreadLabels.length = 0
    expect((await api.getComparison(1)).changes[0].after).toBe('월 58만 원')
    expect((await api.getComparison(1)).unreadLabels).toEqual([field])
  })

  it('확정하지 않으면 입력 초안만 지우고 기존 v1과 일정은 유지한다', async () => {
    const { getMyContract } = await import('../../api/contracts')
    const { getSchedules } = await import('../../api/schedules')
    const beforeContract = await getMyContract(4)
    const beforeSchedules = await getSchedules()
    await api.submitComparisonInputs(1, [{ label: field, value: '수도 요금 포함' }])
    await api.discardComparison(1)
    expect((await api.getComparison(1)).unreadLabels).toEqual([field])
    expect(await getMyContract(4)).toEqual(beforeContract)
    expect(await getSchedules()).toEqual(beforeSchedules)
    expect(await api.confirmComparison(1)).toEqual({ contractId: 2, version: 2 })
    expect(await getSchedules()).toEqual(beforeSchedules)
  })

  it('입력은 새로 불러와도 유지되고 손상된 저장 데이터는 무시한다', async () => {
    const saved = new Map<string, string>()
    vi.stubGlobal('window', { sessionStorage: {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
      removeItem: (key: string) => saved.delete(key),
    } })
    await api.submitComparisonInputs(1, [{ label: field, value: '수도 요금 포함' }])
    vi.resetModules()
    api = await import('../../api/comparisons')
    expect((await api.getComparison(1)).changes.at(-1)?.after).toBe('"수도 요금 포함"')
    saved.set('docai.comparison-result.1', '{broken')
    expect((await api.getComparison(1)).unreadLabels).toEqual([field])
  })

  it('23종 모두 예시가 있고 나머지 21종은 실제 연결 모드에서도 네트워크를 사용하지 않는다', async () => {
    const { mockComparisonResults } = await import('../../api/mocks/comparisons')
    const { mockDocumentTypes } = await import('../../api/mocks/documentTypes')
    const mode = await import('../../api/mock-mode')
    const request = await import('../../api/request')
    expect(new Set(mockComparisonResults.map(result => result.documentTypeCode))).toEqual(new Set(mockDocumentTypes.map(type => type.code)))
    vi.spyOn(mode, 'shouldMock').mockReturnValue(false)
    const network = vi.spyOn(request, 'request').mockRejectedValue(new Error('실제 API 호출 금지'))
    const general = mockComparisonResults.filter(result => !['EMPLOYMENT', 'LEASE'].includes(result.documentTypeCode!))
    expect(general).toHaveLength(21)
    for (const original of general) {
      expect((await api.getComparison(original.comparisonId)).documentTypeCode).toBe(original.documentTypeCode)
      expect(await api.confirmComparison(original.comparisonId)).toMatchObject({ contractId: original.currentContractId, version: 2 })
      await api.discardComparison(original.comparisonId)
    }
    expect(network).not.toHaveBeenCalled()
  })

  it('잘못된 ID와 존재하지 않는 결과를 거절한다', async () => {
    for (const id of [0, -1, 1.5, NaN, 999]) {
      await expect(api.getComparison(id)).rejects.toThrow()
      await expect(api.confirmComparison(id)).rejects.toThrow()
      await expect(api.discardComparison(id)).rejects.toThrow()
      await expect(api.submitComparisonInputs(id, [{ label: field, value: '내용' }])).rejects.toThrow()
    }
  })
})
