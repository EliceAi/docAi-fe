import type { Board } from '../../dev/types'

// 이 폴더의 와이어프레임 보드. 화면을 만들면 render에 그 보드 상태를 mock 데이터로 그려 연결한다.
export const scheduleBoards: Board[] = [
  { id: 'S13_일정등록_신규', owner: '구자건', path: '/schedules/new' },
  { id: 'S13_일정등록_날짜누락충돌', owner: '구자건', path: '/schedules/new' },
  { id: 'S13_일정등록_저장실패', owner: '구자건', path: '/schedules/new' },
  { id: 'S13_일정등록_변경등록', owner: '구자건', path: '/schedules/new' },
  { id: 'S14_내일정_목록', owner: '구자건', path: '/schedules' },
  { id: 'S14_내일정_달력', owner: '구자건', path: '/schedules' },
  { id: 'S14_내일정_빈상태', owner: '구자건', path: '/schedules' },
  { id: 'S14_일정상세', owner: '구자건', path: '/schedules/1' },
]
