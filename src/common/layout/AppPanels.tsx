import { createContext, useContext, useState, type ReactNode } from 'react'

/** 챗봇을 연 곳. from은 화면 코드(S01~S15)로, 화면별 추천 질문을 고를 때 쓴다 */
export type ChatOpening = { from?: string; contractId?: number }

type AppPanels = {
  /** 열려 있는 챗봇. 닫혀 있으면 null */
  chat: ChatOpening | null
  openChat: (opening?: ChatOpening) => void
  closeChat: () => void
}

const AppPanelsContext = createContext<AppPanels | null>(null)

// S10 챗봇은 화면이 아니라 지금 화면 위에 올라오는 패널이다. 닫으면 하던 화면이 그대로 남아야 해서 주소 대신 이 상태로 연다.
export function AppPanelsProvider({ children }: { children: ReactNode }) {
  const [chat, setChat] = useState<ChatOpening | null>(null)
  const panels: AppPanels = {
    chat,
    openChat: (opening = {}) => setChat(opening),
    closeChat: () => setChat(null),
  }
  return <AppPanelsContext.Provider value={panels}>{children}</AppPanelsContext.Provider>
}

export function useAppPanels() {
  const panels = useContext(AppPanelsContext)
  if (!panels) throw new Error('useAppPanels는 AppPanelsProvider 안에서만 쓸 수 있어요.')
  return panels
}
