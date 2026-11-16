import type { ReactNode } from 'react'

// 와이어프레임 .toast: 화면 아래쪽에 잠깐 뜨는 검은 안내
export function Toast({ children }: { children: ReactNode }) {
  return <div className="toast">{children}</div>
}

// 와이어프레임 disclaimer: 분석·답변 아래에 붙는 AI 안내 문구 (문구를 바꾸지 않는다)
export function Disclaimer() {
  return (
    <div className="disc">
      <b>AI도 실수할 수 있어요.</b> 근거 법령은 '법령 원문 ↗'으로 원문을 함께 확인해 주세요. 법률 자문이 아니에요.
      서명 여부는 직접 판단하시고, 애매하면 고용노동부 1350 · 대한법률구조공단 132에 물어보세요.
    </div>
  )
}

// 와이어프레임 .src "법령 원문 ↗": 국가법령정보센터의 조문 원문을 새 탭으로 연다
export function LawSourceLink({ url = 'https://www.law.go.kr', children = '법령 원문 ↗' }: { url?: string; children?: ReactNode }) {
  return (
    <a className="src" href={url} target="_blank" rel="noreferrer">{children}</a>
  )
}
