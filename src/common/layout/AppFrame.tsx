import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { ChatPanel } from '../../pages/chat/ChatPanel'
import { MascotDefs } from '../components/Mascot'
import { useAppPanels } from './AppPanels'
import { PcIntro } from './PcIntro'
import './layout.css'

const PC_MEDIA_QUERY = '(min-width: 768px)'

// PC로 열면 가운데 휴대폰 틀 + 옆 소개, 휴대폰으로 열면 틀 없이 꽉 찬 앱
export function AppFrame() {
  const isPc = useIsPc()
  const app = <PhoneScreen />

  if (!isPc) return <div className="app-mobile"><MascotDefs />{app}</div>
  return (
    <div className="app-pc">
      <MascotDefs />
      <PcIntro />
      <div className="phone-frame">{app}</div>
    </div>
  )
}

// 화면은 스크롤되고, 챗봇 패널은 그 위에 겹친다
function PhoneScreen() {
  const { chat, closeChat } = useAppPanels()
  return (
    <div className="phone-viewport">
      <div className="phone-scroll"><Outlet /></div>
      {chat && (
        <div className="phone-overlay">
          <div className="dim" onClick={closeChat} />
          <ChatPanel opening={chat} onClose={closeChat} />
        </div>
      )}
    </div>
  )
}

function useIsPc() {
  const [isPc, setIsPc] = useState(() => window.matchMedia(PC_MEDIA_QUERY).matches)
  useEffect(() => {
    const media = window.matchMedia(PC_MEDIA_QUERY)
    const update = () => setIsPc(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return isPc
}
