import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { toAnalysisProgress, toAnalysisResult, toClauseDetail, toDocumentTypes, toUpcomingSchedule, type BackendAnalysis, type BackendClause } from './backendResponses'
import { mockDocumentTypes } from './mocks/documentTypes'
import { mockMultipleLawClauseDetail, mockUncertainAnalysisResponse, mockUncertainClauseResponse } from './mocks/analyses'
import { getAnalysis, getClause } from './analyses'
import { AppPanelsProvider } from '../common/layout/AppPanels'
import { AnalysisResultView } from '../pages/analysis/AnalysisResultPage'
import { ClauseDetailView } from '../pages/analysis/ClauseDetailPage'

afterEach(() => vi.unstubAllEnvs())

function renderView(view: ReactNode) {
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(AppPanelsProvider, null, view)))
}

// 아래 입력은 Notion API 명세의 응답 예시를 그대로 옮긴 것이다.
const completed: BackendAnalysis = {
  analysisId: 88, contractId: 12, version: 1, status: 'COMPLETED', progressStep: 'DONE', readProgress: { done: 1, total: 1 }, failure: null,
  result: {
    title: '카페 알바 근로계약서', documentTypeCode: 'EMPLOYMENT', checkLevel: 'A', analyzedAt: '2026-11-12T14:20:00+09:00',
    coverage: { pageCount: 2, readPages: [1, 2], partialPages: [], maskedCount: 5 },
    keyTerms: [
      { label: '임금', value: '시급 10,000원', state: 'NEEDS_CHECK', source: 'WRITTEN' },
      { label: '휴일', value: null, state: 'MISSING', source: null },
      { label: '근무 장소', value: '카페 매장', state: 'OK', source: 'WRITTEN' },
      { label: '사업주', value: null, state: 'MASKED', source: null },
    ],
    counts: { needsCheck: 2, missing: 2, deadline: 0, totalClauses: 8 },
    priorityClauses: [
      { clauseId: 704, verdict: 'NEEDS_CHECK', title: '시급이 2026년 최저임금보다 낮아요', description: '시간당 320원, 주 20시간이면 한 달 약 27,800원 적게 받아요.', comparison: { leftLabel: '계약서 시급', leftValue: '10,000원', operator: '<', rightLabel: '2026년 최저임금', rightValue: '10,320원' }, laws: [{ lawName: '최저임금법', article: '제6조' }], basisType: 'RULE', relatedClauses: [] },
      { clauseId: 707, verdict: 'NEEDS_CHECK', title: '1년 안에 퇴사하면 교육비 30만 원 반환', description: '계약 기간이 3개월이라 계약대로 일해도 1년 안에 끝나요.', comparison: null, laws: [{ lawName: '근로기준법', article: '제20조' }], basisType: 'AI_INTERPRETATION', relatedClauses: [] },
    ],
    missingItems: [{ name: '휴일', description: '주휴일을 꼭 적어야 해요', dueDate: null, laws: [{ lawName: '근로기준법', article: '제17조' }] }],
    deadlines: [],
    clauses: [
      { clauseId: 707, articleNo: '제7조', title: '교육비 반환', verdict: 'NEEDS_CHECK', pageNo: 2 },
      { clauseId: 706, articleNo: '제6조', title: '사회보험', verdict: 'OK', pageNo: 1 },
    ],
    questionsBeforeSigning: ['시급을 최저임금 이상으로 고쳐 주실 수 있나요?'],
    limitations: [],
    foundDateCount: 4,
    similarContract: null,
    disclaimer: '법률 자문이 아니에요.',
  },
}

describe('toDocumentTypes', () => {
  it('그룹형 응답을 목록으로 펴고, 서버에 없는 검색어·긴급 안내는 같은 코드의 mock에서 붙인다', () => {
    const list = toDocumentTypes({ groups: [{ category: 'HOME', situation: '집 구하기', documentTypes: [{ code: 'LEASE', name: '임대차계약서', description: '임대인 = 등기부 소유자인지, 특약, 관리비', checkLevel: 'A', supported: true }] }] }, mockDocumentTypes)
    const lease = mockDocumentTypes.find(type => type.code === 'LEASE')!
    expect(list).toEqual([{ ...lease, code: 'LEASE', name: '임대차계약서', lane: '집', group: '집 구하기', grade: 'A', checkNote: '임대인 = 등기부 소유자인지, 특약, 관리비', supported: true }])
  })
  it('mock에 없는 코드도 서버 값만으로 그린다', () => {
    const [item] = toDocumentTypes({ groups: [{ category: 'WORK', situation: '급여·퇴직', documentTypes: [{ code: 'NEW_TYPE', name: '새 문서', description: '설명', checkLevel: 'B', supported: false }] }] }, mockDocumentTypes)
    expect(item).toEqual({ code: 'NEW_TYPE', name: '새 문서', lane: '일', group: '급여·퇴직', grade: 'B', checkNote: '설명', supported: false })
  })
  it('프론트 mock 문서 종류 코드 23개가 서버 코드와 같다', () => {
    const backendCodes = ['LEASE', 'REGISTRY', 'BUILDING_REGISTER', 'BROKER_DISCLOSURE', 'DEPOSIT_INSURANCE', 'RENT_LOAN', 'MOVE_IN_GUIDE', 'MAINTENANCE_BILL', 'RENT_INCREASE', 'EMPLOYMENT', 'SALARY', 'PROBATION', 'FREELANCE', 'NON_COMPETE', 'DISMISSAL']
    for (const code of backendCodes) expect(mockDocumentTypes.map(type => type.code)).toContain(code)
    expect(mockDocumentTypes).toHaveLength(23)
  })
})

describe('toUpcomingSchedule', () => {
  it('dDay를 남은 날로, 날짜를 화면 형식으로 바꾼다', () => {
    expect(toUpcomingSchedule({ scheduleId: 51, title: '입주·전입신고', date: '2026-11-20', dDay: 8, contractId: 15, contractTitle: '역삼동 원룸 월세 계약서' }))
      .toEqual({ scheduleId: 51, title: '입주·전입신고', date: '2026.11.20', daysLeft: 8, contractId: 15, contractTitle: '역삼동 원룸 월세 계약서' })
  })
})

describe('toAnalysisProgress', () => {
  it('진행 단계를 끝낸 단계 수로 바꾼다', () => {
    const progress = toAnalysisProgress({ ...completed, status: 'ANALYZING', progressStep: 'MATCHING_LAWS', result: null })
    expect(progress).toMatchObject({ analysisId: 88, contractId: 12, status: 'IN_PROGRESS', completedSteps: 2 })
  })
  it('실패 이유는 하나만, 화면 문구로 바꾼다', () => {
    const failed = (failure: BackendAnalysis['failure']) => toAnalysisProgress({ ...completed, status: 'FAILED', progressStep: 'READING_TEXT', failure, result: null }).failures
    expect(failed({ reason: 'PAGE_UNREADABLE', pageNo: 2, detectedTypeName: null })).toEqual([{ kind: 'BLURRY', title: '사진이 흐려요', text: '2쪽 글자를 읽을 수 없었어요.', pageNo: 2 }])
    expect(failed({ reason: 'TYPE_MISMATCH', pageNo: null, detectedTypeName: '임대차계약서' })).toEqual([{ kind: 'TYPE_MISMATCH', title: '고른 종류와 달라 보여요', text: '고른 종류가 아니라 임대차계약서처럼 보여요.' }])
    expect(failed({ reason: 'TEMPORARY_ERROR', pageNo: null, detectedTypeName: null })).toEqual([{ kind: 'TEMPORARY', title: '잠시 문제가 생겼어요', text: '가린 이미지는 그대로 있어요.' }])
  })
  it('완료되면 쪽 수와 문서 이름을 채운다', () => {
    expect(toAnalysisProgress(completed)).toMatchObject({ status: 'COMPLETED', completedSteps: 4, pageCount: 2, documentTypeName: '근로계약서' })
  })
})

describe('toAnalysisResult', () => {
  const result = toAnalysisResult(completed)
  it('주요 조건의 상태와 출처를 화면 값으로 바꾼다', () => {
    expect(result.keyTerms).toEqual([
      { label: '임금', value: '시급 10,000원', source: 'written', state: 'warn' },
      { label: '휴일', value: '-', source: 'review', state: 'miss' },
      { label: '근무 장소', value: '카페 매장', source: 'written' },
      { label: '사업주', value: '가려서 읽지 않음', source: 'review' },
    ])
  })
  it('우선 확인할 조항을 숫자 비교·근거 법령과 함께 옮긴다', () => {
    expect(result.findings[0]).toMatchObject({ clauseId: 704, level: 'check', title: '시급이 2026년 최저임금보다 낮아요', lawName: '최저임금법 제6조 · 계산은 규칙으로 확인했어요', comparison: { contractLabel: '계약서 시급', contractValue: '10,000원', referenceLabel: '2026년 최저임금', referenceValue: '10,320원' } })
    expect(result.findings[1].lawName).toBe('근로기준법 제20조 · AI 해석')
  })
  it('요약 숫자·조항 목록·질문·날짜를 옮긴다', () => {
    expect(result).toMatchObject({
      analysisId: 88, contractId: 12, documentTypeCode: 'EMPLOYMENT', documentTitle: '카페 알바 근로계약서', status: 'COMPLETED',
      reviewLabel: 'A 깊게 점검', analyzedAt: '2026.11.12', readScope: '2쪽 모두 읽었어요 · 직접 가린 5곳은 읽지 않았어요',
      checkCount: 2, clauseCount: 8, dateCount: 4, isSample: false, unreadablePages: [],
      missingItems: [{ title: '휴일', explanation: '주휴일을 꼭 적어야 해요 · 근로기준법 제17조' }],
      questions: ['"시급을 최저임금 이상으로 고쳐 주실 수 있나요?"'],
    })
    expect(result.clauses).toEqual([
      { clauseId: 707, number: 7, title: '교육비 반환', needsCheck: true },
      { clauseId: 706, number: 6, title: '사회보험', needsCheck: false },
    ])
  })
  it('일부만 읽은 쪽이 있으면 "일부 확인 필요"로 보고 그 쪽을 다시 찍게 한다', () => {
    const partial = toAnalysisResult({ ...completed, result: { ...completed.result!, coverage: { pageCount: 2, readPages: [1], partialPages: [2], maskedCount: 0 } } })
    expect(partial).toMatchObject({ status: 'PARTIAL', unreadablePages: [2], readScope: '2쪽 중 1쪽을 모두 읽었고, 2쪽은 일부만 읽었어요' })
  })
  it('근거 없는 조항의 null 설명을 빈 문자열로 바꾸고 법령 링크를 만들지 않는다', () => {
    const uncertain = toAnalysisResult(mockUncertainAnalysisResponse)
    expect(uncertain.findings[0]).toMatchObject({ verdict: 'UNCERTAIN', summary: '', lawName: '', lawUrl: '' })
    const html = renderView(createElement(AnalysisResultView, { analysis: uncertain }))
    expect(html).toContain('근무 시간 변경')
    expect(html).toContain('/analyses/7/clauses/8')
    expect(html).not.toContain('class="law"')
    expect(html).not.toContain('href="https://www.law.go.kr')
  })
  it('UNCERTAIN이면 설명 값이 남아 있어도 확인 이유를 그리지 않는다', () => {
    const uncertain = toAnalysisResult(mockUncertainAnalysisResponse)
    uncertain.findings[0].summary = '표시하면 안 되는 확인 이유'
    expect(renderView(createElement(AnalysisResultView, { analysis: uncertain }))).not.toContain('표시하면 안 되는 확인 이유')
  })
  it('비슷한 계약서의 실제 버전을 쓰고, 버전이 없으면 임의로 v1을 표시하지 않는다', () => {
    const similarContract = { contractId: 4, title: '비슷한 계약서', analyzedAt: '2026-11-05', scheduleCount: 3 }
    for (const version of [undefined, null, 3]) {
      const analysis = toAnalysisResult({ ...completed, result: { ...completed.result!, similarContract: { ...similarContract, version } } })
      expect(analysis.similarContract?.version).toBe(version ?? undefined)
      const html = renderView(createElement(AnalysisResultView, { analysis, forceSimilarPrompt: true }))
      const dialog = html.slice(html.indexOf('role="dialog"'))
      expect(dialog.includes('>v3</span>')).toBe(version === 3)
      expect(dialog).not.toContain('>v1</span>')
    }
  })
})

describe('toClauseDetail', () => {
  const clause: BackendClause = {
    clauseId: 707, articleNo: '제7조', title: '교육비 반환', verdict: 'NEEDS_CHECK', issueSummary: '퇴사하면 미리 정한 금액을 물어내게 하는 조항',
    original: { text: '근로자가 계약일로부터 1년 이내에 퇴사하는 경우 교육비 30만 원을 사업주에게 반환한다.', pageNo: 2, location: '2쪽 특약 사항 첫 줄' },
    easyExplanation: '1년이 되기 전에 그만두면 교육비 30만 원을 돌려줘야 한다는 약속이에요.',
    whyCheck: '근로계약을 지키지 않을 때 낼 돈을 미리 정해 두는 건 법으로 금지돼 있어요.',
    laws: [{ lawName: '근로기준법', article: '제20조', articleTitle: '위약 예정의 금지', content: '사용자는 근로계약 불이행에 대한 위약금 또는 손해배상액을 예정하는 계약을 체결하지 못한다.' }],
    basisType: 'AI_INTERPRETATION', relatedClauses: [], askCounterpart: ['교육비 반환 조항은 빼 주실 수 있나요?'], oneLine: '1년 안에 그만두면 교육비 30만 원 반환',
  }
  it('원문·설명·근거 법령·질문을 S09 모양으로 바꾼다', () => {
    expect(toClauseDetail(clause, { analysisId: 88, contractId: 12, documentTitle: '카페 알바 근로계약서', analyzedAt: '2026.11.12' })).toEqual({
      analysisId: 88, contractId: 12, documentTitle: '카페 알바 근로계약서', clauseId: 707, clauseNumber: 7, title: '교육비 반환', pageNo: 2,
      originalText: clause.original.text, locationDescription: '특약 사항 첫 줄', needsCheck: true, easyExplanation: clause.easyExplanation, checkReason: clause.whyCheck,
      verdict: 'NEEDS_CHECK', basisType: 'AI_INTERPRETATION',
      laws: [{ lawName: '근로기준법 제20조 (위약 예정의 금지)', lawText: clause.laws[0].content, lawUrl: 'https://www.law.go.kr/법령/근로기준법/제20조' }],
      lawName: '근로기준법 제20조 (위약 예정의 금지)', lawText: clause.laws[0].content, lawUrl: 'https://www.law.go.kr/법령/근로기준법/제20조',
      lawAsOf: '2026.11.12', question: '"교육비 반환 조항은 빼 주실 수 있나요?"',
    })
  })
  it('제목이 없으면 조 번호, 그것도 없으면 한 줄 요약을 쓴다', () => {
    expect(toClauseDetail({ ...clause, title: null }, { analysisId: 1, contractId: 1, documentTitle: '', analyzedAt: '' }).title).toBe('제7조')
    expect(toClauseDetail({ ...clause, title: null, articleNo: null }, { analysisId: 1, contractId: 1, documentTitle: '', analyzedAt: '' }).title).toBe('1년 안에 그만두면 교육비 30만 원 반환')
  })
  it('null 설명은 한 줄 요약으로 대체하고 UNCERTAIN의 이유·법령·AI 해석 문구를 숨긴다', () => {
    const detail = toClauseDetail(mockUncertainClauseResponse, { analysisId: 7, contractId: 1, documentTitle: '', analyzedAt: '' })
    expect(detail).toMatchObject({ verdict: 'UNCERTAIN', basisType: null, easyExplanation: mockUncertainClauseResponse.oneLine, checkReason: '', laws: [], lawName: '', lawText: '', lawUrl: '' })
    const html = renderView(createElement(ClauseDetailView, { clause: { ...detail, checkReason: '표시하면 안 되는 확인 이유' } }))
    expect(html).toContain(mockUncertainClauseResponse.oneLine)
    expect(html).toContain('상대방에게 확인할 것')
    expect(html).not.toContain('왜 확인이 필요해요')
    expect(html).not.toContain('표시하면 안 되는 확인 이유')
    expect(html).not.toContain('근거 법령')
    expect(html).not.toContain('AI가 법령을 해석한 거예요')
    expect(html).not.toContain('href="https://www.law.go.kr')
  })
  it('법령 URL이 빈 문자열이면 기존 mock의 법령 이름이 남아 있어도 법령 칸을 숨긴다', () => {
    const detail = toClauseDetail(clause, { analysisId: 1, contractId: 1, documentTitle: '', analyzedAt: '' })
    const html = renderView(createElement(ClauseDetailView, { clause: { ...detail, laws: undefined, lawUrl: '' } }))
    expect(html).not.toContain('근거 법령')
    expect(html).not.toContain('법령 원문 보기')
  })
  it('여러 법령의 이름·원문·링크를 빠짐없이 그린다', () => {
    const html = renderView(createElement(ClauseDetailView, { clause: mockMultipleLawClauseDetail }))
    expect(mockMultipleLawClauseDetail.laws).toHaveLength(2)
    expect(html).toContain('민법 제654조 (준용규정)')
    expect(html).toContain('민법 제615조 (차주의 원상회복의무와 철거권)')
    expect(html).toContain('제610조제1항, 제615조 내지 제617조의 규정은 임대차에 이를 준용한다.')
    expect(html).toContain('차주가 차용물을 반환하는 때에는 이를 원상에 회복하여야 한다.')
    expect(html).toContain('href="https://www.law.go.kr/법령/민법/제654조"')
    expect(html).toContain('href="https://www.law.go.kr/법령/민법/제615조"')
    expect(html.match(/법령 원문 보기/g)).toHaveLength(2)
  })
  it.each(['RULE', null, 'AI_INTERPRETATION'] as const)('근거 종류 %s에 맞춰 AI 해석 문구를 표시한다', basisType => {
    const detail = toClauseDetail({ ...clause, basisType }, { analysisId: 1, contractId: 1, documentTitle: '', analyzedAt: '' })
    const html = renderView(createElement(ClauseDetailView, { clause: detail }))
    expect(html.includes('AI가 법령을 해석한 거예요')).toBe(basisType === 'AI_INTERPRETATION')
  })
  it('근거 없음·여러 법령 예시는 mock API로 분석 결과에서 조항 상세까지 열린다', async () => {
    vi.stubEnv('VITE_API_MODE', 'mock')
    for (const [analysisId, clauseId] of [[7, 8], [8, 9]]) {
      const analysis = await getAnalysis(analysisId)
      expect(analysis.findings[0].clauseId).toBe(clauseId)
      expect(await getClause(analysisId, clauseId)).toMatchObject({ analysisId, clauseId, documentTitle: analysis.documentTitle })
    }
  })
})
