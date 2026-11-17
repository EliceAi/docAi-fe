import type { DocumentType } from '../documentTypes'

// 와이어프레임 S02의 23종(집 13 · 일 10). 문구는 와이어프레임 그대로다.
export const mockDocumentTypes: DocumentType[] = [
  // 집 구하기
  { code: 'LEASE', name: '임대차계약서', lane: '집', group: '집 구하기', grade: 'A', checkNote: '임대인 = 등기부 소유자인지, 특약, 관리비', keywords: ['보증금', '월세', '전세'], searchNote: '보증금·월세·관리비 확인', supported: true },
  { code: 'REGISTRY', name: '등기부등본', lane: '집', group: '집 구하기', grade: 'A', checkNote: '소유자, 근저당·가압류, 신탁 여부', supported: false },
  { code: 'BUILDING_LEDGER', name: '건축물대장', lane: '집', group: '집 구하기', grade: 'A', checkNote: '위반건축물, 주택 용도인지', supported: false },
  { code: 'BROKER_EXPLANATION', name: '중개대상물 확인·설명서', lane: '집', group: '집 구하기', grade: 'A', checkNote: '계약서·등기부와 내용 일치', supported: false },
  { code: 'JEONSE_INSURANCE', name: '전세보증보험 안내·가입서', lane: '집', group: '집 구하기', grade: 'B', checkNote: '가입 가능 여부, 보증 한도', keywords: ['보증금'], searchNote: '보증 한도', supported: false },
  { code: 'JEONSE_LOAN', name: '전세자금대출 약정서', lane: '집', group: '집 구하기', grade: 'B', checkNote: '금리 방식, 만기, 연장 조건', supported: false },
  // 입주·거주
  { code: 'MOVE_IN_REPORT', name: '전입신고·확정일자 안내', lane: '집', group: '입주·거주', grade: 'A', checkNote: '입주일 당일 신고', supported: false },
  { code: 'MANAGEMENT_FEE_BILL', name: '관리비 고지서', lane: '집', group: '입주·거주', grade: 'B', checkNote: '계약서와 다른 청구', supported: false },
  { code: 'UTILITY_BILL', name: '공과금 고지서', lane: '집', group: '입주·거주', grade: 'A', checkNote: '납부 기한, 가산금', supported: false },
  { code: 'RENT_INCREASE_NOTICE', name: '보증금·월세 인상 통지', lane: '집', group: '입주·거주', grade: 'A', checkNote: '인상률 상한, 통지 시점', searchNote: '인상률 상한', supported: false },
  // 계약 종료·이사
  { code: 'RENEWAL_NOTICE', name: '갱신·퇴거 통지', lane: '집', group: '계약 종료·이사', grade: 'A', checkNote: '만료 6~2개월 전 통지', supported: false },
  { code: 'RESTORATION_CLAIM', name: '원상복구·정산 요구서', lane: '집', group: '계약 종료·이사', grade: 'B', checkNote: '통상 마모까지 청구하는지', supported: false },
  { code: 'DEPOSIT_RETURN_GUIDE', name: '보증금 미반환 시 절차 안내', lane: '집', group: '계약 종료·이사', grade: 'A', checkNote: '이사 전 임차권등기', urgentNote: '이사 전 확인', searchNote: '임차권등기', supported: false },
  // 취업·근로 시작
  { code: 'LABOR', name: '근로계약서', lane: '일', group: '취업·근로 시작', grade: 'A', checkNote: '필수 기재사항, 최저임금, 주휴수당', supported: true },
  { code: 'SALARY_CONTRACT', name: '연봉계약서', lane: '일', group: '취업·근로 시작', grade: 'A', checkNote: '고정 연장수당이 몇 시간분인지', supported: false },
  { code: 'PROBATION_CONTRACT', name: '수습·인턴 계약서', lane: '일', group: '취업·근로 시작', grade: 'A', checkNote: '수습 감액 기간·대상 조건', supported: false },
  { code: 'FREELANCE_CONTRACT', name: '프리랜서 용역계약서 (3.3%)', lane: '일', group: '취업·근로 시작', grade: 'B', checkNote: '근로자처럼 일하는지, 대금 지급일', supported: false },
  { code: 'NDA_NON_COMPETE', name: '비밀유지·경업금지 서약서', lane: '일', group: '취업·근로 시작', grade: 'B', checkNote: '금지 기간·지역, 배상액', supported: false },
  { code: 'HIRING_DOCUMENTS', name: '입사 서류 요구 목록', lane: '일', group: '취업·근로 시작', grade: 'B', checkNote: '요구하는 서류가 정상인지', urgentNote: '통장·체크카드 요구는 사기 신호', supported: false },
  // 급여·퇴직
  { code: 'PAYSLIP', name: '임금명세서', lane: '일', group: '급여·퇴직', grade: 'A', checkNote: '계약서와 금액 대조', supported: false },
  { code: 'DISMISSAL_NOTICE', name: '해고 통지서', lane: '일', group: '급여·퇴직', grade: 'A', checkNote: '서면 여부, 30일 전 예고', urgentNote: '구제신청 기한 3개월', supported: false },
  { code: 'RESIGNATION', name: '사직서·퇴직 정산', lane: '일', group: '급여·퇴직', grade: 'A', checkNote: '퇴직금 대상 여부', supported: false },
  { code: 'UNEMPLOYMENT_GUIDE', name: '실업급여 안내', lane: '일', group: '급여·퇴직', grade: 'B', checkNote: '자발적 퇴사 예외 사유', supported: false },
]
