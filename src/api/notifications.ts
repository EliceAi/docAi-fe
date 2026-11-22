import { mockNotifications } from './mocks/notifications'
import { mockResponse, shouldMock } from './mock-mode'
import { request } from './request'
import { toNotifications } from './backendResponses'
import { getMockCurrentSchedules } from './schedules'

// 응답 상세는 API 명세에 아직 없다. 와이어프레임 P01 기준으로 정했고, 실제 연결 때 test-api로 맞춘다.

/** SCHEDULE 다가오는 일정 · ANALYSIS_DONE 분석 완료 */
export type NotificationKind = 'SCHEDULE' | 'ANALYSIS_DONE' | 'ANALYSIS_FAILED'

export type Notification = {
  notificationId: number
  kind: NotificationKind
  title: string
  text: string
  /** 누르면 갈 화면 주소 */
  to: string
  read: boolean
}

function getMockNotifications(): Notification[] {
  const schedules = getMockCurrentSchedules().filter(schedule => schedule.daysLeft >= 0)
  return mockNotifications.flatMap(notice => {
    if (notice.kind !== 'SCHEDULE') return [notice]
    const schedule = schedules[0]
    if (!schedule) return []
    const remaining = schedule.daysLeft === 0 ? 'D-day' : schedule.daysLeft > 0 ? `D-${schedule.daysLeft}` : `D+${Math.abs(schedule.daysLeft)}`
    return [{ ...notice, to: `/schedules/${schedule.scheduleId}`, title: `${remaining} · ${schedule.title}가 다가와요`, text: schedule.contractTitle }]
  })
}

/** GET /api/notifications */
export function getNotifications(): Promise<Notification[]> {
  if (shouldMock('getNotifications')) return mockResponse(getMockNotifications())
  return request<Parameters<typeof toNotifications>[0]>('/api/notifications').then(toNotifications)
}

/** GET /api/notifications/unread-count */
export function getUnreadNotificationCount(): Promise<{ count: number }> {
  if (shouldMock('getUnreadNotificationCount')) return mockResponse({ count: getMockNotifications().filter(notice => !notice.read).length })
  return request<{ unreadCount: number }>('/api/notifications/unread-count').then(({ unreadCount }) => ({ count: unreadCount }))
}
