import type { Board } from '../../dev/types'

// 이 폴더의 와이어프레임 보드. 화면을 만들면 render에 그 보드 상태를 mock 데이터로 그려 연결한다.
export const myContractsBoards: Board[] = [
  { id: 'S15_내계약서_목록', owner: '구자건', path: '/contracts' },
  { id: 'S15_내계약서_빈상태', owner: '구자건', path: '/contracts' },
  { id: 'S15_내계약서_문서상세', owner: '구자건', path: '/contracts/1' },
]
