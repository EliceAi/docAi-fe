import { describe, expect, it } from 'vitest'
import { READY_APIS, shouldMock } from './mock-mode'

describe('shouldMock', () => {
  it('mock 모드면 백엔드에 있는 API도 항상 mock을 쓴다', () => {
    expect(shouldMock('issueAnonymousUser', 'mock')).toBe(true)
  })

  it('real 모드면 READY_APIS에 있는 API만 실제로 호출한다', () => {
    expect(READY_APIS).toContain('issueAnonymousUser')
    expect(shouldMock('issueAnonymousUser', 'real')).toBe(false)
    expect(shouldMock('getComparison', 'real')).toBe(true)
  })

  // undefined를 넘기면 기본값(내 PC의 .env.local)이 쓰여서 PC마다 결과가 달라진다. 빈 값으로 확인한다.
  it('모드 값이 비어 있으면(배포처럼) mock으로 본다', () => {
    expect(shouldMock('issueAnonymousUser', '')).toBe(true)
  })
})
