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

// S12의 문구·금액·기간·출처는 와이어프레임 그대로다.
export const mockComparison: Comparison = {
  comparisonId: 1,
  previousContractId: 4,
  currentContractId: 2,
  documentTitle: '역삼동 원룸 월세 계약서',
  documentTypeCode: 'LEASE',
  previousVersion: 1,
  currentVersion: 2,
  previousDate: '11.05',
  currentDate: '오늘',
  changes: [
    { kind: 'amount', label: '월세', before: '월 55만 원', after: '월 58만 원', pageNo: 1,
      note: '매달 3만 원, 2년이면 72만 원 늘어요', source: 'written' },
    { kind: 'date', label: '계약 기간', before: '2026.11.20 ~ 2028.11.19', after: '2026.12.01 ~ 2028.11.30', pageNo: 1,
      note: '입주·전입신고 날짜와 계약 종료일이 바뀌어요', source: 'written' },
    { kind: 'added', label: '특약 3', before: null, after: '"반려동물을 키울 수 없다."', pageNo: 2,
      note: '새로 생긴 의무예요', source: 'written' },
  ],
  unreadLabels: ['제5조 관리비 포함 항목'],
  unreadFields: [{ label: '제5조 관리비 포함 항목', location: '수정본 2쪽 아래 칸', title: '제5조 관리비', pageNo: 2,
    before: '관리비에는 인터넷 요금이 포함된다.', exampleInput: '관리비에는 인터넷·수도 요금이 포함된다.' }],
  unchangedSummary: '보증금 1,000만 원 · 관리비 7만 원 · 특약 1~2',
}

export const mockFilledComparison: Comparison = {
  ...mockComparison,
  changes: [...mockComparison.changes, {
    kind: 'manual', source: 'typed', label: '제5조 관리비 포함 항목',
    before: '"관리비에는 인터넷 요금이 포함된다."', after: '"관리비에는 인터넷·수도 요금이 포함된다."', pageNo: 2,
    note: '내가 직접 입력한 내용이에요. 원문 글자를 다시 읽은 결과는 아니에요.',
  }],
  unreadLabels: [],
  unreadFields: [],
}

// 근로·임대차도 예시를 유지하고, 나머지 21종은 항상 mock 결과로만 처리한다.
export const mockEmploymentComparison: Comparison = {
  comparisonId: 50, previousContractId: 1, currentContractId: 1001, documentTypeCode: 'EMPLOYMENT',
  documentTitle: '카페 알바 근로계약서', previousVersion: 1, currentVersion: 2, previousDate: '11.05', currentDate: '오늘',
  changes: [{ kind: 'date', source: 'written', label: '계약 기간', before: '2026.12.01 ~ 2027.02.28', after: '2026.12.01 ~ 2027.03.31', pageNo: 1 }],
  unreadLabels: [], unreadFields: [],
}

export const mockGeneralComparisons: Comparison[] = mockDocumentTypes
  .filter(type => type.code !== 'EMPLOYMENT' && type.code !== 'LEASE')
  .map((type, index) => ({
    comparisonId: 100 + index, previousContractId: 100 + index, currentContractId: 1100 + index,
    documentTypeCode: type.code, documentTitle: `${type.name} 예시`,
    previousVersion: 1, currentVersion: 2, previousDate: '11.05', currentDate: '오늘',
    // 바뀐 항목 이름은 그 문서에서 확인하는 첫 항목(예: 등기부등본 → 소유자). 값은 예시임을 문구로 드러낸다
    changes: [{ source: 'written', label: type.checkNote.split(/[,·]/)[0].trim(), before: '"이전본 내용 (예시)"', after: '"수정본에서 바뀐 내용 (예시)"', pageNo: 1,
      note: `${type.name}에서 확인할 것: ${type.checkNote}` }],
    unreadLabels: [], unreadFields: [],
  }))

export const mockComparisonResults = [mockComparison, mockEmploymentComparison, ...mockGeneralComparisons]
