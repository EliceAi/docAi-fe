import { beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

const confirmHarness = vi.hoisted(() => ({
  next: undefined as undefined | (() => Promise<void>),
  flow: null as null | { pages: { id: string; file: File; masks: { x: number; y: number; width: number; height: number }[] }[];
    documentTypeCode: string; pageRecapture: { comparisonId: number; pageNo: number; analysisId?: number } | null; getIdempotencyKey: () => string },
  navigate: vi.fn(),
}))

vi.mock('react-router-dom', async importOriginal => ({
  ...await importOriginal<typeof import('react-router-dom')>(), useNavigate: () => confirmHarness.navigate,
}))
vi.mock('../../common/layout/AppPanels', async importOriginal => ({
  ...await importOriginal<typeof import('../../common/layout/AppPanels')>(),
  useAppPanels: () => ({ chat: null, openChat: () => {}, closeChat: () => {} }),
}))
vi.mock('../contract-register/RegisterFlowContext', async importOriginal => {
  const actual = await importOriginal<typeof import('../contract-register/RegisterFlowContext')>()
  return { ...actual, useRegisterFlow: () => confirmHarness.flow ?? actual.useRegisterFlow() }
})
vi.mock('../contract-register/registerContract', async importOriginal => ({
  ...await importOriginal<typeof import('../contract-register/registerContract')>(), registerContract: vi.fn(async () => 88),
}))
vi.mock('../contract-register/masking', async importOriginal => ({
  ...await importOriginal<typeof import('../contract-register/masking')>(), createMaskedImage: vi.fn(async () => new Blob(['masked-page'], { type: 'image/png' })),
}))
vi.mock('../../common/components', async importOriginal => ({
  ...await importOriginal<typeof import('../../common/components')>(),
  StepFooter: (props: { onNext?: () => Promise<void> }) => { confirmHarness.next = props.onNext; return null },
}))

let api: typeof import('../../api/comparisons')
beforeEach(async () => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.clearAllMocks()
  vi.resetModules()
  confirmHarness.flow = null
  confirmHarness.next = undefined
  confirmHarness.navigate.mockReset()
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
    expect(await api.confirmComparison(1, [], 'test-key')).toMatchObject({ contractId: 2, version: 2, previousVersion: 1 })
    expect(await getMyContract(2)).toMatchObject({ version: 2, previousVersion: { contractId: 4, version: 1 } })
    expect(await getMyContract(4)).toEqual(beforeContract)
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
      expect(await api.confirmComparison(original.comparisonId, [], 'test-key')).toMatchObject({ contractId: original.currentContractId, version: 2 })
      await api.discardComparison(original.comparisonId)
    }
    expect(network).not.toHaveBeenCalled()
  })

  it('잘못된 ID와 존재하지 않는 결과를 거절한다', async () => {
    for (const id of [0, -1, 1.5, NaN, 999]) {
      await expect(api.getComparison(id)).rejects.toThrow()
      await expect(api.confirmComparison(id, [], 'test-key')).rejects.toThrow()
      await expect(api.discardComparison(id)).rejects.toThrow()
      await expect(api.submitComparisonInputs(id, [{ label: field, value: '내용' }])).rejects.toThrow()
    }
  })

  it('S11에서 만든 결과가 S12의 입력·새로고침·확정까지 같은 ID와 문서를 유지한다', async () => {
    const saved = new Map<string, string>()
    vi.stubGlobal('window', { sessionStorage: {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
      removeItem: (key: string) => saved.delete(key),
    } })
    const created = await api.createComparison(4, 2)
    expect(await api.getComparison(created.comparisonId)).toMatchObject({ documentTitle: '역삼동 원룸 월세 계약서',
      previousContractId: 4, currentContractId: 2, unreadLabels: [field] })
    await api.submitComparisonInputs(created.comparisonId, [{ label: field, value: '수도 요금 포함' }])
    vi.resetModules()
    api = await import('../../api/comparisons')
    expect(await api.createComparison(4, 2)).toEqual(created)
    expect((await api.getComparison(created.comparisonId)).changes.at(-1)?.after).toBe('"수도 요금 포함"')
    expect(await api.confirmComparison(created.comparisonId, [], 'test-key')).toMatchObject({ contractId: 2, version: 2 })
    await api.discardComparison(created.comparisonId)
    await expect(api.getComparison(created.comparisonId)).rejects.toThrow()
    expect((await api.createComparison(4, 2)).comparisonId).not.toBe(created.comparisonId)
  })

  it('S11에서 순서를 바꾸면 S12 값·버전·읽지 못한 쪽의 대상도 바뀐다', async () => {
    const created = await api.createComparison(2, 4)
    const result = await api.getComparison(created.comparisonId)
    expect(result).toMatchObject({ previousContractId: 2, currentContractId: 4, previousVersion: 2, currentVersion: 1 })
    expect(result.changes[0]).toMatchObject({ before: '월 58만 원', after: '월 55만 원' })
    expect(result.changes[2]).toMatchObject({ kind: 'removed', before: '"반려동물을 키울 수 없다."', after: null })
    expect(result.unreadFields?.[0]).toMatchObject({ side: 'previous', location: '이전본 2쪽 아래 칸' })
    const updated = await api.submitComparisonInputs(created.comparisonId, [{ label: field, value: '새로 읽은 이전본' }])
    expect(updated.changes.at(-1)).toMatchObject({ before: '"새로 읽은 이전본"', after: '"관리비에는 인터넷 요금이 포함된다."' })
    expect(await api.confirmComparison(created.comparisonId, [], 'test-key')).toMatchObject({ contractId: 4, version: 1, previousVersion: 2 })
  })

  it('23종 모두 S11 생성 결과를 S12에서 읽으며 비교 ID가 예시 ID와 충돌하지 않는다', async () => {
    const { mockComparisonResults, mockComparisonDocuments } = await import('../../api/mocks/comparisons')
    for (const template of mockComparisonResults) {
      const previous = mockComparisonDocuments.find(document => document.documentTypeCode === template.documentTypeCode && document.version === 1 && document.pageCount)!
      const current = mockComparisonDocuments.find(document => document.documentTypeCode === template.documentTypeCode && document.version === 2 && document.pageCount)!
      const created = await api.createComparison(previous.contractId, current.contractId)
      expect(mockComparisonResults.some(result => result.comparisonId === created.comparisonId)).toBe(false)
      expect(await api.getComparison(created.comparisonId)).toMatchObject({ documentTypeCode: template.documentTypeCode,
        previousContractId: previous.contractId, currentContractId: current.contractId, documentTitle: current.title })
    }
  })

  it('재촬영은 해당 쪽만 다시 읽은 출처로 반영하고 v1·일정은 바꾸지 않는다', async () => {
    const { getMyContract } = await import('../../api/contracts')
    const { getSchedules } = await import('../../api/schedules')
    const beforeContract = await getMyContract(4)
    const beforeSchedules = await getSchedules()
    const created = await api.createComparison(4, 2)
    const before = await api.getComparison(created.comparisonId)
    const updated = await api.reanalyseComparisonPage(created.comparisonId, 2, new Blob(['masked']), 1)
    expect(updated.comparisonId).toBe(created.comparisonId)
    expect(updated.changes.slice(0, 3)).toEqual(before.changes)
    expect(updated.changes.at(-1)).toMatchObject({ label: field, source: 'written', pageNo: 2 })
    expect(updated.changes.at(-1)?.source).not.toBe('typed')
    expect(updated.unreadLabels).toEqual([])
    expect(await getMyContract(4)).toEqual(beforeContract)
    expect(await getSchedules()).toEqual(beforeSchedules)
  })

  it('S06 재촬영 제출은 가린 쪽만 전달하고 원래 S12로 돌아간다', async () => {
    const created = await api.createComparison(4, 2)
    confirmHarness.flow = { pages: [{ id: 'retake', file: new File(['original-private-page'], 'retake.png', { type: 'image/png' }),
      masks: [{ x: 0, y: 0, width: 0.3, height: 0.2 }] }], documentTypeCode: 'LEASE',
      pageRecapture: { comparisonId: created.comparisonId, pageNo: 2, analysisId: 6 }, getIdempotencyKey: () => 'same-request-key' }
    const { ConfirmScreen } = await import('../contract-register/ConfirmPage')
    const { AppPanelsProvider } = await import('../../common/layout/AppPanels')
    const { registerContract } = await import('../contract-register/registerContract')
    const masking = await import('../contract-register/masking')
    const recapture = vi.spyOn(api, 'reanalyseComparisonPage')
    const markup = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(AppPanelsProvider, null, React.createElement(ConfirmScreen))))
    await confirmHarness.next!()
    expect(registerContract).not.toHaveBeenCalled()
    const passedBlob = recapture.mock.calls[0][2]
    expect(recapture).toHaveBeenCalledWith(created.comparisonId, 2, expect.any(Blob), 1)
    expect(await passedBlob.text()).toBe('masked-page')
    expect(masking.createMaskedImage).toHaveBeenCalledWith(confirmHarness.flow.pages[0].file, confirmHarness.flow.pages[0].masks)
    expect(confirmHarness.navigate).toHaveBeenCalledWith(`/comparisons/${created.comparisonId}`, { replace: true, state: { analysisId: 6 } })
    confirmHarness.flow.pageRecapture = null
    const normalMarkup = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(AppPanelsProvider, null, React.createElement(ConfirmScreen))))
    expect(normalMarkup).toBe(markup)
  })

  it('S06 일반 등록은 기존 분석 진행 경로를 유지하고 재촬영 API를 부르지 않는다', async () => {
    confirmHarness.flow = { pages: [{ id: 'normal', file: new File(['page'], 'page.png'), masks: [] }], documentTypeCode: 'EMPLOYMENT',
      pageRecapture: null, getIdempotencyKey: () => 'normal-request-key' }
    const { ConfirmScreen } = await import('../contract-register/ConfirmPage')
    const { AppPanelsProvider } = await import('../../common/layout/AppPanels')
    const { registerContract } = await import('../contract-register/registerContract')
    const recapture = vi.spyOn(api, 'reanalyseComparisonPage')
    renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(AppPanelsProvider, null, React.createElement(ConfirmScreen))))
    await confirmHarness.next!()
    expect(registerContract).toHaveBeenCalledWith(confirmHarness.flow.pages, 'EMPLOYMENT', 'normal-request-key')
    expect(recapture).not.toHaveBeenCalled()
    expect(confirmHarness.navigate).toHaveBeenCalledWith('/analyses/88/progress')
  })

  it('재촬영 가림 실패 시 원본을 보내거나 비교 화면으로 이동하지 않는다', async () => {
    confirmHarness.flow = { pages: [{ id: 'failed', file: new File(['private'], 'page.png'), masks: [] }], documentTypeCode: 'LEASE',
      pageRecapture: { comparisonId: 1, pageNo: 2 }, getIdempotencyKey: () => 'failed-request-key' }
    const { ConfirmScreen } = await import('../contract-register/ConfirmPage')
    const { AppPanelsProvider } = await import('../../common/layout/AppPanels')
    const { createMaskedImage } = await import('../contract-register/masking')
    vi.mocked(createMaskedImage).mockRejectedValueOnce(new Error('mask failed'))
    const recapture = vi.spyOn(api, 'reanalyseComparisonPage')
    renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(AppPanelsProvider, null, React.createElement(ConfirmScreen))))
    await confirmHarness.next!()
    expect(recapture).not.toHaveBeenCalled()
    expect(confirmHarness.navigate).not.toHaveBeenCalled()
  })
})
