import { describe, expect, it, vi } from 'vitest'
import type { RouteObject } from 'react-router-dom'
import type { ReactElement } from 'react'

vi.mock('react-router-dom', async importOriginal => ({
  ...await importOriginal<typeof import('react-router-dom')>(),
  createBrowserRouter: vi.fn((routes: RouteObject[]) => routes),
}))

describe('계약서 등록 경로', () => {
  it.each(['mock', 'real'])('%s 모드에서 등록 경로 전체를 시연 안내 또는 실제 등록으로 연결한다', async mode => {
    vi.stubEnv('VITE_API_MODE', mode)
    vi.resetModules()
    const { router } = await import('./router')
    const routes = router as unknown as RouteObject[]
    const registration = routes[0].children![0].children!.find(route => route.children?.some(child => child.path === '/contracts/new'))!
    expect(registration.children?.map(route => route.path)).toEqual([
      '/contracts/new', '/contracts/new/capture', '/contracts/new/preview', '/contracts/new/mask', '/contracts/new/confirm',
    ])
    const element = registration.element as ReactElement
    expect((element.type as { name: string }).name).toBe(mode === 'mock' ? 'DemoContractsPage' : 'RegisterFlowProvider')
    vi.unstubAllEnvs()
  })
  it('/app 아래에서는 모든 앱 링크에 같은 접두 경로를 유지한다', async () => {
    vi.stubGlobal('window', { location: { pathname: '/app/contracts/new/capture' } })
    vi.resetModules()
    await import('./router')
    const { createBrowserRouter } = await import('react-router-dom')
    expect(createBrowserRouter).toHaveBeenLastCalledWith(expect.any(Array), { basename: '/app' })
    vi.unstubAllGlobals()
  })
})
