import { useState, type KeyboardEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { DocumentTypeFocus } from './DocumentTypePage'
import { getSampleAnalysis } from '../../api/analyses'
import { getDocumentTypes } from '../../api/documentTypes'
import { useApiData } from '../../api/useApiData'
import { Button, Header, Icon, Say, Screen, TabBar } from '../../common/components'

export function DemoContractsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [focus, setFocus] = useState<DocumentTypeFocus | null>(() => {
    const state = location.state as DocumentTypeFocus | null
    return state && ['집', '일'].includes(state.lane) ? state : null
  })
  const { data: documentTypes } = useApiData(getDocumentTypes, [])
  const [error, setError] = useState(false)
  const visibleTypes = documentTypes?.filter(type => !focus || type.lane === focus.lane && (!focus.group || type.group === focus.group))
  const showEmployment = !focus || focus.lane === '일' && (!focus.group || focus.group === '취업·근로 시작')
  const showLease = !focus || focus.lane === '집' && (!focus.group || focus.group === '집 구하기')
  async function openExample(code: string) {
    setError(false)
    try {
      const example = await getSampleAnalysis(code)
      navigate(`/analyses/${example.analysisId}`)
    } catch { setError(true) }
  }
  function activate(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.key === 'Enter' || event.key === ' ') && (event.target as HTMLElement).getAttribute('role') === 'button') {
      event.preventDefault()
      ;(event.target as HTMLElement).click()
    }
  }
  return <div onKeyDown={activate}>
    <Screen header={<Header title="예시 계약서 체험" back="/" chatFrom="S02" />} footer={<TabBar active="계약서 등록" />}>
      <Say face={4}>예시 계약서로 <b>직접 확인해 보세요.</b></Say>
      <div className="note"><Icon name="info" size={16} />시연에서는 새 계약서를 촬영하거나 올릴 수 없어요. 예시로 분석 결과, 챗봇, 일정 저장을 체험할 수 있어요.</div>
      {focus && <div className="row"><b>{focus.group || focus.lane} 예시</b><Button kind="l" small onClick={() => setFocus(null)}>전체 예시 보기</Button></div>}
      {showEmployment && <div className="card">
        <div className="h2">근로계약서 시연</div>
        <p className="mut">영상과 같은 근로계약서(안)이에요. 확인할 조항 7개와 일정 2개를 살펴보세요.</p>
        <Button to="/analyses/1/progress">근로계약서 예시 분석 보기</Button>
      </div>}
      {showLease && <div className="card">
        <div className="h2">임대차계약서 시연</div>
        <p className="mut">영상과 같은 표준임대차계약서예요. 확인할 조항 3개와 일정 4개를 살펴보세요.</p>
        <Button to="/analyses/9/progress">임대차계약서 예시 분석 보기</Button>
      </div>}
      {!focus && <div className="card">
        <div className="h2">계약서 비교 체험</div>
        <p className="mut">영상 계약서와 별개로 준비한 역삼동 원룸 계약서의 이전본·수정본을 비교해요.</p>
        <Button to="/comparisons/new" kind="l">이전본·수정본 비교하기</Button>
      </div>}
      <Button to="/contracts" kind="l">보관된 예시 계약서 보기</Button>
      <Button to="/schedules" kind="l">예시 일정 보기</Button>
      <div className="card">
        <div className="h2">{focus ? `${focus.group || focus.lane} 확인 항목` : '다른 문서의 확인 항목'}</div>
        <p className="mut">나머지 문서는 공통 확인 항목을 담은 간단한 예시예요. 실제 AI 분석 결과는 아니에요.</p>
        {visibleTypes?.filter(type => !['EMPLOYMENT', 'LEASE'].includes(type.code)).map(type =>
          <Button key={type.code} kind="l" onClick={() => void openExample(type.code)}>{type.name} 예시 보기</Button>)}
        {error && <div className="note" role="alert">예시를 불러오지 못했어요. 다시 선택해 주세요.</div>}
      </div>
    </Screen>
  </div>
}
