import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, sendRequest } from './http'

function respondWith(status: number, body: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })))
}

afterEach(() => vi.unstubAllGlobals())

describe('sendRequest', () => {
  it('공통 응답이면 data만 돌려준다', async () => {
    respondWith(201, { status: 201, code: null, message: null, data: { userId: 'u1' } })

    await expect(sendRequest('/api/users/anonymous')).resolves.toEqual({ userId: 'u1' })
  })

  it('실패 응답이면 백엔드 code와 message를 담은 ApiError를 던진다', async () => {
    respondWith(400, { status: 400, code: 'INVALID_INPUT', message: 'UUID v4 형식으로 입력해 주세요.', data: null })

    const error = await sendRequest('/api/users/anonymous').catch(caught => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 400, code: 'INVALID_INPUT', message: 'UUID v4 형식으로 입력해 주세요.' })
  })

  it('공통 응답 모양이 아닌 실패(서버 꺼짐 등)도 상태 코드를 담은 ApiError로 던진다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Bad Gateway', { status: 502 })))

    await expect(sendRequest('/api/contracts')).rejects.toMatchObject({ status: 502, code: null })
  })
})
