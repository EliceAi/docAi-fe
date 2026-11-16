import type { DocumentType } from '../documentTypes'

export const mockDocumentTypes: DocumentType[] = [
  { code: 'LEASE', name: '임대차계약서', lane: '집', group: '집 구하기', supported: true },
  { code: 'LEASE_RENEWAL', name: '임대차 갱신 계약서', lane: '집', group: '계약 종료·이사', supported: false },
  { code: 'LABOR', name: '근로계약서', lane: '일', group: '취업·근로 시작', supported: true },
  { code: 'PART_TIME_LABOR', name: '단시간 근로계약서', lane: '일', group: '취업·근로 시작', supported: false },
]
