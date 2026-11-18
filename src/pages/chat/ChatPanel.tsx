import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { askChatQuestion, getChatMessages, loadLastConversationId, saveLastConversationId, type ChatAction, type ChatMessage } from '../../api/chats'
import { getMyContract } from '../../api/contracts'
import { mockGreeting } from '../../api/mocks/chats'
import { useApiData } from '../../api/useApiData'
import { Button, Dialog, Icon, LawSourceLink, Mascot, Sheet, Tag } from '../../common/components'
import type { ChatOpening } from '../../common/layout/AppPanels'
import { CHAT_FAILED_TEXT, needsLeaveConfirm, screenContext, SUGGESTED_QUESTIONS } from './chatRules'

// S10 AI 챗봇 패널 · #23 김지희 · 보드 13개는 boards.tsx 참고
// 챗봇은 화면이 아니라 지금 화면 위에 올라오는 패널이라 주소가 없다(AppPanels 참고).
// 대화만으로 문서를 보내거나 일정을 저장하지 않는다. 이동 버튼은 누를 때만 이동한다.

type ChatPanelProps = {
  /** 어느 화면에서 열었는지(opening.from = S01~S15) */
  opening: ChatOpening
  onClose: () => void
}

export function ChatPanel({ opening, onClose }: ChatPanelProps) {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<ChatMessage[]>([mockGreeting])
  const [chips, setChips] = useState(SUGGESTED_QUESTIONS[opening.from ?? ''] ?? [])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [pending, setPending] = useState<ChatAction | null>(null)
  const conversationId = useRef<number | undefined>(loadLastConversationId())

  // 다시 열면 마지막 대화를 이어 보여 준다(명세: 대화 기록 조회)
  useEffect(() => {
    const lastId = conversationId.current
    if (!lastId) return
    let active = true
    getChatMessages(lastId).then(history => { if (active && history.length) setMessages([mockGreeting, ...history]) }).catch(() => { /* 기록을 못 받아도 새 대화로 시작한다 */ })
    return () => { active = false }
  }, [])
  const failedQuestion = useRef('')
  const { data: contract } = useApiData(() => opening.contractId ? getMyContract(opening.contractId) : Promise.resolve(null), [opening.contractId])
  const linkedDoc = contract ? `${contract.title} (${contract.savedAt.slice(5).replace('-', '.')} 분석)` : undefined

  async function send(question: string, retry = false) {
    const text = question.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')
    // 다시 시도할 때는 실패 안내만 지우고, 같은 질문을 한 번 더 쌓지 않는다
    setMessages(list => retry ? list.filter(message => message.status !== 'FAILED') : [...list, { role: 'me', text }])
    try {
      const answer = await askChatQuestion({ conversationId: conversationId.current, contractId: opening.contractId, screen: opening.from, question: text })
      conversationId.current = answer.conversationId
      saveLastConversationId(answer.conversationId)
      setMessages(list => [...list, { role: 'ai', text: answer.answer, refs: answer.refs, actions: answer.actions, status: answer.status, face: answer.face }])
      setChips(answer.followUps ?? SUGGESTED_QUESTIONS[opening.from ?? ''] ?? [])
    } catch {
      // 작성한 질문은 입력창에 그대로 남긴다
      failedQuestion.current = text
      setInput(text)
      setMessages(list => [...list, { role: 'ai', text: CHAT_FAILED_TEXT, status: 'FAILED', face: 9 }])
    } finally {
      setSending(false)
    }
  }

  function leave(action: ChatAction) {
    navigate(action.to, action.state ? { state: action.state } : undefined)
    onClose()
  }

  function chooseAction(action: ChatAction) {
    if (needsLeaveConfirm(opening.from, action.to)) setPending(action)
    else leave(action)
  }

  return (
    <>
      <ChatPanelView linkedDoc={linkedDoc} context={screenContext(opening.from)} messages={messages} chips={chips} input={input}
        onInput={setInput} onSend={() => void send(input)} onChip={question => void send(question)} onAction={chooseAction}
        onRetry={() => void send(failedQuestion.current, true)} onClose={onClose} />
      {pending && (
        <>
          <div className="dim d2" />
          <ConfirmLeaveDialog onStay={() => setPending(null)} onLeave={() => { leave(pending); setPending(null) }} />
        </>
      )}
    </>
  )
}

export function ConfirmLeaveDialog({ onStay, onLeave }: { onStay?: () => void; onLeave?: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="이동 확인">
      <Dialog face={5} title="가리던 내용이 사라질 수 있어요" text="계약서 등록 화면으로 가면 지금 가린 내용이 저장되지 않아요."
        buttons={<><Button kind="l" onClick={onStay}>계속 대화하기</Button><Button onClick={onLeave}>이동하기</Button></>} />
    </div>
  )
}

type ChatPanelViewProps = {
  /** 대화에 연결된 내 계약서. 없으면 일반 질문 */
  linkedDoc?: string
  /** 지금 보는 문서와 연결 문서가 다를 때 "바꾸기" */
  onSwap?: () => void
  context: string
  /** 대화 중 분석이 끝났다는 안내 */
  banner?: { text: string; actionLabel: string; onAction?: () => void }
  messages: ChatMessage[]
  chips: string[]
  input: string
  onInput?: (value: string) => void
  onSend?: () => void
  onChip?: (question: string) => void
  onAction?: (action: ChatAction) => void
  onRetry?: () => void
  onClose?: () => void
}

/** 와이어프레임 chatPanel(): 보드와 실제 패널이 같은 화면을 그린다 */
export function ChatPanelView({ linkedDoc, onSwap, context, banner, messages, chips, input, onInput, onSend, onChip, onAction, onRetry, onClose }: ChatPanelViewProps) {
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView?.({ block: 'end' }) }, [messages])

  return (
    <Sheet>
      <div className="grab" />
      <div className="sh-t">
        <Mascot face={1} size={30} />
        <b>AI에게 질문</b>
        <a className="x" role="button" tabIndex={0} aria-label="닫기" onClick={onClose} onKeyDown={activate}><Icon name="x" size={22} /></a>
      </div>
      {linkedDoc ? (
        <div className="cl on"><Icon name="doc" size={15} /><span>내 문서 · <b>{linkedDoc}</b></span>
          {onSwap && <a className="sw" role="button" tabIndex={0} onClick={onSwap} onKeyDown={activate}>바꾸기</a>}</div>
      ) : (
        <div className="cl"><Icon name="info" size={15} /><span>일반 질문 · 계약서 연결 없음</span></div>
      )}
      <div className="ctx"><Icon name="info" size={13} /><span>{context}</span></div>
      {banner && (
        <div className="banner"><Icon name="check" size={16} />{banner.text}
          <a role="button" tabIndex={0} onClick={banner.onAction} onKeyDown={activate}>{banner.actionLabel}</a></div>
      )}
      <div className="msgs" style={{ overflowY: 'auto' }} aria-live="polite">
        {messages.map((message, index) => <Message key={index} message={message} onAction={onAction} onRetry={onRetry} />)}
        <div ref={end} />
      </div>
      <div className="qcs">
        {chips.map(chip => <a key={chip} className="qc" role="button" tabIndex={0} onClick={() => onChip?.(chip)} onKeyDown={activate}>{chip}</a>)}
      </div>
      <div className="inp">
        <input aria-label="질문 입력" placeholder="궁금한 걸 물어보세요" value={input} className={input ? 'typed' : ''}
          style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: 'transparent', font: 'inherit', color: 'inherit' }}
          onChange={event => onInput?.(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) onSend?.() }} />
        <b role="button" tabIndex={0} aria-label="보내기" onClick={onSend} onKeyDown={activate}><Icon name="send" size={18} /></b>
      </div>
    </Sheet>
  )
}

function Message({ message, onAction, onRetry }: { message: ChatMessage; onAction?: (action: ChatAction) => void; onRetry?: () => void }) {
  if (message.role === 'me') return <div className="me">{message.text}</div>
  const failed = message.status === 'FAILED'
  const usedLaw = message.refs?.includes('법령 DB')
  return (
    <div className="air">
      <Mascot face={message.face ?? 1} size={30} />
      <div className={`aib ${failed ? 'fail' : ''}`}>
        {message.status === 'NOT_ENOUGH' && <><Tag color="amb">일부만 답할 수 있어요</Tag><br /></>}
        <RichText text={message.text} />
        {message.refs && <div className="refs"><span>참고한 정보</span>{message.refs.map(ref => <em key={ref}>{ref}</em>)}</div>}
        {usedLaw && <div className="refs"><LawSourceLink /><span>AI도 실수할 수 있어요. 원문을 함께 확인해 주세요.</span></div>}
        {(message.actions?.length || failed) ? (
          <div className="acts">
            {message.actions?.map(action => (
              <a key={action.label} className="act" role="button" tabIndex={0} onClick={() => onAction?.(action)} onKeyDown={activate}>{action.label}<Icon name="chev" size={14} /></a>
            ))}
            {failed && <a className="act" role="button" tabIndex={0} onClick={onRetry} onKeyDown={activate}>다시 시도<Icon name="chev" size={14} /></a>}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** 답변 문장의 **굵게**와 줄바꿈만 그린다 */
function RichText({ text }: { text: string }): ReactNode {
  return text.split('\n').map((line, lineIndex) => (
    <span key={lineIndex}>
      {lineIndex > 0 && <br />}
      {line.split('**').map((part, partIndex) => partIndex % 2 ? <b key={partIndex}>{part}</b> : part)}
    </span>
  ))
}

function activate(event: KeyboardEvent<HTMLElement>) {
  if ((event.key === 'Enter' || event.key === ' ') && (event.target as HTMLElement).getAttribute('role') === 'button') {
    event.preventDefault()
    ;(event.target as HTMLElement).click()
  }
}
