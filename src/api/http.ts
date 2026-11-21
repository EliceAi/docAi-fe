/** 백엔드 공통 응답 (docAi-be ApiResponse) */
type ApiResponse<T> = { status: number; code: string | null; message: string | null; data: T }

// 응답이 없을 때 화면이 멈춘 채로 남지 않게 끊는다
const REQUEST_TIMEOUT_MS = 15_000

/** 백엔드가 실패로 답했거나 응답을 받지 못했을 때. code·message는 백엔드 ErrorCode 그대로 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string | null

  constructor(status: number, code: string | null, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

// 인증 없이 보내고 공통 응답에서 data만 꺼낸다. 화면은 이 함수 대신 request()를 쓴다.
export async function sendRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { ...init, signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  const body = await readApiResponse<T>(response)

  if (!response.ok || body === null) {
    throw new ApiError(response.status, body?.code ?? null, body?.message ?? `요청이 실패했어요 (${response.status})`)
  }
  return body.data
}

async function readApiResponse<T>(response: Response): Promise<ApiResponse<T> | null> {
  try {
    return (await response.json()) as ApiResponse<T>
  } catch {
    // 서버가 꺼졌거나 프록시 오류면 본문이 JSON이 아니다. 상태 코드로만 알린다.
    return null
  }
}
