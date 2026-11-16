import type { Analysis, AnalysisStatus, Clause } from '../analyses'

export const mockRequestedAnalysis: { analysisId: number; status: AnalysisStatus } = { analysisId: 1, status: 'IN_PROGRESS' }

// 보드 상태별 응답(일부 확인 필요, 임대차 등)은 화면 담당자가 이 파일에 추가한다
export const mockAnalysis: Analysis = {
  analysisId: 1,
  contractId: 1,
  documentTypeCode: 'LABOR',
  documentTitle: '카페 알바 근로계약서',
  status: 'COMPLETED',
  keyTerms: [
    { label: '시급', value: '10,030원', source: 'written' },
    { label: '근로 시작일', value: '2026.12.05', source: 'written' },
  ],
  findings: [
    {
      clauseId: 3,
      title: '주휴수당',
      level: 'check',
      summary: '주 15시간 이상 일하면 주휴수당을 받을 수 있어요. 계약서에는 적혀 있지 않아요.',
      lawName: '근로기준법 제55조',
      lawUrl: 'https://www.law.go.kr',
    },
  ],
  unreadablePages: [],
}

export const mockClause: Clause = {
  clauseId: 3,
  title: '주휴수당',
  pageNo: 1,
  originalText: '제5조(임금) 시급은 10,030원으로 한다.',
  easyExplanation: '주 15시간 이상 일하면 일주일에 하루치 임금을 더 받을 수 있어요.',
  lawName: '근로기준법 제55조',
  lawUrl: 'https://www.law.go.kr',
}
