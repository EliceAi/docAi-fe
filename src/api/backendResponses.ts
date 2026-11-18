import type { AnalysisProgress, AnalysisResult, ClauseDetail, KeyTerm, ValueSource } from './analyses'
import type { ChatAnswerStatus, ChatMessage } from './chats'
import type { Change, Comparison, ComparisonPreview } from './comparisons'
import type { ContractDetail, ContractSummary } from './contracts'
import type { DocumentType } from './documentTypes'
import { mockDocumentTypes } from './mocks/documentTypes'
import type { Notification } from './notifications'
import type { Schedule, ScheduleCandidateSet, ScheduleChangeSet } from './schedules'

// 백엔드 응답(Notion API 명세 모양)을 화면이 쓰는 모양으로 바꾼다. 화면은 이 파일을 거친 값만 받는다.

/** '2026-11-12' 또는 '2026-11-12T14:20:00+09:00' → '2026.11.12' */
export const toDisplayDate = (value: string) => value.slice(0, 10).replaceAll('-', '.')

/** 국가법령정보센터 조문 주소 (예: /법령/근로기준법/제20조) */
export const lawUrl = (lawName: string, article?: string) => `https://www.law.go.kr/법령/${lawName}${article ? `/${article}` : ''}`

const documentTypeName = (code: string) => mockDocumentTypes.find(type => type.code === code)?.name

// ----- 문서 종류 -----
type BackendDocumentTypes = {
  groups: { category: 'HOME' | 'WORK'; situation: string; documentTypes: { code: string; name: string; description: string; checkLevel: 'A' | 'B'; supported: boolean }[] }[]
}

/** 그룹형 응답을 목록으로 편다. 서버에 없는 검색어·긴급 안내·검색 설명은 같은 코드의 mock에서 붙인다 */
export function toDocumentTypes(data: BackendDocumentTypes, extras: DocumentType[]): DocumentType[] {
  return data.groups.flatMap(group => group.documentTypes.map(type => ({
    ...extras.find(extra => extra.code === type.code),
    code: type.code,
    name: type.name,
    lane: group.category === 'HOME' ? '집' as const : '일' as const,
    group: group.situation,
    grade: type.checkLevel,
    checkNote: type.description,
    supported: type.supported,
  })))
}

// ----- 일정 -----
type BackendUpcomingSchedule = { scheduleId: number; title: string; date: string; dDay: number; contractId: number | null; contractTitle: string | null }

export function toUpcomingSchedule(item: BackendUpcomingSchedule): Schedule {
  return { scheduleId: item.scheduleId, title: item.title, date: toDisplayDate(item.date), daysLeft: item.dDay, contractId: item.contractId ?? 0, contractTitle: item.contractTitle ?? '' }
}

// ----- 분석 -----
type BackendLaw = { lawName: string; article: string }
type BackendKeyTerm = { label: string; value: string | null; state: 'OK' | 'NEEDS_CHECK' | 'MISSING' | 'UNREADABLE' | 'MASKED'; source: 'WRITTEN' | 'MANUAL' | null }

export type BackendAnalysis = {
  analysisId: number | null
  contractId: number | null
  version?: number
  status: 'ANALYZING' | 'COMPLETED' | 'FAILED'
  progressStep?: 'READING_TEXT' | 'FINDING_TERMS' | 'MATCHING_LAWS' | 'SUMMARIZING' | 'DONE'
  readProgress?: { done: number; total: number }
  failure?: { reason: 'PAGE_UNREADABLE' | 'TYPE_MISMATCH' | 'TEMPORARY_ERROR'; pageNo: number | null; detectedTypeName: string | null } | null
  sample?: boolean
  result: {
    title: string
    documentTypeCode: string
    checkLevel: 'A' | 'B'
    analyzedAt: string
    coverage: { pageCount: number; readPages: number[]; partialPages: number[]; maskedCount: number }
    keyTerms: BackendKeyTerm[]
    counts: { needsCheck: number; missing: number; deadline: number; totalClauses: number }
    priorityClauses: { clauseId: number; verdict: string; title: string; description: string; comparison: { leftLabel: string; leftValue: string; operator: string; rightLabel: string; rightValue: string } | null; laws: BackendLaw[]; basisType: 'RULE' | 'AI_INTERPRETATION'; relatedClauses: unknown[] }[]
    missingItems: { name: string; description: string; dueDate: string | null; laws: BackendLaw[] }[]
    deadlines: { name: string; description: string; dueDate: string | null; laws: BackendLaw[] }[]
    clauses: { clauseId: number; articleNo: string | null; title: string | null; verdict: string; pageNo: number }[]
    questionsBeforeSigning: string[]
    limitations: string[]
    foundDateCount: number
    similarContract: { contractId: number; title: string; analyzedAt: string; scheduleCount: number } | null
    disclaimer?: string
  } | null
}

// 분석 단계: 글자·항목 읽기 → 주요 조건 찾기 → 법령 DB 조문과 맞춰 보기 → 확인할 조항 정리 → 끝
const STEPS = ['READING_TEXT', 'FINDING_TERMS', 'MATCHING_LAWS', 'SUMMARIZING', 'DONE'] as const

function toFailure(failure: NonNullable<BackendAnalysis['failure']>): NonNullable<AnalysisProgress['failures']>[number] {
  if (failure.reason === 'PAGE_UNREADABLE') {
    return { kind: 'BLURRY', title: '사진이 흐려요', text: failure.pageNo ? `${failure.pageNo}쪽 글자를 읽을 수 없었어요.` : '글자를 읽을 수 없었어요.', ...(failure.pageNo ? { pageNo: failure.pageNo } : {}) }
  }
  if (failure.reason === 'TYPE_MISMATCH') {
    return { kind: 'TYPE_MISMATCH', title: '고른 종류와 달라 보여요', text: failure.detectedTypeName ? `고른 종류가 아니라 ${failure.detectedTypeName}처럼 보여요.` : '고른 문서 종류와 달라 보여요.' }
  }
  return { kind: 'TEMPORARY', title: '잠시 문제가 생겼어요', text: '가린 이미지는 그대로 있어요.' }
}

/** S07 분석 중·실패 화면 */
export function toAnalysisProgress(data: BackendAnalysis): AnalysisProgress {
  const result = data.result
  return {
    analysisId: data.analysisId ?? 0,
    contractId: data.contractId ?? 0,
    status: data.status === 'ANALYZING' ? 'IN_PROGRESS' : data.status,
    // 분석 중에는 문서 종류·쪽 수가 응답에 없다. 완료되면 결과에서 채운다
    documentTypeName: (result && documentTypeName(result.documentTypeCode)) ?? '계약서',
    pageCount: result?.coverage.pageCount,
    completedSteps: Math.max(0, STEPS.indexOf(data.progressStep ?? 'READING_TEXT')),
    ...(data.status === 'FAILED' && data.failure ? { failures: [toFailure(data.failure)] } : {}),
  }
}

const SOURCE: Record<string, ValueSource> = { WRITTEN: 'written', MANUAL: 'typed' }

function toKeyTerm(term: BackendKeyTerm): KeyTerm {
  if (term.state === 'MASKED') return { label: term.label, value: '가려서 읽지 않음', source: 'review' }
  const state = term.state === 'NEEDS_CHECK' ? 'warn' : term.state === 'MISSING' ? 'miss' : term.state === 'UNREADABLE' ? 'unk' : undefined
  return { label: term.label, value: term.value ?? '-', source: (term.source && SOURCE[term.source]) ?? 'review', ...(state ? { state } : {}) }
}

const lawLabel = (laws: BackendLaw[]) => laws.map(law => `${law.lawName} ${law.article}`).join(', ')
const articleNumber = (articleNo: string | null) => Number(articleNo?.match(/\d+/)?.[0] ?? 0)

function readScope(coverage: NonNullable<BackendAnalysis['result']>['coverage']) {
  const fullyRead = coverage.readPages.filter(page => !coverage.partialPages.includes(page))
  const masked = coverage.maskedCount > 0 ? ` · 직접 가린 ${coverage.maskedCount}곳은 읽지 않았어요` : ''
  if (fullyRead.length === coverage.pageCount) return `${coverage.pageCount}쪽 모두 읽었어요${masked}`
  const partial = coverage.partialPages.length ? `, ${coverage.partialPages.join('·')}쪽은 일부만 읽었어요` : ''
  return `${coverage.pageCount}쪽 중 ${fullyRead.length}쪽을 모두 읽었고${partial}${masked}`
}

/** S08 분석 결과. 완료되지 않은 분석은 결과 없이 상태만 담는다 */
export function toAnalysisResult(data: BackendAnalysis, sampleId?: number): AnalysisResult {
  const result = data.result
  const analysisId = data.analysisId ?? sampleId ?? 0
  if (!result) {
    return {
      analysisId, contractId: data.contractId ?? 0, documentTypeCode: '', documentTitle: '', status: data.status === 'ANALYZING' ? 'IN_PROGRESS' : data.status,
      keyTerms: [], findings: [], unreadablePages: [], reviewLabel: '', analyzedAt: '', readScope: '', isSample: Boolean(data.sample), checkCount: 0,
      missingItems: [], clauses: [], questions: [], dateCount: 0, dateSummary: '',
    }
  }
  const coverage = result.coverage
  // 읽지 못했거나 일부만 읽은 쪽은 다시 찍게 한다. "일부 확인 필요"는 이 쪽이 있는지로 판단한다
  const unreadablePages = [...new Set([...coverage.partialPages, ...Array.from({ length: coverage.pageCount }, (_, i) => i + 1).filter(page => !coverage.readPages.includes(page))])].sort((a, b) => a - b)
  const withLaw = (description: string, laws: BackendLaw[]) => laws.length ? `${description} · ${lawLabel(laws)}` : description
  return {
    analysisId,
    contractId: data.contractId ?? 0,
    version: data.version,
    documentTypeCode: result.documentTypeCode,
    documentTypeName: documentTypeName(result.documentTypeCode),
    documentTitle: result.title,
    status: unreadablePages.length ? 'PARTIAL' : 'COMPLETED',
    summaryAvailable: true,
    reviewLabel: result.checkLevel === 'A' ? 'A 깊게 점검' : 'B 공통 점검',
    analyzedAt: toDisplayDate(result.analyzedAt),
    readScope: readScope(coverage),
    isSample: Boolean(data.sample),
    checkCount: result.counts.needsCheck,
    keyTerms: result.keyTerms.map(toKeyTerm),
    findings: result.priorityClauses.map(clause => ({
      clauseId: clause.clauseId,
      title: clause.title,
      level: 'check' as const,
      summary: clause.description,
      lawName: clause.laws.length ? `${lawLabel(clause.laws)} · ${clause.basisType === 'RULE' ? '계산은 규칙으로 확인했어요' : 'AI 해석'}` : '',
      lawUrl: clause.laws[0] ? lawUrl(clause.laws[0].lawName, clause.laws[0].article) : lawUrl(''),
      ...(clause.comparison ? { comparison: { contractLabel: clause.comparison.leftLabel, contractValue: clause.comparison.leftValue, referenceLabel: clause.comparison.rightLabel, referenceValue: clause.comparison.rightValue } } : {}),
    })),
    missingItems: result.missingItems.map(item => ({ title: item.name, explanation: withLaw(item.description, item.laws) })),
    clauses: result.clauses.map(clause => ({ clauseId: clause.clauseId, number: articleNumber(clause.articleNo), title: clause.title ?? clause.articleNo ?? '', needsCheck: clause.verdict === 'NEEDS_CHECK' || clause.verdict === 'UNCERTAIN' })),
    clauseCount: result.counts.totalClauses,
    questions: result.questionsBeforeSigning.map(question => `"${question}"`),
    dateCount: result.foundDateCount,
    dateSummary: '',
    unreadablePages,
    ...(result.deadlines[0] ? { deadline: { title: result.deadlines[0].name, explanation: withLaw(result.deadlines[0].description, result.deadlines[0].laws) } } : {}),
    ...(result.limitations.length ? { unknowns: { title: '이 계약서만으로 알 수 없는 것', explanation: result.limitations.join(' ') } } : {}),
    ...(result.similarContract ? { similarContract: { contractId: result.similarContract.contractId, title: result.similarContract.title, version: 1, analyzedAt: toDisplayDate(result.similarContract.analyzedAt), scheduleCount: result.similarContract.scheduleCount } } : {}),
  }
}

// ----- 조항 상세 -----
const withoutPagePrefix = (location: string, pageNo: number) => location.startsWith(`${pageNo}쪽`) ? location.slice(`${pageNo}쪽`.length).trim() : location

export type BackendClause = {
  clauseId: number
  articleNo: string | null
  title: string | null
  verdict: string
  issueSummary: string | null
  original: { text: string | null; pageNo: number; location: string }
  easyExplanation: string
  whyCheck: string | null
  laws: { lawName: string; article: string; articleTitle: string; content: string }[]
  basisType: 'RULE' | 'AI_INTERPRETATION'
  relatedClauses: unknown[]
  askCounterpart: string[]
  oneLine: string
}

/** S09 조항 상세. 조항 응답에 없는 계약서 이름·분석일은 분석 결과에서 받아 넘긴다 */
export function toClauseDetail(clause: BackendClause, context: { analysisId: number; contractId: number; documentTitle: string; analyzedAt: string }): ClauseDetail {
  const law = clause.laws[0]
  return {
    analysisId: context.analysisId,
    contractId: context.contractId,
    documentTitle: context.documentTitle,
    clauseId: clause.clauseId,
    clauseNumber: articleNumber(clause.articleNo),
    title: clause.title ?? clause.articleNo ?? clause.oneLine,
    pageNo: clause.original.pageNo,
    originalText: clause.original.text ?? '',
    // 위치 설명이 "2쪽 특약 사항"처럼 쪽 번호로 시작하면 화면이 쪽을 따로 붙이므로 뺀다
    locationDescription: withoutPagePrefix(clause.original.location, clause.original.pageNo),
    needsCheck: clause.verdict === 'NEEDS_CHECK' || clause.verdict === 'UNCERTAIN',
    easyExplanation: clause.easyExplanation,
    checkReason: clause.whyCheck ?? '',
    lawName: law ? `${law.lawName} ${law.article}${law.articleTitle ? ` (${law.articleTitle})` : ''}` : '',
    lawText: law?.content ?? '',
    lawUrl: law ? lawUrl(law.lawName, law.article) : lawUrl(''),
    lawAsOf: context.analyzedAt,
    question: clause.askCounterpart[0] ? `"${clause.askCounterpart[0]}"` : '',
  }
}

// ----- 일정 후보·변경 후보 (S13) -----
type BackendCandidateSet = {
  contractId: number
  contractTitle: string
  candidates: { candidateId: number; title: string; date: string | null; source: 'WRITTEN' | 'REVIEW'; location: string; pageNo: number | null; selected: boolean; conflictGroup: string | null }[]
  missing: { candidateId: number; title: string; message: string }[]
}

/** 계약서에 없는 날짜(missing)는 날짜 없는 후보로 붙여, 화면에서 직접 입력하게 한다 */
export function toScheduleCandidateSet(analysisId: number, data: BackendCandidateSet): ScheduleCandidateSet {
  return {
    analysisId,
    contractId: data.contractId,
    contractTitle: data.contractTitle,
    candidates: [
      ...data.candidates.map(candidate => ({
        candidateId: candidate.candidateId, title: candidate.title, date: candidate.date ? toDisplayDate(candidate.date) : null,
        source: candidate.source === 'WRITTEN' ? 'written' as const : 'review' as const, where: candidate.location, recommended: candidate.selected, conflictGroup: candidate.conflictGroup,
      })),
      ...data.missing.map(item => ({ candidateId: item.candidateId, title: item.title, date: null, source: 'typed' as const, where: '', recommended: false, conflictGroup: null })),
    ],
  }
}

type BackendScheduleChanges = {
  contractTitle: string
  changes: { scheduleId: number | null; candidateId?: number; action: 'UPDATE' | 'CREATE' | 'DELETE'; title: string; beforeDate: string | null; afterDate: string | null; source: 'WRITTEN' | 'REVIEW'; location?: string }[]
}

/** 응답에 없는 계약서 번호·버전은 비교 정보에서 받아 넘긴다 */
export function toScheduleChangeSet(comparisonId: number, data: BackendScheduleChanges, known: { contractId: number; fromVersion: number; toVersion: number }): ScheduleChangeSet {
  return {
    comparisonId,
    ...known,
    contractTitle: data.contractTitle,
    changes: data.changes.map(change => ({
      scheduleId: change.scheduleId,
      ...(change.candidateId ? { candidateId: change.candidateId } : {}),
      action: change.action,
      title: change.title,
      beforeDate: change.beforeDate ? toDisplayDate(change.beforeDate) : null,
      afterDate: change.afterDate ? toDisplayDate(change.afterDate) : null,
      source: change.source === 'WRITTEN' ? 'written' as const : 'review' as const,
      ...(change.location ? { note: change.location } : {}),
    })),
  }
}

// ----- 내 계약서 (S15) -----
type BackendContractItem = { contractId: number; title: string; documentTypeCode: string; documentTypeName: string; category: 'HOME' | 'WORK'; analyzedAt: string; version: number; previousVersionAnalyzedAt: string | null; scheduleCount: number; needsCheckCount: number; missingCount: number }
const isoDay = (value: string) => value.slice(0, 10)

export function toMyContracts(data: { items: BackendContractItem[]; categoryCounts: Record<string, number>; page: number; size: number; hasNext: boolean }): ContractSummary[] {
  return data.items.map(item => ({
    contractId: item.contractId,
    title: item.title,
    documentTypeCode: item.documentTypeCode,
    lane: item.category === 'HOME' ? '집' as const : '일' as const,
    version: item.version,
    savedAt: isoDay(item.analyzedAt),
    needsCheckCount: item.needsCheckCount,
    analysisId: 0, // 목록 응답에는 분석 번호가 없다. 결과는 상세(versions[].analysisId)에서 연다
    missingItemCount: item.missingCount,
    scheduleCount: item.scheduleCount,
    ...(item.previousVersionAnalyzedAt ? { previousVersion: { contractId: item.contractId, version: item.version - 1, savedAt: isoDay(item.previousVersionAnalyzedAt) } } : {}),
  }))
}

type BackendContractDetail = {
  contractId: number; title: string; documentTypeCode: string; documentTypeName: string; checkLevel: 'A' | 'B'
  versions: { version: number; analysisId: number; analyzedAt: string; latest: boolean }[]
  summary: { needsCheckCount: number; missingCount: number; totalClauseCount: number }
  keyTerms: BackendKeyTerm[]
  schedules: { scheduleId: number; title: string; date: string; dDay: number }[]
}

export function toMyContractDetail(data: BackendContractDetail): ContractDetail {
  const latest = data.versions.find(version => version.latest) ?? data.versions[0]
  const previous = data.versions.find(version => version.version === latest.version - 1)
  return {
    contractId: data.contractId,
    title: data.title,
    documentTypeCode: data.documentTypeCode,
    lane: mockDocumentTypes.find(type => type.code === data.documentTypeCode)?.lane ?? (data.documentTypeCode === 'EMPLOYMENT' ? '일' : '집'),
    version: latest.version,
    savedAt: isoDay(latest.analyzedAt),
    needsCheckCount: data.summary.needsCheckCount,
    analysisId: latest.analysisId,
    missingItemCount: data.summary.missingCount,
    scheduleCount: data.schedules.length,
    ...(previous ? { previousVersion: { contractId: data.contractId, version: previous.version, savedAt: isoDay(previous.analyzedAt) } } : {}),
    pageCount: 0, // 상세 응답에 쪽 수가 없다
    scheduleIds: data.schedules.map(schedule => schedule.scheduleId),
    reviewLabel: data.checkLevel === 'A' ? 'A 깊게 점검' : 'B 공통 점검',
    keyTerms: data.keyTerms.map(term => {
      const shown = toKeyTerm(term)
      return { label: shown.label, value: shown.value ?? '-', ...(shown.state ? { state: shown.state } : {}) }
    }),
    // 상세 응답의 일정에는 출처가 없어 "계약서에 적힘"으로 둔다. 정확한 출처는 일정 상세에서 본다
    schedules: data.schedules.map(schedule => ({ scheduleId: schedule.scheduleId, title: schedule.title, date: toDisplayDate(schedule.date), daysLeft: schedule.dDay, source: 'written' as const })),
  }
}

// ----- 일정 상세 (S14) -----
type BackendScheduleDetail = { scheduleId: number; title: string; date: string; dDay: number; source: 'WRITTEN' | 'MANUAL' | 'REVIEW'; location: string | null; contract: { contractId: number; title: string; analyzedAt: string } | null }

export function toScheduleDetail(data: BackendScheduleDetail): Schedule {
  return {
    scheduleId: data.scheduleId,
    title: data.title,
    date: toDisplayDate(data.date),
    daysLeft: data.dDay,
    source: data.source === 'MANUAL' ? 'typed' : data.source === 'WRITTEN' ? 'written' : 'review',
    ...(data.location ? { where: data.location } : {}),
    contractId: data.contract?.contractId ?? 0,
    contractTitle: data.contract?.title ?? '',
    ...(data.contract ? { contractAnalyzedAt: toDisplayDate(data.contract.analyzedAt).slice(5) } : {}),
  }
}

// ----- 비교 (S11·S12) -----
export function toComparisonPreview(data: { compatibility: 'FULL' | 'PARTIAL' | 'IMPOSSIBLE'; reason: string | null; previous: unknown; revised: unknown }): ComparisonPreview {
  return { comparability: data.compatibility === 'IMPOSSIBLE' ? 'NONE' : data.compatibility, reason: data.reason }
}

export type BackendComparison = {
  comparisonId: number
  status: 'PENDING_CONFIRM' | 'CONFIRMED' | 'DISCARDED' | 'SUPERSEDED'
  compatibility: 'FULL' | 'PARTIAL'
  counts: { changed: number; added: number; manual: number; uncompared: number }
  changes: { changeId: number; type: 'CHANGED' | 'ADDED' | 'REMOVED'; category: 'AMOUNT' | 'DATE' | 'CLAUSE'; label: string; before: string | null; after: string | null; note: string | null; source: 'WRITTEN' | 'MANUAL' }[]
  uncompared: { uncomparedId: number; label: string; location: string; reason: string; previousText: string }[]
  unchangedSummary: string
}

/** 비교 응답에는 이전본·수정본 계약서 번호가 없다(명세). 비교를 만들 때 알던 번호를 함께 넘긴다 */
export function toComparison(data: BackendComparison, known: { previousContractId: number; currentContractId: number }): Comparison {
  const kindOf = (change: BackendComparison['changes'][number]): Change['kind'] => change.source === 'MANUAL' ? 'manual'
    : change.type === 'ADDED' ? 'added' : change.type === 'REMOVED' ? 'removed' : change.category === 'AMOUNT' ? 'amount' : change.category === 'DATE' ? 'date' : undefined
  return {
    comparisonId: data.comparisonId,
    ...known,
    changes: data.changes.map(change => ({
      label: change.label, before: change.before, after: change.after, pageNo: 0,
      ...(kindOf(change) ? { kind: kindOf(change) } : {}),
      ...(change.note ? { note: change.note } : {}),
      source: change.source === 'MANUAL' ? 'typed' as const : 'written' as const,
    })),
    unreadLabels: data.uncompared.map(item => item.label),
    unreadFields: data.uncompared.map(item => ({
      uncomparedId: item.uncomparedId, label: item.label, location: item.location, title: item.label, before: item.previousText,
      pageNo: Number(item.location.match(/(\d+)쪽/)?.[1] ?? 0),
      side: item.location.startsWith('이전본') ? 'previous' as const : 'current' as const,
    })),
    unchangedSummary: data.unchangedSummary,
  }
}

// ----- 알림 (P01) -----
type BackendNotifications = { unreadCount: number; items: { notificationId: number; type: 'SCHEDULE_DUE' | 'ANALYSIS_DONE' | 'ANALYSIS_FAILED'; title: string; subTitle: string; target: { scheduleId?: number; analysisId?: number } | null; read: boolean; createdAt: string }[] }

export function toNotifications(data: BackendNotifications): Notification[] {
  return data.items.map(item => ({
    notificationId: item.notificationId,
    kind: item.type === 'SCHEDULE_DUE' ? 'SCHEDULE' : item.type,
    title: item.title,
    text: item.subTitle,
    // 이동할 계약서가 삭제됐으면 target이 null이다
    to: item.target?.scheduleId ? `/schedules/${item.target.scheduleId}`
      : item.target?.analysisId ? (item.type === 'ANALYSIS_FAILED' ? `/analyses/${item.target.analysisId}/progress` : `/analyses/${item.target.analysisId}`) : '',
    read: item.read,
  }))
}

// ----- 챗봇 (S10) -----
export type BackendChatMessage = {
  messageId: number
  role: 'USER' | 'ASSISTANT'
  content: string
  answerType?: ChatAnswerStatus
  references?: { type: string; label: string }[]
  partial?: unknown
  actions?: { type: string; label: string; params: Record<string, number> }[]
  createdAt: string
}

// 참고한 정보 종류 → 화면 이름. 명세 예시에는 LAW_DB만 있어 나머지는 서버 label을 그대로 쓴다
const REFERENCE_NAMES: Record<string, string> = { LAW_DB: '법령 DB', MY_DOCUMENT: '내 문서', CURRENT_SCREEN: '현재 화면', APP_GUIDE: '앱 사용법' }
// 이동 버튼 종류 → 화면 주소. 명세 예시에는 OPEN_CLAUSE만 있다
const actionPath = (action: NonNullable<BackendChatMessage['actions']>[number]) =>
  action.type === 'OPEN_CLAUSE' ? `/analyses/${action.params.analysisId}/clauses/${action.params.clauseId}`
    : action.type === 'OPEN_ANALYSIS' ? `/analyses/${action.params.analysisId}` : null

export function toChatMessage(message: BackendChatMessage): ChatMessage {
  if (message.role === 'USER') return { role: 'me', text: message.content }
  const actions = (message.actions ?? []).flatMap(action => { const to = actionPath(action); return to ? [{ label: action.label, to }] : [] })
  return {
    role: 'ai',
    text: message.content,
    ...(message.answerType ? { status: message.answerType } : {}),
    ...(message.references?.length ? { refs: [...new Set(message.references.map(ref => REFERENCE_NAMES[ref.type] ?? ref.label))] } : {}),
    ...(actions.length ? { actions } : {}),
  }
}

export function toChatMessages(data: { conversationId: number; linkedDocument: unknown; comparisonId: number | null; hasMore: boolean; messages: BackendChatMessage[] }): ChatMessage[] {
  return data.messages.map(toChatMessage)
}
