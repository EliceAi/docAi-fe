import { mockAdditionalSchedules, mockConflictAnalysisId, mockConflictCandidateSet, mockLeaseCandidateSet, mockScheduleCandidateSet, mockScheduleChangeSet, mockScheduleToday, mockStoredSchedules } from './mocks/schedules'
import { getAnalysis, type ValueSource } from './analyses'
import { mockResponse, shouldMock } from './mock-mode'
import { jsonBody, request } from './request'
import { toScheduleCandidateSet, toScheduleChangeSet, toScheduleDetail, toUpcomingSchedule } from './backendResponses'
import { getComparison, knownComparisonContracts } from './comparisons'
import { getMockContract, getMyContract } from './contracts'

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
const savedSchedules = new Map<number, Schedule>()
const storageKey = 'docai.mock-schedules.v1'
let restored = false

function restoreSchedules() {
  if (restored || typeof window === 'undefined') return
  restored = true
  try {
    const data = JSON.parse(window.sessionStorage.getItem(storageKey) ?? 'null') as { saved?: Schedule[]; deleted?: number[] } | null
    for (const schedule of data?.saved ?? []) {
      if (validScheduleId(schedule.scheduleId) && validScheduleId(schedule.contractId) && typeof schedule.title === 'string' && normalizeDate(schedule.date)) savedSchedules.set(schedule.scheduleId, schedule)
    }
    for (const id of data?.deleted ?? []) if (validScheduleId(id)) deletedScheduleIds.add(id)
  } catch { /* 저장 데이터가 손상되어도 원래 예시로 시작한다. */ }
}

function persistSchedules() {
  try {
    if (typeof window !== 'undefined') window.sessionStorage.setItem(storageKey, JSON.stringify({ saved: [...savedSchedules.values(), ...scheduleOverrides.values()], deleted: [...deletedScheduleIds] }))
  } catch { /* 저장 공간을 쓸 수 없어도 현재 탭에서는 계속 사용할 수 있다. */ }
}

/** mock 계약서 조회도 같은 일정 상태를 사용한다. 네트워크를 호출하지 않는 내부 저장소 조회다. */
export function getMockSchedules() {
  restoreSchedules()
  return [...new Map([...mockStoredSchedules, ...mockAdditionalSchedules, ...savedSchedules.values()].map(schedule => [schedule.scheduleId, schedule])).values()]
    .filter(schedule => !deletedScheduleIds.has(schedule.scheduleId))
    .map(schedule => scheduleOverrides.get(schedule.scheduleId) ?? schedule)
    .sort((a, b) => a.date.localeCompare(b.date) || a.scheduleId - b.scheduleId)
}

/** 보관·확정한 계약서의 일정만 교체한다. 이전 버전이나 다른 계약서의 일정은 유지한다. */
export function replaceMockSchedules(contract: { contractId: number; title: string; documentTypeCode: string; savedAt: string }, values: { title: string; date: string; source: ValueSource }[]): Schedule[] {
  const normalized = values.map(value => ({ ...value, title: value.title.trim(), date: normalizeDate(value.date) }))
  if (normalized.some(value => !value.title || !value.date)) throw new Error('저장할 일정의 이름과 날짜를 확인해 주세요.')
  const all = getMockSchedules()
  const previous = all.filter(schedule => schedule.contractId === contract.contractId)
  const used = new Set<number>()
  let nextId = Math.max(2000, ...all.map(schedule => schedule.scheduleId + 1))
  const result: Schedule[] = normalized.map(value => {
    const existing = previous.find(schedule => !used.has(schedule.scheduleId) && schedule.title === value.title)
    const scheduleId = existing?.scheduleId ?? nextId++
    used.add(scheduleId)
    return {
      scheduleId, title: value.title, date: value.date!.replaceAll('-', '.'), source: value.source,
      contractId: contract.contractId, contractTitle: contract.title, documentTypeCode: contract.documentTypeCode,
      contractAnalyzedAt: contract.savedAt.slice(5).replaceAll('-', '.'),
      daysLeft: Math.round((Date.parse(value.date! + 'T00:00:00Z') - Date.parse(mockScheduleToday + 'T00:00:00Z')) / 86400000),
    }
  })
  for (const schedule of previous) if (!used.has(schedule.scheduleId)) deletedScheduleIds.add(schedule.scheduleId)
  for (const schedule of result) {
    deletedScheduleIds.delete(schedule.scheduleId)
    scheduleOverrides.delete(schedule.scheduleId)
    savedSchedules.set(schedule.scheduleId, schedule)
  }
  persistSchedules()
  return structuredClone(result)
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
  /** 같은 항목에 날짜가 둘 이상이면 같은 값(명세). 하나만 고르게 한다. 없으면 제목으로 묶는다 */
  conflictGroup?: string | null
}

/** S13 일정 등록: 분석 결과에서 찾은 날짜 후보와 어느 계약서인지 */
export type ScheduleCandidateSet = { analysisId: number; contractId: number; contractTitle: string; candidates: ScheduleCandidate[] }

/** 수정본 확정으로 바뀌는 일정. scheduleId가 null이면 수정본에서 새로 생기는 일정 */
/** 수정본 확정으로 바뀌는 일정. UPDATE 날짜 변경 · CREATE 새 일정(scheduleId 없음) · DELETE 수정본에서 사라진 일정(afterDate 없음) */
export type ScheduleChange = { scheduleId: number | null; candidateId?: number; action: 'UPDATE' | 'CREATE' | 'DELETE'; title: string; beforeDate: string | null; afterDate: string | null; source: ValueSource; note?: string }

/** S13 변경 등록: 수정본(v2)에 맞춰 바뀌는 일정 */
export type ScheduleChangeSet = { comparisonId: number; contractId: number; contractTitle: string; fromVersion: number; toVersion: number; changes: ScheduleChange[] }

/** S13에서 저장할 일정. 후보에서 고른 일정은 candidateId를 함께 보낸다(직접 추가한 일정은 없음) */
export type NewSchedule = { candidateId?: number; title: string; date: string; source: ValueSource }

/** GET /api/analyses/{analysisId}/schedule-candidates */
export async function getScheduleCandidates(analysisId: number): Promise<ScheduleCandidateSet> {
  const analysis = await getAnalysis(analysisId)
  // 홈 예시는 보관된 계약서가 아니라(계약서 번호 0) 서버에 일정 후보가 없다. 다른 계약서 날짜를 빌려 오지 않고 직접 추가만 받는다
  if (analysis.contractId === 0) return mockResponse({ analysisId, contractId: 0, contractTitle: analysis.documentTitle, candidates: [] })
  if (shouldMock('getScheduleCandidates') || !['EMPLOYMENT', 'LEASE'].includes(analysis.documentTypeCode)) {
    let candidates: ScheduleCandidate[] = []
    if (analysisId === mockConflictAnalysisId) candidates = mockConflictCandidateSet.candidates
    else if (analysis.documentTypeCode === 'EMPLOYMENT') candidates = mockScheduleCandidateSet.candidates
    else if (analysis.documentTypeCode === 'LEASE') {
      const contract = getMockContract(analysis.contractId)
      candidates = contract.schedules.map((schedule, index) => ({ candidateId: index + 1, title: schedule.title, date: schedule.date, source: schedule.source, where: '', recommended: true }))
      if (!candidates.length && analysis.contractId === mockLeaseCandidateSet.contractId) candidates = mockLeaseCandidateSet.candidates
    }
    return mockResponse({ analysisId, contractId: analysis.contractId, contractTitle: analysis.documentTitle, candidates })
  }
  return request<Parameters<typeof toScheduleCandidateSet>[1]>(`/api/analyses/${analysisId}/schedule-candidates`).then(data => toScheduleCandidateSet(analysisId, data))
}

/** GET /api/comparisons/{comparisonId}/schedule-changes */
export async function getScheduleChanges(comparisonId: number): Promise<ScheduleChangeSet> {
  const comparison = await getComparison(comparisonId)
  if (shouldMock('getScheduleChanges') || comparison.documentTypeCode && !['EMPLOYMENT', 'LEASE'].includes(comparison.documentTypeCode)) {
    const before = await getMyContract(comparison.previousContractId)
    const original = getMockContract(comparison.previousContractId)
    const after = getMockContract(comparison.currentContractId)
    const dateChanges = new Map<string, string>()
    for (const change of comparison.changes.filter(change => change.kind === 'date')) {
      const oldDates = change.before?.match(/\d{4}[.-]\d{2}[.-]\d{2}/g) ?? []
      const newDates = change.after?.match(/\d{4}[.-]\d{2}[.-]\d{2}/g) ?? []
      oldDates.forEach((date, index) => { if (newDates[index]) dateChanges.set(date.replaceAll('-', '.'), newDates[index].replaceAll('-', '.')) })
    }
    const revised = after.schedules.length ? after.schedules : before.schedules.map(schedule => ({ ...schedule, date: dateChanges.get(original.schedules.find(item => item.title === schedule.title)?.date ?? schedule.date) ?? schedule.date }))
    const titles = comparison.documentTypeCode === 'LEASE' ? mockScheduleChangeSet.changes.map(change => change.title) : [...new Set([...before.schedules, ...revised].map(schedule => schedule.title))]
    const changes: ScheduleChange[] = titles.flatMap((title, index) => {
      const old = before.schedules.find(schedule => schedule.title === title)
      const next = revised.find(schedule => schedule.title === title)
      if (old?.date === next?.date) return []
      return [{ title, scheduleId: old?.scheduleId ?? null, ...(next && !old ? { candidateId: 410 + index } : {}), action: !next ? 'DELETE' as const : old ? 'UPDATE' as const : 'CREATE' as const,
        beforeDate: old?.date ?? null, afterDate: next?.date ?? null, source: next?.source ?? old?.source ?? 'review',
        ...(comparison.documentTypeCode === 'LEASE' && !old && next ? { note: mockScheduleChangeSet.changes.find(change => change.title === title)?.note } : {}),
      }]
    })
    return mockResponse({ comparisonId, contractId: after.contractId, contractTitle: after.title, fromVersion: before.version, toVersion: after.version, changes })
  }
  // 응답에 계약서 번호·버전이 없어(명세) 비교를 만들 때 기억한 이전본 번호를 쓴다. 버전은 알 수 없어 v1 → v2로 보여 준다
  const known = { contractId: knownComparisonContracts(comparisonId)?.previousContractId ?? 0, fromVersion: 1, toVersion: 2 }
  return request<Parameters<typeof toScheduleChangeSet>[1]>(`/api/comparisons/${comparisonId}/schedule-changes`).then(data => toScheduleChangeSet(comparisonId, data, known))
}

/** GET /api/schedules/upcoming: 홈 "다가오는 일정" */
export function getUpcomingSchedules(): Promise<Schedule[]> {
  if (shouldMock('getUpcomingSchedules')) return mockResponse(getMockSchedules().filter(schedule => schedule.daysLeft >= 0).slice(0, 2))
  return request<Parameters<typeof toUpcomingSchedule>[0][]>('/api/schedules/upcoming').then(items => items.map(toUpcomingSchedule))
}

/** GET /api/schedules */
export function getSchedules(): Promise<Schedule[]> {
  if (shouldMock('getSchedules')) return mockResponse(getMockSchedules())
  // 백엔드는 다가오는 일정과 같은 모양의 배열을 준다(2026-11-21 확인)
  return request<Parameters<typeof toUpcomingSchedule>[0][]>('/api/schedules').then(items => items.map(toUpcomingSchedule))
}

/** GET /api/schedules/{scheduleId} */
export function getSchedule(scheduleId: number): Promise<Schedule> {
  if (!validScheduleId(scheduleId)) return Promise.reject(new Error('일정을 찾을 수 없어요.'))
  const schedule = findMockSchedule(scheduleId)
  if ((schedule?.documentTypeCode && !['EMPLOYMENT', 'LEASE'].includes(schedule.documentTypeCode)) || shouldMock('getSchedule')) {
    return schedule ? mockResponse(schedule) : Promise.reject(new Error('일정을 찾을 수 없어요.'))
  }
  return request<Parameters<typeof toScheduleDetail>[0]>(`/api/schedules/${scheduleId}`).then(toScheduleDetail)
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
    persistSchedules()
    return mockResponse(updated)
  }
  // 명세: 보낸 칸만 바뀐다. 날짜는 yyyy-MM-dd. 응답에는 일부 칸만 있어 상세를 다시 받는다
  const body = { ...(changes.title !== undefined ? { title: changes.title.trim() } : {}), ...(date ? { date } : {}) }
  return request(`/api/schedules/${scheduleId}`, jsonBody('PATCH', body)).then(() => getSchedule(scheduleId))
}

/** DELETE /api/schedules/{scheduleId} */
export function deleteSchedule(scheduleId: number): Promise<void> {
  if (!validScheduleId(scheduleId)) return Promise.reject(new Error('일정을 찾을 수 없어요.'))
  const schedule = findMockSchedule(scheduleId)
  if ((schedule?.documentTypeCode && !['EMPLOYMENT', 'LEASE'].includes(schedule.documentTypeCode)) || shouldMock('deleteSchedule')) {
    if (!schedule) return Promise.reject(new Error('일정을 찾을 수 없어요.'))
    deletedScheduleIds.add(scheduleId)
    scheduleOverrides.delete(scheduleId)
    persistSchedules()
    return mockResponse(undefined)
  }
  return request(`/api/schedules/${scheduleId}`, { method: 'DELETE' })
}
