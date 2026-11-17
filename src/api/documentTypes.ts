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
  /** A 깊게 점검(확인할 조항·근거 조문까지) · B 공통 점검(공통 항목과 기한) */
  grade: 'A' | 'B'
  /** 이 문서에서 확인하는 것 ("보증금 미반환 시 절차 안내"의 "이사 전 임차권등기") */
  checkNote: string
  /** 급하게 알려야 하는 한 줄 ("이사 전 확인"). 없으면 표시하지 않는다 */
  urgentNote?: string
  /** 이름·설명에 없어도 이 단어로 검색되게 하는 말 (임대차계약서 ← 보증금) */
  keywords?: string[]
  /** 검색 결과 줄에 목록 설명 대신 보여 줄 짧은 설명. 없으면 checkNote를 쓴다 */
  searchNote?: string
  /** false면 목록에는 보이지만 아직 분석하지 않는다 */
  supported: boolean
}

/** GET /api/document-types */
export function getDocumentTypes(): Promise<DocumentType[]> {
  if (shouldMock('getDocumentTypes')) return mockResponse(mockDocumentTypes)
  return request('/api/document-types')
}
