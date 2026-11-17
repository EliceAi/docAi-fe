import type { Schedule, ScheduleCandidate, ScheduleChange } from '../schedules'

export const mockSchedules: Schedule[] = [
  { scheduleId: 1, title: '입주·전입신고', date: '2026.11.24', contractId: 2, contractTitle: '역삼동 원룸 월세 계약서 · 예시', daysLeft: 8 },
  { scheduleId: 2, title: '첫 출근 (계약 시작일)', date: '2026.12.05', contractId: 1, contractTitle: '카페 알바 근로계약서 · 예시', daysLeft: 19 },
]

export const mockScheduleCandidates: ScheduleCandidate[] = [
  { candidateId: 1, title: '계약 시작일', date: '2026.12.05', source: 'written', where: '1쪽 제2조' },
  { candidateId: 2, title: '임금 지급일', date: '2026.12.10', source: 'written', where: '1쪽 제5조' },
]

export const mockScheduleChanges: ScheduleChange[] = [
  { scheduleId: 3, title: '계약 종료일', beforeDate: '2027.02.28', afterDate: '2027.08.31' },
]
