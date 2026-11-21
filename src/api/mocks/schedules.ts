import type { Schedule, ScheduleCandidateSet, ScheduleChangeSet } from '../schedules'
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

/** 이 번호의 분석은 종료일이 두 곳에서 다르고 갱신 통보 기한이 없다. /schedules/new?analysisId=5 */
export const mockConflictAnalysisId = 5

export const mockScheduleCandidateSet: ScheduleCandidateSet = {
  analysisId: 1,
  contractId: 1,
  contractTitle: '카페 알바 근로계약서',
  candidates: [
    { candidateId: 1, title: '첫 출근 (계약 시작일)', date: '2026.12.01', source: 'written', where: '1쪽 제1조 · 원문 보기', recommended: true },
    { candidateId: 2, title: '최저임금 변경', date: '2027.01.01', source: 'review', where: '2027년 최저임금 고시 기준 · 시급 다시 확인', recommended: true },
    { candidateId: 3, title: '첫 급여일', date: '2027.01.10', source: 'written', where: '1쪽 제4조 · 원문 보기', recommended: true },
    { candidateId: 4, title: '계약 종료', date: '2027.02.28', source: 'written', where: '1쪽 제1조 · 원문 보기', recommended: false },
  ],
}

export const mockConflictCandidateSet: ScheduleCandidateSet = {
  analysisId: mockConflictAnalysisId,
  contractId: 1,
  contractTitle: '카페 알바 근로계약서',
  candidates: [
    { candidateId: 1, title: '계약 종료일', date: '2027.02.28', source: 'written', where: '1쪽 제1조', recommended: false },
    { candidateId: 2, title: '계약 종료일', date: '2027.03.31', source: 'written', where: '2쪽 특약', recommended: false },
    { candidateId: 3, title: '갱신 통보 기한', date: null, source: 'typed', where: '', recommended: false },
  ],
}

export const mockScheduleChangeSet: ScheduleChangeSet = {
  comparisonId: 1,
  contractId: 2,
  contractTitle: '역삼동 원룸 월세 계약서',
  fromVersion: 1,
  toVersion: 2,
  changes: [
    { scheduleId: 1, action: 'UPDATE', title: '입주·전입신고', beforeDate: '2026.11.20', afterDate: '2026.12.01', source: 'written' },
    { scheduleId: 4, action: 'UPDATE', title: '계약 종료', beforeDate: '2028.11.19', afterDate: '2028.11.30', source: 'written' },
    { scheduleId: null, candidateId: 412, action: 'CREATE', title: '임대차 변경 신고', beforeDate: null, afterDate: '2026.12.12', source: 'review', note: '변경 계약일 + 30일' },
  ],
}
