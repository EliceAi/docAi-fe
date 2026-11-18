import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { createComparison, getComparisonDocuments, previewComparison, type ComparisonDocument, type ComparisonPreview } from '../../api/comparisons'
import { useApiData } from '../../api/useApiData'
import { Button, Dialog, Footer, Header, Icon, Layered, Say, Screen } from '../../common/components'
import './comparison-prepare.css'

// S11 비교 준비 · #21 구자건
export function ComparisonPreparePage() {
  const location = useLocation()
  const state = location.state as { previousContractId?: number; currentContractId?: number; analysisId?: number } | null
  const previous = state?.previousContractId ?? 4
  const current = state?.currentContractId ?? 2
  const analysisId = Number.isSafeInteger(state?.analysisId) && state!.analysisId! > 0 ? state!.analysisId! : 2
  const [retry, setRetry] = useState(0)
  const { data, error, loading } = useApiData(() => getComparisonDocuments(previous, current), [previous, current, retry])

  if (loading || error || !data || data[0].contractId !== previous || data[1].contractId !== current) return <div className="comparison-prepare" onKeyDown={activateButton}>
    <Screen header={<Header title="수정본 비교" back={`/analyses/${analysisId}`} chatFrom="S11" />}>
      <div className="note" role={error ? 'alert' : 'status'}>{error ? '비교할 문서를 불러오지 못했어요.' : '비교할 문서를 불러오는 중이에요.'}</div>
      {error && <><Button kind="l" onClick={() => setRetry(value => value + 1)}>다시 시도</Button><Button to="/contracts" kind="l">다른 문서 고르기</Button></>}
    </Screen>
  </div>
  return <ComparisonPrepareView key={`${previous}:${current}`} documents={data} analysisId={analysisId} />
}

export function ComparisonPrepareView({ documents: initialDocuments, initialPreview = null, analysisId = 2 }: {
  documents: [ComparisonDocument, ComparisonDocument]
  initialPreview?: ComparisonPreview | null
  analysisId?: number
}) {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState(initialDocuments)
  const [preview, setPreview] = useState(initialPreview)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const busy = useRef(false)
  const active = useRef(true)
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelTo = `/analyses/${analysisId}`

  useEffect(() => {
    active.current = true
    return () => { active.current = false }
  }, [])

  useEffect(() => {
    if (!preview) return
    const previous = document.activeElement as HTMLElement | null
    dialogRef.current?.querySelector<HTMLElement>('[role="button"], a[href]')?.focus()
    return () => { if (previous?.isConnected && !previous.closest('[inert]')) previous.focus() }
  }, [preview])

  function swap() {
    if (busy.current) return
    setDocuments(([before, after]) => [after, before])
    setPreview(null)
    setError('')
  }

  async function compare(acceptPartial = false) {
    if (busy.current) return
    busy.current = true
    setSaving(true)
    setError('')
    try {
      const checked = await previewComparison(documents[0].contractId, documents[1].contractId)
      if (!active.current) return
      if (checked.comparability === 'NONE' || checked.comparability === 'PARTIAL' && !acceptPartial) { setPreview(checked); return }
      const result = await createComparison(documents[0].contractId, documents[1].contractId)
      if (active.current) navigate(`/comparisons/${result.comparisonId}`, { state: { previousContractId: documents[0].contractId, currentContractId: documents[1].contractId, analysisId } })
    } catch { if (active.current) setError('비교를 시작하지 못했어요. 선택한 문서는 그대로 있어요. 다시 시도해 주세요.') }
    finally { busy.current = false; if (active.current) setSaving(false) }
  }

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    if (preview && event.key === 'Escape' && !busy.current) { event.preventDefault(); navigate(cancelTo); return }
    if (preview && event.key === 'Tab') {
      const buttons = dialogRef.current?.querySelectorAll<HTMLElement>('[role="button"], a[href]')
      if (buttons?.length) {
        const first = buttons[0]; const last = buttons[buttons.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    activateButton(event)
  }

  const content = <Screen header={<Header title="수정본 비교" back={cancelTo} chatFrom="S11" />} footer={<Footer>
    <Button to={cancelTo} kind="l">취소</Button><Button kind={saving ? 'off' : 'p'} onClick={() => void compare()}>{saving ? '확인 중이에요' : '비교하기'}</Button>
  </Footer>}>
    <Say face={5} size={44}>두 계약서를 비교할게요. <b>이전본과 수정본</b>이 맞는지 확인해 주세요.</Say>
    <VersionCard document={documents[0]} label="이전본" />
    <a className="chip" role="button" tabIndex={0} style={{ alignSelf: 'center' }} onClick={swap} aria-disabled={saving}><Icon name="swap" size={16} /> 순서 바꾸기</a>
    <VersionCard document={documents[1]} label="수정본" />
    <div className="note"><Icon name="lock" size={14} /> 두 문서 모두 가린 이미지로 비교해요. 가린 곳은 비교하지 않아요.</div>
    {!preview && error && <div className="warnb" role="alert">{error}</div>}
  </Screen>

  return <div className="comparison-prepare" onKeyDown={handleKey}>
    {preview ? <Layered base={<div inert style={{ height: '100%' }}>{content}</div>} layers={[
      <div key="comparison-preview" ref={dialogRef} role="dialog" aria-modal="true" aria-label={preview.comparability === 'NONE' ? '비교할 수 없어요' : '일부만 비교할 수 있어요'} aria-busy={saving} style={{ position: 'absolute', inset: 0 }}>
        <Dialog face={preview.comparability === 'NONE' ? 9 : 5} title={preview.comparability === 'NONE' ? '비교할 수 없어요' : '일부만 비교할 수 있어요'}
          text={preview.reason} extra={error && <div className="warnb" role="alert">{error}</div>}
          buttons={preview.comparability === 'NONE' ? <>
            <Button to={cancelTo} kind="l">취소</Button><Button to="/contracts">다른 문서 고르기</Button>
          </> : <>
            <Button kind={saving ? 'off' : 'l'} onClick={() => { if (!busy.current) navigate('/contracts/new/capture', { state: { captureMode: 'select', documentTypeCode: documents[1].documentTypeCode } }) }}>수정본 다시 올리기</Button>
            <Button kind={saving ? 'off' : 'p'} onClick={() => void compare(true)}>{saving ? '비교 중이에요' : '이대로 비교'}</Button>
          </>} />
      </div>,
    ]} /> : content}
  </div>
}

function VersionCard({ document, label }: { document: ComparisonDocument; label: string }) {
  return <div className="vcard"><span className={`vbadge t-${label === '이전본' ? 'gry' : 'blu'}`}>v{document.version ?? (label === '이전본' ? 1 : 2)}</span>
    <span style={{ flex: 1 }}><span className="mut">{label}</span><br /><b>{document.title}</b><br />
      <span className="mut">{document.uploaded ? '오늘 분석 · 방금 올린 계약서' : `${document.analyzedAt} 분석 · 내 계약서`} · {document.pageCount === null ? '쪽 수 확인 필요' : `${document.pageCount}쪽`}</span>
    </span>
  </div>
}

function activateButton(event: KeyboardEvent<HTMLElement>) {
  if ((event.key === 'Enter' || event.key === ' ') && (event.target as HTMLElement).matches('[role="button"]')) {
    event.preventDefault(); (event.target as HTMLElement).click()
  }
}
