import { describe, expect, it } from 'vitest'
import type { ScheduleCandidate } from '../../api/schedules'
import { buildNewSchedules, conflictGroups, dateWithWeekday } from './scheduleRegister'

const candidate = (candidateId: number, title: string, date: string | null, source: ScheduleCandidate['source'] = 'written'): ScheduleCandidate =>
  ({ candidateId, title, date, source, where: '1쪽', recommended: true })
const empty = { checkedIds: [] as number[], chosenIdByTitle: {} as Record<string, number>, typedDates: {} as Record<number, string>, extras: [] as { title: string; date: string }[] }

const start = candidate(1, '첫 출근', '2026.12.01')
const pay = candidate(2, '첫 급여일', '2027.01.10')
const endA = candidate(3, '계약 종료', '2027.02.28')
const endB = candidate(4, '계약 종료', '2027.03.31')
const renewal = candidate(5, '갱신 통보 기한', null)

describe('buildNewSchedules', () => {
  it('체크한 후보만 ISO 날짜와 원래 출처로 저장한다', () => {
    expect(buildNewSchedules([start, pay], { ...empty, checkedIds: [2] })).toEqual([{ candidateId: 2, title: '첫 급여일', date: '2027-01-10', source: 'written' }])
  })
  it('날짜가 서로 다른 같은 일정은 고른 것만 저장하고, 고르지 않으면 저장하지 않는다', () => {
    expect(buildNewSchedules([endA, endB], { ...empty, checkedIds: [3, 4] })).toEqual([])
    expect(buildNewSchedules([endA, endB], { ...empty, chosenIdByTitle: { '계약 종료': 4 } })).toEqual([{ candidateId: 4, title: '계약 종료', date: '2027-03-31', source: 'written' }])
  })
  it('날짜를 고쳐 쓰면 직접 입력으로 표시한다', () => {
    expect(buildNewSchedules([start], { ...empty, checkedIds: [1], typedDates: { 1: '2026.12.02' } })).toEqual([{ candidateId: 1, title: '첫 출근', date: '2026-12-02', source: 'typed' }])
  })
  it('계약서에 날짜가 없는 일정은 직접 입력했을 때만 저장하고 임의로 계산하지 않는다', () => {
    expect(buildNewSchedules([renewal], { ...empty, checkedIds: [5] })).toEqual([])
    expect(buildNewSchedules([renewal], { ...empty, typedDates: { 5: '2027.01.15' } })).toEqual([{ candidateId: 5, title: '갱신 통보 기한', date: '2027-01-15', source: 'typed' }])
  })
  it('직접 추가한 일정은 제목과 올바른 날짜가 모두 있을 때만 저장한다', () => {
    const extras = [{ title: '입주 청소', date: '2026.12.03' }, { title: '', date: '2026.12.04' }, { title: '보증금 입금', date: '2026.13.40' }, { title: '이사', date: '' }]
    expect(buildNewSchedules([], { ...empty, extras })).toEqual([{ title: '입주 청소', date: '2026-12-03', source: 'typed' }])
  })
  it('잘못된 날짜로 고쳐 쓴 일정은 저장하지 않는다', () => {
    expect(buildNewSchedules([start], { ...empty, checkedIds: [1], typedDates: { 1: '2026.02.30' } })).toEqual([])
  })
  it('직접 비운 날짜는 원래 날짜로 되돌려 저장하지 않는다', () => {
    expect(buildNewSchedules([start], { ...empty, checkedIds: [1], typedDates: { 1: '' } })).toEqual([])
  })
})

describe('conflictGroups', () => {
  it('같은 제목에 날짜가 둘 이상 다르면 한 묶음으로 보여 준다', () => {
    expect(conflictGroups([start, endA, endB, renewal])).toEqual([[endA, endB]])
  })
  it('서버가 conflictGroup을 주면 그 묶음을 쓰고, null이면 제목이 같아도 충돌이 아니다', () => {
    const a = { ...endA, conflictGroup: 'CONTRACT_END' }
    const b = { ...endB, conflictGroup: 'CONTRACT_END' }
    const notConflict = { ...candidate(9, '계약 종료', '2027.05.31'), conflictGroup: null }
    expect(conflictGroups([a, b, notConflict])).toEqual([[a, b]])
    expect(buildNewSchedules([a, b], { ...empty, chosenIdByTitle: { CONTRACT_END: 3 } })).toEqual([{ candidateId: 3, title: '계약 종료', date: '2027-02-28', source: 'written' }])
  })
  it('날짜가 같으면 충돌이 아니다', () => {
    expect(conflictGroups([endA, candidate(9, '계약 종료', '2027.02.28')])).toEqual([])
  })
})

describe('dateWithWeekday', () => {
  it('날짜 뒤에 요일을 붙인다', () => {
    expect(dateWithWeekday('2026.12.01')).toBe('2026.12.01 (화)')
    expect(dateWithWeekday('2027.02.28')).toBe('2027.02.28 (일)')
  })
})
