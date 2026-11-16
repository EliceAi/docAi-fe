import type { ReactNode } from 'react'

export type Owner = '김지희' | '구자건'

/** 와이어프레임 보드 하나 */
export type Board = {
  /** docs/wireframe.html의 보드 이름 (예: S15_내계약서_목록) */
  id: string
  owner: Owner
  /** "앱에서 열기"로 갈 주소 */
  path: string
  /** 그 보드 상태를 mock 데이터로 그린다. 없으면 아직 미구현 */
  render?: () => ReactNode
}
