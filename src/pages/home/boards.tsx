import { mockSchedules } from '../../api/mocks/schedules'
import type { Board } from '../../dev/types'
import { HomeScreen } from './HomePage'
import { SplashScreen } from './SplashPage'

// 이 폴더의 와이어프레임 보드. 화면을 만들면 render에 그 보드 상태를 mock 데이터로 그려 연결한다.
export const homeBoards: Board[] = [
  { id: 'S01_홈_기본', owner: '김지희', path: '/', render: () => <HomeScreen upcoming={mockSchedules} /> },
  { id: 'S01_홈_첫사용', owner: '김지희', path: '/', render: () => <HomeScreen upcoming={[]} /> },
  { id: 'S00_스플래시', owner: '김지희', path: '/', render: () => <SplashScreen /> },
]
