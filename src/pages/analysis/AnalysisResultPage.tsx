import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getAnalysis, submitManualInputs, type AnalysisResult, type Finding } from '../../api/analyses'
import { useApiData } from '../../api/useApiData'
import { Button, Dialog, Disclaimer, Footer, Header, Icon, Layered, LawSourceLink, Screen, Sheet, SourceTag, Tag, Toast } from '../../common/components'

const resultScrollPositions = new Map<number, number>()
const answeredSimilarAnalyses = new Set<number>()

// S08 분석 결과 · #17 구자건 · 보드: S08_분석결과_정상 · S08_분석결과_일부확인필요 · S08_분석결과_임대차 · S08_비슷한문서확인
export function AnalysisResultPage() {
  const { analysisId: id } = useParams()
  const analysisId = Number(id)
  const validId = Number.isSafeInteger(analysisId) && analysisId > 0
  const [retry, setRetry] = useState(0)
  const { data, loading, error } = useApiData(
    () => validId ? getAnalysis(analysisId) : Promise.reject(new Error('분석 결과를 찾을 수 없어요.')),
    [analysisId, retry],
  )

  if (!validId || error) {
    return (
      <Screen header={<Header title="분석 결과" back="/" chatFrom="S08" />}>
        <div className="note" role="alert">{validId ? '분석 결과를 불러오지 못했어요.' : '분석 결과를 찾을 수 없어요.'}</div>
        {validId && <Button kind="l" onClick={() => setRetry(value => value + 1)}>다시 시도</Button>}
        <Button to="/" kind="l">홈으로</Button>
      </Screen>
    )
  }

  if (loading || !data || data.analysisId !== analysisId) {
    return <Screen header={<Header title="분석 결과" back="/" chatFrom="S08" />}><div className="note" role="status">분석 결과를 불러오는 중이에요.</div></Screen>
  }

  return <AnalysisResultView key={analysisId} analysis={data} compact />
}

export function AnalysisResultView({ analysis, forceSimilarPrompt = false, compact = false }: { analysis: AnalysisResult; forceSimilarPrompt?: boolean; compact?: boolean }) {
  return <AnalysisResultContent key={analysis.analysisId} initialAnalysis={analysis} forceSimilarPrompt={forceSimilarPrompt} compact={compact} />
}

function AnalysisResultContent({ initialAnalysis, forceSimilarPrompt, compact }: { initialAnalysis: AnalysisResult; forceSimilarPrompt: boolean; compact: boolean }) {
  const navigate = useNavigate()
  const [analysis, setAnalysis] = useState(initialAnalysis)
  const [copyMessage, setCopyMessage] = useState('')
  const [manualOpen, setManualOpen] = useState(false)
  const [holiday, setHoliday] = useState('')
  const [inputError, setInputError] = useState('')
  const [saving, setSaving] = useState(false)
  const [similarOpen, setSimilarOpen] = useState(() => !!initialAnalysis.similarContract && (forceSimilarPrompt || !answeredSimilarAnalyses.has(initialAnalysis.analysisId)))
  const similarDialog = useRef<HTMLDivElement>(null)
  const isPartial = analysis.status === 'PARTIAL'
  const isLease = analysis.documentTypeCode === 'LEASE'
  const isGeneral = analysis.documentTypeCode !== 'EMPLOYMENT' && !isLease

  useEffect(() => {
    if (!similarOpen) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    similarDialog.current?.querySelector<HTMLElement>('[role="button"]')?.focus()
    return () => { if (previousFocus?.isConnected) previousFocus.focus() }
  }, [similarOpen])

  useEffect(() => {
    if (!manualOpen || saving) return
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setManualOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [manualOpen, saving])

  useLayoutEffect(() => {
    const scroller = document.querySelector<HTMLElement>('.phone-scroll')
    if (!scroller) return
    scroller.scrollTop = resultScrollPositions.get(analysis.analysisId) ?? 0
    const remember = () => resultScrollPositions.set(analysis.analysisId, scroller.scrollTop)
    scroller.addEventListener('scroll', remember)
    return () => scroller.removeEventListener('scroll', remember)
  }, [analysis.analysisId])

  useEffect(() => {
    if (!copyMessage) return
    const timer = window.setTimeout(() => setCopyMessage(''), 3000)
    return () => window.clearTimeout(timer)
  }, [copyMessage])

  async function copyQuestion(question: string) {
    try {
      await navigator.clipboard.writeText(question)
      setCopyMessage('문구를 복사했어요.')
    } catch {
      setCopyMessage('복사하지 못했어요. 문구를 길게 눌러 복사해 주세요.')
    }
  }

  function openManualInput() {
    const term = analysis.keyTerms.find(term => term.label === '휴일')
    setHoliday(term?.source === 'typed' ? term.value ?? '' : '')
    setInputError('')
    setManualOpen(true)
  }

  async function saveManualInput() {
    if (saving) return
    if (!holiday.trim()) {
      setInputError('휴일을 입력해 주세요.')
      return
    }
    setSaving(true)
    setInputError('')
    try {
      const updated = await submitManualInputs(analysis.analysisId, [{ label: '휴일', value: holiday }])
      setAnalysis(updated)
      setManualOpen(false)
      setCopyMessage('휴일을 반영했어요.')
    } catch {
      setInputError('입력한 내용을 저장하지 못했어요. 다시 시도해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  function dismissSimilar() {
    answeredSimilarAnalyses.add(analysis.analysisId)
    setSimilarOpen(false)
  }

  function prepareComparison() {
    if (!analysis.similarContract) return
    answeredSimilarAnalyses.add(analysis.analysisId)
    setSimilarOpen(false)
    navigate('/comparisons/new', { state: { previousContractId: analysis.similarContract.contractId, currentContractId: analysis.contractId, analysisId: analysis.analysisId } })
  }

  function handleSimilarKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      dismissSimilar()
    } else if ((event.key === 'Enter' || event.key === ' ') && (event.target as HTMLElement).getAttribute('role') === 'button') {
      event.preventDefault()
      const button = event.target as HTMLElement
      button.click()
    } else if (event.key === 'Tab') {
      const buttons = similarDialog.current?.querySelectorAll<HTMLElement>('[role="button"]')
      if (!buttons?.length) return
      const first = buttons[0]
      const last = buttons[buttons.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
  }

  const TermsContainer = compact ? 'details' : 'div'
  const counts = !isPartial && !isGeneral && analysis.summaryAvailable !== false && <div className="cnt">
        <Tag color="red" icon="warn">확인 필요 {analysis.checkCount}</Tag>
        {isLease ? <Tag color="blu">기한 {analysis.deadline ? 1 : 0}</Tag> : <Tag color="amb">빠진 항목 {analysis.missingItems.length}</Tag>}
        <Tag>전체 조항 {analysis.clauseCount ?? analysis.clauses.length}</Tag>
      </div>

  const content = (
    <Screen header={<Header title={compact && isGeneral ? '공통 확인 항목' : '분석 결과'} back="/" chatFrom="S08" contractId={analysis.contractId} />}
            footer={<Footer><Button to={`/schedules/new?analysisId=${analysis.analysisId}`}>일정 확인하고 저장</Button></Footer>}>
      <div>
        <div className="row"><b style={{ fontSize: 21 }}>{analysis.documentTitle}</b>{analysis.isSample && <Tag>예시</Tag>}{analysis.version ? <Tag>v{analysis.version}</Tag> : null}</div>
        <div className="mut">{[
          analysis.documentTypeName ?? (analysis.documentTypeCode === 'EMPLOYMENT' ? '근로계약서' : '임대차계약서'),
          compact && isGeneral ? '공통 확인 예시' : analysis.reviewLabel,
          compact && isGeneral ? '' : `${analysis.analyzedAt} 분석`,
        ].filter(Boolean).join(' · ')}</div>
      </div>
      <div className="note"><Icon name="info" size={14} /> {compact && isGeneral ? '개별 문서를 AI로 분석한 결과가 아니에요. 일반적인 확인 항목을 안내하는 예시예요.' : analysis.readScope}</div>
      {isPartial && <>
        <div className="warnb"><Icon name="warn" size={18} /><span style={{ flex: 1 }}><b>2쪽 일부를 읽지 못했어요</b><br />읽은 부분만 결과에 넣었어요. 못 읽은 칸은 0이나 '없음'이 아니라 '확인 필요'로 표시해요.</span></div>
        <div className="row">
          <Button kind="l" onClick={() => navigate('/contracts/new/capture', { state: { contractId: analysis.contractId, pageNo: analysis.unreadablePages[0], returnTo: `/analyses/${analysis.analysisId}` } })}>2쪽 다시 찍기</Button>
          <Button kind="l" onClick={openManualInput}>휴일 직접 입력</Button>
        </div>
      </>}
      {compact && counts}
      <TermsContainer className="card">
        {compact ? <summary className="h2" style={{ cursor: 'pointer' }}>{isGeneral ? '문서 안내' : '주요 조건'} {analysis.keyTerms.length}개 · 펼쳐 보기</summary> : <div className="h2">주요 조건</div>}
        <div className="cg" style={compact ? { gridTemplateColumns: '1fr' } : undefined}>
          {analysis.keyTerms.map(term => (
            <div key={term.label} className={`cv${term.state ? ` ${term.state}` : ''}`}>
              <small>{term.label}</small><b>{term.value ?? '확인 필요'}</b>
              {term.state === 'warn' && <Tag color="red" icon="warn">확인 필요</Tag>}
              {term.state === 'miss' && <Tag color="amb">적혀 있지 않아요</Tag>}
              {term.state === 'unk' && <Tag color="amb" icon="warn">읽지 못함 · 확인 필요</Tag>}
              {term.source === 'typed' && <SourceTag.typed />}
            </div>
          ))}
        </div>
      </TermsContainer>
      {!compact && counts}
      {!isPartial && !isLease && !isGeneral && <div className="h2" style={{ margin: '6px 0 0' }}>우선 확인할 조항</div>}
      {analysis.findings.map(finding => <FindingCard key={finding.title} finding={finding} analysisId={analysis.analysisId} />)}
      {isLease && analysis.deadline && <div className="card">
        <div className="h2"><Tag color="blu">기한</Tag> {analysis.deadline.title}</div>
        <div className="mut">{analysis.deadline.explanation}</div>
      </div>}
      {analysis.unknowns && <div className="card">
        <div className="h2">{analysis.unknowns.title}</div><div className="mut">{analysis.unknowns.explanation}</div>
      </div>}
      {!isPartial && !isGeneral && (!isLease || analysis.clauses.length > 0) && <><div className="card">
        <div className="h2">빠진 항목 <Tag color="amb">{analysis.missingItems.length}</Tag></div>
        {analysis.missingItems.map(item => (
          <div key={item.title} className="li"><span style={{ flex: 1 }}><b>{item.title}</b><br /><span className="mut">{item.explanation}</span></span></div>
        ))}
      </div>
      <div className="card" style={{ padding: '6px 16px' }}>
        <div className="h2" style={{ marginTop: 10 }}>전체 조항 {analysis.clauses.length}</div>
        {analysis.clauses.map((clause, index) => (
          // 표준근로계약서처럼 "1.", "2."로 나눈 계약서는 서버가 조 번호를 주지 않아(0) 순서 번호로 보여 준다
          <Link key={`${clause.clauseId}:${index}`} className="li" to={`/analyses/${analysis.analysisId}/clauses/${clause.clauseId}`}>
            <b style={{ width: 46 }}>{clause.number ? `제${clause.number}조` : ''}</b><span style={{ flex: 1 }}>{clause.title || `${index + 1}번째 조항`}</span>
            {clause.needsCheck ? <Tag color="red" icon="warn">확인 필요</Tag> : <Tag>짚은 내용 없음</Tag>}
            <Icon name="chev" size={16} />
          </Link>
        ))}
      </div>
      <div className="card">
        <div className="h2">서명 전에 물어볼 것</div>
        {analysis.questions.map(question => (
          <div key={question} className="quote" style={{ marginTop: 6 }}>
            <span>{question}</span>
            <span role="button" tabIndex={0} aria-label={`${question} 복사`} onClick={() => void copyQuestion(question)}
                  onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); void copyQuestion(question) } }}>
              <Icon name="copy" size={16} />
            </span>
          </div>
        ))}
      </div>
      <div className="card"><div className="h2">찾은 날짜 {analysis.dateCount}개</div><div className="mut">{analysis.dateSummary}<br />다음 화면에서 골라 저장해요</div></div></>}
      <Disclaimer />
      {copyMessage && <div role="status" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}><Toast>{copyMessage}</Toast></div>}
    </Screen>
  )

  if (similarOpen && analysis.similarContract) return (
    <Layered base={content} layers={[
      <div key="similar-contract" ref={similarDialog} role="dialog" aria-modal="true" aria-label="비슷한 계약서가 내 계약서에 있어요"
           onKeyDown={handleSimilarKey} style={{ position: 'absolute', inset: 0 }}>
        <Dialog face={5} title="비슷한 계약서가 내 계약서에 있어요" text="방금 분석한 계약서가 아래 계약서와 많이 비슷해요. 같은 계약의 수정본인가요?"
          extra={<div className="card row" style={{ padding: 12 }}>
            <Icon name="doc" size={20} /><span style={{ flex: 1 }}><b>{analysis.similarContract.title}</b>{analysis.similarContract.version ? <> <Tag>v{analysis.similarContract.version}</Tag></> : null}<br />
              <span className="mut">{analysis.similarContract.analyzedAt.slice(5)} 분석 · 일정 {analysis.similarContract.scheduleCount}개</span>
            </span>
          </div>}
          buttons={<><Button kind="l" onClick={dismissSimilar}>아니요</Button><Button onClick={prepareComparison}>네, 수정본이에요</Button></>} />
      </div>,
    ]} />
  )
  if (!manualOpen) return content
  return (
    <Layered base={content} layers={[
      <Sheet key="manual-holiday" small>
        <div role="dialog" aria-modal="true" aria-labelledby="holiday-input-title" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="grab" />
          <div className="sh-t"><b id="holiday-input-title">휴일 직접 입력</b></div>
          <form onSubmit={event => { event.preventDefault(); void saveManualInput() }} aria-busy={saving}
                style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label htmlFor="holiday-value">휴일</label>
            <input id="holiday-value" autoFocus className="srch" value={holiday} maxLength={100} disabled={saving} aria-invalid={!!inputError}
                   aria-describedby={inputError ? 'holiday-input-error' : 'holiday-input-note'} placeholder="예: 일요일"
                   onChange={event => { setHoliday(event.target.value); setInputError('') }} style={{ width: '100%', color: 'var(--ink)', font: 'inherit' }} />
            <div id="holiday-input-note" className="note">입력한 값은 직접 입력으로 표시돼요.</div>
            {inputError && <div id="holiday-input-error" className="warnb" role="alert">{inputError}</div>}
            <div className="row">
              <Button kind="l" onClick={() => { if (!saving) setManualOpen(false) }}>취소</Button>
              <Button kind={saving ? 'off' : 'p'} onClick={() => void saveManualInput()}>{saving ? '반영 중이에요' : '적용'}</Button>
            </div>
          </form>
        </div>
      </Sheet>,
    ]} />
  )
}

function FindingCard({ finding, analysisId }: { finding: Finding; analysisId: number }) {
  const navigate = useNavigate()
  const target = `/analyses/${analysisId}/clauses/${finding.clauseId}`

  function openClause(event: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('a')) return
    if ('key' in event && event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    navigate(target)
  }

  return (
    <div className="card iss" role="link" tabIndex={0} onClick={openClause} onKeyDown={openClause}>
      <Tag color="red" icon="warn">확인 필요</Tag>
      <div className="it">{finding.title}</div>
      {finding.comparison && (
        <div className="cmp">
          <div><small>{finding.comparison.contractLabel}</small><b>{finding.comparison.contractValue}</b></div><b>&lt;</b>
          <div><small>{finding.comparison.referenceLabel}</small><b>{finding.comparison.referenceValue}</b></div>
        </div>
      )}
      {finding.verdict !== 'UNCERTAIN' && finding.summary && <div className="mut">{finding.summary}</div>}
      {finding.lawUrl && <div className="law"><Icon name="doc" size={13} /> 근거: {finding.lawName}<LawSourceLink url={finding.lawUrl} /></div>}
      <Link className="more2" to={target}>조항 자세히 <Icon name="chev" size={14} /></Link>
    </div>
  )
}
