import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let schedules: typeof import('./schedules')
let contracts: typeof import('./contracts')

beforeEach(async () => {
  // 내 PC의 .env.local(real)과 상관없이 mock 동작을 확인한다
  vi.stubEnv('VITE_API_MODE', 'mock')
  vi.resetModules()
  vi.setSystemTime(new Date('2026-11-12T12:00:00+09:00'))
  schedules = await import('./schedules')
  contracts = await import('./contracts')
})

afterEach(() => vi.useRealTimers())

describe('일정 mock 조회와 변경', () => {
  it('분석한 계약서의 종류·이름·기간으로 일정 후보를 표시하고 없는 분석은 거절한다', async () => {
    expect(await schedules.getScheduleCandidates(2)).toMatchObject({ contractId: 2, contractTitle: '역삼동 원룸 월세 계약서' })
    const lease = await schedules.getScheduleCandidates(2)
    expect(lease.candidates.map(candidate => candidate.title)).toEqual(['입주·전입신고', '임대차 변경 신고', '계약 종료'])
    expect(lease.candidates[0].date).toBe('2026.12.01')
    expect((await schedules.getScheduleCandidates(4)).candidates[0].date).toBe('2026.11.20')
    expect(await schedules.getScheduleCandidates(5)).toMatchObject({ contractId: 1, contractTitle: '카페 알바 근로계약서' })
    const { mockGeneralAnalyses } = await import('./mocks/analyses')
    for (const analysis of mockGeneralAnalyses) {
      expect(await schedules.getScheduleCandidates(analysis.analysisId)).toEqual({ analysisId: analysis.analysisId, contractId: analysis.contractId, contractTitle: analysis.documentTitle, candidates: [] })
    }
    await expect(schedules.getScheduleCandidates(99999)).rejects.toThrow()
  })

  it('비교 방향과 같은 버전·계약서·날짜로 변경 일정을 만든다', async () => {
    const comparisons = await import('./comparisons')
    const forward = await schedules.getScheduleChanges(1)
    expect(forward).toMatchObject({ contractId: 2, fromVersion: 1, toVersion: 2 })
    expect(forward.changes).toContainEqual(expect.objectContaining({ scheduleId: 7, title: '입주·전입신고', beforeDate: '2026.11.20', afterDate: '2026.12.01' }))
    expect(forward.changes).toContainEqual(expect.objectContaining({ scheduleId: 8, title: '계약 종료' }))
    const reversed = await comparisons.createComparison(2, 4)
    const reverse = await schedules.getScheduleChanges(reversed.comparisonId)
    expect(reverse).toMatchObject({ contractId: 4, fromVersion: 2, toVersion: 1 })
    expect(reverse.changes).toContainEqual(expect.objectContaining({ scheduleId: 1, title: '입주·전입신고', beforeDate: '2026.12.01', afterDate: '2026.11.20' }))
    expect(reverse.changes).toContainEqual(expect.objectContaining({ action: 'DELETE', scheduleId: 3, title: '임대차 변경 신고', afterDate: null }))
  })

  it('달력에서 고친 날짜와 계약서 원문의 날짜를 구분한다', async () => {
    await schedules.updateSchedule(1, { date: '2026-12-05' })
    expect((await schedules.getScheduleCandidates(2)).candidates[0].date).toBe('2026.12.01')
    await schedules.updateSchedule(7, { date: '2026-11-25' })
    expect((await schedules.getScheduleChanges(1)).changes).toContainEqual(expect.objectContaining({ title: '입주·전입신고', beforeDate: '2026.11.25', afterDate: '2026.12.01' }))
  })

  it('계약서에 연결된 각 일정 ID가 같은 제목·날짜·계약서의 상세로 열린다', async () => {
    for (const contractId of [1, 2, 3, 4]) {
      const contract = await contracts.getMyContract(contractId)
      for (const linked of contract.schedules) {
        const detail = await schedules.getSchedule(linked.scheduleId)
        expect(detail).toMatchObject({ contractId, title: linked.title, date: linked.date })
      }
    }
    expect(await schedules.getSchedule(7)).toMatchObject({ contractId: 4, date: '2026.11.20', daysLeft: 8, contractAnalyzedAt: '11.05' })
    expect(await schedules.getSchedule(1)).toMatchObject({ contractId: 2, date: '2026.12.01', daysLeft: 19 })
  })

  it('없는 ID나 잘못된 ID를 다른 일정으로 꾸며서 반환하지 않는다', async () => {
    for (const id of [999, 0, -1, 1.5, NaN]) {
      await expect(schedules.getSchedule(id)).rejects.toThrow()
      await expect(schedules.updateSchedule(id, { date: '2026-12-02' })).rejects.toThrow()
      await expect(schedules.deleteSchedule(id)).rejects.toThrow()
    }
  })

  it('날짜 수정은 해당 일정의 목록·상세·계약서 조회에 반영하고 다른 일정은 유지한다', async () => {
    const other = await schedules.getSchedule(1)
    await schedules.updateSchedule(7, { date: '2026-12-03' })
    expect(await schedules.getSchedule(7)).toMatchObject({ date: '2026.12.03', daysLeft: 21, source: 'typed', where: undefined })
    expect((await schedules.getSchedules()).some(item => item.scheduleId === 7)).toBe(false)
    expect((await contracts.getMyContract(4)).schedules.find(item => item.scheduleId === 7)?.date).toBe('2026.12.03')
    expect(await schedules.getSchedule(1)).toEqual(other)
    const dates = (await schedules.getSchedules()).map(item => item.date)
    expect(dates).toEqual([...dates].sort().reverse())
  })

  it('잘못된 날짜를 거절하고 윤년 날짜는 저장한다', async () => {
    const original = await schedules.getSchedule(7)
    for (const date of ['', '2026-02-29', '2026-04-31', '2026-13-01', '26-1-1']) {
      await expect(schedules.updateSchedule(7, { date })).rejects.toThrow()
    }
    expect(await schedules.getSchedule(7)).toEqual(original)
    expect(await schedules.updateSchedule(7, { date: '2028-02-29' })).toMatchObject({ date: '2028.02.29' })
  })

  it('삭제한 일정만 목록·홈·계약서 일정에서 제거하고 계약서와 원본 예시는 보존한다', async () => {
    const before = await contracts.getMyContract(2)
    await schedules.deleteSchedule(1)
    await expect(schedules.getSchedule(1)).rejects.toThrow()
    expect((await schedules.getSchedules()).some(item => item.scheduleId === 1)).toBe(false)
    expect((await schedules.getUpcomingSchedules()).some(item => item.scheduleId === 1)).toBe(false)
    const after = await contracts.getMyContract(2)
    expect(after.title).toBe(before.title)
    expect(after.schedules.length).toBe(before.schedules.length - 1)
    expect(after.scheduleIds).not.toContain(1)
    expect((await contracts.getMyContracts()).find(item => item.contractId === 2)?.scheduleCount).toBe(after.schedules.length)
    const { mockContractDetails } = await import('./mocks/contracts')
    expect(mockContractDetails.find(item => item.contractId === 2)?.scheduleIds).toContain(1)
  })

  it('응답을 수정해도 다음 조회의 예시 원본은 바뀌지 않는다', async () => {
    const result = await schedules.getSchedule(7)
    result.title = 'changed'
    expect((await schedules.getSchedule(7)).title).toBe('입주·전입신고')
  })
})
