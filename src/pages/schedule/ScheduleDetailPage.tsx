import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { deleteSchedule, getSchedule, getSchedules, updateSchedule, type Schedule } from '../../api/schedules'
import { useApiData } from '../../api/useApiData'
import { Button, Dialog, Header, Icon, Layered, Screen, Sheet, SourceTag, TabBar, Tag } from '../../common/components'
import { SchedulesView } from './SchedulesPage'
import { activateScheduleButton, dday, scheduleDate, weekdays } from './scheduleDates'

// S14 일정 상세 · #19 구자건
export function ScheduleDetailPage() {
  const scheduleId = Number(useParams().scheduleId)
  const validId = Number.isSafeInteger(scheduleId) && scheduleId > 0
  const location = useLocation()
  const returnTo = typeof location.state?.scheduleReturn === 'string' && /^\/schedules(?:\?|$)/.test(location.state.scheduleReturn) ? location.state.scheduleReturn : '/schedules'
  const [retry, setRetry] = useState(0)
  const { data, error, loading } = useApiData(async () => {
    if (!validId) throw new Error('일정을 찾을 수 없어요.')
    const [schedule, schedules] = await Promise.all([getSchedule(scheduleId), getSchedules()])
    return { schedule, schedules }
  }, [scheduleId, retry])

  if (error || !validId || loading || !data || data.schedule.scheduleId !== scheduleId) return (
    <div className="schedule-screen" onKeyDown={activateScheduleButton}>
      <Screen header={<Header title="일정 상세" back={returnTo} chatFrom="S14" />} footer={<TabBar active="내 일정" />}>
        <div className="note" role={error || !validId ? 'alert' : 'status'}>{error || !validId ? '일정을 찾을 수 없거나 불러오지 못했어요.' : '일정을 불러오는 중이에요.'}</div>
        {error && validId && <Button kind="l" onClick={() => setRetry(value => value + 1)}>다시 시도</Button>}
        <Button to={returnTo} kind="l">내 일정으로</Button>
      </Screen>
    </div>
  )
  return <ScheduleDetailView key={scheduleId} schedule={data.schedule} schedules={data.schedules} returnTo={returnTo} latestFirst />
}

type DetailProps = { schedule: Schedule; schedules: Schedule[]; returnTo?: string; showSaved?: boolean; latestFirst?: boolean }

export function ScheduleDetailView({ schedule, schedules, returnTo = '/schedules', showSaved = false, latestFirst = false }: DetailProps) {
  const navigate = useNavigate()
  const [current, setCurrent] = useState(schedule)
  const [mode, setMode] = useState<'detail' | 'edit' | 'delete'>('detail')
  const [date, setDate] = useState(schedule.date.replaceAll('.', '-'))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const detailRef = useRef<HTMLDivElement>(null)
  const actionRef = useRef<HTMLDivElement>(null)
  const busy = useRef(false)
  const close = () => { if (!busy.current) navigate(returnTo) }
  const cancel = () => { if (!busy.current) { setMode('detail'); setError('') } }

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const active = mode === 'detail' ? detailRef.current : actionRef.current
    active?.querySelector<HTMLElement>('input, a, button, [tabindex="0"]')?.focus()
    return () => { if (previous?.isConnected && !previous.closest('[inert]')) previous.focus() }
  }, [mode])

  async function saveDate() {
    if (busy.current) return
    if (!date) { setError('날짜를 입력해 주세요.'); return }
    busy.current = true
    setSaving(true)
    setError('')
    try {
      const updated = await updateSchedule(current.scheduleId, { date })
      setCurrent(updated)
      setMode('detail')
    } catch { setError('날짜를 저장하지 못했어요. 입력한 날짜를 확인하고 다시 시도해 주세요.') }
    finally { busy.current = false; setSaving(false) }
  }

  async function removeSchedule() {
    if (busy.current) return
    busy.current = true
    setSaving(true)
    setError('')
    try { await deleteSchedule(current.scheduleId); navigate(returnTo, { replace: true }) }
    catch { setError('일정을 삭제하지 못했어요. 다시 시도해 주세요.') }
    finally { busy.current = false; setSaving(false) }
  }

  function handleModalKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      if (mode === 'detail') close(); else cancel()
      return
    }
    if (event.key === 'Tab') {
      const active = mode === 'detail' ? detailRef.current : actionRef.current
      const targets = Array.from(active?.querySelectorAll<HTMLElement>('a[href], [role="button"][tabindex="0"], input:not(:disabled), button:not(:disabled)') ?? [])
      const first = targets[0]
      const last = targets.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    activateScheduleButton(event)
  }

  const visibleDate = scheduleDate(current.date)
  const Source = current.source ? SourceTag[current.source] : null
  const baseSchedules = schedules.map(item => item.scheduleId === current.scheduleId ? current : item)
  const sheet = <Sheet key="schedule-detail" small>
    <div ref={detailRef} role="dialog" aria-modal={mode === 'detail' ? true : undefined} aria-label="일정 상세" inert={mode !== 'detail'}>
      <div className="grab" />
      <div className="sh-t"><b>일정 상세</b><a className="x" role="button" tabIndex={0} aria-label="일정 상세 닫기" onClick={close}><Icon name="x" size={22} /></a></div>
      <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div><b style={{ fontSize: 19 }}>{current.title}</b>{' '}<Tag color={current.color ?? (current.daysLeft <= 14 ? 'red' : current.daysLeft <= 21 ? 'blu' : 'gry')}>{dday(current.daysLeft)}</Tag>
          <div className="dt2" style={{ marginTop: 4 }}>{current.date} ({weekdays[visibleDate.getDay()]})</div>
          {Source && <Source />}{' '}{current.where && <span className="mut">{current.where}</span>}
        </div>
        <Link className="card row" to={`/contracts/${current.contractId}`}><Icon name="doc" size={20} />
          <span style={{ flex: 1 }}><b>{current.contractTitle}</b><br /><span className="mut">연결된 계약서{current.contractAnalyzedAt && ` · ${current.contractAnalyzedAt} 분석`}</span></span><Icon name="chev" size={16} />
        </Link>
        <div className="row"><Button kind="l" onClick={() => { setDate(current.date.replaceAll('.', '-')); setError(''); setMode('edit') }}>날짜 수정</Button><Button kind="l" onClick={() => { setError(''); setMode('delete') }}>삭제</Button></div>
        <div className="note"><Icon name="bell" size={14} /> 앱 안에서만 알려 드려요. 휴대폰 알림은 준비 중이에요.</div>
      </div>
    </div>
  </Sheet>

  const action = mode !== 'detail' && <div key="schedule-action" ref={actionRef} role="dialog" aria-modal="true" aria-label={mode === 'edit' ? '날짜 수정' : '일정 삭제'} aria-busy={saving} style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
    <Dialog title={mode === 'edit' ? '날짜 수정' : '일정을 삭제할까요?'} text={mode === 'edit' ? '변경할 날짜를 입력해 주세요.' : '일정만 삭제해요. 연결된 계약서는 내 계약서에 남아요.'}
      extra={<>
        {mode === 'edit' && <form onSubmit={event => { event.preventDefault(); void saveDate() }}>
          <label htmlFor="schedule-date" className="mut">날짜</label>
          <input id="schedule-date" type="date" className="srch" value={date} disabled={saving} aria-invalid={!!error} aria-describedby={error ? 'schedule-action-error' : undefined}
                 onChange={event => { setDate(event.target.value); setError('') }} style={{ width: '100%', color: 'var(--ink)', font: 'inherit' }} />
        </form>}
        {error && <div id="schedule-action-error" className="warnb" role="alert">{error}</div>}
      </>}
      buttons={<><Button kind={saving ? 'off' : 'l'} onClick={cancel}>취소</Button><Button kind={saving ? 'off' : 'p'} onClick={() => void (mode === 'edit' ? saveDate() : removeSchedule())}>{saving ? '처리 중이에요' : mode === 'edit' ? '저장' : '삭제'}</Button></>} />
  </div>

  return <div className="schedule-screen" onKeyDown={handleModalKey}>
    <Layered base={<div inert style={{ height: '100%' }}><SchedulesView schedules={baseSchedules} showSaved={showSaved} latestFirst={latestFirst} backgroundPath={returnTo} /></div>} layers={action ? [sheet, action] : [sheet]} />
  </div>
}
