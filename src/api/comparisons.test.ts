import { beforeEach, describe, expect, it, vi } from 'vitest'

let api: typeof import('./comparisons')
// 비교 mock 흐름을 검사한다. 로컬 .env.local의 real 모드와 상관없이 mock으로 돌린다
beforeEach(async () => { vi.stubEnv('VITE_API_MODE', 'mock'); vi.resetModules(); api = await import('./comparisons') })

describe('S11 비교 준비', () => {
  it('근로계약서 수정본의 종료일도 일정과 계약서 조건에 같은 날짜로 저장한다', async () => {
    const schedules = await import('./schedules')
    const contracts = await import('./contracts')
    const { mockContractDetails } = await import('./mocks/contracts')
    // 비교 50번의 이전본은 영상 데이터와 분리된 와이어프레임 예시다.
    const previousContract = mockContractDetails.find(contract => contract.contractId === 1)!
    contracts.saveMockContract(previousContract)
    schedules.replaceMockSchedules(previousContract, previousContract.schedules)
    const v1 = await contracts.getMyContract(1)
    const changes = await schedules.getScheduleChanges(50)
    expect(changes).toMatchObject({ contractId: 1001, fromVersion: 1, toVersion: 2 })
    expect(changes.changes).toContainEqual(expect.objectContaining({ action: 'UPDATE', title: '계약 종료', beforeDate: '2027.02.28', afterDate: '2027.03.31' }))
    const payload = changes.changes.map(change => ({ action: change.action, scheduleId: change.scheduleId, candidateId: change.candidateId, title: change.title, ...(change.afterDate ? { date: change.afterDate } : {}) }))
    const saved = await api.confirmComparison(50, payload, 'employment-revised')
    const revised = await contracts.getMyContract(saved.contractId)
    expect(revised.keyTerms.find(term => term.label === '기간')?.value).toContain('2027.03.31')
    expect(revised.schedules).toContainEqual(expect.objectContaining({ title: '계약 종료', date: '2027.03.31' }))
    expect(await contracts.getMyContract(1)).toEqual(v1)
  })

  it('역순 확정도 선택한 버전으로 보관하고 이전 버전 보기에서 순환하지 않는다', async () => {
    const contracts = await import('./contracts')
    const schedules = await import('./schedules')
    const old = await contracts.getMyContract(2)
    const reversed = await api.createComparison(2, 4)
    const changes = await schedules.getScheduleChanges(reversed.comparisonId)
    const payload = changes.changes.map(change => ({ action: change.action, scheduleId: change.scheduleId, candidateId: change.candidateId, title: change.title, ...(change.afterDate ? { date: change.afterDate.replaceAll('.', '-') } : {}) }))
    const saved = await api.confirmComparison(reversed.comparisonId, payload, 'reverse-history')
    expect(saved).toMatchObject({ contractId: 4, version: 1, previousVersion: 2 })
    expect(await contracts.getMyContract(4)).toMatchObject({ version: 1, previousVersion: { contractId: 2, version: 2 } })
    const previous = await contracts.getMyContract(2)
    expect(previous.keyTerms).toEqual(old.keyTerms)
    expect(previous.schedules).toEqual(old.schedules)
    const seen = new Set<number>()
    let current = await contracts.getMyContract(4)
    while (current.previousVersion) {
      expect(seen.has(current.contractId)).toBe(false)
      seen.add(current.contractId)
      current = await contracts.getMyContract(current.previousVersion.contractId)
    }
    expect(current.version).toBe(1)
    expect((await contracts.getMyContracts()).filter(contract => contract.title === '역삼동 원룸 월세 계약서').map(contract => contract.contractId)).toEqual([4])
  })

  it('mock 전용 21종은 실제 모드에서도 일정 후보·변경·보관까지 같은 문서로 이어진다', async () => {
    const schedules = await import('./schedules')
    const contracts = await import('./contracts')
    const { mockGeneralAnalyses } = await import('./mocks/analyses')
    const mode = await import('./mock-mode')
    const request = await import('./request')
    const ready = vi.spyOn(mode, 'shouldMock').mockReturnValue(false)
    const network = vi.spyOn(request, 'request').mockRejectedValue(new Error('실제 API 호출 금지'))
    try {
      for (const analysis of mockGeneralAnalyses) {
        expect(await schedules.getScheduleCandidates(analysis.analysisId)).toMatchObject({ contractId: analysis.contractId, contractTitle: analysis.documentTitle, candidates: [] })
        const created = await api.createComparison(analysis.contractId, analysis.contractId + 1000)
        expect(await schedules.getScheduleChanges(created.comparisonId)).toMatchObject({ contractId: analysis.contractId + 1000, fromVersion: 1, toVersion: 2, changes: [] })
        const saved = await api.confirmComparison(created.comparisonId, [], `general-${analysis.contractId}`)
        expect(await contracts.getMyContract(saved.contractId)).toMatchObject({ documentTypeCode: analysis.documentTypeCode, version: 2 })
        await contracts.archiveContract(analysis.contractId, [], `archive-${analysis.contractId}`)
      }
      expect(network).not.toHaveBeenCalled()
    } finally { ready.mockRestore(); network.mockRestore() }
  })

  it('S13에서 확정한 수정본과 일정이 같은 계약서로 저장되고 v1은 유지된다', async () => {
    const contracts = await import('./contracts')
    const schedules = await import('./schedules')
    const old = await contracts.getMyContract(4)
    const changes = await schedules.getScheduleChanges(1)
    const payload = changes.changes.map(change => ({ action: change.action, scheduleId: change.scheduleId, candidateId: change.candidateId, title: change.title, ...(change.afterDate ? { date: change.afterDate.replaceAll('.', '-') } : {}) }))
    payload[0].date = '2026-12-03'
    const saved = await api.confirmComparison(1, payload, 'confirm-schedules')
    expect(saved).toMatchObject({ contractId: 2, version: 2, previousVersion: 1 })
    expect(await contracts.getMyContract(4)).toEqual(old)
    const revised = await contracts.getMyContract(saved.contractId)
    expect(revised).toMatchObject({ version: 2, previousVersion: { contractId: 4, version: 1 } })
    expect(revised.schedules).toContainEqual(expect.objectContaining({ title: '입주·전입신고', date: '2026.12.03' }))
    for (const schedule of revised.schedules) expect(await schedules.getSchedule(schedule.scheduleId)).toMatchObject({ contractId: 2, title: schedule.title, date: schedule.date })
    expect(await api.confirmComparison(1, payload, 'confirm-schedules')).toEqual(saved)
    expect((await contracts.getMyContract(2)).schedules).toHaveLength(3)
    await expect(api.confirmComparison(1, [{ ...payload[0], date: '2026-12-04' }], 'confirm-schedules')).rejects.toThrow()
  })

  it('확정 요청에 잘못된 날짜가 섞이면 일정과 계약서를 일부만 저장하지 않는다', async () => {
    const schedules = await import('./schedules')
    const before = await schedules.getSchedules()
    await expect(api.confirmComparison(1, [
      { action: 'UPDATE', scheduleId: 7, title: '입주·전입신고', date: '2026-12-03' },
      { action: 'UPDATE', scheduleId: 8, title: '계약 종료', date: '2026-02-30' },
    ], 'invalid-dates')).rejects.toThrow()
    expect(await schedules.getSchedules()).toEqual(before)
  })

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
