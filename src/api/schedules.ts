import { mockAdditionalSchedules, mockConflictAnalysisId, mockConflictCandidateSet, mockScheduleCandidateSet, mockScheduleChangeSet, mockSchedules, mockScheduleToday, mockStoredSchedules } from './mocks/schedules'
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
  documentTypeCode?: string
  source?: ValueSource
  where?: string
  contractAnalyzedAt?: string
  note?: string
  color?: 'red' | 'blu' | 'amb' | 'gry'
}

// 예시의 원본은 유지하고, 앱을 사용하는 동안의 날짜 수정·삭제만 따로 보관한다.
const scheduleOverrides = new Map<number, Schedule>()
const deletedScheduleIds = new Set<number>()

/** mock 계약서 조회도 같은 일정 상태를 사용한다. 네트워크를 호출하지 않는 내부 저장소 조회다. */
export function getMockSchedules() {
  return [...mockStoredSchedules, ...mockAdditionalSchedules]
    .filter(schedule => !deletedScheduleIds.has(schedule.scheduleId))
    .map(schedule => scheduleOverrides.get(schedule.scheduleId) ?? schedule)
    .sort((a, b) => a.date.localeCompare(b.date) || a.scheduleId - b.scheduleId)
}

function findMockSchedule(scheduleId: number) {
  return getMockSchedules().find(schedule => schedule.scheduleId === scheduleId)
}

function validScheduleId(scheduleId: number) {
  return Number.isSafeInteger(scheduleId) && scheduleId > 0
}

/** '2026.12.01' 또는 '2026-12-01'을 '2026-12-01'로. 없는 날짜면 null */
export function normalizeDate(value: string) {
  const normalized = value.replaceAll('.', '-')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null
  const date = new Date(normalized + 'T00:00:00Z')
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === normalized ? normalized : null
}

/** 분석 결과에서 찾은 날짜 후보 */
export type ScheduleCandidate = {
  candidateId: number
  title: string
  date: string | null
  source: ValueSource
  /** 계약서 어디에 적혀 있는지 (1쪽 제1조) */
  where: string
  /** 처음부터 체크해 둘지. 종료일처럼 알림이 필요 없을 수 있는 일정은 false */
  recommended: boolean
}

/** S13 일정 등록: 분석 결과에서 찾은 날짜 후보와 어느 계약서인지 */
export type ScheduleCandidateSet = { analysisId: number; contractId: number; contractTitle: string; candidates: ScheduleCandidate[] }

/** 수정본 확정으로 바뀌는 일정. scheduleId가 null이면 수정본에서 새로 생기는 일정 */
export type ScheduleChange = { scheduleId: number | null; title: string; beforeDate: string | null; afterDate: string; source: ValueSource; note?: string }

/** S13 변경 등록: 수정본(v2)에 맞춰 바뀌는 일정 */
export type ScheduleChangeSet = { comparisonId: number; contractId: number; contractTitle: string; fromVersion: number; toVersion: number; changes: ScheduleChange[] }

export type NewSchedule = { title: string; date: string; source: ValueSource }

/** GET /api/analyses/{analysisId}/schedule-candidates */
export function getScheduleCandidates(analysisId: number): Promise<ScheduleCandidateSet> {
  if (shouldMock('getScheduleCandidates')) return mockResponse({ ...(analysisId === mockConflictAnalysisId ? mockConflictCandidateSet : mockScheduleCandidateSet), analysisId })
  return request(`/api/analyses/${analysisId}/schedule-candidates`)
}

/** GET /api/comparisons/{comparisonId}/schedule-changes */
export function getScheduleChanges(comparisonId: number): Promise<ScheduleChangeSet> {
  if (shouldMock('getScheduleChanges')) return mockResponse({ ...mockScheduleChangeSet, comparisonId })
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
  if (shouldMock('getUpcomingSchedules')) return mockResponse(getMockSchedules().filter(schedule => schedule.daysLeft >= 0).slice(0, 2))
  return request('/api/schedules/upcoming')
}

/** GET /api/schedules */
export function getSchedules(): Promise<Schedule[]> {
  if (shouldMock('getSchedules')) return mockResponse(getMockSchedules())
  return request('/api/schedules')
}

/** GET /api/schedules/{scheduleId} */
export function getSchedule(scheduleId: number): Promise<Schedule> {
  if (!validScheduleId(scheduleId)) return Promise.reject(new Error('일정을 찾을 수 없어요.'))
  const schedule = findMockSchedule(scheduleId)
  if ((schedule?.documentTypeCode && !['EMPLOYMENT', 'LEASE'].includes(schedule.documentTypeCode)) || shouldMock('getSchedule')) {
    return schedule ? mockResponse(schedule) : Promise.reject(new Error('일정을 찾을 수 없어요.'))
  }
  return request(`/api/schedules/${scheduleId}`)
}

/** PATCH /api/schedules/{scheduleId} */
export function updateSchedule(scheduleId: number, changes: Partial<Pick<Schedule, 'title' | 'date'>>): Promise<Schedule> {
  if (!validScheduleId(scheduleId)) return Promise.reject(new Error('일정을 찾을 수 없어요.'))
  const date = changes.date === undefined ? undefined : normalizeDate(changes.date)
  if (date === null || changes.title !== undefined && !changes.title.trim()) return Promise.reject(new Error('수정할 내용을 확인해 주세요.'))
  const schedule = findMockSchedule(scheduleId)
  if ((schedule?.documentTypeCode && !['EMPLOYMENT', 'LEASE'].includes(schedule.documentTypeCode)) || shouldMock('updateSchedule')) {
    if (!schedule) return Promise.reject(new Error('일정을 찾을 수 없어요.'))
    const updated: Schedule = {
      ...schedule,
      ...(changes.title !== undefined ? { title: changes.title.trim() } : {}),
      ...(date !== undefined ? {
        date: date.replaceAll('-', '.'),
        daysLeft: Math.round((Date.parse(date + 'T00:00:00Z') - Date.parse(mockScheduleToday + 'T00:00:00Z')) / 86400000),
        source: 'typed',
        where: undefined,
      } : {}),
    }
    scheduleOverrides.set(scheduleId, updated)
    return mockResponse(updated)
  }
  return request(`/api/schedules/${scheduleId}`, jsonBody('PATCH', changes))
}

/** DELETE /api/schedules/{scheduleId} */
export function deleteSchedule(scheduleId: number): Promise<void> {
  if (!validScheduleId(scheduleId)) return Promise.reject(new Error('일정을 찾을 수 없어요.'))
  const schedule = findMockSchedule(scheduleId)
  if ((schedule?.documentTypeCode && !['EMPLOYMENT', 'LEASE'].includes(schedule.documentTypeCode)) || shouldMock('deleteSchedule')) {
    if (!schedule) return Promise.reject(new Error('일정을 찾을 수 없어요.'))
    deletedScheduleIds.add(scheduleId)
    scheduleOverrides.delete(scheduleId)
    return mockResponse(undefined)
  }
  return request(`/api/schedules/${scheduleId}`, { method: 'DELETE' })
}
