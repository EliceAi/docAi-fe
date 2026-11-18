import { mockClauseDetail, mockFailedAnalysisId, mockFailedProgress, mockGeneralAnalyses, mockLeaseAnalysis, mockLeaseClauseDetail, mockNormalAnalysis, mockPartialAnalysis, mockRequestedAnalysis, mockSimilarAnalysis, mockStoredAnalyses } from './mocks/analyses'
import { mockResponse, shouldMock } from './mock-mode'
import { jsonBody, request } from './request'

// 응답 상세는 API 명세에 아직 없다. 와이어프레임 S07~S09 기준으로 정했고, 실제 연결 때 test-api로 맞춘다.

/** IN_PROGRESS 분석 중 · COMPLETED 완료 · PARTIAL 일부 확인 필요 · FAILED 실패 */
export type AnalysisStatus = 'IN_PROGRESS' | 'COMPLETED' | 'PARTIAL' | 'FAILED'

/** S07 분석 중 화면이 쓰는 진행 정보. 백엔드에 진행 상태 확인 방식을 묻는 중이라 모양은 와이어프레임 S07 기준이다. */
export type AnalysisProgress = {
  analysisId: number
  contractId: number
  status: AnalysisStatus
  documentTypeName: string
  /** 분석에 쓰는 가린 이미지 쪽 수 */
  pageCount: number
  /** 끝낸 단계 수(0~4). 글자·항목 읽기 → 주요 조건 찾기 → 법령 DB 조문과 맞춰 보기 → 확인할 조항 정리 */
  completedSteps: number
  /** status가 FAILED일 때 분석하지 못한 이유 */
  failures?: { kind: 'BLURRY' | 'TYPE_MISMATCH' | 'TEMPORARY'; title: string; text: string; pageNo?: number }[]
}

/** 값이 어디서 왔는지: 계약서에 적힘 · 직접 입력 · 조건 검토 필요 */
export type ValueSource = 'written' | 'typed' | 'review'

export type KeyTerm = { label: string; value: string | null; source: ValueSource; state?: 'warn' | 'miss' | 'unk' }

/** 우선 확인할 조항 */
export type Finding = {
  clauseId: number
  title: string
  level: 'check' | 'missing'
  summary: string
  lawName: string
  lawUrl: string
  comparison?: { contractLabel: string; contractValue: string; referenceLabel: string; referenceValue: string }
}

export type Analysis = {
  analysisId: number
  contractId: number
  documentTypeCode: string
  documentTitle: string
  status: AnalysisStatus
  keyTerms: KeyTerm[]
  findings: Finding[]
  /** 읽지 못해 다시 찍거나 직접 입력해야 하는 쪽 번호 */
  unreadablePages: number[]
}

/** S08에 표시할 분석 당시의 조건·조항·확인 질문. */
export type AnalysisResult = Analysis & {
  documentTypeName?: string
  version?: number
  /** 전체 조항·기한 등의 집계 정보가 없는 보관 예시는 수치를 단정하지 않는다. */
  summaryAvailable?: boolean
  reviewLabel: string
  analyzedAt: string
  readScope: string
  isSample: boolean
  checkCount: number
  missingItems: { title: string; explanation: string }[]
  clauses: { clauseId: number; number: number; title: string; needsCheck: boolean }[]
  questions: string[]
  dateCount: number
  dateSummary: string
  clauseCount?: number
  deadline?: { title: string; explanation: string }
  unknowns?: { title: string; explanation: string }
  similarContract?: { contractId: number; title: string; version: number; analyzedAt: string; scheduleCount: number }
}

const mockAnalysisOverrides = new Map<number, AnalysisResult>()

function findMockAnalysis(analysisId: number) {
  return mockAnalysisOverrides.get(analysisId)
    ?? [mockNormalAnalysis, mockPartialAnalysis, mockLeaseAnalysis, mockSimilarAnalysis, ...mockStoredAnalyses, ...mockGeneralAnalyses].find(analysis => analysis.analysisId === analysisId)
}

function isBackendDocumentType(code: string) {
  return code === 'EMPLOYMENT' || code === 'LEASE'
}

export type Clause = {
  clauseId: number
  title: string
  pageNo?: number
  originalText: string
  easyExplanation: string
  lawName: string
  lawUrl: string
}

/** S09 상세 화면. 기존 조항 요약에 원문 위치와 근거·확인 질문을 함께 표시한다. */
export type ClauseDetail = Clause & {
  analysisId: number
  contractId: number
  documentTitle: string
  clauseNumber?: number
  locationDescription?: string
  checkReason: string
  lawText: string
  lawAsOf: string
  question: string
}

/** POST /api/contracts/{contractId}/analyses */
export function requestAnalysis(contractId: number): Promise<{ analysisId: number; status: AnalysisStatus }> {
  const mockOnly = mockGeneralAnalyses.find(analysis => analysis.contractId === contractId)
  if (mockOnly) return mockResponse({ analysisId: mockOnly.analysisId, status: mockOnly.status })
  if (shouldMock('requestAnalysis')) return mockResponse({ ...mockRequestedAnalysis })
  // 백엔드 응답에는 진행 단계도 있지만 S07은 아직 mock 진행 상태를 쓴다. 분석 번호와 상태만 받는다.
  return request<{ analysisId: number; status: string }>(`/api/contracts/${contractId}/analyses`, { method: 'POST' })
    .then(({ analysisId, status }) => ({ analysisId, status: status === 'ANALYZING' ? 'IN_PROGRESS' : status as AnalysisStatus }))
}

// mock 진행: 분석마다 확인할 때마다 한 단계씩 끝낸다(몇 번째 확인인지 센다)
const mockProgressPolls = new Map<number, number>()
const TOTAL_STEPS = 4

/** 분석 진행 상태. 백엔드 GET /api/analyses/{analysisId}가 아직 없어 mock으로만 동작한다(READY_APIS에 넣지 않음). */
export function getAnalysisProgress(analysisId: number): Promise<AnalysisProgress> {
  if (shouldMock('getAnalysisProgress')) {
    if (analysisId === mockFailedAnalysisId) return mockResponse(mockFailedProgress)
    const polls = mockProgressPolls.get(analysisId) ?? 0
    mockProgressPolls.set(analysisId, polls + 1)
    const completedSteps = Math.min(polls, TOTAL_STEPS)
    const known = findMockAnalysis(analysisId)
    return mockResponse({
      analysisId,
      contractId: known?.contractId ?? analysisId,
      status: completedSteps >= TOTAL_STEPS ? 'COMPLETED' : 'IN_PROGRESS',
      documentTypeName: known?.documentTypeName ?? '근로계약서',
      pageCount: 2,
      completedSteps,
    })
  }
  return request(`/api/analyses/${analysisId}`)
}

/** GET /api/analyses/{analysisId}. S07 분석 중에는 이 응답의 status로 진행 상태를 본다(백엔드에 확인 중) */
export function getAnalysis(analysisId: number): Promise<AnalysisResult> {
  const analysis = findMockAnalysis(analysisId)
  if ((analysis && !isBackendDocumentType(analysis.documentTypeCode)) || shouldMock('getAnalysis')) {
    return analysis ? mockResponse(analysis) : Promise.reject(new Error('분석 결과를 찾을 수 없어요.'))
  }
  return request(`/api/analyses/${analysisId}`)
}

/** GET /api/analyses/samples/{documentTypeCode}: 홈 "예시 계약서로 먼저 해보기" */
export function getSampleAnalysis(documentTypeCode: string): Promise<Analysis> {
  if (!isBackendDocumentType(documentTypeCode) || shouldMock('getSampleAnalysis')) {
    const analysis = [mockNormalAnalysis, mockLeaseAnalysis, ...mockGeneralAnalyses].find(analysis => analysis.documentTypeCode === documentTypeCode)
    return analysis ? mockResponse(analysis) : Promise.reject(new Error('예시 분석 결과를 찾을 수 없어요.'))
  }
  return request(`/api/analyses/samples/${documentTypeCode}`)
}

/** POST /api/analyses/{analysisId}/manual-inputs: 읽지 못한 칸을 직접 입력 */
export function submitManualInputs(analysisId: number, inputs: { label: string; value: string }[]): Promise<AnalysisResult> {
  const values = inputs.map(input => ({ ...input, value: input.value.trim() }))
  if (values.length === 0 || values.some(input => !input.value)) return Promise.reject(new Error('입력할 값을 확인해 주세요.'))
  const analysis = findMockAnalysis(analysisId)
  if ((analysis && !isBackendDocumentType(analysis.documentTypeCode)) || shouldMock('submitManualInputs')) {
    if (!analysis) return Promise.reject(new Error('분석 결과를 찾을 수 없어요.'))
    if (values.some(input => !analysis.keyTerms.some(term => term.label === input.label && (term.state === 'unk' || term.source === 'typed')))) {
      return Promise.reject(new Error('직접 입력할 항목을 확인해 주세요.'))
    }
    const updated: AnalysisResult = {
      ...analysis,
      keyTerms: analysis.keyTerms.map(term => {
        const input = values.find(value => value.label === term.label)
        return input ? { ...term, value: input.value, source: 'typed', state: undefined } : term
      }),
    }
    mockAnalysisOverrides.set(analysisId, updated)
    return mockResponse(updated)
  }
  return request(`/api/analyses/${analysisId}/manual-inputs`, jsonBody('POST', { inputs: values }))
}

/** GET /api/analyses/{analysisId}/clauses/{clauseId} */
export function getClause(analysisId: number, clauseId: number): Promise<ClauseDetail> {
  const analysis = findMockAnalysis(analysisId)
  if ((analysis && !isBackendDocumentType(analysis.documentTypeCode)) || shouldMock('getClause')) {
    const clause = [mockClauseDetail, mockLeaseClauseDetail].find(clause => clause.contractId === analysis?.contractId && clause.clauseId === clauseId)
    return clause ? mockResponse({ ...clause, analysisId }) : Promise.reject(new Error('조항을 찾을 수 없어요.'))
  }
  return request(`/api/analyses/${analysisId}/clauses/${clauseId}`)
}
