/**
 * 백엔드 dev에 머지되고 test-api 스킬로 응답 모양까지 확인한 API만 넣는다.
 * 여기 없는 API는 VITE_API_MODE=real이어도 mock으로 답한다.
 */
export const READY_APIS: string[] = [
  'issueAnonymousUser', 'createContract', 'requestAnalysis',
  'getDocumentTypes', 'getUpcomingSchedules', 'getUnreadNotificationCount',
  'getAnalysis', 'getAnalysisProgress', 'getClause', 'getSampleAnalysis', 'submitManualInputs', 'loadContractPageImage',
  // #54 B 담당 (2026-11-21 로컬 실제 호출로 확인)
  'getScheduleCandidates', 'archiveContract', 'getMyContracts', 'getMyContract',
  'getSchedules', 'getSchedule', 'updateSchedule', 'deleteSchedule', 'getNotifications',
  'changeDocumentType', 'reuploadPage',
]

export function shouldMock(apiName: string, mode: string | undefined = import.meta.env.VITE_API_MODE): boolean {
  if (mode !== 'real') return true
  return !READY_APIS.includes(apiName)
}

// mock 응답도 실제처럼 비동기로 돌려준다. 화면 코드가 mock과 실제를 구분하지 않게 하기 위해서다.
export function mockResponse<T>(data: T): Promise<T> {
  return Promise.resolve(structuredClone(data))
}
