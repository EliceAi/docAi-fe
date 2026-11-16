import type { Board } from '../../dev/types'
import { NotificationsPage } from './NotificationsPage'

// 이 폴더의 와이어프레임 보드. 화면을 만들면 render에 그 보드 상태를 mock 데이터로 그려 연결한다.
export const notificationsBoards: Board[] = [
  { id: 'P01_알림패널', owner: '지희', path: '/notifications', render: () => <NotificationsPage /> },
]
