import type { Comparison, ComparisonPreview } from '../comparisons'

export const mockComparisonPreview: ComparisonPreview = { comparability: 'FULL', reason: null }

// 보드 상태별 응답(일부만 가능, 비교 불가 등)은 화면 담당자가 이 파일에 추가한다
export const mockComparison: Comparison = {
  comparisonId: 1,
  previousContractId: 2,
  currentContractId: 3,
  changes: [
    { label: '월세', before: '55만 원', after: '60만 원', pageNo: 1 },
    { label: '계약 종료일', before: '2027.02.28', after: '2027.08.31', pageNo: 1 },
  ],
  unreadLabels: [],
}
