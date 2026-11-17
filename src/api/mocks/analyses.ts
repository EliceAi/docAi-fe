import type { Analysis, AnalysisStatus, Clause, ClauseDetail } from '../analyses'

export const mockRequestedAnalysis: { analysisId: number; status: AnalysisStatus } = { analysisId: 1, status: 'IN_PROGRESS' }

// 보드 상태별 응답(일부 확인 필요, 임대차 등)은 화면 담당자가 이 파일에 추가한다
export const mockAnalysis: Analysis = {
  analysisId: 1,
  contractId: 1,
  documentTypeCode: 'EMPLOYMENT',
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

// S09_조항상세_기본. S08에서 쓰는 기존 예시와 별도로 설계도의 제7조를 보여 준다.
export const mockClauseDetail: ClauseDetail = {
  analysisId: 1,
  contractId: 1,
  clauseId: 1,
  clauseNumber: 7,
  title: '교육비 반환',
  documentTitle: '카페 알바 근로계약서',
  pageNo: 2,
  originalText: '근로자가 계약일로부터 1년 이내에 퇴사하는 경우 교육비 30만 원을 사업주에게 반환한다.',
  locationDescription: '특약 사항 첫 줄',
  easyExplanation: '1년이 되기 전에 그만두면 교육비 30만 원을 돌려줘야 한다는 약속이에요.',
  checkReason: '근로계약을 지키지 않을 때 낼 돈을 미리 정해 두는 건 법으로 금지돼 있어요. 실제 교육이 어떤 성격인지에 따라 판단이 달라질 수 있어요.',
  lawName: '근로기준법 제20조 (위약 예정의 금지)',
  lawText: '사용자는 근로계약 불이행에 대한 위약금 또는 손해배상액을 예정하는 계약을 체결하지 못한다.',
  lawUrl: 'https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0020&lsiSeq=285279&urlMode=lsScJoRltInfoR',
  lawAsOf: '2026.11.12',
  question: '"교육비 반환 조항은 빼 주실 수 있나요?"',
}
