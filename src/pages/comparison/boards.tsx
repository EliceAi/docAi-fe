import type { Board } from '../../dev/types'

// 이 폴더의 와이어프레임 보드. 화면을 만들면 render에 그 보드 상태를 mock 데이터로 그려 연결한다.
export const comparisonBoards: Board[] = [
  { id: 'S11_비교준비_기본', owner: '구자건', path: '/comparisons/new' },
  { id: 'S11_비교준비_일부만가능', owner: '구자건', path: '/comparisons/new' },
  { id: 'S11_비교준비_비교불가', owner: '구자건', path: '/comparisons/new' },
  { id: 'S12_비교결과_기본', owner: '구자건', path: '/comparisons/1' },
  { id: 'S12_비교결과_직접입력', owner: '구자건', path: '/comparisons/1' },
  { id: 'S12_비교결과_입력반영', owner: '구자건', path: '/comparisons/1' },
  { id: 'S12_비교결과_확정안함', owner: '구자건', path: '/comparisons/1' },
]
