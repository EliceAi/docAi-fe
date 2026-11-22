// PC로 열었을 때 휴대폰 틀 옆에 보이는 소개. 영상·설계안 주소는 배포 때 환경 변수로 넣는다(#23).
const DEMO_VIDEO_URL = import.meta.env.VITE_DEMO_VIDEO_URL
const WIREFRAME_URL = import.meta.env.VITE_WIREFRAME_URL
const IS_DEMO_MODE = import.meta.env.VITE_API_MODE !== 'real'

export function PcIntro() {
  return (
    <section className="pc-intro">
      <span className="pc-badge">엘리스 AI 챌린지</span>
      <h1>서명 전에<br />계약서를 같이 읽어요</h1>
      <p>
        사회초년생을 위한 문서AI.<br />
        근로계약서·임대차계약서를 찍으면<br />
        확인할 조항과 일정을 알려 드려요.
      </p>
      <div className="pc-actions">
        {(DEMO_VIDEO_URL || IS_DEMO_MODE) && <a className="pc-btn primary" href={DEMO_VIDEO_URL || '/#video'}>시연 영상 보기</a>}
        {IS_DEMO_MODE && <a className="pc-btn" href="/#pipeline">AI 분석 과정</a>}
        {WIREFRAME_URL && <a className="pc-btn" href={WIREFRAME_URL} target="_blank" rel="noreferrer">화면 설계안 보기</a>}
      </div>
      <div className="pc-qr">
        <a className="pc-qr-box" href="https://elice-ai-docs.vercel.app/app" aria-label="휴대폰용 앱 주소 열기">
          <img src="/app-qr.svg" alt="문서AI 앱을 휴대폰에서 여는 QR 코드" width="112" height="112" />
        </a>
        <span><b>휴대폰으로 열기</b><br />QR을 찍으면 휴대폰에서<br />전체 화면 앱으로 열려요</span>
      </div>
      {IS_DEMO_MODE && <p className="pc-demo">시연 모드 · 분석 결과는 예시 데이터예요</p>}
    </section>
  )
}
