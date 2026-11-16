import { mockDocumentTypes } from './mocks/documentTypes'
import { mockResponse, shouldMock } from './mock-mode'
import { request } from './request'

// 응답 상세는 API 명세에 아직 없다. 와이어프레임 S02 기준으로 정했고, 실제 연결 때 test-api로 맞춘다.

/** 집 13종 · 일 10종. PoC에서 실제로 분석하는 건 근로계약서·임대차계약서뿐이다 */
export type DocumentType = {
  code: string
  name: string
  lane: '집' | '일'
  /** 집 구하기 · 입주·거주 · 취업·근로 시작 같은 묶음 */
  group: string
  /** false면 목록에는 보이지만 아직 분석하지 않는다 */
  supported: boolean
}

/** GET /api/document-types */
export function getDocumentTypes(): Promise<DocumentType[]> {
  if (shouldMock('getDocumentTypes')) return mockResponse(mockDocumentTypes)
  return request('/api/document-types')
}
