import { useEffect, useLayoutEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { getSchedules, type Schedule } from '../../api/schedules'
import { mockScheduleToday } from '../../api/mocks/schedules'
import { useApiData } from '../../api/useApiData'
import { Button, Header, Icon, Mascot, Screen, TabBar, Tag } from '../../common/components'
import { activateScheduleButton, dateKey, dday, scheduleDate, weekdays } from './scheduleDates'
import './schedule.css'

// S14 내 일정 · #19 구자건
export function SchedulesPage() {
  const [retry, setRetry] = useState(0)
  const { data, error, loading } = useApiData(getSchedules, [retry])
  if (loading || error || !data) return (
    <div className="schedule-screen" onKeyDown={activateScheduleButton}>
      <Screen header={<Header title="내 일정" back={false} chatFrom="S14" />} footer={<TabBar active="내 일정" />}>
        <div className="note" role={error ? 'alert' : 'status'}>{error ? '일정을 불러오지 못했어요.' : '일정을 불러오는 중이에요.'}</div>
        {error && <Button kind="l" onClick={() => setRetry(value => value + 1)}>다시 시도</Button>}
      </Screen>
    </div>
  )
  return <SchedulesView schedules={data} latestFirst />
}

const scheduleScrollPositions = new Map<string, number>()
type SchedulesViewProps = { schedules: Schedule[]; initialView?: 'list' | 'calendar'; showSaved?: boolean; latestFirst?: boolean; backgroundPath?: string }

export function SchedulesView({ schedules, initialView, showSaved = false, latestFirst = false, backgroundPath }: SchedulesViewProps) {
  const [routeParams, setRouteParams] = useSearchParams()
  const location = useLocation()
  const [previewParams, setPreviewParams] = useState(() => new URLSearchParams(backgroundPath?.split('?')[1]))
  const params = location.pathname === '/schedules' ? routeParams : previewParams
  const view = params.has('view') ? (params.get('view') === 'calendar' ? 'calendar' : 'list') : initialView ?? 'list'
  function setParams(next: URLSearchParams) {
    if (location.pathname === '/schedules') setRouteParams(next, { replace: true })
    else setPreviewParams(next)
  }
  const [today] = useState(() => latestFirst ? dateKey(new Date()) : mockScheduleToday)
  const initialDate = latestFirst ? location.state?.savedDate ?? today : schedules[0]?.date.replaceAll('.', '-') ?? today
  const requestedDate = params.get('date')
  const selected = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) && dateKey(scheduleDate(requestedDate)) === requestedDate ? requestedDate : initialDate
  const requestedMonth = params.get('month')
  const month = requestedMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth) ? requestedMonth : selected.slice(0, 7)
  const [savedVisible, setSavedVisible] = useState(showSaved || location.state?.schedulesSaved === true || typeof location.state?.schedulesSaved === 'number')
  const scrollKey = backgroundPath ?? location.pathname + location.search
  useLayoutEffect(() => {
    if (!latestFirst) return
    const scroller = document.querySelector<HTMLElement>('.phone-scroll')
    if (scroller) scroller.scrollTop = location.state?.schedulesSaved ? 0 : scheduleScrollPositions.get(scrollKey) ?? 0
  }, [latestFirst, scrollKey, location.state?.schedulesSaved])
  // S13에서 저장한 일정 수. 보드처럼 개수를 모를 때는 와이어프레임 예시대로 3개로 보여 준다
  const savedCount: number = typeof location.state?.schedulesSaved === 'number' ? location.state.schedulesSaved : 3

  useEffect(() => {
    if (!savedVisible || showSaved) return
    const timer = window.setTimeout(() => setSavedVisible(false), 4000)
    return () => window.clearTimeout(timer)
  }, [savedVisible, showSaved])

  function setView(next: 'list' | 'calendar') {
    const nextParams = new URLSearchParams(params)
    nextParams.set('view', next)
    setParams(nextParams)
  }

  function selectDate(date: string) {
    const nextParams = new URLSearchParams(params)
    nextParams.set('date', date)
    nextParams.set('month', date.slice(0, 7))
    setParams(nextParams)
  }

  function changeMonth(offset: number) {
    const date = scheduleDate(month + '-01')
    date.setMonth(date.getMonth() + offset)
    selectDate(dateKey(date))
  }

  const sorted = [...schedules].sort((a, b) => (latestFirst ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)) || a.scheduleId - b.scheduleId)
  const justSaved = savedVisible && latestFirst ? sorted.filter(schedule => location.state?.savedScheduleIds?.includes(schedule.scheduleId)) : []
  const groups = new Map<string, Schedule[]>()
  sorted.forEach(schedule => {
    const key = schedule.date.slice(0, 7)
    groups.set(key, [...(groups.get(key) ?? []), schedule])
  })
  const currentMonth = scheduleDate(month + '-01')
  const monthDays = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
  const calendarSize = Math.ceil((currentMonth.getDay() + monthDays) / 7) * 7
  const selectedDate = scheduleDate(selected)
  const selectedSchedules = sorted.filter(schedule => schedule.date.replaceAll('.', '-') === selected)

  return (
    <div className="schedule-screen" onKeyDown={activateScheduleButton}>
      <Screen header={<Header title="내 일정" back={false} chatFrom="S14" />} footer={<TabBar active="내 일정" />}>
        {schedules.length === 0 ? <div className="empty" style={{ marginTop: 120 }}>
          <Mascot face={8} size={96} /><b style={{ fontSize: 18 }}>아직 등록한 일정이 없어요</b>
          <span className="mut">계약서를 분석하고 일정을 저장하면 여기 모여요</span>
          <Button to="/contracts/new">계약서 등록하기</Button>
        </div> : <>
          <div className="seg" aria-label="일정 보기 방식">
            <a role="button" tabIndex={0} className={view === 'list' ? 'on' : ''} aria-pressed={view === 'list'} onClick={() => setView('list')}><Icon name="list" size={16} />목록</a>
            <a role="button" tabIndex={0} className={view === 'calendar' ? 'on' : ''} aria-pressed={view === 'calendar'} onClick={() => setView('calendar')}><Icon name="cal" size={16} />달력</a>
          </div>
          {latestFirst && <div className="note">최신 계약서의 일정만 보여요. 목록은 날짜가 최신인 순서예요.</div>}
          {view === 'list' && justSaved.length > 0 && <div className="card">
            <div className="h2">방금 저장한 일정</div>
            {justSaved.map(schedule => <ScheduleEntry key={schedule.scheduleId} schedule={schedule} showFullDate />)}
          </div>}
          {view === 'list' ? [...groups].map(([key, entries], index) => (
            <div key={key} style={{ display: 'contents' }}>
              <div className="mh">{index === 0 || key.slice(0, 4) !== [...groups.keys()][index - 1].slice(0, 4) ? `${Number(key.slice(0, 4))}년 ` : ''}{Number(key.slice(5))}월</div>
              <div className="card" style={{ padding: '0 16px' }}>{entries.map(schedule => <ScheduleEntry key={schedule.scheduleId} schedule={schedule} />)}</div>
            </div>
          )) : <>
            <div className="card">
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <span role="button" tabIndex={0} aria-label="지난달" onClick={() => changeMonth(-1)}>‹</span>
                <b>{currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월</b>
                <span role="button" tabIndex={0} aria-label="다음 달" onClick={() => changeMonth(1)}>›</span>
              </div>
              {latestFirst && <div className="row" style={{ marginBottom: 12 }}>
                <input type="month" aria-label="달력 연월 선택" value={month} onChange={event => { if (event.target.value) selectDate(event.target.value + '-01') }} />
                <Button kind="l" small onClick={() => selectDate(today)}>오늘</Button>
              </div>}
              <div className="calg" aria-label="일정 달력">
                {weekdays.map(day => <span key={day} className="w">{day}</span>)}
                {Array.from({ length: calendarSize }, (_, index) => {
                  const day = index - currentMonth.getDay() + 1
                  if (day < 1 || day > monthDays) return <span key={index} />
                  const key = dateKey(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, 12))
                  const hasSchedule = schedules.some(schedule => schedule.date.replaceAll('.', '-') === key)
                  return <span key={index} role="button" tabIndex={0} aria-label={`${key}${hasSchedule ? ' 일정 있음' : ''}`} aria-pressed={selected === key}
                               aria-current={today === key ? 'date' : undefined} className={selected === key ? 'pick' : today === key ? 'today' : ''} onClick={() => selectDate(key)}>
                    {day}{hasSchedule && <i aria-hidden="true" />}
                  </span>
                })}
              </div>
            </div>
            <div className="mh">{selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 ({weekdays[selectedDate.getDay()]})</div>
            {selectedSchedules.length > 0 ? <div className="card" style={{ padding: '0 16px' }}>
              {selectedSchedules.map(schedule => <ScheduleEntry key={schedule.scheduleId} schedule={schedule} />)}
            </div> : <div className="note" role="status">이날은 등록한 일정이 없어요.</div>}
          </>}
          {savedVisible && view === 'list' && <div className="toast" role="status"><Mascot face={6} size={30} /><span>일정 {savedCount}개를 저장하고 계약서를 보관했어요<br /><span style={{ color: 'var(--line)', fontSize: 11 }}>저장 직후에만 잠깐 보여요</span></span></div>}
        </>}
      </Screen>
    </div>
  )
}

export function ScheduleEntry({ schedule, showFullDate = false }: { schedule: Schedule; showFullDate?: boolean }) {
  const location = useLocation()
  const date = scheduleDate(schedule.date)
  const color = schedule.color ?? (schedule.daysLeft <= 14 ? 'red' : schedule.daysLeft <= 21 ? 'blu' : 'gry')
  return <Link className="er" to={`/schedules/${schedule.scheduleId}`} state={{ scheduleReturn: location.pathname === '/schedules' ? location.pathname + location.search : '/schedules' }}
    onClick={event => scheduleScrollPositions.set(location.pathname + location.search, event.currentTarget.closest('.phone-scroll')?.scrollTop ?? 0)}>
    <span className="ed"><b>{date.getDate()}</b><small>{weekdays[date.getDay()]}</small></span>
    <span style={{ flex: 1, minWidth: 0 }}><b>{schedule.title}</b>{' '}<Tag color={color}>{dday(schedule.daysLeft)}</Tag><br />
      <span className="mut">{showFullDate && `${schedule.date} · `}{schedule.contractTitle}{schedule.note && ` · ${schedule.note}`}</span>
    </span><Icon name="chev" size={16} />
  </Link>
}
