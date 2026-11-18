import { mockGeneralAnalyses } from './mocks/analyses'
import { mockContractDetails, mockCreatedContract, mockMyContracts } from './mocks/contracts'
import { mockResponse, shouldMock } from './mock-mode'
import { jsonBody, request } from './request'
import { ApiError } from './http'
import { getAccessToken, renewAccessToken } from './users'
import { toMyContractDetail, toMyContracts } from './backendResponses'
import { getMockSchedules } from './schedules'

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
  if (shouldMock('archiveContract')) {
    return mockResponse({ contractId, archived: true, version: 1, savedSchedules: schedules.map((schedule, index) => ({ scheduleId: 1000 + index, title: schedule.title, date: schedule.date })) })
  }
  return request(`/api/contracts/${contractId}/archive`, { ...jsonBody('POST', { schedules }), headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey } })
}

/** GET /api/contracts: 내 계약서 목록 */
export function getMyContracts(): Promise<ContractSummary[]> {
  if (shouldMock('getMyContracts')) {
    const schedules = getMockSchedules()
    return mockResponse(mockMyContracts.map(contract => ({
      ...contract,
      scheduleCount: schedules.filter(schedule => schedule.contractId === contract.contractId).length,
    })))
  }
  return request<Parameters<typeof toMyContracts>[0]>('/api/contracts').then(toMyContracts)
}

/** GET /api/contracts/{contractId} */
export function getMyContract(contractId: number): Promise<ContractDetail> {
  if (shouldMock('getMyContract')) {
    const contract = mockContractDetails.find(detail => detail.contractId === contractId)
    if (!contract) return Promise.reject(new Error('계약서를 찾을 수 없어요.'))
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
