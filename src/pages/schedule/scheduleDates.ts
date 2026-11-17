import type { KeyboardEvent } from 'react'

export function scheduleDate(value: string) {
  const [year, month, day] = value.replaceAll('.', '-').split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export const weekdays = ['일', '월', '화', '수', '목', '금', '토']

export function dday(daysLeft: number) {
  return daysLeft === 0 ? 'D-day' : daysLeft > 0 ? `D-${daysLeft}` : `D+${Math.abs(daysLeft)}`
}
export function activateScheduleButton(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  const target = event.target as HTMLElement
  if (target.matches('[role="button"]')) { event.preventDefault(); target.click() }
}
