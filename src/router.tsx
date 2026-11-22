import { createBrowserRouter, Navigate, Outlet, type RouteObject } from 'react-router-dom'
import { AppFrame } from './common/layout/AppFrame'
import { AppPanelsProvider } from './common/layout/AppPanels'
import { BoardsPage } from './dev/BoardsPage'
import { AnalysisProgressPage } from './pages/analysis/AnalysisProgressPage'
import { AnalysisResultPage } from './pages/analysis/AnalysisResultPage'
import { ClauseDetailPage } from './pages/analysis/ClauseDetailPage'
import { ComparisonPreparePage } from './pages/comparison/ComparisonPreparePage'
import { ComparisonResultPage } from './pages/comparison/ComparisonResultPage'
import { CapturePage } from './pages/contract-register/CapturePage'
import { ConfirmPage } from './pages/contract-register/ConfirmPage'
import { DocumentTypePage } from './pages/contract-register/DocumentTypePage'
import { MaskPage } from './pages/contract-register/MaskPage'
import { PreviewPage } from './pages/contract-register/PreviewPage'
import { RegisterFlowProvider } from './pages/contract-register/RegisterFlowContext'
import { HomePage } from './pages/home/HomePage'
import { MyContractDetailPage } from './pages/my-contracts/MyContractDetailPage'
import { MyContractsPage } from './pages/my-contracts/MyContractsPage'
import { NotificationsPage } from './pages/notifications/NotificationsPage'
import { ScheduleDetailPage } from './pages/schedule/ScheduleDetailPage'
import { ScheduleRegisterPage } from './pages/schedule/ScheduleRegisterPage'
import { SchedulesPage } from './pages/schedule/SchedulesPage'
import { DemoContractsPage } from './pages/contract-register/DemoContractsPage'
import { shouldMock } from './api/mock-mode'

// 앱의 모든 화면 주소. 주소 이름은 백엔드 API와 같은 규칙(복수형 명사)이다. S10 챗봇은 주소 없이 패널로 연다.
const appRoutes: RouteObject[] = [
  { path: '/', element: <HomePage /> }, // S00·S01
  { path: '/notifications', element: <NotificationsPage /> }, // P01
  // S02~S06은 고른 문서 종류 같은 값을 화면이 바뀌어도 이어서 쓰도록 RegisterFlowProvider로 감싼다
  {
    element: shouldMock('createContract') ? <DemoContractsPage /> : <RegisterFlowProvider><Outlet /></RegisterFlowProvider>,
    children: [
      { path: '/contracts/new', element: <DocumentTypePage /> }, // S02
      { path: '/contracts/new/capture', element: <CapturePage /> }, // S03
      { path: '/contracts/new/preview', element: <PreviewPage /> }, // S04
      { path: '/contracts/new/mask', element: <MaskPage /> }, // S05
      { path: '/contracts/new/confirm', element: <ConfirmPage /> }, // S06
    ],
  },
  { path: '/analyses/:analysisId/progress', element: <AnalysisProgressPage /> }, // S07
  { path: '/analyses/:analysisId', element: <AnalysisResultPage /> }, // S08
  { path: '/analyses/:analysisId/clauses/:clauseId', element: <ClauseDetailPage /> }, // S09
  { path: '/comparisons/new', element: <ComparisonPreparePage /> }, // S11
  { path: '/comparisons/:comparisonId', element: <ComparisonResultPage /> }, // S12
  { path: '/schedules/new', element: <ScheduleRegisterPage /> }, // S13
  { path: '/schedules', element: <SchedulesPage /> }, // S14
  { path: '/schedules/:scheduleId', element: <ScheduleDetailPage /> }, // S14 상세
  { path: '/contracts', element: <MyContractsPage /> }, // S15
  { path: '/contracts/:contractId', element: <MyContractDetailPage /> }, // S15 상세
  // 와이어프레임에 없는 주소는 오류 화면 대신 홈으로 보낸다
  { path: '*', element: <Navigate to="/" replace /> },
]

const SHOW_BOARDS = import.meta.env.VITE_SHOW_BOARDS === 'true'

export const router = createBrowserRouter([
  {
    element: <AppPanelsProvider><Outlet /></AppPanelsProvider>,
    children: [
      { element: <AppFrame />, children: appRoutes },
      ...(SHOW_BOARDS ? [{ path: '/dev/boards', element: <BoardsPage /> }] : []),
    ],
  },
], { basename: typeof window !== 'undefined' && /^\/app(?:\/|$)/.test(window.location.pathname) ? '/app' : '/' })
