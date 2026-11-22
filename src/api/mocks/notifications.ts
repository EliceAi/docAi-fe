import type { Notification } from '../notifications'

export const mockNotifications: Notification[] = [
  { notificationId: 1, kind: 'SCHEDULE', title: 'D-8 · 입주·전입신고가 다가와요', text: '역삼동 원룸 월세 계약서', to: '/schedules/7', read: false },
  { notificationId: 2, kind: 'ANALYSIS_DONE', title: '분석이 끝났어요', text: '근로계약서(안) · 확인 필요 7', to: '/analyses/1', read: false },
  { notificationId: 3, kind: 'ANALYSIS_DONE', title: '분석이 끝났어요', text: '표준임대차계약서 · 확인 필요 3', to: '/analyses/9', read: false },
]
