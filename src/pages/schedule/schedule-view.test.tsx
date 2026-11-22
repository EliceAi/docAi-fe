import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { AppPanelsProvider } from '../../common/layout/AppPanels'
import { ScheduleDetailView } from './ScheduleDetailPage'
import { activateScheduleButton } from './scheduleDates'
import type { KeyboardEvent } from 'react'
import type { Schedule } from '../../api/schedules'

const schedules: Schedule[] = [
  { scheduleId: 1, title: '입주', date: '2026.12.01', contractId: 2, contractTitle: '임대차', daysLeft: 9 },
  { scheduleId: 2, title: '과거 입주', date: '2022.02.12', contractId: 9, contractTitle: '예시', daysLeft: -1000 },
]

describe('일정 상세에서 보던 화면 유지', () => {
  it('달력에서 상세를 열어도 뒤의 2026년 12월 달력을 유지한다', () => {
    const html = renderToStaticMarkup(<MemoryRouter initialEntries={['/schedules/1']}><AppPanelsProvider>
      <ScheduleDetailView schedule={schedules[0]} schedules={schedules} latestFirst returnTo="/schedules?view=calendar&date=2026-12-01&month=2026-12" />
    </AppPanelsProvider></MemoryRouter>)
    expect(html).toContain('aria-label="일정 달력"')
    expect(html).toContain('value="2026-12"')
  })

  it.each([' ', 'Enter'])('체크박스를 %s 키로 선택할 수 있다', key => {
    const click = vi.fn()
    const event = { key, preventDefault: vi.fn(), target: { getAttribute: () => 'checkbox', matches: () => false, click } } as unknown as KeyboardEvent<HTMLElement>
    activateScheduleButton(event)
    expect(click).toHaveBeenCalledOnce()
  })
})
