import { mockScheduleCandidates, mockScheduleChanges, mockSchedules } from './mocks/schedules'
import type { ValueSource } from './analyses'
import { mockResponse, shouldMock } from './mock-mode'
import { jsonBody, request } from './request'

// 응답 상세는 API 명세에 아직 없다. 와이어프레임 S13·S14·홈 기준으로 정했고, 실제 연결 때 test-api로 맞춘다.

export type Schedule = {
  scheduleId: number
  title: string
  date: string
  contractId: number
  contractTitle: string
  /** 오늘부터 남은 날 (D-8이면 8) */
  daysLeft: number
}

/** 분석 결과에서 찾은 날짜 후보 */
export type ScheduleCandidate = {
  candidateId: number
  title: string
  date: string | null
  source: ValueSource
  /** 계약서 어디에 적혀 있는지 (1쪽 제1조) */
  where: string
}

/** 수정본 확정으로 바뀌는 일정 */
export type ScheduleChange = { scheduleId: number; title: string; beforeDate: string; afterDate: string }

export type NewSchedule = { title: string; date: string; source: ValueSource }

/** GET /api/analyses/{analysisId}/schedule-candidates */
export function getScheduleCandidates(analysisId: number): Promise<ScheduleCandidate[]> {
  if (shouldMock('getScheduleCandidates')) return mockResponse(mockScheduleCandidates)
  return request(`/api/analyses/${analysisId}/schedule-candidates`)
}

/** GET /api/comparisons/{comparisonId}/schedule-changes */
export function getScheduleChanges(comparisonId: number): Promise<ScheduleChange[]> {
  if (shouldMock('getScheduleChanges')) return mockResponse(mockScheduleChanges)
  return request(`/api/comparisons/${comparisonId}/schedule-changes`)
}

/**
 * POST /api/schedules: S13 "선택한 일정 저장"
 * 명세 없음: 백엔드에 추가 요청. 주소와 본문은 명세 규칙대로 가정했다.
 */
export function createSchedules(contractId: number, schedules: NewSchedule[]): Promise<Schedule[]> {
  if (shouldMock('createSchedules')) return mockResponse(mockSchedules)
  return request('/api/schedules', jsonBody('POST', { contractId, schedules }))
}

/** GET /api/schedules/upcoming: 홈 "다가오는 일정" */
export function getUpcomingSchedules(): Promise<Schedule[]> {
  if (shouldMock('getUpcomingSchedules')) return mockResponse(mockSchedules)
  return request('/api/schedules/upcoming')
}

/** GET /api/schedules */
export function getSchedules(): Promise<Schedule[]> {
  if (shouldMock('getSchedules')) return mockResponse(mockSchedules)
  return request('/api/schedules')
}

/** GET /api/schedules/{scheduleId} */
export function getSchedule(scheduleId: number): Promise<Schedule> {
  if (shouldMock('getSchedule')) return mockResponse({ ...mockSchedules[0], scheduleId })
  return request(`/api/schedules/${scheduleId}`)
}

/** PATCH /api/schedules/{scheduleId} */
export function updateSchedule(scheduleId: number, changes: Partial<Pick<Schedule, 'title' | 'date'>>): Promise<Schedule> {
  if (shouldMock('updateSchedule')) return mockResponse({ ...mockSchedules[0], ...changes, scheduleId })
  return request(`/api/schedules/${scheduleId}`, jsonBody('PATCH', changes))
}

/** DELETE /api/schedules/{scheduleId} */
export function deleteSchedule(scheduleId: number): Promise<void> {
  if (shouldMock('deleteSchedule')) return mockResponse(undefined)
  return request(`/api/schedules/${scheduleId}`, { method: 'DELETE' })
}
