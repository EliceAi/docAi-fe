import { useCallback, useState, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getSampleAnalysis } from '../../api/analyses'
import { getUpcomingSchedules, type Schedule } from '../../api/schedules'
import { useApiData } from '../../api/useApiData'
import { Header, Icon, Mascot, Say, Screen, TabBar } from '../../common/components'
import type { DocumentTypeFocus } from '../contract-register/DocumentTypePage'
import { SplashPage } from './SplashPage'
import { shouldMock } from '../../api/mock-mode'

// 홈 "내 상황에 맞는 문서 찾기" 칩. 누르면 문서 선택(S02)에서 그 탭(집/일)을 열고 그 묶음으로 내려간다
const DOCUMENT_CHIP_LANES: { lane: DocumentTypeFocus['lane']; chips: { group: string; label: string }[] }[] = [
  { lane: '집', chips: [{ group: '집 구하기', label: '집 구하기 6' }, { group: '입주·거주', label: '입주·거주 4' }, { group: '계약 종료·이사', label: '계약 종료·이사 3' }] },
  { lane: '일', chips: [{ group: '취업·근로 시작', label: '취업·근로 시작 6' }, { group: '급여·퇴직', label: '급여·퇴직 4' }] },
]

// 홈의 "예시 계약서로 먼저 해보기"가 보여 주는 문서 종류
const SAMPLE_DOCUMENT_TYPE_CODE = 'EMPLOYMENT'
// 이 날수 이하로 남으면 D-day를 빨간색으로 보여 준다
const URGENT_DAYS_LEFT = 14

// 앱을 연 뒤 처음 홈에 들어올 때만 스플래시를 보여 준다. 탭으로 홈에 돌아올 때는 건너뛴다.
let hasShownSplash = false

// S00·S01 · #7 김지희 · 보드: S00_스플래시 · S01_홈_기본 · S01_홈_첫사용
export function HomePage() {
  const [isSplashing, setIsSplashing] = useState(!hasShownSplash)
  const finishSplash = useCallback(() => {
    hasShownSplash = true
    setIsSplashing(false)
  }, [])

  if (isSplashing) return <SplashPage onDone={finishSplash} />
  return <HomeWithApiData />
}

function HomeWithApiData() {
  const navigate = useNavigate()
  const [sampleFailed, setSampleFailed] = useState(false)
  const { data: upcoming } = useApiData(getUpcomingSchedules, [])

  async function startSample() {
    if (shouldMock('getSampleAnalysis')) { navigate('/analyses/1/progress'); return }
    setSampleFailed(false)
    try {
      const sample = await getSampleAnalysis(SAMPLE_DOCUMENT_TYPE_CODE)
      navigate(`/analyses/${sample.analysisId}`)
    } catch {
      setSampleFailed(true)
    }
  }

  return <HomeScreen upcoming={upcoming ?? []} onStartSample={startSample} sampleFailed={sampleFailed} demo={shouldMock('createContract')} />
}

type HomeScreenProps = {
  /** 다가오는 일정. 비어 있으면 "첫 사용" 화면 */
  upcoming: Schedule[]
  onStartSample?: () => void
  sampleFailed?: boolean
  demo?: boolean
}

// 와이어프레임 homeScreen(firstUse): 보드에서도 같은 화면을 예시 데이터로 그린다
export function HomeScreen({ upcoming, onStartSample, sampleFailed = false, demo = false }: HomeScreenProps) {
  const isFirstUse = upcoming.length === 0

  return (
    <Screen header={<Header home chatFrom="S01" />} footer={<TabBar active="홈" />}>
      <Say face={2} size={60}>
        받은 계약서, 서명 전에 <b>같이 읽어봐요.</b><br />
        <span className="mut">확인할 조항·빠진 항목·기한을 근거와 함께 알려 드려요</span>
      </Say>
      <div className="hero">
        <Link className="hbtn" to="/contracts/new">
          <Icon name={demo ? 'doc' : 'camera'} size={26} /><b>{demo ? '예시 계약서 체험' : '계약서 촬영'}</b><small>{demo ? '근로·임대차 분석 보기' : '카메라로 바로 찍기'}</small>
        </Link>
        <Link className="hbtn w" to={demo ? '/contracts' : '/contracts/new'}>
          <Icon name={demo ? 'files' : 'upload'} size={26} /><b>{demo ? '보관된 예시 보기' : '파일·앨범 올리기'}</b><small>{demo ? '계약서·일정 확인' : '사진 여러 장'}</small>
        </Link>
      </div>
      <div className="note" style={{ justifyContent: 'center' }}>
        <Icon name="lock" size={14} /> {demo ? '시연 모드 · 새 계약서 업로드 없이 예시로 체험해요' : '개인정보는 내가 직접 가린 뒤에만 AI에 보내요'}
      </div>
      {demo && <a className="more2" href="/#video" style={{ alignSelf: 'center' }}>AI 분석 과정·시연 영상 보기 <Icon name="chev" size={14} /></a>}
      {isFirstUse ? <EmptyUpcoming /> : <UpcomingSchedules schedules={upcoming} />}
      <div className="card">
        <div className="h2">내 상황에 맞는 문서 찾기<Link className="more" to="/contracts/new">23종 보기</Link></div>
        {DOCUMENT_CHIP_LANES.map(({ lane, chips }) => (
          <div key={lane} className="lane2">
            <b>{lane}</b>
            {chips.map(chip => (
              <Link key={chip.group} className="chip" to="/contracts/new" state={{ lane, group: chip.group } satisfies DocumentTypeFocus}>{chip.label}</Link>
            ))}
          </div>
        ))}
      </div>
      <a className="card row" role="button" tabIndex={0} onClick={onStartSample} onKeyDown={event => activateOnEnter(event, onStartSample)}>
        <Mascot face={4} size={46} />
        <span style={{ flex: 1 }}>
          <b>예시 계약서로 먼저 해보기</b><br />
          {/* #48: 예시는 실제 AI 분석 응답(근로계약서(안))이라 와이어프레임의 "카페 알바" 대신 그 제목을 쓴다 */}
          <span className="mut">근로계약서(안) · 예시</span>
        </span>
        <Icon name="chev" size={18} />
      </a>
      {sampleFailed && <div className="note" role="alert">예시를 불러오지 못했어요. 잠시 뒤 다시 눌러 주세요.</div>}
    </Screen>
  )
}

function UpcomingSchedules({ schedules }: { schedules: Schedule[] }) {
  return (
    <div className="card">
      <div className="h2">다가오는 일정<Link className="more" to="/schedules">전체 보기</Link></div>
      {schedules.map(schedule => (
        <Link key={schedule.scheduleId} className="ev" to={`/schedules/${schedule.scheduleId}`}>
          <span className={`dday ${schedule.daysLeft <= URGENT_DAYS_LEFT ? 't-red' : 't-blu'}`}>D-{schedule.daysLeft}</span>
          <span><b>{schedule.title}</b><small>{schedule.contractTitle}</small></span>
          <Icon name="chev" size={16} />
        </Link>
      ))}
    </div>
  )
}

function EmptyUpcoming() {
  return (
    <div className="card empty">
      <Mascot face={8} size={64} />
      <b>아직 챙길 일정이 없어요</b>
      <span className="mut">계약서를 분석하면 신고 기한·첫 출근 같은 날짜를 모아 드려요</span>
    </div>
  )
}

function activateOnEnter(event: KeyboardEvent, action?: () => void) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  action?.()
}
