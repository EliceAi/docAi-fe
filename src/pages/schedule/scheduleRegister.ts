import { normalizeDate, type NewSchedule, type ScheduleCandidate } from '../../api/schedules'
import { scheduleDate, weekdays } from './scheduleDates'

export type RegisterSelection = {
  /** 체크한 후보 */
  checkedIds: number[]
  /** 날짜가 서로 다른 같은 일정에서 고른 후보 (묶음 이름 → 후보 번호). 묶음 이름은 conflictKey로 정한다 */
  chosenIdByTitle: Record<string, number>
  /** 날짜를 직접 입력하거나 고쳐 쓴 후보 (후보 번호 → 날짜) */
  typedDates: Record<number, string>
  /** "일정 직접 추가"로 만든 일정 */
  extras: { title: string; date: string }[]
}

/**
 * 날짜가 서로 다른 같은 일정을 묶는 이름. 서버가 conflictGroup을 주면 그대로 쓰고(null이면 충돌 아님),
 * conflictGroup이 없는 mock 후보는 같은 제목끼리 묶는다.
 */
export const conflictKey = (candidate: ScheduleCandidate) => candidate.conflictGroup !== undefined ? candidate.conflictGroup : candidate.title

/** 날짜가 서로 다른 같은 일정 묶음. 어느 날짜가 맞는지는 앱이 고르지 않는다 */
export function conflictGroups(candidates: ScheduleCandidate[]): ScheduleCandidate[][] {
  const byKey = new Map<string, ScheduleCandidate[]>()
  for (const candidate of candidates.filter(candidate => candidate.date)) {
    const key = conflictKey(candidate)
    if (key) byKey.set(key, [...(byKey.get(key) ?? []), candidate])
  }
  return [...byKey.values()].filter(group => new Set(group.map(candidate => candidate.date)).size > 1)
}

/** 저장할 일정을 모은다. 날짜가 없거나 잘못된 일정은 임의로 채우지 않고 뺀다 */
export function buildNewSchedules(candidates: ScheduleCandidate[], selection: RegisterSelection): NewSchedule[] {
  const conflictIds = new Set(conflictGroups(candidates).flat().map(candidate => candidate.candidateId))
  const fromCandidates = candidates.flatMap((candidate): NewSchedule[] => {
    const typed = selection.typedDates[candidate.candidateId]
    const isConflict = conflictIds.has(candidate.candidateId)
    const picked = isConflict
      ? selection.chosenIdByTitle[conflictKey(candidate) ?? ''] === candidate.candidateId
      : selection.checkedIds.includes(candidate.candidateId) || (candidate.date === null && Boolean(typed))
    if (!picked) return []
    const date = normalizeDate(typed || candidate.date || '')
    if (!date) return []
    return [{ candidateId: candidate.candidateId, title: candidate.title, date, source: typed ? 'typed' : candidate.source }]
  })
  const fromExtras = selection.extras.flatMap((extra): NewSchedule[] => {
    const date = normalizeDate(extra.date)
    return extra.title.trim() && date ? [{ title: extra.title.trim(), date, source: 'typed' }] : []
  })
  return [...fromCandidates, ...fromExtras]
}

/** '2026.12.01' → '2026.12.01 (화)' */
export function dateWithWeekday(date: string): string {
  return `${date} (${weekdays[scheduleDate(date).getDay()]})`
}
