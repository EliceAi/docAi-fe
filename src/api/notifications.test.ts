import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let notices: typeof import('./notifications')
let schedules: typeof import('./schedules')
beforeEach(async () => {
  vi.resetModules()
  vi.setSystemTime(new Date('2026-11-22T12:00:00+09:00'))
  vi.stubEnv('VITE_API_MODE', 'mock')
  notices = await import('./notifications')
  schedules = await import('./schedules')
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers() })

describe('P01 알림과 일정 연결', () => {
  it('최신 v2의 D-9 알림이 같은 일정 상세로 연결된다', async () => {
    const notice = (await notices.getNotifications()).find(notice => notice.kind === 'SCHEDULE')!
    expect(notice).toMatchObject({ title: 'D-9 · 입주·전입신고가 다가와요', to: '/schedules/1' })
    const schedule = await schedules.getSchedule(Number(notice.to.split('/').at(-1)))
    expect(schedule).toMatchObject({ date: '2026.12.01', daysLeft: 9, contractId: 2, contractTitle: notice.text })
  })

  it('날짜를 수정하면 알림의 D-day도 같은 상태로 갱신된다', async () => {
    await schedules.updateSchedule(1, { date: '2026-12-05' })
    expect((await notices.getNotifications()).find(notice => notice.kind === 'SCHEDULE')?.title).toBe('D-13 · 입주·전입신고가 다가와요')
    expect(await notices.getUnreadNotificationCount()).toEqual({ count: 3 })
  })

  it('삭제한 일정의 알림과 개수를 제거해 없는 상세로 보내지 않는다', async () => {
    for (const schedule of await schedules.getSchedules()) {
      if (schedule.daysLeft >= 0) await schedules.deleteSchedule(schedule.scheduleId)
    }
    expect((await notices.getNotifications()).map(notice => notice.kind)).toEqual(['ANALYSIS_DONE', 'ANALYSIS_DONE'])
    expect(await notices.getUnreadNotificationCount()).toEqual({ count: 2 })
  })
})
