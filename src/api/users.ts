import { sendRequest } from './http'
import { mockResponse, shouldMock } from './mock-mode'

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>

/** POST /api/users/anonymous 응답 */
export type AnonymousUser = { userId: string; accessToken: string; isNew: boolean }

const DEVICE_ID_KEY = 'docai.deviceId'

// 토큰은 메모리에만 둔다. 새로고침하면 같은 deviceId로 다시 받으면 되므로 저장해 둘 이유가 없다.
let accessToken: string | null = null

/** 이 기기를 구분하는 값. 처음이면 만들어 저장하고, 이후에는 같은 값을 쓴다 */
export function getDeviceId(store: KeyValueStore = localStorage): string {
  const savedDeviceId = store.getItem(DEVICE_ID_KEY)
  if (savedDeviceId) return savedDeviceId

  const newDeviceId = crypto.randomUUID()
  store.setItem(DEVICE_ID_KEY, newDeviceId)
  return newDeviceId
}

/** 회원가입 없이 기기별 사용자를 발급받는다. 같은 기기면 같은 사용자에 새 토큰 */
export async function issueAnonymousUser(): Promise<AnonymousUser> {
  if (shouldMock('issueAnonymousUser')) {
    return mockResponse({ userId: '00000000-0000-4000-8000-000000000001', accessToken: 'mock-token', isNew: false })
  }
  return sendRequest<AnonymousUser>('/api/users/anonymous', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId: getDeviceId() }),
  })
}

export async function getAccessToken(): Promise<string> {
  return accessToken ?? renewAccessToken()
}

/** 토큰이 없거나 만료(24시간)됐을 때 같은 deviceId로 다시 받는다 */
export async function renewAccessToken(): Promise<string> {
  const user = await issueAnonymousUser()
  accessToken = user.accessToken
  return accessToken
}
