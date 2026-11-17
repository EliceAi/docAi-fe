import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getClause, type ClauseDetail } from '../../api/analyses'
import { useApiData } from '../../api/useApiData'
import { Button, Footer, Header, Icon, LawSourceLink, Mascot, Screen, Tag, Toast } from '../../common/components'
import { useAppPanels, type ChatOpening } from '../../common/layout/AppPanels'

/** 챗봇에서 패널을 닫고 이동할 때 넘기는 복귀 정보. */
export type ClauseDetailNavigationState = {
  fromChat?: boolean
  chatOpening?: ChatOpening
}

// S09 조항 상세 · #18 구자건 · 보드: S09_조항상세_기본
export function ClauseDetailPage() {
  const params = useParams()
  const analysisId = Number(params.analysisId)
  const clauseId = Number(params.clauseId)
  const validIds = Number.isSafeInteger(analysisId) && analysisId > 0 && Number.isSafeInteger(clauseId) && clauseId > 0
  const [retry, setRetry] = useState(0)
  const location = useLocation()
  const navigation = location.state as ClauseDetailNavigationState | null
  const { data, loading, error } = useApiData(
    () => validIds ? getClause(analysisId, clauseId) : Promise.reject(new Error('조항을 찾을 수 없어요.')),
    [analysisId, clauseId, retry],
  )
  const back = validIds ? `/analyses/${analysisId}` : '/contracts'

  if (!validIds || error) {
    return (
      <Screen header={<Header title="조항 상세" back={back} chatFrom="S09" />} footer={<Footer><Button to={back} kind="l">{validIds ? '분석 결과로' : '내 계약서로'}</Button></Footer>}>
        <div className="note" role="alert">{validIds ? '조항을 불러오지 못했어요.' : '조항을 찾을 수 없어요.'}</div>
        {validIds && <Button kind="l" onClick={() => setRetry(value => value + 1)}>다시 시도</Button>}
      </Screen>
    )
  }

  if (loading || !data || data.analysisId !== analysisId || data.clauseId !== clauseId) {
    return (
      <Screen header={<Header title="조항 상세" back={back} chatFrom="S09" />}>
        <div className="note" role="status">조항을 불러오는 중이에요.</div>
      </Screen>
    )
  }

  return <ClauseDetailView key={`${analysisId}/${clauseId}`} clause={data} fromChat={navigation?.fromChat === true} chatOpening={navigation?.chatOpening} />
}

export function ClauseDetailView({ clause, fromChat = false, chatOpening }: { clause: ClauseDetail; fromChat?: boolean; chatOpening?: ChatOpening }) {
  const navigate = useNavigate()
  const { openChat } = useAppPanels()
  const [copyMessage, setCopyMessage] = useState('')
  const back = `/analyses/${clause.analysisId}`
  const hasClauseNumber = clause.clauseNumber !== undefined && clause.clauseNumber > 0
  const hasPage = clause.pageNo !== undefined && clause.pageNo > 0

  useEffect(() => {
    if (!copyMessage) return
    const timer = window.setTimeout(() => setCopyMessage(''), 3000)
    return () => window.clearTimeout(timer)
  }, [copyMessage])

  async function copyQuestion() {
    try {
      await navigator.clipboard.writeText(clause.question)
      setCopyMessage('문구를 복사했어요.')
    } catch {
      setCopyMessage('복사하지 못했어요. 문구를 길게 눌러 복사해 주세요.')
    }
  }

  function returnToChat() {
    navigate(back)
    openChat(chatOpening ?? { from: 'S08', contractId: clause.contractId })
  }

  return (
    <Screen header={<Header title="조항 상세" back={back} chatFrom="S09" contractId={clause.contractId} />} footer={<Footer><Button to={back} kind="l">분석 결과로</Button></Footer>}>
      {fromChat && (
        <a className="act" role="button" tabIndex={0} onClick={returnToChat}
           onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); returnToChat() } }}
           style={{ justifyContent: 'flex-start', gap: 6 }}>
          <Icon name="back" size={14} /> AI 대화로 돌아가기
          <span className="mut" style={{ fontWeight: 400, marginLeft: 'auto' }}>챗봇에서 열었을 때만</span>
        </a>
      )}
      <div className="row">
        <Tag color="red" icon="warn">확인 필요</Tag><b>{hasClauseNumber && `제${clause.clauseNumber}조 `}{clause.title}</b>
        <span className="mut" style={{ marginLeft: 'auto' }}>{clause.documentTitle}</span>
      </div>
      <div className="card">
        <div className="h2">원문</div>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div className="orig" style={{ flex: 1 }}><mark>{clause.originalText}</mark></div>
          {hasPage && <div className="minipage" aria-label={`${clause.pageNo}쪽 원문 위치 예시`}>
            <div className="ln" /><div className="ln" /><div className="ln hl" />
            <div className="ln" /><div className="ln" /><div className="ln" />
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>{clause.pageNo}쪽</span>
          </div>}
        </div>
        {(hasPage || clause.locationDescription) && <div className="mut" style={{ marginTop: 6 }}>위치: {hasPage && `${clause.pageNo}쪽 `}{clause.locationDescription}</div>}
      </div>
      <div className="card"><div className="h2">쉬운 설명</div>{clause.easyExplanation}</div>
      <div className="card"><div className="h2">왜 확인이 필요해요</div>{clause.checkReason}</div>
      <div className="card">
        <div className="h2"><Mascot face={4} size={26} /> 근거 법령</div>
        <div className="lawbox"><b>{clause.lawName}</b><br />{clause.lawText}</div>
        <div className="srcbox">
          <span>출처 · 국가법령정보센터 · {clause.lawAsOf} 기준 시행 법령</span>
          <LawSourceLink url={clause.lawUrl} className="btn l">법령 원문 보기 ↗</LawSourceLink>
        </div>
        <div className="warnline"><Icon name="info" size={14} /> 위 설명은 AI가 법령을 해석한 거예요. AI도 실수할 수 있으니 원문 법령을 함께 확인해 주세요.</div>
      </div>
      <div className="card">
        <div className="h2">상대방에게 확인할 것</div>
        <div className="quote">
          <span>{clause.question}</span>
          <span role="button" tabIndex={0} aria-label="문구 복사" onClick={copyQuestion}
                onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); void copyQuestion() } }}>
            <Icon name="copy" size={16} />
          </span>
        </div>
      </div>
      {copyMessage && <div role="status"><Toast>{copyMessage}</Toast></div>}
    </Screen>
  )
}
