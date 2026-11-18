import type { Comparison, ComparisonPreview } from '../comparisons'
import { mockDocumentTypes } from './documentTypes'

export const mockComparisonPreview: ComparisonPreview = { comparability: 'FULL', reason: null }

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
    changes: [{ kind: 'added', source: 'written', label: '추가 내용', before: null, after: `${type.checkNote} 확인`, pageNo: 1 }],
    unreadLabels: [], unreadFields: [],
  }))

export const mockComparisonResults = [mockComparison, mockEmploymentComparison, ...mockGeneralComparisons]
