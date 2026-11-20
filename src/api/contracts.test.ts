import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let contracts: typeof import('./contracts')
let schedules: typeof import('./schedules')

beforeEach(async () => {
  vi.resetModules()
  vi.stubEnv('VITE_API_MODE', 'mock')
  contracts = await import('./contracts')
  schedules = await import('./schedules')
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('S13 mock 보관과 내 일정 연결', () => {
  it('없는 계약서·큰 번호는 다른 문서로 바꾸지 않고 거절한다', async () => {
    for (const id of [0, -1, 999, 99999, Number.MAX_SAFE_INTEGER]) await expect(contracts.getMyContract(id)).rejects.toThrow()
  })
  it('선택·직접 추가한 일정만 목록·상세·계약서에 같은 ID로 저장하고 다른 계약서는 보존한다', async () => {
    const before = await contracts.getMyContract(4)
    const values = [
      { candidateId: 1, title: '첫 출근 (계약 시작일)', date: '2026-12-01', source: 'WRITTEN' as const },
      { candidateId: null, title: '테스트용 계약 확인', date: '2026-12-15', source: 'MANUAL' as const },
    ]
    const saved = await contracts.archiveContract(1, values, 'archive-1')
    expect(saved.savedSchedules.map(schedule => schedule.title)).toEqual(values.map(value => value.title))
    const detail = await contracts.getMyContract(1)
    expect(detail.scheduleIds).toEqual(saved.savedSchedules.map(schedule => schedule.scheduleId))
    expect(detail.schedules).toHaveLength(2)
    for (const savedSchedule of saved.savedSchedules) {
      expect(await schedules.getSchedule(savedSchedule.scheduleId)).toMatchObject({ contractId: 1, title: savedSchedule.title, date: savedSchedule.date.replaceAll('-', '.') })
    }
    expect((await contracts.getMyContracts()).find(contract => contract.contractId === 1)?.scheduleCount).toBe(2)
    expect(await contracts.getMyContract(4)).toEqual(before)
  })

  it('충돌에서 고른 날짜를 저장하며 성공 응답만 반환하지 않는다', async () => {
    const candidates = await schedules.getScheduleCandidates(5)
    const chosen = candidates.candidates.find(candidate => candidate.date === '2027.03.31')!
    await contracts.archiveContract(candidates.contractId, [{ candidateId: chosen.candidateId, title: chosen.title, date: '2027-03-31', source: 'WRITTEN' }], 'conflict')
    expect((await schedules.getSchedules()).filter(schedule => schedule.contractId === candidates.contractId)).toEqual([
      expect.objectContaining({ title: '계약 종료일', date: '2027.03.31' }),
    ])
  })

  it('같은 키의 재시도는 중복 저장하지 않고 다른 내용이나 잘못된 날짜는 전체를 거절한다', async () => {
    const values = [{ candidateId: null, title: '직접 추가', date: '2026-12-15', source: 'MANUAL' as const }]
    const first = await contracts.archiveContract(1, values, 'same-key')
    expect(await contracts.archiveContract(1, values, 'same-key')).toEqual(first)
    const before = await schedules.getSchedules()
    await expect(contracts.archiveContract(1, [{ ...values[0], date: '2026-12-16' }], 'same-key')).rejects.toThrow()
    await expect(contracts.archiveContract(1, [values[0], { ...values[0], date: '2026-02-30' }], 'invalid')).rejects.toThrow()
    expect(await schedules.getSchedules()).toEqual(before)
    expect((await contracts.getMyContract(1)).schedules).toHaveLength(1)
  })

  it('일정 없이 보관하면 해당 계약서 일정만 비우고 계약서는 목록에 남긴다', async () => {
    await contracts.archiveContract(1, [], 'without-schedules')
    expect((await contracts.getMyContract(1)).schedules).toEqual([])
    expect((await contracts.getMyContracts()).find(contract => contract.contractId === 1)).toMatchObject({ scheduleCount: 0 })
    expect((await contracts.getMyContract(2)).schedules).toHaveLength(3)
  })

  it('새로고침으로 모듈을 다시 불러와도 저장한 일정과 보관 응답이 유지된다', async () => {
    const saved = new Map<string, string>()
    vi.stubGlobal('window', { sessionStorage: { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => saved.set(key, value) } })
    const values = [{ candidateId: null, title: '새로고침 확인', date: '2026-12-15', source: 'MANUAL' as const }]
    const result = await contracts.archiveContract(1, values, 'refresh')
    vi.resetModules()
    contracts = await import('./contracts')
    schedules = await import('./schedules')
    expect((await contracts.getMyContract(1)).schedules).toEqual([expect.objectContaining({ title: '새로고침 확인', date: '2026.12.15' })])
    expect(await contracts.archiveContract(1, values, 'refresh')).toEqual(result)
    expect(await schedules.getSchedule(result.savedSchedules[0].scheduleId)).toMatchObject({ contractId: 1, title: '새로고침 확인' })
  })
})
