import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSchedules } from './schedules'
import * as users from './users'

// 2026-11-21 로컬 백엔드 GET /api/schedules 실제 응답 모양 (다가오는 일정과 같은 배열)
const realSchedules = [
  { scheduleId: 1, title: '계약 시작일', date: '2026-12-01', dDay: 10, contractId: 6, contractTitle: '표준근로계약서 (단시간근로자)' },
]

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('getSchedules (실제 백엔드)', () => {
  it('내 일정 목록을 화면 모양(점 날짜, 남은 날짜)으로 바꾼다', async () => {
    vi.stubEnv('VITE_API_MODE', 'real')
    vi.spyOn(users, 'getAccessToken').mockResolvedValue('token-1')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ status: 200, code: null, message: null, data: realSchedules }), { status: 200 })))

    const [schedule] = await getSchedules()

    expect(schedule).toMatchObject({ scheduleId: 1, title: '계약 시작일', date: '2026.12.01', daysLeft: 10, contractId: 6, contractTitle: '표준근로계약서 (단시간근로자)' })
  })
})
