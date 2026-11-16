import { ApiError, sendRequest } from './http'
import { getAccessToken, renewAccessToken } from './users'

/**
 * 로그인한 사용자로 백엔드를 부른다. 모든 기능 API 함수는 이 함수로 보낸다.
 * 토큰이 만료돼 401이 오면 토큰을 다시 받아 한 번만 더 보낸다.
 */
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    return await sendWithToken<T>(path, init, await getAccessToken())
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error
    return sendWithToken<T>(path, init, await renewAccessToken())
  }
}

function sendWithToken<T>(path: string, init: RequestInit, token: string): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)
  return sendRequest<T>(path, { ...init, headers })
}

/** JSON 본문을 보내는 요청의 init */
export function jsonBody(method: 'POST' | 'PUT' | 'PATCH', body: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}
