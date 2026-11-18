import { mockComparison, mockComparisonPreview, mockComparisonResults } from './mocks/comparisons'
import { mockResponse, shouldMock } from './mock-mode'
import { jsonBody, request } from './request'

// 응답 상세는 API 명세에 아직 없다. 와이어프레임 S11·S12 기준으로 정했고, 실제 연결 때 test-api로 맞춘다.

/** FULL 비교 가능 · PARTIAL 일부만 가능 · NONE 비교 불가 */
export type Comparability = 'FULL' | 'PARTIAL' | 'NONE'

export type ComparisonPreview = { comparability: Comparability; reason: string | null }

export type Change = {
  label: string
  before: string | null
  after: string | null
  pageNo: number
  kind?: 'amount' | 'date' | 'added' | 'manual'
  note?: string
  source?: 'written' | 'typed'
}

export type UnreadComparisonField = {
  label: string
  location: string
  title: string
  before: string
  pageNo: number
  /** 보드 시연용 입력 예시. 실제로 읽은 결과가 아니다. */
  exampleInput?: string
}

export type Comparison = {
  comparisonId: number
  previousContractId: number
  currentContractId: number
  changes: Change[]
  /** 읽지 못해 비교하지 못한 칸 */
  unreadLabels: string[]
  documentTitle?: string
  documentTypeCode?: string
  previousVersion?: number
  currentVersion?: number
  previousDate?: string
  currentDate?: string
  unchangedSummary?: string
  unreadFields?: UnreadComparisonField[]
}

const editedResults = new Map<number, Comparison>()
const storagePrefix = 'docai.comparison-result.'

function validComparisonId(comparisonId: number) {
  if (!Number.isSafeInteger(comparisonId) || comparisonId <= 0) throw new Error('비교 결과를 찾을 수 없어요.')
}

function mockOnlyResult(comparisonId: number) {
  const result = mockComparisonResults.find(result => result.comparisonId === comparisonId)
  return !!result && result.documentTypeCode !== 'EMPLOYMENT' && result.documentTypeCode !== 'LEASE'
}

function readMockResult(comparisonId: number): Comparison {
  validComparisonId(comparisonId)
  const original = mockComparisonResults.find(result => result.comparisonId === comparisonId)
  if (!original) throw new Error('비교 결과를 찾을 수 없어요.')
  const edited = editedResults.get(comparisonId)
  if (edited) return structuredClone(edited)
  try {
    const saved = typeof window !== 'undefined' && window.sessionStorage.getItem(storagePrefix + comparisonId)
    if (saved) {
      const result = JSON.parse(saved) as Comparison
      if (result.comparisonId === comparisonId && result.previousContractId === original.previousContractId
          && result.currentContractId === original.currentContractId && Array.isArray(result.changes)
          && Array.isArray(result.unreadLabels) && Array.isArray(result.unreadFields)) return result
    }
  } catch { /* 저장 공간을 사용할 수 없으면 메모리의 시연 데이터로 계속한다. */ }
  return structuredClone(original)
}

function saveMockResult(result: Comparison) {
  editedResults.set(result.comparisonId, structuredClone(result))
  try {
    if (typeof window !== 'undefined') window.sessionStorage.setItem(storagePrefix + result.comparisonId, JSON.stringify(result))
  } catch { /* 저장 공간을 사용할 수 없어도 현재 화면에서 입력은 유지한다. */ }
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
export async function getComparison(comparisonId: number): Promise<Comparison> {
  validComparisonId(comparisonId)
  if (mockOnlyResult(comparisonId) || shouldMock('getComparison')) return mockResponse(readMockResult(comparisonId))
  return request(`/api/comparisons/${comparisonId}`)
}

/** POST /api/comparisons/{comparisonId}/manual-inputs: 비교하지 못한 칸 직접 입력 */
export async function submitComparisonInputs(comparisonId: number, inputs: { label: string; value: string }[]): Promise<Comparison> {
  validComparisonId(comparisonId)
  if (!inputs.length || inputs.some(input => !input.value.trim())) throw new Error('종이에 적힌 내용을 입력해 주세요.')
  if (mockOnlyResult(comparisonId) || shouldMock('submitComparisonInputs')) {
    const result = readMockResult(comparisonId)
    const labels = new Set<string>()
    for (const input of inputs) {
      const original = mockComparisonResults.find(result => result.comparisonId === comparisonId)!
      const field = original.unreadFields?.find(field => field.label === input.label)
      if (!field || labels.has(input.label)) throw new Error('직접 입력할 칸을 확인해 주세요.')
      labels.add(input.label)
      const change: Change = { label: field.label, before: `"${field.before}"`, after: `"${input.value.trim()}"`,
        pageNo: field.pageNo, kind: 'manual', source: 'typed',
        note: '내가 직접 입력한 내용이에요. 원문 글자를 다시 읽은 결과는 아니에요.' }
      const existing = result.changes.findIndex(item => item.label === input.label && item.source === 'typed')
      if (existing < 0) result.changes.push(change)
      else result.changes[existing] = change
    }
    result.unreadLabels = result.unreadLabels.filter(label => !labels.has(label))
    result.unreadFields = result.unreadFields?.filter(field => !labels.has(field.label))
    saveMockResult(result)
    return mockResponse(result)
  }
  return request(`/api/comparisons/${comparisonId}/manual-inputs`, jsonBody('POST', { inputs }))
}

/** POST /api/comparisons/{comparisonId}/confirm: 수정본으로 확정(v2) */
export async function confirmComparison(comparisonId: number): Promise<{ contractId: number; version: number }> {
  validComparisonId(comparisonId)
  if (mockOnlyResult(comparisonId) || shouldMock('confirmComparison')) {
    const result = readMockResult(comparisonId)
    return mockResponse({ contractId: result.currentContractId, version: result.currentVersion ?? 2 })
  }
  return request(`/api/comparisons/${comparisonId}/confirm`, { method: 'POST' })
}

/** POST /api/comparisons/{comparisonId}/discard: 확정하지 않기(v1과 일정 유지) */
export async function discardComparison(comparisonId: number): Promise<void> {
  validComparisonId(comparisonId)
  if (mockOnlyResult(comparisonId) || shouldMock('discardComparison')) {
    readMockResult(comparisonId)
    editedResults.delete(comparisonId)
    try {
      if (typeof window !== 'undefined') window.sessionStorage.removeItem(storagePrefix + comparisonId)
    } catch { /* 기존 계약서와 일정은 변경하지 않는다. */ }
    return mockResponse(undefined)
  }
  return request(`/api/comparisons/${comparisonId}/discard`, { method: 'POST' })
}
