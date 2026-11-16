import type { ReactNode } from 'react'

type ScreenProps = {
  /** 맨 위 고정 영역: 보통 <Header /> */
  header?: ReactNode
  /** 맨 아래 고정 영역: <Footer /> 또는 <TabBar /> */
  footer?: ReactNode
  children: ReactNode
}

// 와이어프레임 screen(head, body, foot): 헤더·아래 버튼은 고정되고 본문만 스크롤된다
export function Screen({ header, footer, children }: ScreenProps) {
  return (
    <div className="scr">
      {header}
      <div className="bd">{children}</div>
      {footer}
    </div>
  )
}

// 와이어프레임 footer(...buttons): 화면 아래 고정 버튼 줄
export function Footer({ children }: { children: ReactNode }) {
  return <div className="ft">{children}</div>
}
