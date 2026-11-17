import type { Board } from '../../dev/types'
import { mockEmptySchedules, mockSchedules } from '../../api/mocks/schedules'
import { SchedulesView } from './SchedulesPage'
import { ScheduleDetailView } from './ScheduleDetailPage'

// 이 폴더의 와이어프레임 보드. 담당자가 둘이라 아래 주석으로 구역을 나눴다(같은 줄을 동시에 고치면 git 충돌).
// 화면을 만들면 render에 그 보드 상태를 mock 데이터로 그려 연결한다.
export const scheduleBoards: Board[] = [
  // S13 일정 등록 · #20 김지희
  { id: 'S13_일정등록_신규', owner: '김지희', path: '/schedules/new' },
  { id: 'S13_일정등록_날짜누락충돌', owner: '김지희', path: '/schedules/new' },
  { id: 'S13_일정등록_저장실패', owner: '김지희', path: '/schedules/new' },
  { id: 'S13_일정등록_변경등록', owner: '김지희', path: '/schedules/new' },

  // S14 내 일정 · #19 구자건
  { id: 'S14_내일정_목록', owner: '구자건', path: '/schedules', render: () => <SchedulesView key="schedule-list" schedules={mockSchedules} showSaved /> },
  { id: 'S14_내일정_달력', owner: '구자건', path: '/schedules?view=calendar', render: () => <SchedulesView key="schedule-calendar" schedules={mockSchedules} initialView="calendar" /> },
  { id: 'S14_내일정_빈상태', owner: '구자건', path: '/schedules', render: () => <SchedulesView key="schedule-empty" schedules={mockEmptySchedules} /> },
  { id: 'S14_일정상세', owner: '구자건', path: '/schedules/7', render: () => <ScheduleDetailView key="schedule-detail" schedule={mockSchedules[0]} schedules={mockSchedules} showSaved /> },
]
