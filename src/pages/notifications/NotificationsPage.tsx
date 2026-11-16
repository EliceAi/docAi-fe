import { Link } from 'react-router-dom'
import { getNotifications, type NotificationKind } from '../../api/notifications'
import { useApiData } from '../../api/useApiData'
import { Header, Icon, Mascot, Screen, type MascotFace } from '../../common/components'

// 와이어프레임 P01: 다가오는 일정은 짚어줌(5), 분석 완료는 완료(6) 표정
const FACE_BY_KIND: Record<NotificationKind, MascotFace> = { SCHEDULE: 5, ANALYSIS_DONE: 6 }

// P01 알림 · #5 김지희 · 보드: P01_알림패널
export function NotificationsPage() {
  const { data: notices } = useApiData(() => getNotifications(), [])

  return (
    <Screen header={<Header title="알림" back="/" chatFrom="S01" />}>
      <div className="card" style={{ padding: '4px 16px' }}>
        {notices?.map(notice => (
          <Link key={notice.notificationId} className="li" to={notice.to}>
            <Mascot face={FACE_BY_KIND[notice.kind]} size={36} />
            <span style={{ flex: 1 }}>
              <b>{notice.title}</b><br />
              <span className="mut">{notice.text}</span>
            </span>
            <Icon name="chev" size={16} />
          </Link>
        ))}
      </div>
      <div className="note"><Icon name="bell" size={14} /> 앱을 열면 이곳에 모아 보여 드려요. 휴대폰 푸시 알림은 준비 중이에요.</div>
    </Screen>
  )
}
