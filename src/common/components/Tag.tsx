import type { ReactNode } from 'react'
import { Icon } from './Icon'
import type { IconName } from './iconPaths'

/** red 확인 필요 · amb 주의 · grn 완료 · blu 정보 · gry 기본 · ink 진한 강조 */
export type TagColor = 'red' | 'amb' | 'grn' | 'blu' | 'gry' | 'ink'

// 와이어프레임 tag(text, color, iconName). 상태는 색만 쓰지 않고 글자로도 보여 준다.
export function Tag({ children, color = 'gry', icon }: { children: ReactNode; color?: TagColor; icon?: IconName }) {
  return (
    <span className={`tag t-${color}`}>
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  )
}

// 와이어프레임 sourceTag: 날짜·값이 어디서 왔는지
export const SourceTag = {
  written: () => <Tag color="blu">계약서에 적힘</Tag>,
  typed: () => <Tag color="gry">직접 입력</Tag>,
  review: () => <Tag color="amb">조건 검토 필요</Tag>,
}
