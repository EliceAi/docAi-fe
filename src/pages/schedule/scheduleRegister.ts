import { normalizeDate, type NewSchedule, type ScheduleCandidate } from '../../api/schedules'
import { scheduleDate, weekdays } from './scheduleDates'

export type RegisterSelection = {
  /** 체크한 후보 */
  checkedIds: number[]
  /** 날짜가 서로 다른 같은 일정에서 고른 후보 (일정 제목 → 후보 번호) */
  chosenIdByTitle: Record<string, number>
  /** 날짜를 직접 입력하거나 고쳐 쓴 후보 (후보 번호 → 날짜) */
  typedDates: Record<number, string>
  /** "일정 직접 추가"로 만든 일정 */
  extras: { title: string; date: string }[]
}

/** 같은 제목인데 날짜가 서로 다른 후보 묶음. 어느 날짜가 맞는지는 앱이 고르지 않는다 */
export function conflictGroups(candidates: ScheduleCandidate[]): ScheduleCandidate[][] {
  const byTitle = new Map<string, ScheduleCandidate[]>()
  for (const candidate of candidates.filter(candidate => candidate.date)) {
    byTitle.set(candidate.title, [...(byTitle.get(candidate.title) ?? []), candidate])
  }
  return [...byTitle.values()].filter(group => new Set(group.map(candidate => candidate.date)).size > 1)
}

/** 저장할 일정을 모은다. 날짜가 없거나 잘못된 일정은 임의로 채우지 않고 뺀다 */
export function buildNewSchedules(candidates: ScheduleCandidate[], selection: RegisterSelection): NewSchedule[] {
  const conflictIds = new Set(conflictGroups(candidates).flat().map(candidate => candidate.candidateId))
  const fromCandidates = candidates.flatMap((candidate): NewSchedule[] => {
    const typed = selection.typedDates[candidate.candidateId]
    const isConflict = conflictIds.has(candidate.candidateId)
    const picked = isConflict
      ? selection.chosenIdByTitle[candidate.title] === candidate.candidateId
      : selection.checkedIds.includes(candidate.candidateId) || (candidate.date === null && Boolean(typed))
    if (!picked) return []
    const date = normalizeDate(typed || candidate.date || '')
    if (!date) return []
    return [{ title: candidate.title, date, source: typed ? 'typed' : candidate.source }]
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
