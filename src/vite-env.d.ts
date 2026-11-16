/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** mock: 모든 API를 가짜 응답으로 · real: 백엔드에 머지된 API는 실제로 호출 */
  readonly VITE_API_MODE?: 'mock' | 'real'
  /** 'true'일 때만 /dev/boards가 열린다 */
  readonly VITE_SHOW_BOARDS?: string
  /** PC 소개의 "실제 동작 영상 보기" 주소 (배포 때) */
  readonly VITE_DEMO_VIDEO_URL?: string
  /** PC 소개의 "화면 설계안 보기" 주소 (배포 때) */
  readonly VITE_WIREFRAME_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
