export { SUGGESTED_QUESTIONS } from '../../api/chatSuggestions'

const SCREEN_NAMES: Record<string, string> = {
  S01: '홈', S02: '문서 선택', S03: '입력 방식', S04: '올린 페이지 확인', S05: '개인정보 가리기', S06: '보내기 전 확인',
  S07: '분석 중', S08: '분석 결과', S09: '조항 상세', S11: '수정본 비교', S12: '비교 결과', S13: '일정 확인·등록', S14: '내 일정', S15: '내 계약서',
}

/** 챗봇 위에 보이는 "지금 화면" 안내 한 줄 */
export function screenContext(from: string | undefined): string {
  const name = from ? SCREEN_NAMES[from] : undefined
  if (!name) return '지금 화면을 알 수 없어요'
  return from === 'S05' ? `지금 화면: ${name} · 가리기 전 원본은 챗봇에 보내지 않아요` : `지금 화면: ${name}`
}

/** 가리는 중에 다른 등록 화면으로 가면 지금 가린 내용이 사라질 수 있어 먼저 묻는다 */
export function needsLeaveConfirm(from: string | undefined, to: string): boolean {
  return from === 'S05' && to.startsWith('/contracts/new') && to !== '/contracts/new/mask'
}

/** 챗봇이 지금 화면 내용을 보고 답하도록, 보고 있는 분석·조항·비교 번호를 주소에서 읽는다 */
export function screenIdsFromPath(pathname: string): { analysisId?: number; clauseId?: number; comparisonId?: number; contractId?: number } {
  const clause = pathname.match(/^\/analyses\/(\d+)\/clauses\/(\d+)/)
  if (clause) return { analysisId: Number(clause[1]), clauseId: Number(clause[2]) }
  const analysis = pathname.match(/^\/analyses\/(\d+)/)
  if (analysis) return { analysisId: Number(analysis[1]) }
  const comparison = pathname.match(/^\/comparisons\/(\d+)/)
  if (comparison) return { comparisonId: Number(comparison[1]) }
  const contract = pathname.match(/^\/contracts\/(\d+)$/)
  if (contract) return { contractId: Number(contract[1]) }
  if (pathname.startsWith('/schedules/new?')) {
    const params = new URLSearchParams(pathname.split('?')[1])
    for (const key of ['comparisonId', 'analysisId'] as const) {
      const id = Number(params.get(key))
      if (Number.isSafeInteger(id) && id > 0) return { [key]: id }
    }
  }
  return {}
}

/** 답변을 받지 못했을 때 */
export const CHAT_FAILED_TEXT = '답변을 받지 못했어요. 작성한 질문은 그대로 있어요.'
