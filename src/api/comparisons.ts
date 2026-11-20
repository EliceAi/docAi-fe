import { mockDocumentTypes } from './mocks/documentTypes'
import { mockComparisonDocuments, mockComparisonPreview, mockComparisonResults } from './mocks/comparisons'
import { getMockContract, getMyContract, reuploadPage, saveMockContract } from './contracts'
import { getMockSchedules, normalizeDate, replaceMockSchedules } from './schedules'
import { getAnalysisProgress, requestAnalysis } from './analyses'
import { mockResponse, shouldMock } from './mock-mode'
import { jsonBody, request } from './request'
import { toComparison, toComparisonPreview, type BackendComparison } from './backendResponses'

// 응답 상세는 API 명세에 아직 없다. 와이어프레임 S11·S12 기준으로 정했고, 실제 연결 때 test-api로 맞춘다.

/** FULL 비교 가능 · PARTIAL 일부만 가능 · NONE 비교 불가 */
export type Comparability = 'FULL' | 'PARTIAL' | 'NONE'

export type ComparisonPreview = { comparability: Comparability; reason: string | null }

export type Change = {
  label: string
  before: string | null
  after: string | null
  pageNo: number
  kind?: 'amount' | 'date' | 'added' | 'removed' | 'manual'
  note?: string
  source?: 'written' | 'typed'
}

export type UnreadComparisonField = {
  /** 직접 입력할 때 보내는 비교 못 한 곳 번호(명세). mock 예시는 없을 수 있다 */
  uncomparedId?: number
  label: string
  location: string
  title: string
  before: string
  pageNo: number
  /** 보드 시연용 입력 예시. 실제로 읽은 결과가 아니다. */
  exampleInput?: string
  side?: 'previous' | 'current'
}

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
      documentTypeName: mockDocumentTypes.find(type => type.code === contract.documentTypeCode)?.name ?? '계약서',
      title: contract.title, version: contract.version, analyzedAt: contract.savedAt.slice(5).replace('-', '.'), pageCount: contract.pageCount || null,
    }
  }
  const [before, after] = await Promise.all([load(previous), load(current)])
  return [before, { ...after, title: after.title.endsWith(' (수정)') ? after.title : after.title + ' (수정)', uploaded: true }]
}

const createdComparisons = new Map<number, Comparison>()

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
const createdStorageKey = 'docai.comparison-created.v1'
let nextComparisonId = Math.max(...mockComparisonResults.map(result => result.comparisonId)) + 1

function validComparisonId(comparisonId: number) {
  if (!Number.isSafeInteger(comparisonId) || comparisonId <= 0) throw new Error('비교 결과를 찾을 수 없어요.')
}

function mockOnlyResult(comparisonId: number) {
  restoreCreatedResults()
  if (createdComparisons.has(comparisonId)) return true
  const result = mockComparisonResults.find(result => result.comparisonId === comparisonId)
  return !!result && result.documentTypeCode !== 'EMPLOYMENT' && result.documentTypeCode !== 'LEASE'
}

function restoreCreatedResults() {
  try {
    const saved = typeof window !== 'undefined' && window.sessionStorage.getItem(createdStorageKey)
    if (!saved) return
    const stored = JSON.parse(saved) as { nextId: number; results: Comparison[] }
    if (!Array.isArray(stored.results)) return
    for (const result of stored.results) {
      if (Number.isSafeInteger(result.comparisonId) && result.comparisonId > 120
          && validPair(result.previousContractId, result.currentContractId)
          && mockComparisonDocuments.some(document => document.contractId === result.previousContractId)
          && mockComparisonDocuments.some(document => document.contractId === result.currentContractId)
          && Array.isArray(result.changes) && Array.isArray(result.unreadLabels) && Array.isArray(result.unreadFields)
          && !createdComparisons.has(result.comparisonId)) createdComparisons.set(result.comparisonId, result)
    }
    nextComparisonId = Math.max(nextComparisonId, ...[...createdComparisons.keys()].map(id => id + 1),
      Number.isSafeInteger(stored.nextId) && stored.nextId > 120 ? stored.nextId : 121)
  } catch { /* 새로고침 복원이 안 되면 현재 탭의 비교를 계속 사용한다. */ }
}

function persistCreatedResults() {
  try {
    if (typeof window !== 'undefined') window.sessionStorage.setItem(createdStorageKey,
      JSON.stringify({ nextId: nextComparisonId, results: [...createdComparisons.values()] }))
  } catch { /* 저장 공간을 쓸 수 없어도 현재 탭의 결과는 유지한다. */ }
}

function originalMockResult(comparisonId: number) {
  restoreCreatedResults()
  return createdComparisons.get(comparisonId) ?? mockComparisonResults.find(result => result.comparisonId === comparisonId)
}

function readMockResult(comparisonId: number): Comparison {
  validComparisonId(comparisonId)
  const original = originalMockResult(comparisonId)
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
  // 명세 파라미터 이름은 revisedContractId(수정본)다
  return request<Parameters<typeof toComparisonPreview>[0]>(`/api/comparisons/preview?previousContractId=${previousContractId}&revisedContractId=${currentContractId}`).then(toComparisonPreview)
}

// 비교 응답에는 이전본·수정본 계약서 번호가 없다(명세). 비교를 만들 때 알던 번호를 기억해 두고 결과에 붙인다
const comparisonContracts = new Map<number, { previousContractId: number; currentContractId: number }>()
export const knownComparisonContracts = (comparisonId: number) => comparisonContracts.get(comparisonId)

/** POST /api/comparisons: 수정본 비교 */
export async function createComparison(previousContractId: number, currentContractId: number): Promise<{ comparisonId: number }> {
  if (!validPair(previousContractId, currentContractId)) throw new Error('비교할 문서를 확인해 주세요.')
  if (isMockOnly(previousContractId) || isMockOnly(currentContractId) || shouldMock('createComparison')) {
    const preview = await previewComparison(previousContractId, currentContractId)
    if (preview.comparability === 'NONE') throw new Error(preview.reason ?? '비교할 수 없어요.')
    restoreCreatedResults()
    const existing = [...createdComparisons.values()].find(result => result.previousContractId === previousContractId && result.currentContractId === currentContractId)
    if (existing) return mockResponse({ comparisonId: existing.comparisonId })
    const before = mockComparisonDocuments.find(document => document.contractId === previousContractId)!
    const after = mockComparisonDocuments.find(document => document.contractId === currentContractId)!
    const template = mockComparisonResults.find(result => result.documentTypeCode === before.documentTypeCode)!
    const reversed = (before.version ?? 1) > (after.version ?? 2)
    const comparisonId = nextComparisonId++
    const result: Comparison = {
      ...structuredClone(template), comparisonId, previousContractId, currentContractId,
      documentTitle: after.title, previousVersion: before.version, currentVersion: after.version,
      previousDate: before.analyzedAt, currentDate: after.version === 2 ? '오늘' : after.analyzedAt,
      changes: template.changes.map(change => reversed ? { ...change, before: change.after, after: change.before,
        kind: change.kind === 'added' ? 'removed' : change.kind, note: undefined } : { ...change }),
      unreadFields: template.unreadFields?.map(field => reversed ? {
        ...field, location: field.location.replace('수정본', '이전본'), side: 'previous',
      } : { ...field }),
    }
    createdComparisons.set(comparisonId, result)
    persistCreatedResults()
    return mockResponse({ comparisonId })
  }
  const data = await request<BackendComparison>('/api/comparisons', jsonBody('POST', { previousContractId, revisedContractId: currentContractId }))
  comparisonContracts.set(data.comparisonId, { previousContractId, currentContractId })
  return { comparisonId: data.comparisonId }
}

/** GET /api/comparisons/{comparisonId} */
export async function getComparison(comparisonId: number): Promise<Comparison> {
  validComparisonId(comparisonId)
  if (mockOnlyResult(comparisonId) || shouldMock('getComparison')) return mockResponse(readMockResult(comparisonId))
  const data = await request<BackendComparison>(`/api/comparisons/${comparisonId}`)
  return toComparison(data, comparisonContracts.get(comparisonId) ?? { previousContractId: 0, currentContractId: 0 })
}

/** POST /api/comparisons/{comparisonId}/manual-inputs: 비교하지 못한 칸 직접 입력 */
export async function submitComparisonInputs(comparisonId: number, inputs: { label: string; value: string }[]): Promise<Comparison> {
  validComparisonId(comparisonId)
  if (!inputs.length || inputs.some(input => !input.value.trim())) throw new Error('종이에 적힌 내용을 입력해 주세요.')
  if (mockOnlyResult(comparisonId) || shouldMock('submitComparisonInputs')) {
    const result = readMockResult(comparisonId)
    const labels = new Set<string>()
    for (const input of inputs) {
      const original = originalMockResult(comparisonId)!
      const field = original.unreadFields?.find(field => field.label === input.label)
      if (!field || labels.has(input.label)) throw new Error('직접 입력할 칸을 확인해 주세요.')
      labels.add(input.label)
      const known = `"${field.before}"`; const typed = `"${input.value.trim()}"`
      const change: Change = { label: field.label, before: field.side === 'previous' ? typed : known, after: field.side === 'previous' ? known : typed,
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
  // 명세는 비교 못 한 곳 번호(uncomparedId)와 문장 한 개씩 받는다. 화면이 넘긴 칸 이름으로 번호를 찾아 보낸다
  const current = await getComparison(comparisonId)
  for (const input of inputs) {
    const field = current.unreadFields?.find(field => field.label === input.label)
    if (!field?.uncomparedId) throw new Error('직접 입력할 칸을 확인해 주세요.')
    await request(`/api/comparisons/${comparisonId}/manual-inputs`, jsonBody('POST', { uncomparedId: field.uncomparedId, text: input.value.trim() }))
  }
  return getComparison(comparisonId)
}

/** 수정본 확정 때 함께 바꿀 일정(명세). UPDATE·DELETE는 이전본 일정 번호, CREATE는 수정본 분석의 후보 번호 */
export type ConfirmSchedule = { action: 'UPDATE' | 'CREATE' | 'DELETE'; scheduleId: number | null; candidateId?: number; title?: string; date?: string }
export type ConfirmResult = { contractId: number; version: number; previousVersion: number; savedSchedules: { scheduleId: number; title: string; date: string }[] }
const confirmedRequests = new Map<string, { idempotencyKey: string; content: string; response: ConfirmResult }>()

/**
 * POST /api/comparisons/{comparisonId}/confirm: 수정본을 v2로 보관하고 일정을 한 번에 바꾼다(명세, 한 트랜잭션).
 * S13 "바꿔서 저장"에서만 부른다. 같은 Idempotency-Key로 다시 보내도 한 번만 확정된다.
 */
export async function confirmComparison(comparisonId: number, schedules: ConfirmSchedule[], idempotencyKey: string): Promise<ConfirmResult> {
  validComparisonId(comparisonId)
  if (mockOnlyResult(comparisonId) || shouldMock('confirmComparison')) {
    const result = readMockResult(comparisonId)
    const key = `docai.comparison-confirm.${comparisonId}:${idempotencyKey}`
    const content = JSON.stringify(schedules)
    let cached = confirmedRequests.get(key) ?? null
    try { if (!cached && typeof window !== 'undefined') cached = JSON.parse(window.sessionStorage.getItem(key) ?? 'null') } catch { /* 손상된 저장 데이터는 무시한다. */ }
    if (cached?.idempotencyKey === idempotencyKey) {
      if (cached.content !== content) throw new Error('다른 내용을 확정하려면 새 요청으로 다시 시도해 주세요.')
      return mockResponse(cached.response)
    }
    const before = getMockContract(result.previousContractId)
    const current = getMockContract(result.currentContractId)
    const previousSchedules = getMockSchedules().filter(schedule => schedule.contractId === before.contractId)
    const revisedSchedules = getMockSchedules().filter(schedule => schedule.contractId === current.contractId)
    // 요청 전체를 먼저 검증한다. 잘못된 변경 하나 때문에 나머지가 일부만 저장되지 않게 한다.
    const changes = schedules.map(change => {
      const original = previousSchedules.find(schedule => schedule.scheduleId === change.scheduleId)
      if (!['UPDATE', 'CREATE', 'DELETE'].includes(change.action) || change.action !== 'CREATE' && !original) throw new Error('바꿀 일정을 확인해 주세요.')
      const title = (change.title ?? original?.title ?? '').trim()
      const date = change.action === 'DELETE' ? null : normalizeDate(change.date ?? '')
      if (!title || change.action !== 'DELETE' && !date) throw new Error('저장할 일정의 이름과 날짜를 확인해 주세요.')
      return { ...change, title, date, source: revisedSchedules.find(schedule => schedule.title === title)?.source ?? original?.source ?? 'review' as const }
    })
    const revised = revisedSchedules.map(schedule => ({ title: schedule.title, date: schedule.date, source: schedule.source ?? 'review' as const }))
    for (const change of changes) {
      const index = revised.findIndex(schedule => schedule.title === change.title)
      if (change.action === 'DELETE') { if (index >= 0) revised.splice(index, 1) }
      else {
        const value = { title: change.title, date: change.date!, source: change.source }
        if (index >= 0) revised[index] = value
        else revised.push(value)
      }
    }
    const saved = changes.length ? replaceMockSchedules(current, revised) : revisedSchedules
    const keyTerms = current.contractId >= 1000 ? current.keyTerms.map(term => {
      const change = result.changes.find(change => change.label === term.label || term.label === '기간' && change.label === '계약 기간')
      return change?.after ? { ...term, value: change.after } : term
    }) : current.keyTerms
    saveMockContract({ ...current, keyTerms, previousVersion: { contractId: before.contractId, version: before.version, savedAt: before.savedAt } })
    const response: ConfirmResult = { contractId: current.contractId, version: current.version, previousVersion: before.version,
      savedSchedules: saved.filter(schedule => changes.some(change => change.action !== 'DELETE' && change.title === schedule.title)).map(schedule => ({ scheduleId: schedule.scheduleId, title: schedule.title, date: schedule.date.replaceAll('.', '-') })) }
    confirmedRequests.set(key, { idempotencyKey, content, response })
    try { if (typeof window !== 'undefined') window.sessionStorage.setItem(key, JSON.stringify({ idempotencyKey, content, response })) } catch { /* 현재 탭의 보관·일정 상태는 유지한다. */ }
    return mockResponse(response)
  }
  return request(`/api/comparisons/${comparisonId}/confirm`, { ...jsonBody('POST', { schedules }), headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey } })
}

/** POST /api/comparisons/{comparisonId}/discard: 확정하지 않기(v1과 일정 유지) */
export async function discardComparison(comparisonId: number): Promise<void> {
  validComparisonId(comparisonId)
  if (mockOnlyResult(comparisonId) || shouldMock('discardComparison')) {
    readMockResult(comparisonId)
    editedResults.delete(comparisonId)
    createdComparisons.delete(comparisonId)
    persistCreatedResults()
    try {
      if (typeof window !== 'undefined') window.sessionStorage.removeItem(storagePrefix + comparisonId)
    } catch { /* 기존 계약서와 일정은 변경하지 않는다. */ }
    return mockResponse(undefined)
  }
  return request(`/api/comparisons/${comparisonId}/discard`, { method: 'POST' })
}

/** S12 재촬영: 가린 해당 쪽만 사용하고 동일 비교의 나머지 내용·기존 v1·일정을 유지한다. */
export async function reanalyseComparisonPage(comparisonId: number, pageNo: number, maskedPage: Blob, maskedCount: number): Promise<Comparison> {
  validComparisonId(comparisonId)
  if (!Number.isSafeInteger(pageNo) || pageNo <= 0 || !maskedPage.size || !Number.isSafeInteger(maskedCount) || maskedCount < 0) {
    throw new Error('다시 찍은 쪽을 확인해 주세요.')
  }
  const result = await getComparison(comparisonId)
  const fields = result.unreadFields?.filter(field => field.pageNo === pageNo) ?? []
  if (!fields.length) throw new Error('다시 분석할 쪽을 찾을 수 없어요.')
  // 비교·쪽 교체·진행 조회를 실제로 연결하기 전에는 23종 모두 가린 이미지 기반 시연을 쓴다.
  if (mockOnlyResult(comparisonId) || shouldMock('getComparison') || shouldMock('reuploadPage')
      || shouldMock('requestAnalysis') || shouldMock('getAnalysisProgress') || shouldMock('createComparison')) {
    const labels = new Set(fields.map(field => field.label))
    for (const field of fields) {
      if (!field.exampleInput) throw new Error('이 쪽의 재분석 예시가 없어요.')
      const known = `"${field.before}"`; const reread = `"${field.exampleInput}"`
      result.changes.push({ label: field.label, before: field.side === 'previous' ? reread : known,
        after: field.side === 'previous' ? known : reread, source: 'written', pageNo: field.pageNo })
    }
    result.unreadLabels = result.unreadLabels.filter(label => !labels.has(label))
    result.unreadFields = result.unreadFields?.filter(field => !labels.has(field.label))
    saveMockResult(result)
    return mockResponse(result)
  }
  const contractId = fields[0].side === 'previous' ? result.previousContractId : result.currentContractId
  await reuploadPage(contractId, pageNo, maskedPage, maskedCount)
  const analysis = await requestAnalysis(contractId)
  for (let attempt = 0; attempt < 24; attempt++) {
    const progress = await getAnalysisProgress(analysis.analysisId)
    if (progress.status === 'FAILED') throw new Error('다시 찍은 쪽을 분석하지 못했어요.')
    if (progress.status === 'COMPLETED' || progress.status === 'PARTIAL') {
      const comparison = await createComparison(result.previousContractId, result.currentContractId)
      return getComparison(comparison.comparisonId)
    }
    await new Promise(resolve => setTimeout(resolve, 2500))
  }
  throw new Error('분석에 시간이 걸리고 있어요. 잠시 후 다시 시도해 주세요.')
}
