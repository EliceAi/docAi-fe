import { useRef, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { archiveContract, type ArchiveSchedule } from '../../api/contracts'
import { confirmComparison, type ConfirmSchedule } from '../../api/comparisons'
import { getScheduleCandidates, getScheduleChanges, type NewSchedule, type ScheduleCandidate, type ScheduleCandidateSet, type ScheduleChangeSet } from '../../api/schedules'
import type { ValueSource } from '../../api/analyses'
import { useApiData } from '../../api/useApiData'
import { Button, Dialog, Footer, Header, Icon, Layered, Say, Screen, SourceTag, Tag } from '../../common/components'
import { subjectParticle } from '../contract-register/masking'
import { buildNewSchedules, conflictGroups, conflictKey, dateWithWeekday, type RegisterSelection } from './scheduleRegister'
import { activateScheduleButton } from './scheduleDates'
import './schedule.css'

// S13 일정 등록 · #20 김지희
// 주소: /schedules/new?analysisId=1 (분석에서 찾은 날짜 저장) · /schedules/new?comparisonId=1 (수정본에 맞춰 일정 변경)
const DEFAULT_ANALYSIS_ID = 1 // 번호 없이 들어오면 예시 분석으로 보여 준다

const isId = (value: number) => Number.isSafeInteger(value) && value > 0

export function ScheduleRegisterPage() {
  const [params] = useSearchParams()
  const comparisonId = Number(params.get('comparisonId'))
  const analysisId = params.get('analysisId') === null ? DEFAULT_ANALYSIS_ID : Number(params.get('analysisId'))
  return params.get('comparisonId') !== null
    ? <ChangeLoader comparisonId={comparisonId} />
    : <NewLoader analysisId={analysisId} />
}

function Loading({ error, onRetry, back }: { error: boolean; onRetry: () => void; back: string }) {
  return (
    <div className="schedule-screen">
      <Screen header={<Header title="일정 확인·등록" back={back} chatFrom="S13" />}>
        <div className="note" role={error ? 'alert' : 'status'}>{error ? '일정을 불러오지 못했어요.' : '일정을 불러오는 중이에요.'}</div>
        {error && <Button kind="l" onClick={onRetry}>다시 시도</Button>}
      </Screen>
    </div>
  )
}

function NewLoader({ analysisId }: { analysisId: number }) {
  const [retry, setRetry] = useState(0)
  const { data, error } = useApiData(() => isId(analysisId) ? getScheduleCandidates(analysisId) : Promise.reject(new Error('분석을 찾을 수 없어요.')), [analysisId, retry])
  if (!data || data.analysisId !== analysisId) return <Loading error={Boolean(error)} onRetry={() => setRetry(count => count + 1)} back="/" />
  return <ScheduleNewView key={analysisId} data={data} />
}

function ChangeLoader({ comparisonId }: { comparisonId: number }) {
  const [retry, setRetry] = useState(0)
  const { data, error } = useApiData(() => isId(comparisonId) ? getScheduleChanges(comparisonId) : Promise.reject(new Error('비교 결과를 찾을 수 없어요.')), [comparisonId, retry])
  if (!data || data.comparisonId !== comparisonId) return <Loading error={Boolean(error)} onRetry={() => setRetry(count => count + 1)} back="/" />
  return <ScheduleChangeView key={comparisonId} data={data} />
}

const sourceTag = (source: ValueSource) => SourceTag[source]()

// 화면의 출처 → 명세 값 (직접 입력·고친 날짜는 MANUAL)
const SOURCE_CODE = { written: 'WRITTEN', review: 'REVIEW', typed: 'MANUAL' } as const
const toArchiveSchedule = (schedule: NewSchedule): ArchiveSchedule => ({ candidateId: schedule.candidateId ?? null, title: schedule.title, date: schedule.date, source: SOURCE_CODE[schedule.source] })
const isoDate = (date: string) => date.replaceAll('.', '-')

/** 같은 내용을 다시 보내면 같은 키를 쓴다. 내용이 바뀌면 새 저장이라 새 키를 만든다(같은 키로 다른 내용을 보내면 서버가 거절함) */
function useIdempotencyKey() {
  const current = useRef<{ content: string; key: string } | null>(null)
  return (content: unknown) => {
    const text = JSON.stringify(content)
    if (current.current?.content !== text) current.current = { content: text, key: crypto.randomUUID() }
    return current.current.key
  }
}

/** 저장 요청을 한 번에 하나만 보내고, 실패하면 확인창으로 보여 준다 */
function useSaving(run: () => Promise<void>, initialFailed: boolean) {
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(initialFailed)
  async function save() {
    if (saving) return
    setSaving(true)
    setFailed(false)
    try { await run() } catch { setFailed(true) } finally { setSaving(false) }
  }
  return { saving, failed, setFailed, save }
}

function FailedDialog({ screen, onClose, onRetry }: { screen: ReactNode; onClose: () => void; onRetry: () => void }) {
  return <Layered base={<div inert>{screen}</div>} layers={[
    <div key="failed" role="dialog" aria-modal="true" aria-label="저장 실패" onKeyDown={activateScheduleButton}>
      <Dialog face={9} title="저장하지 못했어요" text="입력한 날짜와 분석 결과는 그대로 있어요. 같은 일정이 두 번 저장되지 않게 다시 시도해요."
        buttons={<><Button kind="l" onClick={onClose}>닫기</Button><Button onClick={onRetry}>다시 시도</Button></>} />
    </div>,
  ]} />
}

type NewViewProps = {
  data: ScheduleCandidateSet
  /** 보드 모아 보기에서 상태를 그대로 그리기 위한 시작값 */
  initialChosen?: Record<string, number>
  initialFailed?: boolean
}

export function ScheduleNewView({ data, initialChosen = {}, initialFailed = false }: NewViewProps) {
  const navigate = useNavigate()
  const [checkedIds, setCheckedIds] = useState(() => data.candidates.filter(candidate => candidate.recommended && candidate.date).map(candidate => candidate.candidateId))
  const [chosenIdByTitle, setChosenIdByTitle] = useState(initialChosen)
  const [typedDates, setTypedDates] = useState<Record<number, string>>({})
  const [editingIds, setEditingIds] = useState<number[]>([])
  const [extras, setExtras] = useState<RegisterSelection['extras']>([])
  const [message, setMessage] = useState('')
  const keyFor = useIdempotencyKey()

  const groups = conflictGroups(data.candidates)
  const conflictIds = new Set(groups.flat().map(candidate => candidate.candidateId))
  const missing = data.candidates.filter(candidate => !candidate.date)
  const plain = data.candidates.filter(candidate => candidate.date && !conflictIds.has(candidate.candidateId))
  const toSave = buildNewSchedules(data.candidates, { checkedIds, chosenIdByTitle, typedDates, extras })
  const needsDecision = groups.length > 0 || missing.length > 0

  const { failed, setFailed, save } = useSaving(async () => {
    if (!toSave.length) { setMessage('저장할 일정을 골라 주세요.'); return }
    setMessage('')
    // 명세: 보관 API 한 번에 일정까지 저장한다. 다시 시도해도 같은 키라 두 번 저장되지 않는다
    const schedules = toSave.map(toArchiveSchedule)
    await archiveContract(data.contractId, schedules, keyFor(schedules))
    navigate('/schedules', { state: { schedulesSaved: schedules.length } })
  }, initialFailed)
  const keepOnly = useSaving(async () => {
    await archiveContract(data.contractId, [], keyFor([]))
    navigate('/contracts')
  }, false)

  const toggle = (id: number) => setCheckedIds(ids => ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id])
  const typeDate = (id: number, value: string) => setTypedDates(dates => ({ ...dates, [id]: value }))
  const showDate = (candidate: ScheduleCandidate) => dateWithWeekday((typedDates[candidate.candidateId]?.replaceAll('-', '.') || candidate.date) as string)

  const screen = (
    <div className="schedule-screen" onKeyDown={activateScheduleButton}>
      <Screen header={<Header title="일정 확인·등록" back={`/analyses/${data.analysisId}`} chatFrom="S13" contractId={data.contractId} />}
        footer={<Footer>
          <Button kind="l" onClick={keepOnly.save}>일정 없이 보관</Button>
          <Button onClick={save}>{needsDecision ? '저장' : `선택한 ${toSave.length}개 저장`}</Button>
        </Footer>}>
        <div className="row"><Icon name="doc" size={18} /><b>{data.contractTitle}</b></div>
        <Say face={1} size={40}>계약서에서 찾은 날짜예요. <b>맞는지 확인하고</b> 저장할 일정을 골라 주세요.</Say>
        {groups.map(group => (
          <div className="card" key={group[0].title}>
            <div className="h2"><Icon name="warn" size={16} /> {subjectParticle(group[0].title)} 두 곳에 달라요</div>
            {group.map((candidate, index) => {
              const chosen = chosenIdByTitle[conflictKey(candidate) ?? ''] === candidate.candidateId
              return (
                <div key={candidate.candidateId} className="srow" style={index === group.length - 1 ? { border: 0 } : undefined}>
                  <span className={`cb ${chosen ? 'on' : ''}`} role="radio" aria-checked={chosen} tabIndex={0} aria-label={dateWithWeekday(candidate.date as string)}
                    onClick={() => setChosenIdByTitle(current => ({ ...current, [conflictKey(candidate) ?? '']: candidate.candidateId }))}>{chosen && <Icon name="check" size={14} />}</span>
                  <span style={{ flex: 1 }}><span className="dt2">{dateWithWeekday(candidate.date as string)}</span> {sourceTag(candidate.source)}<br /><span className="mut">{candidate.where}</span></span>
                </div>
              )
            })}
            <div className="mut">어느 날짜가 맞는지 상대방에게 확인해 보세요. 앱이 임의로 고르지 않아요.</div>
          </div>
        ))}
        {missing.map(candidate => (
          <div className="card" key={candidate.candidateId}>
            <div className="h2">{subjectParticle(candidate.title)} 계약서에 없어요</div>
            <div className="mut" style={{ marginBottom: 8 }}>직접 입력하거나 비워 둘 수 있어요. 기한을 임의로 계산하지 않아요.</div>
            {editingIds.includes(candidate.candidateId)
              ? <input type="date" aria-label={`${candidate.title} 날짜`} value={typedDates[candidate.candidateId] ?? ''} onChange={event => typeDate(candidate.candidateId, event.target.value)} />
              : <Button kind="l" onClick={() => setEditingIds(ids => [...ids, candidate.candidateId])}>직접 입력</Button>}
          </div>
        ))}
        {plain.length > 0 && (
          <div className="card" style={{ padding: '4px 16px' }}>
            {plain.map(candidate => {
              const checked = checkedIds.includes(candidate.candidateId)
              return (
                <div key={candidate.candidateId} className="srow">
                  <span className={`cb ${checked ? 'on' : ''}`} role="checkbox" aria-checked={checked} tabIndex={0} aria-label={candidate.title} onClick={() => toggle(candidate.candidateId)}>{checked && <Icon name="check" size={14} />}</span>
                  <span style={{ flex: 1 }}>
                    <b>{candidate.title}</b><br />
                    {editingIds.includes(candidate.candidateId)
                      ? <input type="date" aria-label={`${candidate.title} 날짜`} value={typedDates[candidate.candidateId] ?? ''} onChange={event => typeDate(candidate.candidateId, event.target.value)} />
                      : <span className="dt2">{showDate(candidate)}</span>} {sourceTag(typedDates[candidate.candidateId] ? 'typed' : candidate.source)}<br />
                    <span className="mut">{candidate.where}</span>
                  </span>
                  <a className="mut" role="button" tabIndex={0} onClick={() => setEditingIds(ids => ids.includes(candidate.candidateId) ? ids : [...ids, candidate.candidateId])}>수정</a>
                </div>
              )
            })}
            {extras.map((extra, index) => (
              <div key={index} className="srow">
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input aria-label="일정 이름" placeholder="일정 이름" value={extra.title} onChange={event => setExtras(list => list.map((item, i) => i === index ? { ...item, title: event.target.value } : item))} />
                  <input type="date" aria-label="일정 날짜" value={extra.date} onChange={event => setExtras(list => list.map((item, i) => i === index ? { ...item, date: event.target.value } : item))} />
                </span>
                <Tag>직접 입력</Tag>
              </div>
            ))}
            <a className="li" role="button" tabIndex={0} onClick={() => setExtras(list => [...list, { title: '', date: '' }])}>
              <Icon name="plus" size={18} /><span style={{ flex: 1 }}>일정 직접 추가</span><span className="mut">날짜가 없거나 다를 때</span>
            </a>
          </div>
        )}
        {message && toSave.length === 0 && <div className="note" role="status">{message}</div>}
        <div className="note"><Icon name="bell" size={14} /> 저장한 일정은 내 일정에서 보여 드려요. 휴대폰 알림은 아직 준비 중이에요.</div>
        <div className="infob"><Icon name="files" size={18} /><span>저장하면 이 계약서가 <b>내 계약서</b>에 함께 보관돼요.</span></div>
      </Screen>
    </div>
  )

  const dialogOpen = failed || keepOnly.failed
  if (!dialogOpen) return screen
  return <FailedDialog screen={screen} onClose={() => { setFailed(false); keepOnly.setFailed(false) }} onRetry={failed ? save : keepOnly.save} />
}

export function ScheduleChangeView({ data, initialFailed = false }: { data: ScheduleChangeSet; initialFailed?: boolean }) {
  const navigate = useNavigate()
  const keyFor = useIdempotencyKey()
  const { saving, failed, setFailed, save } = useSaving(async () => {
    // 명세: 수정본 확정 한 번에 v2 보관과 일정 변경(UPDATE·CREATE·DELETE)을 함께 처리한다(한 트랜잭션)
    const schedules: ConfirmSchedule[] = data.changes.map(change => change.action === 'DELETE'
      ? { action: 'DELETE', scheduleId: change.scheduleId }
      : { action: change.action, scheduleId: change.scheduleId, ...(change.candidateId ? { candidateId: change.candidateId } : {}), title: change.title, date: isoDate(change.afterDate ?? '') })
    await confirmComparison(data.comparisonId, schedules, keyFor(schedules))
    navigate('/contracts')
  }, initialFailed)

  const screen = (
    <div className="schedule-screen" onKeyDown={activateScheduleButton}>
      <Screen header={<Header title="바뀐 일정 확인" back={`/comparisons/${data.comparisonId}`} chatFrom="S13" contractId={data.contractId} />}
        footer={<Footer>
          <Button kind="l" to={`/comparisons/${data.comparisonId}`}>취소</Button>
          <Button kind={saving ? 'off' : 'p'} onClick={save}>바꿔서 저장</Button>
        </Footer>}>
        <div className="row"><Icon name="doc" size={18} /><b>{data.contractTitle}</b><Tag color="blu">v{data.fromVersion} → v{data.toVersion}</Tag></div>
        <Say face={5} size={40}>수정본(v{data.toVersion})에 맞춰 <b>일정을 바꿔서 등록</b>할까요?</Say>
        <div className="card" style={{ padding: '4px 16px' }}>
          {data.changes.map(change => (
            <div className="crow" key={change.title}>
              <b>{change.title}</b>
              <div className="ba"><s>{change.beforeDate ?? '-'}</s><Icon name="chev" size={14} /><b>{change.action === 'DELETE' ? '삭제' : change.afterDate}</b></div>
              <span>{sourceTag(change.source)}{change.note && <> <span className="mut">{change.note}</span></>}</span>
            </div>
          ))}
        </div>
        <div className="infob"><Icon name="files" size={18} /><span>저장하면 내 계약서에 <b>v{data.toVersion}</b>로 보관돼요. v{data.fromVersion}은 이전 버전으로 함께 남아요.</span></div>
      </Screen>
    </div>
  )

  if (!failed) return screen
  return <FailedDialog screen={screen} onClose={() => setFailed(false)} onRetry={save} />
}
