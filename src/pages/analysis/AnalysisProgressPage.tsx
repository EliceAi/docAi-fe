import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getAnalysisProgress, requestAnalysis, type AnalysisProgress } from '../../api/analyses'
import { useApiData } from '../../api/useApiData'
import { Button, Header, Icon, Mascot, Screen } from '../../common/components'
import { objectParticle } from '../contract-register/masking'

// S07 분석 중과 실패 · #13 김지희
const POLL_INTERVAL_MS = 2500
const STEP_LABELS = ['글자·항목 읽기', '주요 조건 찾기', '법령 DB 조문과 맞춰 보기', '확인할 조항 정리']

// 진행 정보를 아직 못 받았을 때(처음 열릴 때) 그리는 기본값
const STARTING: AnalysisProgress = { analysisId: 0, contractId: 0, status: 'IN_PROGRESS', documentTypeName: '근로계약서', pageCount: 2, completedSteps: 0 }
// 진행 정보를 받지 못했을 때는 일시 오류로 보여 준다
const LOAD_FAILED: AnalysisProgress = {
  ...STARTING, status: 'FAILED',
  failures: [{ kind: 'TEMPORARY', title: '잠시 문제가 생겼어요', text: '가린 이미지는 그대로 있어요.' }],
}

export function AnalysisProgressPage() {
  const analysisId = Number(useParams().analysisId)
  const navigate = useNavigate()
  const [tick, setTick] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [retryFailed, setRetryFailed] = useState(false)
  const { data, error } = useApiData(() => getAnalysisProgress(analysisId), [analysisId, tick, attempt])
  const progress = data ?? (error ? LOAD_FAILED : STARTING)
  const finished = progress.status === 'COMPLETED' || progress.status === 'PARTIAL'

  // 분석 중에는 몇 초마다 진행 상태를 다시 확인한다. 화면을 떠나면 멈춘다.
  useEffect(() => {
    if (progress.status !== 'IN_PROGRESS') return
    const timer = setTimeout(() => setTick(count => count + 1), POLL_INTERVAL_MS)
    return () => clearTimeout(timer)
  }, [progress.status, tick])

  useEffect(() => {
    if (finished) navigate(`/analyses/${analysisId}`, { replace: true })
  }, [finished, analysisId, navigate])

  async function retry() {
    setRetryFailed(false)
    try {
      // 계약서 번호를 알면 분석을 새로 요청하고, 모르면 진행 정보만 다시 받는다
      const next = progress.contractId ? await requestAnalysis(progress.contractId) : null
      if (next) navigate(`/analyses/${next.analysisId}/progress`, { replace: true })
      setAttempt(count => count + 1)
    } catch {
      setRetryFailed(true)
    }
  }

  return <AnalysisProgressView progress={progress} onRetry={retry} retryFailed={retryFailed} />
}

type ViewProps = { progress: AnalysisProgress; onRetry?: () => void; retryFailed?: boolean }

export function AnalysisProgressView({ progress, onRetry, retryFailed = false }: ViewProps) {
  return progress.status === 'FAILED'
    ? <AnalysisFailedScreen progress={progress} onRetry={onRetry} retryFailed={retryFailed} />
    : <AnalyzingScreen progress={progress} />
}

function AnalyzingScreen({ progress }: { progress: AnalysisProgress }) {
  return (
    <Screen header={<Header title="분석 중" back={false} chatFrom="S07" />}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 0' }}>
        <Mascot face={3} size={110} />
        <b style={{ fontSize: 19 }}>{objectParticle(progress.documentTypeName)} 읽고 있어요</b>
        <span className="mut">보통 30초쯤 걸려요</span>
      </div>
      <div className="card">
        {STEP_LABELS.map((label, index) => {
          const state = index < progress.completedSteps ? 'done' : index === progress.completedSteps ? 'doing' : 'todo'
          return <div key={label} className={`pst ${state}`}><span className="pd">{state === 'done' && <Icon name="check" size={16} />}</span>{label}</div>
        })}
      </div>
      <div className="note"><Icon name="lock" size={14} /> 가린 이미지 {progress.pageCount}쪽만 사용해요</div>
      <div className="note"><Icon name="info" size={14} /> 다른 화면으로 가도 분석은 계속돼요. 끝나면 알려 드릴게요.</div>
    </Screen>
  )
}

function AnalysisFailedScreen({ progress, onRetry, retryFailed }: { progress: AnalysisProgress; onRetry?: () => void; retryFailed: boolean }) {
  const navigate = useNavigate()
  const action = (failure: NonNullable<AnalysisProgress['failures']>[number]) => {
    if (failure.kind === 'BLURRY') return <Button kind="l" onClick={() => navigate('/contracts/new/capture', { state: { captureMode: 'camera' } })}>{failure.pageNo ? `${failure.pageNo}쪽 다시 찍기` : '다시 찍기'}</Button>
    if (failure.kind === 'TYPE_MISMATCH') return <Button kind="l" to="/contracts/new">종류 다시 고르기</Button>
    return <Button kind="l" onClick={onRetry}>다시 시도</Button>
  }
  return (
    <Screen header={<Header title="분석 결과" back="/" chatFrom="S07" />}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '10px 0' }}>
        <Mascot face={9} size={90} />
        <b style={{ fontSize: 19 }}>분석하지 못했어요</b>
        <span className="mut">이번 분석은 저장되지 않았어요</span>
      </div>
      {progress.failures?.map(failure => (
        <div key={failure.kind} className="card">
          <b>{failure.title}</b>
          <div className="mut" style={{ margin: '2px 0 10px' }}>{failure.text}</div>
          {action(failure)}
        </div>
      ))}
      {retryFailed && <div className="note" role="status"><Icon name="warn" size={14} /> 다시 시도하지 못했어요. 잠시 뒤 다시 눌러 주세요.</div>}
    </Screen>
  )
}
