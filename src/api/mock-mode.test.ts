import { describe, expect, it } from 'vitest'
import { READY_APIS, shouldMock } from './mock-mode'

describe('shouldMock', () => {
  it('mock 모드면 백엔드에 있는 API도 항상 mock을 쓴다', () => {
    expect(shouldMock('issueAnonymousUser', 'mock')).toBe(true)
  })

  it('real 모드면 READY_APIS에 있는 API만 실제로 호출한다', () => {
    expect(READY_APIS).toContain('issueAnonymousUser')
    expect(shouldMock('issueAnonymousUser', 'real')).toBe(false)
    expect(shouldMock('getAnalysis', 'real')).toBe(true)
  })

  it('모드를 정하지 않으면 mock으로 본다', () => {
    expect(shouldMock('issueAnonymousUser', undefined)).toBe(true)
  })
})
