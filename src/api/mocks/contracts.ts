import type { ContractDetail, ContractSummary, CreatedContract } from '../contracts'

export const mockCreatedContract: CreatedContract = { contractId: 1, documentTypeCode: 'LABOR', pageCount: 2, status: 'REGISTERED' }

export const mockMyContracts: ContractSummary[] = [
  {
    contractId: 2,
    title: '역삼동 원룸 월세 계약서',
    documentTypeCode: 'LEASE',
    lane: '집',
    version: 2,
    savedAt: '2026-11-12',
    needsCheckCount: 1,
    analysisId: 2,
    scheduleCount: 3,
    previousVersion: { contractId: 4, version: 1, savedAt: '2026-11-05' },
  },
  {
    contractId: 1,
    title: '카페 알바 근로계약서',
    documentTypeCode: 'LABOR',
    lane: '일',
    version: 1,
    savedAt: '2026-11-12',
    needsCheckCount: 2,
    analysisId: 1,
    missingItemCount: 2,
    scheduleCount: 3,
  },
  {
    contractId: 3,
    title: '신림동 원룸 전세 계약서',
    documentTypeCode: 'LEASE',
    lane: '집',
    version: 1,
    savedAt: '2026-10-30',
    needsCheckCount: 0,
    analysisId: 3,
    scheduleCount: 0,
  },
]

// S15 문서 상세 보드: 수정본(v2)의 분석 당시 조건과 연결 일정.
export const mockContractDetail: ContractDetail = {
  ...mockMyContracts[0],
  pageCount: 3,
  scheduleIds: [1, 3, 4],
  reviewLabel: 'A 깊게 점검',
  keyTerms: [
    { label: '보증금', value: '1,000만 원' },
    { label: '월세', value: '58만 원' },
    { label: '기간', value: '26.12.01 ~ 28.11.30' },
    { label: '특약', value: '3개', state: 'warn' },
  ],
  schedules: [
    { scheduleId: 1, title: '입주·전입신고', date: '2026.12.01', daysLeft: 19, source: 'written' },
    { scheduleId: 3, title: '임대차 변경 신고', date: '2026.12.12', daysLeft: 30, source: 'review' },
    { scheduleId: 4, title: '계약 종료', date: '2028.11.30', daysLeft: 749, source: 'written' },
  ],
}

// 이전 v1의 금액·기간·특약은 와이어프레임 S12의 이전본과 같다.
export const mockPreviousContract: ContractDetail = {
  ...mockContractDetail,
  contractId: 4,
  version: 1,
  savedAt: '2026-11-05',
  analysisId: 4,
  previousVersion: undefined,
  pageCount: 2,
  scheduleIds: [7, 8],
  scheduleCount: 2,
  keyTerms: [
    { label: '보증금', value: '1,000만 원' },
    { label: '월세', value: '55만 원' },
    { label: '기간', value: '26.11.20 ~ 28.11.19' },
    { label: '특약', value: '2개' },
  ],
  schedules: [
    { scheduleId: 7, title: '입주·전입신고', date: '2026.11.20', daysLeft: 15, source: 'written' },
    { scheduleId: 8, title: '계약 종료', date: '2028.11.19', daysLeft: 745, source: 'written' },
  ],
}

export const mockContractDetails: ContractDetail[] = [
  mockContractDetail,
  {
    ...mockMyContracts[1],
    pageCount: 2,
    scheduleIds: [2, 5, 6],
    reviewLabel: 'A 깊게 점검',
    keyTerms: [
      { label: '임금', value: '시급 10,000원', state: 'warn' },
      { label: '근로시간', value: '주 20시간' },
      { label: '기간', value: '26.12.01 ~ 27.02.28' },
      { label: '휴일', value: '-', state: 'miss' },
      { label: '수당', value: '주휴수당 표시 없음', state: 'miss' },
      { label: '근무 장소', value: '카페 매장' },
    ],
    schedules: [
      { scheduleId: 2, title: '첫 출근', date: '2026.12.01', daysLeft: 19, source: 'written' },
      { scheduleId: 5, title: '첫 급여일', date: '2027.01.10', daysLeft: 59, source: 'written' },
      { scheduleId: 6, title: '계약 종료', date: '2027.02.28', daysLeft: 108, source: 'written' },
    ],
  },
  { ...mockMyContracts[2], pageCount: 0, scheduleIds: [], reviewLabel: '', keyTerms: [], schedules: [] },
  mockPreviousContract,
]

export const mockEmptyContracts: ContractSummary[] = []
