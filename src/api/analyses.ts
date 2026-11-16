import { mockAnalysis, mockClause, mockRequestedAnalysis } from './mocks/analyses'
import { mockResponse, shouldMock } from './mock-mode'
import { jsonBody, request } from './request'

// 응답 상세는 API 명세에 아직 없다. 와이어프레임 S07~S09 기준으로 정했고, 실제 연결 때 test-api로 맞춘다.

/** IN_PROGRESS 분석 중 · COMPLETED 완료 · PARTIAL 일부 확인 필요 · FAILED 실패 */
export type AnalysisStatus = 'IN_PROGRESS' | 'COMPLETED' | 'PARTIAL' | 'FAILED'

/** 값이 어디서 왔는지: 계약서에 적힘 · 직접 입력 · 조건 검토 필요 */
export type ValueSource = 'written' | 'typed' | 'review'

export type KeyTerm = { label: string; value: string | null; source: ValueSource }

/** 우선 확인할 조항 */
export type Finding = {
  clauseId: number
  title: string
  level: 'check' | 'missing'
  summary: string
  lawName: string
  lawUrl: string
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

export type Clause = {
  clauseId: number
  title: string
  pageNo: number
  originalText: string
  easyExplanation: string
  lawName: string
  lawUrl: string
}

/** POST /api/contracts/{contractId}/analyses */
export function requestAnalysis(contractId: number): Promise<{ analysisId: number; status: AnalysisStatus }> {
  if (shouldMock('requestAnalysis')) return mockResponse({ ...mockRequestedAnalysis })
  return request(`/api/contracts/${contractId}/analyses`, { method: 'POST' })
}

/** GET /api/analyses/{analysisId}. S07 분석 중에는 이 응답의 status로 진행 상태를 본다(백엔드에 확인 중) */
export function getAnalysis(analysisId: number): Promise<Analysis> {
  if (shouldMock('getAnalysis')) return mockResponse({ ...mockAnalysis, analysisId })
  return request(`/api/analyses/${analysisId}`)
}

/** GET /api/analyses/samples/{documentTypeCode}: 홈 "예시 계약서로 먼저 해보기" */
export function getSampleAnalysis(documentTypeCode: string): Promise<Analysis> {
  if (shouldMock('getSampleAnalysis')) return mockResponse({ ...mockAnalysis, documentTypeCode })
  return request(`/api/analyses/samples/${documentTypeCode}`)
}

/** POST /api/analyses/{analysisId}/manual-inputs: 읽지 못한 칸을 직접 입력 */
export function submitManualInputs(analysisId: number, inputs: { label: string; value: string }[]): Promise<Analysis> {
  if (shouldMock('submitManualInputs')) return mockResponse({ ...mockAnalysis, analysisId, status: 'COMPLETED' })
  return request(`/api/analyses/${analysisId}/manual-inputs`, jsonBody('POST', { inputs }))
}

/** GET /api/analyses/{analysisId}/clauses/{clauseId} */
export function getClause(analysisId: number, clauseId: number): Promise<Clause> {
  if (shouldMock('getClause')) return mockResponse({ ...mockClause, clauseId })
  return request(`/api/analyses/${analysisId}/clauses/${clauseId}`)
}
