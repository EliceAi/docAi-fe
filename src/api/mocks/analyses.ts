import type { Analysis, AnalysisResult, AnalysisStatus, Clause, ClauseDetail } from '../analyses'
import { mockDocumentTypes } from './documentTypes'
import { mockContractDetails } from './contracts'

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
  lawUrl: 'https://www.law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1025590015',
  lawAsOf: '2026.11.12',
  question: '"교육비 반환 조항은 빼 주실 수 있나요?"',
}

// S08_분석결과_정상. 문구·수치·조항 상세 목적지는 와이어프레임의 예시와 같다.
export const mockNormalAnalysis: AnalysisResult = {
  analysisId: 1,
  contractId: 1,
  documentTypeCode: 'EMPLOYMENT',
  documentTitle: '카페 알바 근로계약서',
  status: 'COMPLETED',
  reviewLabel: 'A 깊게 점검',
  analyzedAt: '2026.11.12',
  readScope: '2쪽 모두 읽었어요 · 직접 가린 5곳은 읽지 않았어요',
  isSample: true,
  checkCount: 2,
  keyTerms: [
    { label: '임금', value: '시급 10,000원', source: 'written', state: 'warn' },
    { label: '근로시간', value: '주 20시간', source: 'written' },
    { label: '기간', value: '26.12.01 ~ 27.02.28', source: 'written' },
    { label: '휴일', value: '-', source: 'review', state: 'miss' },
    { label: '수당', value: '주휴수당 표시 없음', source: 'review', state: 'miss' },
    { label: '근무 장소', value: '카페 매장', source: 'written' },
  ],
  findings: [
    {
      clauseId: 1,
      title: '시급이 2026년 최저임금보다 낮아요',
      level: 'check',
      summary: '시간당 320원, 주 20시간이면 한 달 약 27,800원 적게 받아요.',
      lawName: '최저임금법 제6조 · 계산은 규칙으로 확인했어요',
      lawUrl: 'https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1031471553',
      comparison: { contractLabel: '계약서 시급', contractValue: '10,000원', referenceLabel: '2026년 최저임금', referenceValue: '10,320원' },
    },
    {
      clauseId: 1,
      title: '"1년 안에 퇴사하면 교육비 30만 원 반환"',
      level: 'check',
      summary: '미리 정한 위약금이나 손해배상은 금지돼 있어서, 법에 어긋날 수 있어요.',
      lawName: '근로기준법 제20조 (위약 예정의 금지) · AI 해석',
      lawUrl: mockClauseDetail.lawUrl,
    },
  ],
  missingItems: [
    { title: '휴일', explanation: '주휴일을 꼭 적어야 해요 · 근로기준법 제17조' },
    { title: '연차유급휴가', explanation: '필수 기재사항이에요 · 근로기준법 제17조' },
  ],
  clauses: [
    { clauseId: 1, number: 1, title: '계약 기간', needsCheck: false },
    { clauseId: 1, number: 2, title: '근무 장소·업무', needsCheck: false },
    { clauseId: 1, number: 3, title: '근로시간·휴게', needsCheck: false },
    { clauseId: 1, number: 4, title: '임금', needsCheck: true },
    { clauseId: 1, number: 5, title: '사회보험', needsCheck: false },
    { clauseId: 1, number: 6, title: '계약서 교부', needsCheck: false },
    { clauseId: 1, number: 7, title: '교육비 반환', needsCheck: true },
    { clauseId: 1, number: 8, title: '근무 시간 변경', needsCheck: false },
  ],
  questions: ['"시급을 최저임금 이상으로 고쳐 주실 수 있나요?"', '"주휴일과 연차 규정을 계약서에 넣어 주세요."', '"교육비 반환 조항은 빼 주실 수 있나요?"'],
  dateCount: 4,
  dateSummary: '첫 출근 12.01 · 최저임금 변경 1.01 · 첫 급여일 1.10 · 계약 종료 2.28',
  unreadablePages: [],
}

// S08_분석결과_일부확인필요. 정상 결과와 별도 ID로 부분 분석과 직접 입력을 확인한다.
export const mockPartialAnalysis: AnalysisResult = {
  ...mockNormalAnalysis,
  analysisId: 5,
  status: 'PARTIAL',
  readScope: '1쪽은 모두 읽었고, 2쪽은 일부만 읽었어요',
  keyTerms: [
    ...mockNormalAnalysis.keyTerms.slice(0, 3),
    { label: '휴일', value: '2쪽 흐림', source: 'review', state: 'unk' },
  ],
  findings: [{
    ...mockNormalAnalysis.findings[0],
    summary: '계약서 시급 10,000원 < 최저임금 10,320원',
    lawName: '최저임금법 제6조',
    comparison: undefined,
  }],
  unreadablePages: [2],
}

// S08_분석결과_임대차. S15 문서 상세의 분석 ID 2와 연결한다.
export const mockLeaseAnalysis: AnalysisResult = {
  ...mockNormalAnalysis,
  analysisId: 2,
  contractId: 2,
  documentTypeCode: 'LEASE',
  documentTitle: '역삼동 원룸 월세 계약서',
  readScope: '3쪽 모두 읽었어요 · 직접 가린 5곳은 읽지 않았어요',
  checkCount: 1,
  keyTerms: [
    { label: '보증금', value: '1,000만 원', source: 'written' },
    { label: '월세', value: '58만 원', source: 'written' },
    { label: '관리비', value: '7만 원 · 포함 항목 없음', source: 'review', state: 'miss' },
    { label: '기간', value: '26.12.01 ~ 28.11.30', source: 'written' },
    { label: '특약', value: '3개', source: 'written', state: 'warn' },
    { label: '임대인', value: '가려서 읽지 않음', source: 'review' },
  ],
  findings: [{
    clauseId: 1,
    title: '"퇴실 시 도배·장판 비용은 전액 임차인 부담"',
    level: 'check',
    summary: '평소 쓰면서 생긴 마모까지 부담하게 될 수 있어요.',
    lawName: '민법 제654조·제615조 (원상회복) · AI 해석',
    lawUrl: 'https://www.law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=900158560',
  }],
  missingItems: [],
  clauses: [],
  clauseCount: 11,
  questions: [],
  dateCount: 0,
  dateSummary: '',
  deadline: {
    title: '임대차 신고 대상이에요',
    explanation: '월세 30만 원을 넘어서 계약일로부터 30일 안에 신고해야 해요 · 부동산 거래신고 등에 관한 법률',
  },
  unknowns: {
    title: '이 계약서만으로는 알 수 없어요',
    explanation: '임대인이 등기부등본의 소유자와 같은지, 근저당이 있는지는 등기부등본에서 확인해 보세요.',
  },
}

// 임대차 설계도에 없는 조항 번호·쪽 위치는 임의로 채우지 않는다.
export const mockLeaseClauseDetail: ClauseDetail = {
  analysisId: mockLeaseAnalysis.analysisId,
  contractId: mockLeaseAnalysis.contractId,
  clauseId: 1,
  title: '도배·장판 비용 부담',
  documentTitle: mockLeaseAnalysis.documentTitle,
  originalText: '퇴실 시 도배·장판 비용은 전액 임차인 부담',
  easyExplanation: '퇴실할 때 도배·장판 비용을 모두 임차인이 부담한다는 내용이에요.',
  checkReason: mockLeaseAnalysis.findings[0].summary,
  lawName: '민법 제654조·제615조 (원상회복)',
  lawText: '제654조: 제610조제1항, 제615조 내지 제617조의 규정은 임대차에 이를 준용한다. 제615조: 차주가 차용물을 반환하는 때에는 이를 원상에 회복하여야 한다. 이에 부속시킨 물건은 철거할 수 있다.',
  lawUrl: mockLeaseAnalysis.findings[0].lawUrl,
  lawAsOf: mockLeaseAnalysis.analyzedAt,
  question: '"도배·장판 비용을 부담하는 범위를 확인해 주실 수 있나요?"',
}

// S08_비슷한문서확인. 수정본 2와 이전본 4는 내 계약서 예시의 ID를 사용한다.
export const mockSimilarAnalysis: AnalysisResult = {
  ...mockLeaseAnalysis,
  analysisId: 6,
  similarContract: {
    contractId: 4,
    title: '역삼동 원룸 월세 계약서',
    version: 1,
    analyzedAt: '2026.11.05',
    scheduleCount: 3,
  },
}

// S15의 신림동 전세와 역삼동 v1에서 참조하는 분석. v2의 조건·판단을 상속하지 않는다.
export const mockStoredAnalyses: AnalysisResult[] = mockContractDetails
  .filter(contract => contract.analysisId === 3 || contract.analysisId === 4)
  .map<AnalysisResult>(contract => ({
    analysisId: contract.analysisId,
    contractId: contract.contractId,
    documentTypeCode: contract.documentTypeCode,
    documentTitle: contract.title,
    version: contract.version,
    status: 'COMPLETED',
    reviewLabel: contract.reviewLabel,
    analyzedAt: contract.savedAt.replaceAll('-', '.'),
    readScope: `v${contract.version}로 보관한 분석 당시의 조건이에요.`,
    isSample: true,
    summaryAvailable: false,
    checkCount: contract.needsCheckCount,
    keyTerms: contract.keyTerms.length > 0
      ? contract.keyTerms.map(term => ({ ...term, source: 'written' }))
      : [
          { label: '계약 종류', value: contract.analysisId === 3 ? '전세' : '임대차', source: 'written' },
          { label: '보증금', value: null, source: 'review' },
          { label: '기간', value: null, source: 'review' },
        ],
    findings: [],
    missingItems: [],
    clauses: [],
    questions: [],
    dateCount: 0,
    dateSummary: '',
    unreadablePages: [],
    unknowns: {
      title: '원문과 함께 확인해 주세요',
      explanation: contract.keyTerms.length > 0
        ? '보관된 이전 버전의 조건이에요. 조항 원문과 특약 내용은 해당 버전의 계약서에서 확인해 주세요.'
        : '보증금·기간 정보가 없어 확인이 필요해요. 계약서 원문에서 내용을 확인해 주세요.',
    },
  }))

// PoC의 나머지 21종은 문서 목록과 같은 코드·이름으로 공통 확인 항목을 보여 준다.
export const mockGeneralAnalyses: AnalysisResult[] = mockDocumentTypes
  .filter(document => document.code !== 'EMPLOYMENT' && document.code !== 'LEASE')
  .map((document, index) => ({
    analysisId: 100 + index,
    contractId: 100 + index,
    documentTypeCode: document.code,
    documentTypeName: document.name,
    documentTitle: `${document.name} 예시`,
    status: 'COMPLETED',
    reviewLabel: document.grade === 'A' ? 'A 깊게 점검' : 'B 공통 점검',
    analyzedAt: '2026.11.12',
    readScope: '문서에 맞는 확인 항목을 함께 살펴봐요',
    isSample: true,
    checkCount: 0,
    keyTerms: [
      { label: '문서 종류', value: document.name, source: 'written' },
      { label: '분류', value: `${document.lane} · ${document.group}`, source: 'review' },
    ],
    findings: [],
    missingItems: [],
    clauses: [],
    questions: [],
    dateCount: 0,
    dateSummary: '',
    unreadablePages: [],
    unknowns: {
      title: '확인할 내용',
      explanation: document.urgentNote ? `${document.checkNote} · ${document.urgentNote}` : document.checkNote,
    },
  }))
