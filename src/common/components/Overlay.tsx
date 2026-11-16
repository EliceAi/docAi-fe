import type { ReactNode } from 'react'
import { Mascot, type MascotFace } from './Mascot'

// 와이어프레임 sheet(inner, small): 아래에서 올라오는 패널. small이면 62% 높이
export function Sheet({ small = false, children }: { small?: boolean; children: ReactNode }) {
  return <div className={`sheet ${small ? 's60' : ''}`}>{children}</div>
}

type DialogProps = {
  face?: MascotFace
  title: ReactNode
  text: ReactNode
  extra?: ReactNode
  /** 아래 버튼들: <Button />을 넣는다 */
  buttons: ReactNode
}

// 와이어프레임 dialog({ face, title, text, extra, buttons }): 가운데 확인창
export function Dialog({ face, title, text, extra, buttons }: DialogProps) {
  return (
    <div className="dlg">
      {face && <div style={{ display: 'flex', justifyContent: 'center' }}><Mascot face={face} size={64} /></div>}
      <div className="dt">{title}</div>
      <div className="dd">{text}</div>
      {extra}
      <div className="db">{buttons}</div>
    </div>
  )
}

// 와이어프레임 layered(base, ...layers): 아래 화면은 어둡게 두고 패널·확인창을 위에 얹는다
export function Layered({ base, layers }: { base: ReactNode; layers: ReactNode[] }) {
  return (
    <div className="ov">
      <div className="base">{base}</div>
      {layers.map((layer, index) => (
        <div key={index}>
          <div className={`dim ${index > 0 ? 'd2' : ''}`} />
          {layer}
        </div>
      ))}
    </div>
  )
}
