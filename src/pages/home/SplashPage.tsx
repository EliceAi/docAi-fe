import { useEffect, type CSSProperties } from 'react'
import { getAccessToken } from '../../api/users'
import { Mascot } from '../../common/components'

const SPLASH_MS = 1000

// 와이어프레임 splashScreen(): 보드에서는 390×844 그대로, 앱에서는 화면을 가득 채운다
export function SplashScreen({ style }: { style?: CSSProperties }) {
  return (
    <div className="spl" style={style}>
      <Mascot face={2} size={130} />
      <b>문서AI</b>
      <span className="mut">집과 일, 처음 받는 문서 길잡이</span>
      <span className="dots"><i /><i /><i /></span>
    </div>
  )
}

// S00 스플래시 · #7 김지희 · 보드: S00_스플래시
export function SplashPage({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    // 익명 사용자 토큰을 미리 받아 둔다. 실패해도 이후 API 호출 때 다시 받으므로 홈으로 간다
    getAccessToken().catch(() => {})
    const timer = window.setTimeout(onDone, SPLASH_MS)
    return () => window.clearTimeout(timer)
  }, [onDone])

  return <SplashScreen style={{ width: '100%', height: '100%' }} />
}
