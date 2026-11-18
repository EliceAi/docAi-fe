import type { Comparison, ComparisonDocument, ComparisonPreview } from '../comparisons'
import { mockContractDetails } from './contracts'
import { mockGeneralAnalyses } from './analyses'
import { mockDocumentTypes } from './documentTypes'

export const mockComparisonPreview: ComparisonPreview = { comparability: 'FULL', reason: null }

export const mockPartialComparisonPreview: ComparisonPreview = {
  comparability: 'PARTIAL',
  reason: '이전본은 2쪽, 수정본은 3쪽이에요. 짝이 없는 3쪽은 "추가된 내용"으로만 보여 드려요.',
}
export const mockUnavailableComparisonPreview: ComparisonPreview = {
  comparability: 'NONE',
  reason: '두 문서의 계약 종류가 달라요 (임대차계약서 · 근로계약서). 같은 계약의 이전본과 수정본만 비교할 수 있어요.',
}

export const mockComparisonDocuments: ComparisonDocument[] = [
  ...mockContractDetails.map(contract => ({
    contractId: contract.contractId,
    documentTypeCode: contract.documentTypeCode,
    documentTypeName: mockDocumentTypes.find(type => type.code === contract.documentTypeCode)!.name,
    title: contract.title,
    version: contract.version,
    analyzedAt: contract.savedAt.slice(5).replace('-', '.'),
    pageCount: contract.pageCount || null,
  })),
  ...mockGeneralAnalyses.map(analysis => ({
    contractId: analysis.contractId, documentTypeCode: analysis.documentTypeCode,
    documentTypeName: analysis.documentTypeName!, title: analysis.documentTitle,
    analyzedAt: analysis.analyzedAt.slice(5), version: 1, pageCount: 1,
  })),
]

// S11 시연용 이전본·수정본. 임대차는 기존 4 → 2를 쓰고, 나머지 22종도 끝까지 비교할 수 있게 한다.
// 쪽 수는 실제 원문에서 읽은 값이 아니라 mock 문서의 예시 값이다.
mockComparisonDocuments.push(...mockComparisonDocuments
  .filter(document => document.documentTypeCode !== 'LEASE')
  .map(document => ({ ...document, contractId: document.contractId + 1000, version: 2 })))

export const mockPreparationDocuments: [ComparisonDocument, ComparisonDocument] = [
  { ...mockComparisonDocuments.find(document => document.contractId === 4)! },
  { ...mockComparisonDocuments.find(document => document.contractId === 2)!, title: '역삼동 원룸 월세 계약서 (수정)', uploaded: true },
]

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
