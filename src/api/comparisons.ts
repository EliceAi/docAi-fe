import { mockComparison, mockComparisonPreview } from './mocks/comparisons'
import { mockResponse, shouldMock } from './mock-mode'
import { jsonBody, request } from './request'

// 응답 상세는 API 명세에 아직 없다. 와이어프레임 S11·S12 기준으로 정했고, 실제 연결 때 test-api로 맞춘다.

/** FULL 비교 가능 · PARTIAL 일부만 가능 · NONE 비교 불가 */
export type Comparability = 'FULL' | 'PARTIAL' | 'NONE'

export type ComparisonPreview = { comparability: Comparability; reason: string | null }

export type Change = { label: string; before: string | null; after: string | null; pageNo: number }

export type Comparison = {
  comparisonId: number
  previousContractId: number
  currentContractId: number
  changes: Change[]
  /** 읽지 못해 비교하지 못한 칸 */
  unreadLabels: string[]
}

/** GET /api/comparisons/preview */
export function previewComparison(previousContractId: number, currentContractId: number): Promise<ComparisonPreview> {
  if (shouldMock('previewComparison')) return mockResponse(mockComparisonPreview)
  return request(`/api/comparisons/preview?previousContractId=${previousContractId}&currentContractId=${currentContractId}`)
}

/** POST /api/comparisons: 수정본 비교 */
export function createComparison(previousContractId: number, currentContractId: number): Promise<{ comparisonId: number }> {
  if (shouldMock('createComparison')) return mockResponse({ comparisonId: mockComparison.comparisonId })
  return request('/api/comparisons', jsonBody('POST', { previousContractId, currentContractId }))
}

/** GET /api/comparisons/{comparisonId} */
export function getComparison(comparisonId: number): Promise<Comparison> {
  if (shouldMock('getComparison')) return mockResponse({ ...mockComparison, comparisonId })
  return request(`/api/comparisons/${comparisonId}`)
}

/** POST /api/comparisons/{comparisonId}/manual-inputs: 비교하지 못한 칸 직접 입력 */
export function submitComparisonInputs(comparisonId: number, inputs: { label: string; value: string }[]): Promise<Comparison> {
  if (shouldMock('submitComparisonInputs')) return mockResponse({ ...mockComparison, comparisonId, unreadLabels: [] })
  return request(`/api/comparisons/${comparisonId}/manual-inputs`, jsonBody('POST', { inputs }))
}

/** POST /api/comparisons/{comparisonId}/confirm: 수정본으로 확정(v2) */
export function confirmComparison(comparisonId: number): Promise<{ contractId: number; version: number }> {
  if (shouldMock('confirmComparison')) return mockResponse({ contractId: mockComparison.currentContractId, version: 2 })
  return request(`/api/comparisons/${comparisonId}/confirm`, { method: 'POST' })
}

/** POST /api/comparisons/{comparisonId}/discard: 확정하지 않기(v1과 일정 유지) */
export function discardComparison(comparisonId: number): Promise<void> {
  if (shouldMock('discardComparison')) return mockResponse(undefined)
  return request(`/api/comparisons/${comparisonId}/discard`, { method: 'POST' })
}
