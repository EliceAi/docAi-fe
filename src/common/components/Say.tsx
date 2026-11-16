import type { ReactNode } from 'react'
import { Mascot, type MascotFace } from './Mascot'

// 와이어프레임 say(expression, text, size): 캐릭터 + 말풍선
export function Say({ face, size = 44, children }: { face: MascotFace; size?: number; children: ReactNode }) {
  return (
    <div className="say">
      <Mascot face={face} size={size} />
      <div className="bub">{children}</div>
    </div>
  )
}
