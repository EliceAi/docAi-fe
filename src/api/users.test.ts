import { describe, expect, it } from 'vitest'
import { getDeviceId } from './users'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

function memoryStore(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  }
}

describe('getDeviceId', () => {
  it('저장된 기기 식별값이 없으면 UUID v4를 만들어 저장한다', () => {
    const store = memoryStore()

    const deviceId = getDeviceId(store)

    expect(deviceId).toMatch(UUID_V4)
    expect(store.getItem('docai.deviceId')).toBe(deviceId)
  })

  it('저장된 기기 식별값이 있으면 그대로 쓴다', () => {
    const store = memoryStore({ 'docai.deviceId': '3f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b' })

    expect(getDeviceId(store)).toBe('3f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b')
  })
})
