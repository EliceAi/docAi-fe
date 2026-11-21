import { mockGeneralAnalyses, mockLeaseAnalysis, mockNormalAnalysis } from './mocks/analyses'
import { mockDocumentTypes } from './mocks/documentTypes'
import { mockContractDetails, mockCreatedContract, mockMyContracts } from './mocks/contracts'
import { mockResponse, shouldMock } from './mock-mode'
import { jsonBody, request } from './request'
import { ApiError } from './http'
import { getAccessToken, renewAccessToken } from './users'
import { toMyContractDetail, toMyContracts } from './backendResponses'
import { getMockSchedules, replaceMockSchedules } from './schedules'

// 계약서 등록(createContract)은 백엔드와 확인을 마쳤다. 나머지 상세는 와이어프레임 S06·S15 기준이다.

export type CreateContractInput = {
  documentTypeCode: string
  /** 가린 뒤의 쪽 이미지. 원본은 보내지 않는다 */
  pages: Blob[]
  /** 쪽마다 가린 곳 개수 (pages와 길이가 같다) */
  maskedCounts: number[]
}

/** POST /api/contracts 응답 */
export type CreatedContract = { contractId: number; documentTypeCode: string; pageCount: number; status: string }

export type ContractSummary = {
  contractId: number
  title: string
  documentTypeCode: string
  lane: '집' | '일'
  /** v1, v2 … 수정본을 확정하면 올라간다 */
  version: number
  savedAt: string
  needsCheckCount: number
  analysisId: number
  missingItemCount?: number
  scheduleCount?: number
  previousVersion?: { contractId: number; version: number; savedAt: string }
}

export type ContractDetail = ContractSummary & {
  pageCount: number
  scheduleIds: number[]
  reviewLabel: string
  keyTerms: { label: string; value: string; state?: 'warn' | 'miss' | 'unk' }[]
  schedules: {
    scheduleId: number
    title: string
    date: string
    daysLeft: number
    source: 'written' | 'typed' | 'review'
  }[]
}

const archivedContracts = new Map<number, ContractDetail>()
const snapshotIds = new Set<number>()
const archiveResponses = new Map<string, { content: string; response: ArchiveResult }>()
const storageKey = 'docai.mock-contracts.v1'
let restored = false

function restoreContracts() {
  if (restored || typeof window === 'undefined') return
  restored = true
  try {
    const data = JSON.parse(window.sessionStorage.getItem(storageKey) ?? 'null') as { contracts?: ContractDetail[]; snapshots?: number[]; responses?: [string, { content: string; response: ArchiveResult }][] } | null
    for (const contract of data?.contracts ?? []) {
      if (Number.isSafeInteger(contract.contractId) && contract.contractId > 0 && typeof contract.title === 'string' && Array.isArray(contract.keyTerms)) archivedContracts.set(contract.contractId, contract)
    }
    for (const [key, response] of data?.responses ?? []) if (typeof key === 'string' && response.response?.archived) archiveResponses.set(key, response)
    for (const id of data?.snapshots ?? []) if (Number.isSafeInteger(id)) snapshotIds.add(id)
  } catch { /* 저장 데이터가 손상되어도 원래 예시로 시작한다. */ }
}

function persistContracts() {
  try {
    if (typeof window !== 'undefined') window.sessionStorage.setItem(storageKey, JSON.stringify({ contracts: [...archivedContracts.values()], snapshots: [...snapshotIds], responses: [...archiveResponses] }))
  } catch { /* 저장 공간을 쓸 수 없어도 현재 탭에서는 계속 사용할 수 있다. */ }
}

/** mock 보관과 비교에서 같은 계약서·버전을 조회한다. 예시 원본은 변경하지 않는다. */
export function getMockContract(contractId: number): ContractDetail {
  restoreContracts()
  const stored = archivedContracts.get(contractId) ?? mockContractDetails.find(contract => contract.contractId === contractId)
  if (stored) return structuredClone(stored)
  // S11의 나머지 22종 수정본 예시는 원본 번호 + 1000을 사용한다.
  const baseId = contractId - 1000
  if (contractId >= 1000 && (archivedContracts.has(baseId) || mockContractDetails.some(contract => contract.contractId === baseId) || mockGeneralAnalyses.some(analysis => analysis.contractId === baseId))) {
    const base = getMockContract(contractId - 1000)
    return { ...base, contractId, version: base.version + 1, previousVersion: { contractId: base.contractId, version: base.version, savedAt: base.savedAt }, schedules: [], scheduleIds: [], scheduleCount: 0 }
  }
  const analysis = [mockNormalAnalysis, mockLeaseAnalysis, ...mockGeneralAnalyses].find(analysis => analysis.contractId === contractId)
  if (!analysis) throw new Error('계약서를 찾을 수 없어요.')
  const document = mockDocumentTypes.find(document => document.code === analysis.documentTypeCode)!
  return {
    contractId, title: analysis.documentTitle, documentTypeCode: analysis.documentTypeCode, lane: document.lane, version: 1,
    savedAt: analysis.analyzedAt.replaceAll('.', '-'), needsCheckCount: analysis.checkCount, analysisId: analysis.analysisId,
    missingItemCount: analysis.missingItems.length, scheduleCount: 0, pageCount: 1, reviewLabel: analysis.reviewLabel,
    keyTerms: analysis.keyTerms.map(term => ({ label: term.label, value: term.value ?? '확인 필요', ...(term.state ? { state: term.state } : {}) })),
    schedules: [], scheduleIds: [],
  }
}

/** 확정된 수정본의 내용과 버전을 내 계약서 조회에 반영한다. 이전본 원문은 보존한다. */
export function saveMockContract(contract: ContractDetail) {
  restoreContracts()
  // 예전 버전을 수정본으로 고르면 기존 이전 버전 링크가 순환하지 않도록 원본을 별도로 보존한다.
  let ancestorId = contract.previousVersion?.contractId
  const visited = new Set<number>()
  while (ancestorId && !visited.has(ancestorId)) {
    visited.add(ancestorId)
    const ancestor = getMockContract(ancestorId)
    if (ancestor.previousVersion?.contractId === contract.contractId) {
      const original = getMockContract(contract.contractId)
      const snapshotId = Math.max(20000, ...archivedContracts.keys()) + 1
      const snapshot = { ...original, contractId: snapshotId }
      archivedContracts.set(snapshotId, snapshot)
      snapshotIds.add(snapshotId)
      replaceMockSchedules(snapshot, original.schedules.map(schedule => ({ title: schedule.title, date: schedule.date, source: schedule.source })))
      archivedContracts.set(ancestorId, { ...ancestor, previousVersion: { contractId: snapshotId, version: original.version, savedAt: original.savedAt } })
      break
    }
    ancestorId = ancestor.previousVersion?.contractId
  }
  archivedContracts.set(contract.contractId, structuredClone(contract))
  persistContracts()
}

/**
 * POST /api/contracts (multipart)
 * idempotencyKey: 같은 등록을 다시 시도할 때 같은 값을 보내면 계약서가 두 번 만들어지지 않는다.
 */
export function createContract(input: CreateContractInput, idempotencyKey: string): Promise<CreatedContract> {
  // 백엔드는 근로·임대차계약서만 받는다(그 밖의 종류는 400). 나머지 21종은 mock 계약서로 끝까지 보여 준다.
  const mockOnly = mockGeneralAnalyses.find(analysis => analysis.documentTypeCode === input.documentTypeCode)
  if (mockOnly) return mockResponse({ ...mockCreatedContract, contractId: mockOnly.contractId, documentTypeCode: input.documentTypeCode, pageCount: input.pages.length })
  if (shouldMock('createContract')) return mockResponse(mockCreatedContract)
  const form = new FormData()
  form.append('documentTypeCode', input.documentTypeCode)
  input.pages.forEach((page, index) => form.append('pages', page, `page-${index + 1}.png`))
  form.append('maskedCounts', JSON.stringify(input.maskedCounts))
  return request('/api/contracts', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: form })
}

/** PATCH /api/contracts/{contractId} */
export function changeDocumentType(contractId: number, documentTypeCode: string): Promise<Pick<CreatedContract, 'contractId' | 'documentTypeCode' | 'status'>> {
  if (shouldMock('changeDocumentType')) return mockResponse({ ...mockCreatedContract, contractId, documentTypeCode })
  return request(`/api/contracts/${contractId}`, jsonBody('PATCH', { documentTypeCode }))
}

/** PUT /api/contracts/{contractId}/pages/{pageNo}: 흐린 쪽만 다시 찍어 올린다 */
export function reuploadPage(contractId: number, pageNo: number, page: Blob, maskedCount: number): Promise<{ contractId: number; pageNo: number; pageCount: number; status: string }> {
  if (shouldMock('reuploadPage')) return mockResponse({ contractId, pageNo, pageCount: mockCreatedContract.pageCount, status: 'DRAFT' })
  const form = new FormData()
  form.append('page', page, `page-${pageNo}.png`)
  form.append('maskedCount', String(maskedCount))
  return request(`/api/contracts/${contractId}/pages/${pageNo}`, { method: 'PUT', body: form })
}

/** POST /api/contracts/{contractId}/archive: 내 계약서에 보관 */
/** 보관할 때 함께 저장할 일정(명세). 일정 없이 보관이면 빈 배열 */
export type ArchiveSchedule = { candidateId: number | null; title: string; date: string; source: 'WRITTEN' | 'MANUAL' | 'REVIEW' }
export type ArchiveResult = { contractId: number; archived: boolean; version: number; savedSchedules: { scheduleId: number; title: string; date: string }[] }

/**
 * POST /api/contracts/{contractId}/archive: 내 계약서에 보관하면서 고른 일정을 한 번에 저장한다(명세).
 * 같은 Idempotency-Key로 다시 보내면 서버가 처음 결과를 돌려줘 일정이 두 번 저장되지 않는다.
 */
export function archiveContract(contractId: number, schedules: ArchiveSchedule[], idempotencyKey: string): Promise<ArchiveResult> {
  const general = mockGeneralAnalyses.some(analysis => analysis.contractId === contractId)
  if (general || shouldMock('archiveContract')) {
    try {
      const contract = getMockContract(contractId)
      const key = `${contractId}:${idempotencyKey}`
      const content = JSON.stringify(schedules)
      const previous = archiveResponses.get(key)
      if (previous) {
        if (previous.content !== content) throw new Error('다른 내용을 저장하려면 새 요청으로 다시 시도해 주세요.')
        return mockResponse(previous.response)
      }
      const saved = replaceMockSchedules(contract, schedules.map(schedule => ({ title: schedule.title, date: schedule.date, source: schedule.source === 'MANUAL' ? 'typed' : schedule.source === 'WRITTEN' ? 'written' : 'review' })))
      saveMockContract(contract)
      const response: ArchiveResult = { contractId, archived: true, version: contract.version, savedSchedules: saved.map(schedule => ({ scheduleId: schedule.scheduleId, title: schedule.title, date: schedule.date.replaceAll('.', '-') })) }
      archiveResponses.set(key, { content, response })
      persistContracts()
      return mockResponse(response)
    } catch (error) { return Promise.reject(error) }
  }
  return request(`/api/contracts/${contractId}/archive`, { ...jsonBody('POST', { schedules }), headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey } })
}

/** GET /api/contracts: 내 계약서 목록 */
export function getMyContracts(): Promise<ContractSummary[]> {
  if (shouldMock('getMyContracts')) {
    restoreContracts()
    const schedules = getMockSchedules()
    const contracts = new Map<number, ContractSummary>(mockMyContracts.map(contract => [contract.contractId, contract]))
    for (const contract of archivedContracts.values()) {
      if (!snapshotIds.has(contract.contractId)) contracts.set(contract.contractId, contract)
    }
    for (const contract of archivedContracts.values()) if (contract.previousVersion) contracts.delete(contract.previousVersion.contractId)
    return mockResponse([...contracts.values()].map(contract => ({
      ...contract,
      scheduleCount: schedules.filter(schedule => schedule.contractId === contract.contractId).length,
    })))
  }
  return request<Parameters<typeof toMyContracts>[0]>('/api/contracts').then(toMyContracts)
}

/** GET /api/contracts/{contractId} */
export function getMyContract(contractId: number): Promise<ContractDetail> {
  const mockOnly = mockGeneralAnalyses.some(analysis => analysis.contractId === contractId || analysis.contractId + 1000 === contractId)
  if (mockOnly || shouldMock('getMyContract')) {
    let contract: ContractDetail
    try { contract = getMockContract(contractId) } catch (error) { return Promise.reject(error) }
    const schedules = getMockSchedules().filter(schedule => schedule.contractId === contractId)
    return mockResponse({
      ...contract,
      scheduleCount: schedules.length,
      scheduleIds: schedules.map(schedule => schedule.scheduleId),
      schedules: schedules.map(schedule => ({
        scheduleId: schedule.scheduleId, title: schedule.title, date: schedule.date,
        daysLeft: schedule.daysLeft, source: schedule.source ?? 'review',
      })),
    })
  }
  return request<Parameters<typeof toMyContractDetail>[0]>(`/api/contracts/${contractId}`).then(toMyContractDetail)
}

// mock 원문 보기용 회색 종이 이미지
const MOCK_PAGE_IMAGE = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#fff"/><g fill="#C5CAD1">' + Array.from({ length: 14 }, (_, i) => `<rect x="48" y="${90 + i * 46}" width="${i % 3 ? 500 : 360}" height="14" rx="4"/>`).join('') + '</g></svg>')

/**
 * GET /api/contracts/{contractId}/pages/{pageNo}: 가린 쪽 이미지(JPEG)
 * 토큰이 필요해 이미지 태그 주소로 바로 쓸 수 없다. 토큰을 붙여 받은 뒤 화면에서 쓸 주소(blob:)로 바꿔 돌려준다.
 * 다 쓴 주소는 URL.revokeObjectURL로 정리한다.
 */
export async function loadContractPageImage(contractId: number, pageNo: number, version?: number): Promise<string> {
  if (shouldMock('loadContractPageImage')) return MOCK_PAGE_IMAGE
  const path = `/api/contracts/${contractId}/pages/${pageNo}${version ? `?version=${version}` : ''}`
  const load = async (token: string) => fetch(path, { headers: { Authorization: `Bearer ${token}` } })
  let response = await load(await getAccessToken())
  if (response.status === 401) response = await load(await renewAccessToken())
  if (!response.ok) throw new ApiError(response.status, null, '원본 이미지를 불러오지 못했어요.')
  return URL.createObjectURL(await response.blob())
}
