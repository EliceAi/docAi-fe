import type { Schedule, ScheduleCandidate, ScheduleChange } from '../schedules'
import { mockContractDetails } from './contracts'

// S14의 오늘 표시와 D-day는 설계도의 시연 기준일을 사용한다.
export const mockScheduleToday = '2026-11-12'

export const mockStoredSchedules: Schedule[] = mockContractDetails.flatMap(contract =>
  contract.schedules.map(schedule => ({
    ...schedule,
    contractId: contract.contractId,
    contractTitle: contract.title,
    documentTypeCode: contract.documentTypeCode,
    contractAnalyzedAt: contract.savedAt.slice(5).replace('-', '.'),
    where: schedule.title === '입주·전입신고' ? '계약 시작일 · 1쪽 제2조' : undefined,
    daysLeft: Math.round((Date.parse(schedule.date.replaceAll('.', '-') + 'T00:00:00Z') - Date.parse(mockScheduleToday + 'T00:00:00Z')) / 86400000),
  })),
)

// 설계도에만 있는 두 일정도 고유 ID를 부여해 다른 계약서의 일정과 섞이지 않게 한다.
export const mockAdditionalSchedules: Schedule[] = [
  { scheduleId: 9, title: '임대차 신고 기한', date: '2026.12.05', contractId: 4, contractTitle: '역삼동 원룸 월세 계약서', documentTypeCode: 'LEASE', contractAnalyzedAt: '11.05', daysLeft: 23, source: 'review', color: 'amb' },
  { scheduleId: 10, title: '최저임금 변경', date: '2027.01.01', contractId: 1, contractTitle: '카페 알바 근로계약서', documentTypeCode: 'EMPLOYMENT', contractAnalyzedAt: '11.12', daysLeft: 50, source: 'review', note: '시급 다시 확인' },
]

// S14 목록·달력·상세 보드는 같은 예시를 공유한다. 11.20 입주는 이전 v1 계약서에 연결된다.
export const mockSchedules: Schedule[] = [7, 2, 9, 10, 5].map(id =>
  [...mockStoredSchedules, ...mockAdditionalSchedules].find(schedule => schedule.scheduleId === id)!,
)

export const mockEmptySchedules: Schedule[] = []

export const mockScheduleCandidates: ScheduleCandidate[] = [
  { candidateId: 1, title: '계약 시작일', date: '2026.12.05', source: 'written', where: '1쪽 제2조' },
  { candidateId: 2, title: '임금 지급일', date: '2026.12.10', source: 'written', where: '1쪽 제5조' },
]

export const mockScheduleChanges: ScheduleChange[] = [
  { scheduleId: 3, title: '계약 종료일', beforeDate: '2027.02.28', afterDate: '2027.08.31' },
]
