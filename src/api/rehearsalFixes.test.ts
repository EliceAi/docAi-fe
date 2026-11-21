import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppPanelsProvider } from '../common/layout/AppPanels'
import { AnalysisResultView } from '../pages/analysis/AnalysisResultPage'
import { mockDemoEmploymentAnalysis } from './mocks/analyses'

// #49 리허설 점검(2026-11-21)에서 찾은 문제

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('S08 전체 조항 목록', () => {
  it('조 번호가 없는 계약서("1.", "2." 형식)는 제0조 대신 순서 번호를 보여 준다', () => {
    const analysis = { ...mockDemoEmploymentAnalysis, clauses: [
      { clauseId: 1, number: 0, title: '', needsCheck: false },
      { clauseId: 2, number: 0, title: '', needsCheck: true },
    ] }
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(AppPanelsProvider, null, createElement(AnalysisResultView, { analysis }))))
    expect(html).not.toContain('제0조')
    expect(html).toContain('1번째 조항')
    expect(html).toContain('2번째 조항')
  })
})

describe('getAccessToken', () => {
  it('화면 여러 곳이 동시에 토큰을 찾아도 익명 발급은 한 번만 요청한다(백엔드 1분 10번 제한)', async () => {
    vi.stubEnv('VITE_API_MODE', 'real')
    vi.stubGlobal('localStorage', { getItem: () => '33333333-3333-4333-8333-333333333333', setItem: () => {} })
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ status: 200, code: null, message: null, data: { userId: 'u', accessToken: 'token-1', isNew: false } }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const { getAccessToken } = await import('./users')

    const tokens = await Promise.all([getAccessToken(), getAccessToken(), getAccessToken()])

    expect(tokens).toEqual(['token-1', 'token-1', 'token-1'])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
