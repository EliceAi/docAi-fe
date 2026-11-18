import { mockComparison, mockComparisonDocuments, mockComparisonPreview } from './mocks/comparisons'
import { getMyContract } from './contracts'
import { mockResponse, shouldMock } from './mock-mode'
import { jsonBody, request } from './request'

// 응답 상세는 API 명세에 아직 없다. 와이어프레임 S11·S12 기준으로 정했고, 실제 연결 때 test-api로 맞춘다.

/** FULL 비교 가능 · PARTIAL 일부만 가능 · NONE 비교 불가 */
export type Comparability = 'FULL' | 'PARTIAL' | 'NONE'

export type ComparisonPreview = { comparability: Comparability; reason: string | null }

export type ComparisonDocument = {
  contractId: number
  documentTypeCode: string
  documentTypeName: string
  title: string
  version?: number
  analyzedAt: string
  pageCount: number | null
  uploaded?: boolean
}

function validPair(previous: number, current: number) {
  return Number.isSafeInteger(previous) && previous > 0 && Number.isSafeInteger(current) && current > 0 && previous !== current
}

function isMockOnly(contractId: number) {
  const document = mockComparisonDocuments.find(document => document.contractId === contractId)
  return !!document && document.documentTypeCode !== 'EMPLOYMENT' && document.documentTypeCode !== 'LEASE'
}

/** S11 카드에 필요한 정보는 기존 계약서 조회를 재사용한다. 21종은 항상 예시로 읽는다. */
export async function getComparisonDocuments(previous: number, current: number): Promise<[ComparisonDocument, ComparisonDocument]> {
  if (!validPair(previous, current)) throw new Error('서로 다른 이전본과 수정본을 골라 주세요.')
  async function load(contractId: number): Promise<ComparisonDocument> {
    if (isMockOnly(contractId) || shouldMock('getMyContract')) {
      const document = mockComparisonDocuments.find(document => document.contractId === contractId)
      if (!document) throw new Error('비교할 계약서를 찾을 수 없어요.')
      return mockResponse(document)
    }
    const contract = await getMyContract(contractId)
    return {
      contractId, documentTypeCode: contract.documentTypeCode,
      documentTypeName: contract.documentTypeCode === 'LEASE' ? '임대차계약서' : '근로계약서',
      title: contract.title, version: contract.version, analyzedAt: contract.savedAt.slice(5).replace('-', '.'), pageCount: contract.pageCount || null,
    }
  }
  const [before, after] = await Promise.all([load(previous), load(current)])
  return [before, { ...after, title: after.title.endsWith(' (수정)') ? after.title : after.title + ' (수정)', uploaded: true }]
}

const createdComparisons = new Map<number, Comparison>()

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
  if (!validPair(previousContractId, currentContractId)) return Promise.reject(new Error('비교할 문서를 확인해 주세요.'))
  if (isMockOnly(previousContractId) || isMockOnly(currentContractId) || shouldMock('previewComparison')) {
    const before = mockComparisonDocuments.find(document => document.contractId === previousContractId)
    const after = mockComparisonDocuments.find(document => document.contractId === currentContractId)
    if (!before || !after) return Promise.reject(new Error('비교할 계약서를 찾을 수 없어요.'))
    if (before.documentTypeCode !== after.documentTypeCode) return mockResponse({
      comparability: 'NONE', reason: `두 문서의 계약 종류가 달라요 (${before.documentTypeName} · ${after.documentTypeName}). 같은 계약의 이전본과 수정본만 비교할 수 있어요.`,
    })
    if (!before.pageCount || !after.pageCount) return mockResponse({ comparability: 'NONE', reason: '비교할 원문 쪽 정보가 없어요. 문서를 다시 올리거나 다른 문서를 골라 주세요.' })
    if (before.pageCount !== after.pageCount) return mockResponse({
      comparability: 'PARTIAL', reason: `이전본은 ${before.pageCount}쪽, 수정본은 ${after.pageCount}쪽이에요. 짝이 없는 ${Math.min(before.pageCount, after.pageCount) + 1}쪽${Math.abs(before.pageCount - after.pageCount) > 1 ? '부터는' : '은'} "${after.pageCount > before.pageCount ? '추가된 내용' : '이전본에만 있는 내용'}"으로만 보여 드려요.`,
    })
    return mockResponse(mockComparisonPreview)
  }
  return request(`/api/comparisons/preview?previousContractId=${previousContractId}&currentContractId=${currentContractId}`)
}

/** POST /api/comparisons: 수정본 비교 */
export async function createComparison(previousContractId: number, currentContractId: number): Promise<{ comparisonId: number }> {
  if (!validPair(previousContractId, currentContractId)) throw new Error('비교할 문서를 확인해 주세요.')
  if (isMockOnly(previousContractId) || isMockOnly(currentContractId) || shouldMock('createComparison')) {
    const preview = await previewComparison(previousContractId, currentContractId)
    if (preview.comparability === 'NONE') throw new Error(preview.reason ?? '비교할 수 없어요.')
    const existing = [...createdComparisons.values()].find(result => result.previousContractId === previousContractId && result.currentContractId === currentContractId)
    if (existing) return mockResponse({ comparisonId: existing.comparisonId })
    const comparisonId = 2 + createdComparisons.size
    createdComparisons.set(comparisonId, { comparisonId, previousContractId, currentContractId, changes: [], unreadLabels: [] })
    return mockResponse({ comparisonId })
  }
  return request('/api/comparisons', jsonBody('POST', { previousContractId, currentContractId }))
}

/** GET /api/comparisons/{comparisonId} */
export function getComparison(comparisonId: number): Promise<Comparison> {
  const created = createdComparisons.get(comparisonId)
  if (created) return mockResponse(created)
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
