import { Icon } from '../../common/components/Icon'
import { Mascot } from '../../common/components/Mascot'
import { Sheet } from '../../common/components/Overlay'
import type { ChatOpening } from '../../common/layout/AppPanels'

type ChatPanelProps = {
  /** 어느 화면에서 열었는지(opening.from = S01~S15) */
  opening: ChatOpening
  onClose: () => void
}

// S10 AI 챗봇 패널 · #23 김지희 · 보드 13개는 boards.tsx 참고
// 와이어프레임 chatPanel()을 옮길 자리. 지금은 제목과 닫기만 있다.
export function ChatPanel({ opening, onClose }: ChatPanelProps) {
  return (
    <Sheet>
      <div className="grab" />
      <div className="sh-t">
        <Mascot face={1} size={30} />
        <b>AI에게 질문</b>
        <a className="x" role="button" aria-label="닫기" onClick={onClose}><Icon name="x" size={22} /></a>
      </div>
      <div className="msgs">
        <div className="air">
          <Mascot face={8} size={30} />
          <div className="aib">아직 만들지 않은 패널이에요. 담당 이슈에서 만들어요. (연 화면: {opening.from ?? '알 수 없음'})</div>
        </div>
      </div>
    </Sheet>
  )
}
