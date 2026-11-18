import { beforeEach, describe, expect, it, vi } from 'vitest'

let schedules: typeof import('./schedules')
let contracts: typeof import('./contracts')

beforeEach(async () => {
  // 내 PC의 .env.local(real)과 상관없이 mock 동작을 확인한다
  vi.stubEnv('VITE_API_MODE', 'mock')
  vi.resetModules()
  schedules = await import('./schedules')
  contracts = await import('./contracts')
})

describe('일정 mock 조회와 변경', () => {
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
    expect((await schedules.getSchedules()).find(item => item.scheduleId === 7)?.date).toBe('2026.12.03')
    expect((await contracts.getMyContract(4)).schedules.find(item => item.scheduleId === 7)?.date).toBe('2026.12.03')
    expect(await schedules.getSchedule(1)).toEqual(other)
    const dates = (await schedules.getSchedules()).map(item => item.date)
    expect(dates).toEqual([...dates].sort())
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
