import { describe, expect, it } from 'vitest'
import { needsLeaveConfirm, SUGGESTED_QUESTIONS, screenContext, screenIdsFromPath } from './chatRules'

describe('screenIdsFromPath', () => {
  it('지금 보는 분석·조항·비교 번호를 주소에서 읽는다', () => {
    expect(screenIdsFromPath('/analyses/7')).toEqual({ analysisId: 7 })
    expect(screenIdsFromPath('/analyses/7/progress')).toEqual({ analysisId: 7 })
    expect(screenIdsFromPath('/analyses/7/clauses/3')).toEqual({ analysisId: 7, clauseId: 3 })
    expect(screenIdsFromPath('/comparisons/4')).toEqual({ comparisonId: 4 })
  })
  it('번호가 없는 화면은 아무것도 보내지 않는다', () => {
    expect(screenIdsFromPath('/')).toEqual({})
    expect(screenIdsFromPath('/comparisons/new')).toEqual({})
    expect(screenIdsFromPath('/contracts/new/mask')).toEqual({})
  })
})

describe('needsLeaveConfirm', () => {
  it('가리는 중(S05)에 다른 등록 화면으로 가면 확인한다', () => {
    expect(needsLeaveConfirm('S05', '/contracts/new')).toBe(true)
    expect(needsLeaveConfirm('S05', '/contracts/new/capture')).toBe(true)
  })
  it('가리던 화면으로 돌아가거나 다른 화면에서는 확인하지 않는다', () => {
    expect(needsLeaveConfirm('S05', '/contracts/new/mask')).toBe(false)
    expect(needsLeaveConfirm('S01', '/contracts/new')).toBe(false)
    expect(needsLeaveConfirm(undefined, '/contracts/new')).toBe(false)
  })
})

describe('SUGGESTED_QUESTIONS', () => {
  it('S10을 뺀 14개 화면마다 추천 질문 3개가 있다', () => {
    const codes = ['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08', 'S09', 'S11', 'S12', 'S13', 'S14', 'S15']
    for (const code of codes) expect(SUGGESTED_QUESTIONS[code]).toHaveLength(3)
  })
})

describe('screenContext', () => {
  it('화면 이름을 붙이고, 가리는 화면에는 원본을 보내지 않는다는 안내를 더한다', () => {
    expect(screenContext('S01')).toBe('지금 화면: 홈')
    expect(screenContext('S05')).toBe('지금 화면: 개인정보 가리기 · 가리기 전 원본은 챗봇에 보내지 않아요')
  })
  it('알 수 없는 화면이면 화면 이름 없이 안내한다', () => {
    expect(screenContext(undefined)).toBe('지금 화면을 알 수 없어요')
  })
})
