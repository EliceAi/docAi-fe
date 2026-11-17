import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppPanels } from '../layout/AppPanels'
import { Icon } from './Icon'
import { Mascot } from './Mascot'

type HeaderProps = {
  title?: string
  /** 홈 화면처럼 왼쪽에 "문서AI" 로고를 둔다 */
  home?: boolean
  /** 뒤로 버튼이 갈 주소. false면 뒤로 버튼을 숨기고, 비우면 브라우저 뒤로 가기 */
  back?: string | false
  /** 챗봇을 열 때 넘길 화면 코드(S01~S15). 화면별 추천 질문에 쓴다 */
  chatFrom?: string
  /** 챗봇에서 질문할 계약서 ID */
  contractId?: number
  /** 헤더 아래에 붙는 영역(단계 표시 등) */
  sub?: ReactNode
}

// 와이어프레임 header(title, options): 상태 표시줄 + 뒤로 · 제목 · 알림 · AI에게 질문
export function Header({ title = '', home = false, back, chatFrom, contractId, sub }: HeaderProps) {
  const navigate = useNavigate()
  const { openChat } = useAppPanels()

  return (
    <div className="hd-w">
      <div className="sb"><span>9:41</span><span>●●● ▮</span></div>
      <div className="hd">
        {home ? (
          <><b className="logo">문서AI</b><span className="ht" /></>
        ) : (
          <>
            {back === false && <span style={{ width: 10 }} />}
            {typeof back === 'string' && <Link className="hb" to={back} aria-label="뒤로"><Icon name="back" size={22} /></Link>}
            {back === undefined && (
              <a className="hb" role="button" aria-label="뒤로" onClick={() => navigate(-1)}><Icon name="back" size={22} /></a>
            )}
            <span className="ht">{title}</span>
          </>
        )}
        <Link className="hi" to="/notifications" aria-label="알림"><Icon name="bell" size={22} /></Link>
        <a className="ai-chip" role="button" onClick={() => openChat({ from: chatFrom, contractId })}>
          <Mascot face={1} size={22} />AI에게 질문
        </a>
      </div>
      {sub}
    </div>
  )
}
