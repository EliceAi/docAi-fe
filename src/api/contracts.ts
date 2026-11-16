import { mockContractDetail, mockCreatedContract, mockMyContracts } from './mocks/contracts'
import { mockResponse, shouldMock } from './mock-mode'
import { jsonBody, request } from './request'

// 계약서 등록 응답은 민서 님 브랜치(feat/ELICE-12-contract-registration) 기준, 나머지 상세는 와이어프레임 S06·S15 기준이다.

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
}

export type ContractDetail = ContractSummary & { pageCount: number; scheduleIds: number[] }

/**
 * POST /api/contracts (multipart)
 * idempotencyKey: 같은 등록을 다시 시도할 때 같은 값을 보내면 계약서가 두 번 만들어지지 않는다.
 */
export function createContract(input: CreateContractInput, idempotencyKey: string): Promise<CreatedContract> {
  if (shouldMock('createContract')) return mockResponse(mockCreatedContract)
  const form = new FormData()
  form.append('documentTypeCode', input.documentTypeCode)
  input.pages.forEach((page, index) => form.append('pages', page, `page-${index + 1}.png`))
  form.append('maskedCounts', JSON.stringify(input.maskedCounts))
  return request('/api/contracts', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: form })
}

/** PATCH /api/contracts/{contractId} */
export function changeDocumentType(contractId: number, documentTypeCode: string): Promise<CreatedContract> {
  if (shouldMock('changeDocumentType')) return mockResponse({ ...mockCreatedContract, contractId, documentTypeCode })
  return request(`/api/contracts/${contractId}`, jsonBody('PATCH', { documentTypeCode }))
}

/** PUT /api/contracts/{contractId}/pages/{pageNo}: 흐린 쪽만 다시 찍어 올린다 */
export function reuploadPage(contractId: number, pageNo: number, page: Blob, maskedCount: number): Promise<CreatedContract> {
  if (shouldMock('reuploadPage')) return mockResponse({ ...mockCreatedContract, contractId })
  const form = new FormData()
  form.append('page', page, `page-${pageNo}.png`)
  form.append('maskedCount', String(maskedCount))
  return request(`/api/contracts/${contractId}/pages/${pageNo}`, { method: 'PUT', body: form })
}

/** POST /api/contracts/{contractId}/archive: 내 계약서에 보관 */
export function archiveContract(contractId: number): Promise<ContractSummary> {
  if (shouldMock('archiveContract')) return mockResponse({ ...mockMyContracts[0], contractId })
  return request(`/api/contracts/${contractId}/archive`, { method: 'POST' })
}

/** GET /api/contracts: 내 계약서 목록 */
export function getMyContracts(): Promise<ContractSummary[]> {
  if (shouldMock('getMyContracts')) return mockResponse(mockMyContracts)
  return request('/api/contracts')
}

/** GET /api/contracts/{contractId} */
export function getMyContract(contractId: number): Promise<ContractDetail> {
  if (shouldMock('getMyContract')) return mockResponse({ ...mockContractDetail, contractId })
  return request(`/api/contracts/${contractId}`)
}

/**
 * GET /api/contracts/{contractId}/pages/{pageNo}: 가린 쪽 이미지
 * 이미지 응답이라 공통 응답(JSON)과 모양이 다르다. 백엔드 API가 나오면 test-api로 받는 방법을 정한다.
 */
export function getContractPageImageUrl(contractId: number, pageNo: number): string {
  return `/api/contracts/${contractId}/pages/${pageNo}`
}
