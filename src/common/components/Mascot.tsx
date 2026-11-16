import { MASCOT_SPRITE } from './mascotSprite'

/**
 * 캐릭터 표정 1~9. 화면 상태를 보여 주는 장식이며 기능을 뜻하지 않는다.
 * 1 기본 · 2 반가움 · 3 생각 중 · 4 돋보기 · 5 짚어줌 · 6 완료 · 7 가리기 · 8 쉬는 중 · 9 미안
 */
export type MascotFace = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

// 와이어프레임 mascot(expression, size)
export function Mascot({ face, size = 40 }: { face: MascotFace; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" style={{ flex: 'none' }} aria-hidden="true">
      <use href={`#m${face}`} />
    </svg>
  )
}

// 표정 정의를 문서에 한 번만 넣는다. AppFrame과 보드 모아 보기가 맨 위에 둔다.
export function MascotDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs dangerouslySetInnerHTML={{ __html: MASCOT_SPRITE }} />
    </svg>
  )
}
