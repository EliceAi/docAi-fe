import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let notices: typeof import('./notifications')
let schedules: typeof import('./schedules')
beforeEach(async () => {
  vi.resetModules()
  vi.stubEnv('VITE_API_MODE', 'mock')
  notices = await import('./notifications')
  schedules = await import('./schedules')
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('P01 알림과 일정 연결', () => {
  it('D-8 알림은 같은 날짜·계약서의 D-8 상세로 연결한다', async () => {
    const notice = (await notices.getNotifications()).find(notice => notice.kind === 'SCHEDULE')!
    expect(notice).toMatchObject({ title: 'D-8 · 입주·전입신고가 다가와요', to: '/schedules/7' })
    const schedule = await schedules.getSchedule(Number(notice.to.split('/').at(-1)))
    expect(schedule).toMatchObject({ date: '2026.11.20', daysLeft: 8, contractId: 4, contractTitle: notice.text })
  })

  it('날짜를 수정하면 알림의 D-day도 같은 상태로 갱신된다', async () => {
    await schedules.updateSchedule(7, { date: '2026-12-05' })
    expect((await notices.getNotifications()).find(notice => notice.kind === 'SCHEDULE')?.title).toBe('D-23 · 입주·전입신고가 다가와요')
    expect(await notices.getUnreadNotificationCount()).toEqual({ count: 2 })
  })

  it('삭제한 일정의 알림과 개수를 제거해 없는 상세로 보내지 않는다', async () => {
    await schedules.deleteSchedule(7)
    expect((await notices.getNotifications()).map(notice => notice.kind)).toEqual(['ANALYSIS_DONE'])
    expect(await notices.getUnreadNotificationCount()).toEqual({ count: 1 })
  })
})
