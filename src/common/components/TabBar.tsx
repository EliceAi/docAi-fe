import { Link } from 'react-router-dom'
import { Icon } from './Icon'
import type { IconName } from './iconPaths'

export type TabName = '홈' | '계약서 등록' | '내 계약서' | '내 일정'

const TABS: { icon: IconName; label: TabName; to: string }[] = [
  { icon: 'home', label: '홈', to: '/' },
  { icon: 'filePlus', label: '계약서 등록', to: '/contracts/new' },
  { icon: 'files', label: '내 계약서', to: '/contracts' },
  { icon: 'cal', label: '내 일정', to: '/schedules' },
]

// 와이어프레임 tabBar(active): 하단 탭 4개
export function TabBar({ active }: { active: TabName }) {
  return (
    <div className="tb">
      {TABS.map(tab => (
        <Link key={tab.label} className={tab.label === active ? 'on' : ''} to={tab.to}>
          <Icon name={tab.icon} size={22} />{tab.label}
        </Link>
      ))}
    </div>
  )
}
