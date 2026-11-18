import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { confirmComparison, discardComparison, getComparison, submitComparisonInputs, type Change, type Comparison, type UnreadComparisonField } from '../../api/comparisons'
import { useApiData } from '../../api/useApiData'
import { Button, Dialog, Footer, Header, Icon, Layered, Screen, Sheet, Tag } from '../../common/components'
import './comparison-result.css'

type Panel = 'manual' | 'discard' | null

// S12 비교 결과 · #22 구자건
export function ComparisonResultPage() {
  const comparisonId = Number(useParams().comparisonId)
  const validId = Number.isSafeInteger(comparisonId) && comparisonId > 0
  const [retry, setRetry] = useState(0)
  const { data, error, loading } = useApiData(
    () => validId ? getComparison(comparisonId) : Promise.reject(new Error('비교 결과를 찾을 수 없어요.')),
    [comparisonId, retry],
  )

  if (!validId || error) return <div className="comparison-result" onKeyDown={activateButton}>
    <Screen header={<Header title="비교 결과" back="/comparisons/new" chatFrom="S12" />}>
      <div className="note" role="alert">{validId ? '비교 결과를 불러오지 못했어요.' : '비교 결과를 찾을 수 없어요.'}</div>
      {validId && <Button kind="l" onClick={() => setRetry(value => value + 1)}>다시 시도</Button>}
      <Button to="/contracts" kind="l">내 계약서로</Button>
    </Screen>
  </div>
  if (loading || !data || data.comparisonId !== comparisonId) return <div className="comparison-result">
    <Screen header={<Header title="비교 결과" back="/comparisons/new" chatFrom="S12" />}>
      <div className="note" role="status">비교 결과를 불러오는 중이에요.</div>
    </Screen>
  </div>
  return <ComparisonResultView key={comparisonId} comparison={data} />
}

export function ComparisonResultView({ comparison, initialPanel = null }: { comparison: Comparison; initialPanel?: Panel }) {
  return <ComparisonResultContent key={comparison.comparisonId} initialComparison={comparison} initialPanel={initialPanel} />
}

function ComparisonResultContent({ initialComparison, initialPanel }: { initialComparison: Comparison; initialPanel: Panel }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [comparison, setComparison] = useState(initialComparison)
  const [panel, setPanel] = useState<Panel>(initialPanel)
  const [field, setField] = useState(comparison.unreadFields?.[0])
  const [input, setInput] = useState(field?.exampleInput ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const active = useRef(true)
  const busy = useRef(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const previousPanel = useRef<Panel>(null)
  const incoming = location.state as { analysisId?: number } | null
  const preparationState = {
    previousContractId: comparison.previousContractId,
    currentContractId: comparison.currentContractId,
    analysisId: incoming?.analysisId,
  }

  useEffect(() => {
    active.current = true
    return () => { active.current = false }
  }, [])

  useEffect(() => {
    if (panel) dialogRef.current?.querySelector<HTMLElement>('textarea, [role="button"], a[href]')?.focus()
    else if (previousPanel.current) {
      rootRef.current?.querySelector<HTMLElement>(previousPanel.current === 'manual' ? '.comparison-unread .btn:last-child, .ft .btn:last-child' : '.ft .btn')?.focus()
    }
    previousPanel.current = panel
  }, [panel])

  function openManualInput(unread: UnreadComparisonField) {
    if (busy.current) return
    setField(unread)
    setInput(unread.exampleInput ?? '')
    setError('')
    setPanel('manual')
  }

  function closePanel() {
    if (busy.current) return
    setPanel(null)
    setError('')
  }

  async function perform(action: 'input' | 'confirm' | 'discard') {
    if (busy.current) return
    if (action === 'input' && (!field || !input.trim())) { setError('종이에 적힌 내용을 입력해 주세요.'); return }
    busy.current = true
    setSaving(true)
    setError('')
    try {
      if (action === 'input') {
        const updated = await submitComparisonInputs(comparison.comparisonId, [{ label: field!.label, value: input }])
        if (active.current) { setComparison(updated); setPanel(null) }
      } else if (action === 'confirm') {
        const result = await confirmComparison(comparison.comparisonId)
        if (active.current) navigate('/schedules/new', { state: { ...preparationState, comparisonId: comparison.comparisonId,
          contractId: result.contractId, version: result.version, mode: 'change' } })
      } else {
        await discardComparison(comparison.comparisonId)
        if (active.current) navigate('/', { replace: true })
      }
    } catch {
      if (active.current) setError(action === 'input' ? '입력한 내용을 반영하지 못했어요. 내용은 그대로 있어요. 다시 시도해 주세요.'
        : action === 'confirm' ? '수정본을 확정하지 못했어요. 다시 시도해 주세요.' : '확정하지 않기를 처리하지 못했어요. 기존 계약서와 일정은 그대로예요. 다시 시도해 주세요.')
    } finally {
      busy.current = false
      if (active.current) setSaving(false)
    }
  }

  function handleBack(event: MouseEvent<HTMLDivElement>) {
    if (!(event.target as HTMLElement).closest('a.hb')) return
    event.preventDefault()
    if (!busy.current) navigate('/comparisons/new', { state: preparationState })
  }

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    if (panel && event.key === 'Escape') { event.preventDefault(); closePanel(); return }
    if (panel && event.key === 'Tab') {
      const controls = dialogRef.current?.querySelectorAll<HTMLElement>('textarea, [role="button"], a[href]')
      if (controls?.length) {
        const first = controls[0]; const last = controls[controls.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    activateButton(event)
  }

  const changed = comparison.changes.filter(change => change.kind !== 'added').length
  const added = comparison.changes.filter(change => change.kind === 'added').length
  const typed = comparison.changes.filter(change => change.source === 'typed').length
  const content = <Screen header={<Header title="비교 결과" back="/comparisons/new" chatFrom="S12" contractId={comparison.currentContractId} />}
    footer={<Footer>
      <Button kind={saving ? 'off' : 'l'} onClick={() => { if (!busy.current) { setError(''); setPanel('discard') } }}>확정하지 않기</Button>
      <Button kind={saving ? 'off' : 'p'} onClick={() => void perform('confirm')}>{saving ? '처리 중이에요' : '수정본으로 확정'}</Button>
    </Footer>}>
    <div className="row"><Tag>v{comparison.previousVersion ?? 1} {comparison.previousDate}</Tag><Icon name="chev" size={14} />
      <Tag color="blu">v{comparison.currentVersion ?? 2} {comparison.currentDate}</Tag><b style={{ marginLeft: 'auto' }}>{comparison.documentTitle}</b></div>
    <div className="cnt"><Tag color="blu">바뀐 곳 {changed}</Tag><Tag color="grn">추가 {added}</Tag>
      {typed > 0 && <Tag>직접 입력 {typed}</Tag>}
      {comparison.unreadLabels.length > 0 && <Tag color="amb" icon="warn">비교 못 한 곳 {comparison.unreadLabels.length}</Tag>}
    </div>
    {comparison.changes.map((change, index) => <ChangeCard key={`${index}:${change.label}`} change={change}
      previousVersion={comparison.previousVersion ?? 1} currentVersion={comparison.currentVersion ?? 2} />)}
    {comparison.unreadFields?.map(unread => <div key={unread.label} className="card comparison-unread">
      <div className="h2"><Icon name="warn" size={16} /> 비교하지 못한 곳 {comparison.unreadLabels.length}</div>
      <div className="mut"><b style={{ color: 'var(--ink)' }}>{unread.location} ({unread.title})</b><br />글자가 흐려서 읽지 못했어요. 삭제된 조항으로 보지 않아요. 확정하기 전에 확인해 주세요.</div>
      <div className="row" style={{ marginTop: 10 }}>
        <Button kind="l" onClick={() => navigate('/contracts/new/capture', { state: { captureMode: 'camera', documentTypeCode: comparison.documentTypeCode,
          comparisonId: comparison.comparisonId, contractId: comparison.currentContractId, pageNo: unread.pageNo,
          analysisId: incoming?.analysisId, returnTo: `/comparisons/${comparison.comparisonId}` } })}>그 쪽 다시 찍기</Button>
        <Button kind="l" onClick={() => openManualInput(unread)}>직접 입력</Button>
      </div>
      <div className="mut" style={{ marginTop: 8 }}>그대로 확정하면 이 칸은 '비교 못 함'으로 남아요. 직접 가린 곳(이름·연락처 등)은 원래 비교하지 않아요.</div>
    </div>)}
    {comparison.unchangedSummary && <div className="mut">그대로인 곳: {comparison.unchangedSummary}</div>}
    {!panel && error && <div className="warnb" role="alert">{error}</div>}
  </Screen>

  return <div ref={rootRef} className="comparison-result" onKeyDown={handleKey} onClickCapture={handleBack}>
    {panel ? <Layered base={<div inert style={{ height: '100%' }}>{content}</div>} layers={[
      <div key={panel} ref={dialogRef} role="dialog" aria-modal="true" aria-label={panel === 'manual' ? '읽지 못한 칸 직접 입력' : '수정본으로 확정하지 않을까요?'}
        aria-busy={saving} style={{ position: 'absolute', inset: 0 }}>
        {panel === 'manual' && field ? <Sheet>
          <div className="grab" /><div className="sh-t"><b>읽지 못한 칸 직접 입력</b>
            <a className="x" role="button" tabIndex={0} aria-label="닫기" onClick={closePanel}><Icon name="x" size={22} /></a></div>
          <form onSubmit={event => { event.preventDefault(); void perform('input') }} style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="mut">{field.location} · {field.title}</div>
              <div className="chg"><div className="bf"><small>{field.side === 'previous' ? `수정 v${comparison.currentVersion ?? 2}` : `이전 v${comparison.previousVersion ?? 1}`} (읽음)</small><span>{field.before}</span></div>
              <div className="af" style={{ background: 'inherit', border: '1.5px solid var(--accent)' }}>
                <label htmlFor="comparison-manual-input"><small>{field.side === 'previous' ? `이전 v${comparison.previousVersion ?? 1}` : `수정 v${comparison.currentVersion ?? 2}`} · 종이에 적힌 대로 입력</small></label>
                <textarea id="comparison-manual-input" rows={2} value={input} disabled={saving} aria-invalid={!!error} aria-describedby="comparison-manual-note"
                  onChange={event => { setInput(event.target.value); setError('') }} />
              </div></div>
            <div className="note" id="comparison-manual-note"><Icon name="info" size={14} /> 입력한 내용은 '직접 입력'으로 표시해요. AI가 원문을 읽은 것처럼 다루지 않아요.</div>
            <div className="note"><Icon name="camera" size={14} /> 글자를 알아보기 어렵다면 그 쪽을 다시 찍는 게 더 정확해요.</div>
            {error && <div className="warnb" role="alert">{error}</div>}
            <div className="row"><Button kind={saving ? 'off' : 'l'} onClick={closePanel}>취소</Button>
              <Button kind={saving ? 'off' : 'p'} onClick={() => void perform('input')}>{saving ? '반영 중이에요' : '비교에 넣기'}</Button></div>
          </form>
        </Sheet> : <Dialog face={1} title="수정본으로 확정하지 않을까요?" text="기존 v1 계약서와 일정은 그대로 두고, 방금 올린 수정본은 보관하지 않아요."
          extra={error && <div className="warnb" role="alert">{error}</div>}
          buttons={<><Button kind={saving ? 'off' : 'l'} onClick={closePanel}>돌아가기</Button>
            <Button kind={saving ? 'off' : 'p'} onClick={() => void perform('discard')}>{saving ? '처리 중이에요' : '확정하지 않기'}</Button></>} />}
      </div>,
    ]} /> : content}
  </div>
}

function ChangeCard({ change, previousVersion, currentVersion }: { change: Change; previousVersion: number; currentVersion: number }) {
  const kind = change.source === 'typed' ? 'manual' : change.kind
  const label = kind === 'amount' ? '금액' : kind === 'date' ? '날짜' : kind === 'added' ? '추가' : kind === 'removed' ? '삭제' : kind === 'manual' ? '직접 입력' : '변경'
  return <div className="chg"><div className="row"><Tag color={kind === 'added' ? 'grn' : kind === 'manual' ? 'gry' : 'blu'}>{label}</Tag><b>{change.label}</b></div>
    <div className="bf"><small>이전 v{previousVersion}</small><span>{change.before ?? '(없음)'}</span></div>
    <div className="af"><small>수정 v{currentVersion}</small><b>{change.after ?? '(없음)'}</b></div>
    {change.note && <div className="mut">{change.note}</div>}
  </div>
}

function activateButton(event: KeyboardEvent<HTMLElement>) {
  if ((event.key === 'Enter' || event.key === ' ') && (event.target as HTMLElement).matches('[role="button"]')) {
    event.preventDefault(); (event.target as HTMLElement).click()
  }
}
