import { describe, expect, it } from 'vitest'
import {
  toChatMessages, toComparison, toComparisonPreview, toMyContractDetail, toMyContracts, toNotifications, toScheduleCandidateSet,
  toScheduleChangeSet, toScheduleDetail,
} from './backendResponses'

// 백엔드가 아직 없는 API. 입력은 Notion API 명세의 응답 예시를 그대로 옮긴 것이다.

describe('일정 후보 toScheduleCandidateSet', () => {
  const set = toScheduleCandidateSet(7, {
    contractId: 12, contractTitle: '카페 알바 근로계약서',
    candidates: [
      { candidateId: 301, title: '첫 출근 (계약 시작일)', date: '2026-12-01', source: 'WRITTEN', location: '1쪽 제1조', pageNo: 1, selected: true, conflictGroup: null },
      { candidateId: 302, title: '최저임금 변경', date: '2027-01-01', source: 'REVIEW', location: '2027년 최저임금 고시 기준', pageNo: null, selected: true, conflictGroup: null },
      { candidateId: 304, title: '계약 종료', date: '2027-02-28', source: 'WRITTEN', location: '1쪽 제1조', pageNo: 1, selected: false, conflictGroup: 'CONTRACT_END' },
    ],
    missing: [{ candidateId: 306, title: '갱신 통보 기한', message: '계약서에 없어요.' }],
  })
  it('후보를 화면 값으로 바꾸고, 계약서에 없는 날짜는 날짜 없는 후보로 붙인다', () => {
    expect(set).toMatchObject({ analysisId: 7, contractId: 12, contractTitle: '카페 알바 근로계약서' })
    expect(set.candidates[0]).toEqual({ candidateId: 301, title: '첫 출근 (계약 시작일)', date: '2026.12.01', source: 'written', where: '1쪽 제1조', recommended: true, conflictGroup: null })
    expect(set.candidates[1].source).toBe('review')
    expect(set.candidates[2].conflictGroup).toBe('CONTRACT_END')
    expect(set.candidates[3]).toEqual({ candidateId: 306, title: '갱신 통보 기한', date: null, source: 'typed', where: '', recommended: false, conflictGroup: null })
  })
})

describe('일정 변경 후보 toScheduleChangeSet', () => {
  it('UPDATE·CREATE·DELETE를 그대로 두고 날짜를 화면 형식으로 바꾼다', () => {
    const set = toScheduleChangeSet(9, {
      contractTitle: '역삼동 원룸 월세 계약서',
      changes: [
        { scheduleId: 51, action: 'UPDATE', title: '입주·전입신고', beforeDate: '2026-11-20', afterDate: '2026-11-27', source: 'WRITTEN' },
        { scheduleId: null, candidateId: 412, action: 'CREATE', title: '임대차 변경 신고', beforeDate: null, afterDate: '2026-12-12', source: 'REVIEW', location: '변경 계약일 + 30일 (법정 기한 계산)' },
        { scheduleId: 53, action: 'DELETE', title: '관리비 납부일', beforeDate: '2026-11-25', afterDate: null, source: 'WRITTEN' },
      ],
    }, { contractId: 15, fromVersion: 1, toVersion: 2 })
    expect(set).toMatchObject({ comparisonId: 9, contractId: 15, contractTitle: '역삼동 원룸 월세 계약서', fromVersion: 1, toVersion: 2 })
    expect(set.changes).toEqual([
      { scheduleId: 51, action: 'UPDATE', title: '입주·전입신고', beforeDate: '2026.11.20', afterDate: '2026.11.27', source: 'written' },
      { scheduleId: null, candidateId: 412, action: 'CREATE', title: '임대차 변경 신고', beforeDate: null, afterDate: '2026.12.12', source: 'review', note: '변경 계약일 + 30일 (법정 기한 계산)' },
      { scheduleId: 53, action: 'DELETE', title: '관리비 납부일', beforeDate: '2026.11.25', afterDate: null, source: 'written' },
    ])
  })
})

describe('내 계약서 toMyContracts / toMyContractDetail', () => {
  it('목록 응답의 items를 화면 목록으로 바꾼다', () => {
    const [item] = toMyContracts({ items: [{ contractId: 15, title: '역삼동 원룸 월세 계약서', documentTypeCode: 'LEASE', documentTypeName: '임대차계약서', category: 'HOME', analyzedAt: '2026-11-12T14:20:00+09:00', version: 2, previousVersionAnalyzedAt: '2026-11-05T10:00:00+09:00', scheduleCount: 3, needsCheckCount: 1, missingCount: 0 }], categoryCounts: { ALL: 1, HOME: 1, WORK: 0 }, page: 0, size: 20, hasNext: false })
    expect(item).toEqual({ contractId: 15, title: '역삼동 원룸 월세 계약서', documentTypeCode: 'LEASE', lane: '집', version: 2, savedAt: '2026-11-12', needsCheckCount: 1, analysisId: 0, missingItemCount: 0, scheduleCount: 3, previousVersion: { contractId: 15, version: 1, savedAt: '2026-11-05' } })
  })
  it('상세 응답은 최신 버전의 분석 번호와 요약·일정을 쓴다', () => {
    const detail = toMyContractDetail({ contractId: 15, title: '역삼동 원룸 월세 계약서', documentTypeCode: 'LEASE', documentTypeName: '임대차계약서', checkLevel: 'A', versions: [{ version: 2, analysisId: 88, analyzedAt: '2026-11-12T14:20:00+09:00', latest: true }, { version: 1, analysisId: 61, analyzedAt: '2026-11-05T10:00:00+09:00', latest: false }], summary: { needsCheckCount: 1, missingCount: 0, totalClauseCount: 11 }, keyTerms: [{ label: '보증금', value: '1,000만 원', state: 'OK', source: 'WRITTEN' }, { label: '임대인', value: null, state: 'MASKED', source: null }], schedules: [{ scheduleId: 51, title: '입주·전입신고', date: '2026-11-20', dDay: 8 }] })
    expect(detail).toMatchObject({ contractId: 15, analysisId: 88, version: 2, lane: '집', reviewLabel: 'A 깊게 점검', needsCheckCount: 1, scheduleIds: [51], previousVersion: { contractId: 15, version: 1, savedAt: '2026-11-05' } })
    expect(detail.keyTerms).toEqual([{ label: '보증금', value: '1,000만 원' }, { label: '임대인', value: '가려서 읽지 않음' }])
    expect(detail.schedules).toEqual([{ scheduleId: 51, title: '입주·전입신고', date: '2026.11.20', daysLeft: 8, source: 'written' }])
  })
})

describe('일정 상세 toScheduleDetail', () => {
  it('출처·근거 위치·연결된 계약서를 옮긴다', () => {
    expect(toScheduleDetail({ scheduleId: 51, title: '입주·전입신고', date: '2026-11-20', dDay: 8, source: 'MANUAL', location: '계약 시작일 · 1쪽 제2조', contract: { contractId: 15, title: '역삼동 원룸 월세 계약서', analyzedAt: '2026-11-05T10:00:00+09:00' } }))
      .toEqual({ scheduleId: 51, title: '입주·전입신고', date: '2026.11.20', daysLeft: 8, source: 'typed', where: '계약 시작일 · 1쪽 제2조', contractId: 15, contractTitle: '역삼동 원룸 월세 계약서', contractAnalyzedAt: '11.05' })
  })
})

describe('비교 toComparisonPreview / toComparison', () => {
  it('IMPOSSIBLE을 비교 불가로 바꾼다', () => {
    expect(toComparisonPreview({ compatibility: 'IMPOSSIBLE', reason: '종류가 달라요', previous: null, revised: null })).toEqual({ comparability: 'NONE', reason: '종류가 달라요' })
    expect(toComparisonPreview({ compatibility: 'FULL', reason: null, previous: null, revised: null })).toEqual({ comparability: 'FULL', reason: null })
  })
  it('바뀐 곳·비교 못 한 곳을 화면 모양으로 바꾸고, 응답에 없는 계약서 번호는 알고 있는 값으로 채운다', () => {
    const comparison = toComparison({
      comparisonId: 9, status: 'PENDING_CONFIRM', compatibility: 'PARTIAL', counts: { changed: 2, added: 1, manual: 0, uncompared: 1 },
      changes: [
        { changeId: 1, type: 'CHANGED', category: 'AMOUNT', label: '월세', before: '월 55만 원', after: '월 58만 원', note: '매달 3만 원 늘어요', source: 'WRITTEN' },
        { changeId: 3, type: 'ADDED', category: 'CLAUSE', label: '특약 3', before: null, after: '반려동물을 키울 수 없다.', note: '새로 생긴 의무예요', source: 'WRITTEN' },
        { changeId: 4, type: 'CHANGED', category: 'CLAUSE', label: '제5조 관리비', before: '인터넷', after: '인터넷·수도', note: null, source: 'MANUAL' },
      ],
      uncompared: [{ uncomparedId: 5, label: '제5조 관리비 포함 항목', location: '수정본 2쪽 아래 칸', reason: '글자가 흐려서 읽지 못했어요.', previousText: '관리비에는 인터넷 요금이 포함된다.' }],
      unchangedSummary: '보증금 1,000만 원',
    }, { previousContractId: 15, currentContractId: 21 })
    expect(comparison).toMatchObject({ comparisonId: 9, previousContractId: 15, currentContractId: 21, unchangedSummary: '보증금 1,000만 원', unreadLabels: ['제5조 관리비 포함 항목'] })
    expect(comparison.changes.map(change => change.kind)).toEqual(['amount', 'added', 'manual'])
    expect(comparison.changes[2].source).toBe('typed')
    expect(comparison.unreadFields).toEqual([{ uncomparedId: 5, label: '제5조 관리비 포함 항목', location: '수정본 2쪽 아래 칸', title: '제5조 관리비 포함 항목', before: '관리비에는 인터넷 요금이 포함된다.', pageNo: 2, side: 'current' }])
  })
})

describe('알림 toNotifications', () => {
  it('종류·부제·이동할 곳을 화면 값으로 바꾼다', () => {
    expect(toNotifications({ unreadCount: 1, items: [
      { notificationId: 3, type: 'SCHEDULE_DUE', title: 'D-8 · 입주·전입신고', subTitle: '역삼동 원룸 월세 계약서', target: { scheduleId: 51 }, read: false, createdAt: '2026-11-12T09:00:00+09:00' },
      { notificationId: 2, type: 'ANALYSIS_FAILED', title: '분석하지 못했어요', subTitle: '카페 알바 근로계약서', target: { analysisId: 88 }, read: true, createdAt: '2026-11-12T14:21:00+09:00' },
      { notificationId: 1, type: 'ANALYSIS_DONE', title: '분석이 끝났어요', subTitle: '삭제된 계약서', target: null, read: true, createdAt: '2026-11-12T14:21:00+09:00' },
    ] })).toEqual([
      { notificationId: 3, kind: 'SCHEDULE', title: 'D-8 · 입주·전입신고', text: '역삼동 원룸 월세 계약서', to: '/schedules/51', read: false },
      { notificationId: 2, kind: 'ANALYSIS_FAILED', title: '분석하지 못했어요', text: '카페 알바 근로계약서', to: '/analyses/88/progress', read: true },
      { notificationId: 1, kind: 'ANALYSIS_DONE', title: '분석이 끝났어요', text: '삭제된 계약서', to: '', read: true },
    ])
  })
})

describe('대화 기록 toChatMessages', () => {
  it('USER·ASSISTANT 메시지와 참고한 정보·이동 버튼을 옮긴다', () => {
    expect(toChatMessages({ conversationId: 3, linkedDocument: null, comparisonId: null, hasMore: false, messages: [
      { messageId: 40, role: 'USER', content: '내 계약 문제없어?', createdAt: '' },
      { messageId: 41, role: 'ASSISTANT', content: '두 가지를 먼저 보세요.', answerType: 'ANSWERED', references: [{ type: 'LAW_DB', label: '근로기준법 제20조' }], partial: null, actions: [{ type: 'OPEN_CLAUSE', label: '근거 조항 보기 (제7조)', params: { analysisId: 88, clauseId: 707 } }], createdAt: '' },
    ] })).toEqual([
      { role: 'me', text: '내 계약 문제없어?' },
      { role: 'ai', text: '두 가지를 먼저 보세요.', status: 'ANSWERED', refs: ['법령 DB'], actions: [{ label: '근거 조항 보기 (제7조)', to: '/analyses/88/clauses/707' }] },
    ])
  })
})
