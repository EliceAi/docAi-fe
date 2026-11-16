import { Link } from 'react-router-dom'
import { Header, Icon, Mascot, Screen, type MascotFace } from '../../common/components'

type Notice = { face: MascotFace; title: string; text: string; to: string }

// #6에서 GET /api/notifications 응답으로 바꾼다
const SAMPLE_NOTICES: Notice[] = [
  { face: 5, title: 'D-8 · 입주·전입신고가 다가와요', text: '역삼동 원룸 월세 계약서', to: '/schedules/1' },
  { face: 6, title: '분석이 끝났어요', text: '카페 알바 근로계약서 · 확인 필요 2', to: '/analyses/1' },
]

// P01 알림 · #5 지희 · 보드: P01_알림패널
export function NotificationsPage() {
  return (
    <Screen header={<Header title="알림" back="/" chatFrom="S01" />}>
      <div className="card" style={{ padding: '4px 16px' }}>
        {SAMPLE_NOTICES.map(notice => (
          <Link key={notice.title} className="li" to={notice.to}>
            <Mascot face={notice.face} size={36} />
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
