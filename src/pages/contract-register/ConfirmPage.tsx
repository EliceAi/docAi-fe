import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Dialog, Header, Icon, Layered, Screen, StepBar, StepFooter, Tag } from '../../common/components'
import { pagesSignature, registerContract } from './registerContract'
import { activateButton } from './PreviewPage'
import { useRegisterFlow, type RegisteredPage } from './RegisterFlowContext'

// S06 최종 확인 · #12 김지희
export function ConfirmPage() {
  return <ConfirmScreen />
}

const CHECK_ITEMS = ['이름·주민번호·연락처·주소를 가렸어요', '시급·근로시간·날짜는 보여요']

export function ConfirmScreen({ initialFailed = false }: { initialFailed?: boolean }) {
  const { pages, documentTypeCode, getIdempotencyKey } = useRegisterFlow()
  const navigate = useNavigate()
  const [checked, setChecked] = useState([true, true])
  const [failed, setFailed] = useState(initialFailed)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')

  async function requestAnalysis() {
    if (sending || !documentTypeCode) return
    setSending(true)
    setFailed(false)
    try {
      const analysisId = await registerContract(pages, documentTypeCode, getIdempotencyKey(pagesSignature(pages)))
      navigate(`/analyses/${analysisId}/progress`)
    } catch {
      setFailed(true)
    } finally {
      setSending(false)
    }
  }

  const canRequest = pages.length > 0 && documentTypeCode !== null
  const content = (
    <Screen header={<Header title="보내기 전 확인" back="/contracts/new/mask" chatFrom="S06" sub={<StepBar current={4} />} />}
      footer={<StepFooter current={4} nextLabel="분석 요청" ready={canRequest && !sending} onNext={requestAnalysis}
        onNotReady={() => setMessage(canRequest ? '' : pages.length ? '계약서 종류를 먼저 골라 주세요.' : '사진이나 파일을 올리면 눌러져요.')} />}>
      <div className="infob"><Icon name="lock" size={18} /><span>AI에는 <b>가린 이미지 {pages.length}쪽</b>만 보내요.<br />가리기 전 원본은 보내지 않아요.</span></div>
      <div className="pages">
        {pages.map((page, index) => <PageThumb key={page.id} page={page} number={index + 1} />)}
      </div>
      <div className="card">
        <div className="h2">마지막으로 확인해 주세요</div>
        {CHECK_ITEMS.map((text, index) => (
          <div key={text} className="srow" style={index === CHECK_ITEMS.length - 1 ? { border: 0 } : undefined} onKeyDown={activateButton}>
            <span className={`cb ${checked[index] ? 'on' : ''}`} role="checkbox" aria-checked={checked[index]} aria-label={text} tabIndex={0}
              onClick={() => setChecked(previous => previous.map((value, i) => i === index ? !value : value))}>
              {checked[index] && <Icon name="check" size={14} />}
            </span>
            <span>{text}</span>
          </div>
        ))}
      </div>
      <div className="note"><Icon name="info" size={14} /> 가린 곳을 고치면 이 확인을 다시 받아요.</div>
      {message && <div className="note" role="status">{message}</div>}
    </Screen>
  )

  if (!failed) return content
  return <Layered base={<div inert>{content}</div>} layers={[
    <div key="failed" role="dialog" aria-modal="true" aria-label="가린 이미지 생성 실패" onKeyDown={activateButton}>
      <Dialog face={9} title="가린 이미지를 만들지 못했어요" text="원본은 보내지 않았어요. 다시 시도하거나 가린 곳을 확인해 주세요."
        buttons={<><Button kind="l" to="/contracts/new/mask">가린 곳 확인</Button><Button onClick={requestAnalysis}>다시 시도</Button></>} />
    </div>,
  ]} />
}

function PageThumb({ page, number }: { page: RegisteredPage; number: number }) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    const objectUrl = URL.createObjectURL(page.file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [page.file])
  return (
    <div className="pth">
      <div className="pimg" style={{ padding: 0, position: 'relative', overflow: 'hidden' }}>
        {url && page.file.type !== 'application/pdf' && <img src={url} alt={`${number}쪽`} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'fill' }} />}
        {page.masks.map((mask, index) => (
          <span key={index} className="mkb" style={{ position: 'absolute', left: `${mask.x * 100}%`, top: `${mask.y * 100}%`, width: `${mask.width * 100}%`, height: `${mask.height * 100}%` }} />
        ))}
      </div>
      <div className="row" style={{ justifyContent: 'space-between' }}><b>{number}쪽</b><Tag color={page.masks.length ? 'ink' : 'gry'}>가린 곳 {page.masks.length}</Tag></div>
    </div>
  )
}
