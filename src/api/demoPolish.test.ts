import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildNewSchedules, conflictGroups } from '../pages/schedule/scheduleRegister'

beforeEach(() => {
  vi.stubEnv('VITE_API_MODE', 'mock')
  vi.resetModules()
  vi.setSystemTime(new Date('2026-11-22T12:00:00+09:00'))
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs() })

describe('배포 시연 일정', () => {
  it('홈과 목록은 최신 v2 일정만 보여 주고 이전 v1 상세 기록은 보존한다', async () => {
    const api = await import('./schedules')
    const upcoming = await api.getUpcomingSchedules()
    expect(upcoming.filter(item => item.title === '입주·전입신고')).toHaveLength(1)
    expect(upcoming[0]).toMatchObject({ contractId: 2, date: '2026.12.01', daysLeft: 9 })
    const list = await api.getSchedules()
    expect(list.some(item => item.contractId === 4)).toBe(false)
    expect(list.map(item => item.date)).toEqual(list.map(item => item.date).sort().reverse())
    expect(await api.getSchedule(7)).toMatchObject({ contractId: 4, date: '2026.11.20', daysLeft: -2 })
  })

  it('새 수정본을 확정하면 홈과 목록도 바뀐 최신 계약서만 따른다', async () => {
    const api = await import('./schedules')
    const contracts = await import('./contracts')
    const previous = await contracts.getMyContract(2)
    const revised = { ...previous, contractId: 2002, version: 3, previousVersion: { contractId: 2, version: 2, savedAt: previous.savedAt } }
    api.replaceMockSchedules(revised, [{ title: '입주·전입신고', date: '2026-12-03', source: 'written' }])
    contracts.saveMockContract(revised)
    expect((await api.getSchedules()).some(item => [2, 4].includes(item.contractId))).toBe(false)
    expect((await api.getUpcomingSchedules())[0]).toMatchObject({ contractId: 2002, date: '2026.12.03' })
    expect((await contracts.getMyContract(2)).schedules.length).toBeGreaterThan(0)
  })

  it('임대차 입주 시작일과 종료일은 각각 선택하며 원본 날짜를 유지한다', async () => {
    const { getScheduleCandidates } = await import('./schedules')
    const { candidates } = await getScheduleCandidates(9)
    expect(conflictGroups(candidates)).toEqual([])
    const selected = buildNewSchedules(candidates, { checkedIds: candidates.map(item => item.candidateId), chosenIdByTitle: {}, typedDates: {}, extras: [] })
    expect(selected).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: '입주 시작일', date: '2022-02-12' }),
      expect.objectContaining({ title: '입주 종료일', date: '2023-02-12' }),
    ]))
  })
})
