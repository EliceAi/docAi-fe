import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** p 파랑(주 버튼) · l 흰 테두리 · g 회색 · off 아직 누를 수 없음 */
export type ButtonKind = 'p' | 'l' | 'g' | 'off'

type ButtonProps = {
  children: ReactNode
  kind?: ButtonKind
  /** 작은 버튼(.btn.s) */
  small?: boolean
  /** 누르면 이동할 화면 주소. 없으면 onClick만 실행한다 */
  to?: string
  onClick?: () => void
}

// 와이어프레임 button(text, target, kind)
export function Button({ children, kind = 'p', small = false, to, onClick }: ButtonProps) {
  const className = `btn ${kind}${small ? ' s' : ''}`
  if (to) {
    return <Link className={className} to={to} onClick={onClick}>{children}</Link>
  }
  return (
    <a className={className} role="button" tabIndex={0} onClick={onClick}>
      {children}
    </a>
  )
}
