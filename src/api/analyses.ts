import { mockClauseDetail, mockDemoEmploymentAnalysis, mockDemoEmploymentClauseDetails, mockFailedAnalysisId, mockFailedProgress, mockGeneralAnalyses, mockLeaseAnalysis, mockLeaseClauseDetail, mockMultipleLawAnalysis, mockMultipleLawClauseDetail, mockPartialAnalysis, mockRequestedAnalysis, mockSimilarAnalysis, mockStoredAnalyses, mockUncertainAnalysis, mockUncertainClauseDetail } from './mocks/analyses'
import { mockResponse, shouldMock } from './mock-mode'
import { jsonBody, request } from './request'
import { ApiError } from './http'
import { toAnalysisProgress, toAnalysisResult, toClauseDetail, type BackendAnalysis, type BackendClause } from './backendResponses'

// 화면 타입은 와이어프레임 S07~S09 기준이고, 백엔드 응답(Notion API 명세 모양)은 backendResponses.ts에서 이 타입으로 바꾼다.

/** IN_PROGRESS 분석 중 · COMPLETED 완료 · PARTIAL 일부 확인 필요 · FAILED 실패 */
export type AnalysisStatus = 'IN_PROGRESS' | 'COMPLETED' | 'PARTIAL' | 'FAILED'

/** S07 분석 중 화면이 쓰는 진행 정보. 백엔드에 진행 상태 확인 방식을 묻는 중이라 모양은 와이어프레임 S07 기준이다. */
export type AnalysisProgress = {
  analysisId: number
  contractId: number
  status: AnalysisStatus
  documentTypeName: string
  /** 분석에 쓰는 가린 이미지 쪽 수. 분석 중에는 서버가 알려 주지 않아 없을 수 있다 */
  pageCount?: number
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
  verdict?: string
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
  similarContract?: { contractId: number; title: string; version?: number; analyzedAt: string; scheduleCount: number }
}

const mockAnalysisOverrides = new Map<number, AnalysisResult>()

function findMockAnalysis(analysisId: number) {
  return mockAnalysisOverrides.get(analysisId)
    ?? [mockDemoEmploymentAnalysis, mockPartialAnalysis, mockLeaseAnalysis, mockSimilarAnalysis, mockUncertainAnalysis, mockMultipleLawAnalysis, ...mockStoredAnalyses, ...mockGeneralAnalyses].find(analysis => analysis.analysisId === analysisId)
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
  verdict?: string
  basisType?: 'RULE' | 'AI_INTERPRETATION' | null
  laws?: { lawName: string; lawText: string; lawUrl: string }[]
  /** 확인이 필요한 조항인지. 백엔드 verdict가 OK면 false. mock은 비워 둔다(확인 필요로 표시) */
  needsCheck?: boolean
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

/** S07 분석 진행 상태. 분석 결과 조회(GET /api/analyses/{analysisId})의 진행 단계·실패 이유를 쓴다. 21종 mock 분석은 백엔드를 부르지 않는다 */
export function getAnalysisProgress(analysisId: number): Promise<AnalysisProgress> {
  const known = findMockAnalysis(analysisId)
  if ((known && !isBackendDocumentType(known.documentTypeCode)) || analysisId === mockFailedAnalysisId || shouldMock('getAnalysisProgress')) {
    if (analysisId === mockFailedAnalysisId) return mockResponse(mockFailedProgress)
    const polls = mockProgressPolls.get(analysisId) ?? 0
    mockProgressPolls.set(analysisId, polls + 1)
    const completedSteps = Math.min(polls, TOTAL_STEPS)
    return mockResponse({
      analysisId,
      contractId: known?.contractId ?? analysisId,
      status: completedSteps >= TOTAL_STEPS ? 'COMPLETED' : 'IN_PROGRESS',
      documentTypeName: known?.documentTypeName ?? '근로계약서',
      pageCount: 2,
      completedSteps,
    })
  }
  return request<BackendAnalysis>(`/api/analyses/${analysisId}`).then(toAnalysisProgress)
}

// 예시 분석은 서버 응답에 분석 번호가 없다. 화면 주소에 쓸 번호를 앱이 정해 두고, 받은 결과·조항을 기억해 둔다
const SAMPLE_ANALYSIS_IDS: Record<string, number> = { EMPLOYMENT: 900001, LEASE: 900002 }
const sampleResults = new Map<number, AnalysisResult>()
const sampleClauses = new Map<string, ClauseDetail>()
const sampleCodeOf = (analysisId: number) => Object.keys(SAMPLE_ANALYSIS_IDS).find(code => SAMPLE_ANALYSIS_IDS[code] === analysisId)

/** GET /api/analyses/{analysisId}: S08 분석 결과 */
export function getAnalysis(analysisId: number): Promise<AnalysisResult> {
  const sample = sampleResults.get(analysisId)
  if (sample) return mockResponse(sample)
  const sampleCode = sampleCodeOf(analysisId)
  if (sampleCode) return getSampleAnalysis(sampleCode) // 새로고침으로 기억이 사라졌으면 예시를 다시 받는다
  const analysis = findMockAnalysis(analysisId)
  if ((analysis && !isBackendDocumentType(analysis.documentTypeCode)) || shouldMock('getAnalysis')) {
    return analysis ? mockResponse(analysis) : Promise.reject(new Error('분석 결과를 찾을 수 없어요.'))
  }
  return request<BackendAnalysis>(`/api/analyses/${analysisId}`).then(data => toAnalysisResult(data))
}

/** GET /api/analyses/samples/{documentTypeCode}: 홈 "예시 계약서로 먼저 해보기" */
export async function getSampleAnalysis(documentTypeCode: string): Promise<AnalysisResult> {
  const mockSample = [mockDemoEmploymentAnalysis, mockLeaseAnalysis, ...mockGeneralAnalyses].find(analysis => analysis.documentTypeCode === documentTypeCode)
  const sampleId = SAMPLE_ANALYSIS_IDS[documentTypeCode]
  if (!sampleId || shouldMock('getSampleAnalysis')) {
    return mockSample ? mockResponse(mockSample) : Promise.reject(new Error('예시 분석 결과를 찾을 수 없어요.'))
  }
  try {
    const data = await request<BackendAnalysis & { clauseDetails: Record<string, Omit<BackendClause, 'clauseId'>> }>(`/api/analyses/samples/${documentTypeCode}`)
    const result = toAnalysisResult({ ...data, sample: true }, sampleId)
    // 예시에서 조항을 누르면 조항 API를 부르지 않고 함께 온 clauseDetails로 그린다(명세)
    for (const [clauseId, clause] of Object.entries(data.clauseDetails ?? {})) {
      sampleClauses.set(`${sampleId}:${clauseId}`, toClauseDetail({ ...clause, clauseId: Number(clauseId) }, { analysisId: sampleId, contractId: 0, documentTitle: result.documentTitle, analyzedAt: result.analyzedAt }))
    }
    sampleResults.set(sampleId, result)
    return result
  } catch (error) {
    // 서버에 예시가 없는 종류(임대차 등)는 앱에 고정한 예시를 쓴다(명세 비고: 앱에 고정해도 된다)
    if (!(error instanceof ApiError) || error.status !== 404 || !mockSample) throw error
    const fallback = { ...mockSample, analysisId: sampleId, isSample: true }
    sampleResults.set(sampleId, fallback)
    return fallback
  }
}

/** POST /api/analyses/{analysisId}/manual-inputs: 읽지 못한 칸을 직접 입력 */
export async function submitManualInputs(analysisId: number, inputs: { label: string; value: string }[]): Promise<AnalysisResult> {
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
  // 명세는 한 번에 한 칸 {label, value}만 받는다. 여러 칸이면 한 칸씩 보낸 뒤 결과를 다시 받는다
  for (const value of values) {
    await request(`/api/analyses/${analysisId}/manual-inputs`, jsonBody('POST', { label: value.label, value: value.value }))
  }
  return getAnalysis(analysisId)
}

/** GET /api/analyses/{analysisId}/clauses/{clauseId} */
export async function getClause(analysisId: number, clauseId: number): Promise<ClauseDetail> {
  const sampleClause = sampleClauses.get(`${analysisId}:${clauseId}`)
  if (sampleClause) return mockResponse(sampleClause)
  const analysis = sampleResults.get(analysisId) ?? findMockAnalysis(analysisId)
  if (sampleCodeOf(analysisId) || (analysis && !isBackendDocumentType(analysis.documentTypeCode)) || shouldMock('getClause')) {
    const clause = [mockClauseDetail, ...mockDemoEmploymentClauseDetails, mockLeaseClauseDetail, mockUncertainClauseDetail, mockMultipleLawClauseDetail].find(clause => clause.contractId === analysis?.contractId && clause.clauseId === clauseId)
    return clause ? mockResponse({ ...clause, analysisId }) : Promise.reject(new Error('조항을 찾을 수 없어요.'))
  }
  // 조항 응답에는 계약서 이름·분석일이 없어 분석 결과에서 함께 받는다
  const [clause, result] = await Promise.all([
    request<BackendClause>(`/api/analyses/${analysisId}/clauses/${clauseId}`),
    getAnalysis(analysisId),
  ])
  return toClauseDetail(clause, { analysisId, contractId: result.contractId, documentTitle: result.documentTitle, analyzedAt: result.analyzedAt })
}
