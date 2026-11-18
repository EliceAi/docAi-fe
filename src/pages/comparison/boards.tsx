import type { Board } from '../../dev/types'
import { mockComparison, mockFilledComparison } from '../../api/mocks/comparisons'
import { ComparisonResultView } from './ComparisonResultPage'

// 이 폴더의 와이어프레임 보드. 담당자가 둘이라 아래 주석으로 구역을 나눴다(같은 줄을 동시에 고치면 git 충돌).
// 화면을 만들면 render에 그 보드 상태를 mock 데이터로 그려 연결한다.
export const comparisonBoards: Board[] = [
  // S11 비교 준비 · #21 구자건
  { id: 'S11_비교준비_기본', owner: '구자건', path: '/comparisons/new' },
  { id: 'S11_비교준비_일부만가능', owner: '구자건', path: '/comparisons/new' },
  { id: 'S11_비교준비_비교불가', owner: '구자건', path: '/comparisons/new' },

  // S12 비교 결과 · #22 구자건 (GitHub 이슈의 최신 담당자)
  { id: 'S12_비교결과_기본', owner: '구자건', path: '/comparisons/1', render: () => <ComparisonResultView key="result-base" comparison={mockComparison} /> },
  { id: 'S12_비교결과_직접입력', owner: '구자건', path: '/comparisons/1', render: () => <ComparisonResultView key="result-manual" comparison={mockComparison} initialPanel="manual" /> },
  { id: 'S12_비교결과_입력반영', owner: '구자건', path: '/comparisons/1', render: () => <ComparisonResultView key="result-filled" comparison={mockFilledComparison} /> },
  { id: 'S12_비교결과_확정안함', owner: '구자건', path: '/comparisons/1', render: () => <ComparisonResultView key="result-discard" comparison={mockComparison} initialPanel="discard" /> },
]
