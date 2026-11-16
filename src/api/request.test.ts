import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './http'
import { request } from './request'
import * as users from './users'

const ok = (data: unknown) => new Response(JSON.stringify({ status: 200, code: null, message: null, data }), { status: 200 })
const unauthorized = () => new Response(JSON.stringify({ status: 401, code: 'UNAUTHORIZED', message: '인증이 필요합니다.', data: null }), { status: 401 })

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('request', () => {
  it('토큰을 Bearer 헤더로 붙여 보낸다', async () => {
    vi.spyOn(users, 'getAccessToken').mockResolvedValue('token-1')
    const fetchMock = vi.fn(async () => ok({ id: 1 }))
    vi.stubGlobal('fetch', fetchMock)

    await request('/api/contracts')

    const headers = new Headers((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].headers)
    expect(headers.get('Authorization')).toBe('Bearer token-1')
  })

  it('401이면 토큰을 다시 받아 한 번만 재시도한다', async () => {
    vi.spyOn(users, 'getAccessToken').mockResolvedValue('expired')
    const renew = vi.spyOn(users, 'renewAccessToken').mockResolvedValue('fresh')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(ok({ id: 1 })))

    await expect(request('/api/contracts')).resolves.toEqual({ id: 1 })
    expect(renew).toHaveBeenCalledTimes(1)
  })

  it('재시도도 401이면 더 시도하지 않고 ApiError를 던진다', async () => {
    vi.spyOn(users, 'getAccessToken').mockResolvedValue('expired')
    vi.spyOn(users, 'renewAccessToken').mockResolvedValue('still-bad')
    const fetchMock = vi.fn(async () => unauthorized())
    vi.stubGlobal('fetch', fetchMock)

    await expect(request('/api/contracts')).rejects.toBeInstanceOf(ApiError)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
