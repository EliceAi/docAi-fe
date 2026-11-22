import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './common/styles/tokens.css'
import './common/styles/base.css'
import { router } from './router'
import { shouldMock } from './api/mock-mode'

const showLanding = shouldMock('createContract') && window.location.pathname === '/'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {showLanding
      ? <iframe title="문서AI 분석 파이프라인과 시연 영상" src={`/showcase.html${window.location.hash}`} style={{ display: 'block', width: '100%', height: '100dvh', border: 0 }} />
      : <RouterProvider router={router} />}
  </StrictMode>,
)
