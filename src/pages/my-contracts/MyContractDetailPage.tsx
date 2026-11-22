import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getMyContract, type ContractDetail } from '../../api/contracts'
import { useApiData } from '../../api/useApiData'
import { Button, Header, Icon, Screen, TabBar, Tag } from '../../common/components'
import { shouldMock } from '../../api/mock-mode'
import { mockDocumentTypes } from '../../api/mocks/documentTypes'

// S15 계약서 상세 · #16 구자건 · 보드: S15_내계약서_문서상세
export function MyContractDetailPage() {
  const { contractId: id } = useParams()
  const contractId = Number(id)
  const validId = Number.isSafeInteger(contractId) && contractId > 0
  const [retry, setRetry] = useState(0)
  const { data, loading, error } = useApiData(
    () => validId ? getMyContract(contractId) : Promise.reject(new Error('계약서를 찾을 수 없어요.')),
    [contractId, retry],
  )

  if (!validId || error) {
    return (
      <Screen header={<Header title="계약서 상세" back="/contracts" chatFrom="S15" />} footer={<TabBar active="내 계약서" />}>
        <div className="note" role="alert">{validId ? '계약서를 불러오지 못했어요.' : '계약서를 찾을 수 없어요.'}</div>
        {validId && <Button kind="l" onClick={() => setRetry(value => value + 1)}>다시 시도</Button>}
        <Button to="/contracts" kind="l">내 계약서로</Button>
      </Screen>
    )
  }

  if (loading || !data || data.contractId !== contractId) {
    return (
      <Screen header={<Header title="계약서 상세" back="/contracts" chatFrom="S15" />} footer={<TabBar active="내 계약서" />}>
        <div className="note" role="status">계약서를 불러오는 중이에요.</div>
      </Screen>
    )
  }

  return <MyContractDetailView contract={data} demo={shouldMock('getMyContract')} />
}

export function MyContractDetailView({ contract, demo = false }: { contract: ContractDetail; demo?: boolean }) {
  const TermsContainer = demo ? 'details' : 'div'
  return (
    <Screen header={<Header title="계약서 상세" back="/contracts" chatFrom="S15" contractId={contract.contractId} />} footer={<TabBar active="내 계약서" />}>
      <div className="infob">
        <Icon name="info" size={18} />
        <span style={{ flex: 1 }}>
          <b>{contract.savedAt.slice(5, 10).replace('-', '.')} 분석 · v{contract.version}</b>
          <br />분석한 날 기준이에요. 최신 법령으로 다시 검토한 결과가 아니에요.
        </span>
        {contract.previousVersion && (
          <Button to={`/contracts/${contract.previousVersion.contractId}`} kind="l" small>v{contract.previousVersion.version} 보기</Button>
        )}
      </div>
      <div>
        <b style={{ fontSize: 21 }}>{contract.title}</b>
        <div className="mut">
          {mockDocumentTypes.find(type => type.code === contract.documentTypeCode)?.name ?? '계약서'}{contract.reviewLabel && ` · ${contract.reviewLabel}`}
        </div>
      </div>
      {contract.reviewState === 'insufficient' && <div className="warnb"><Icon name="info" size={16} />원문과 주요 조건 정보가 부족한 예시예요. 검토 결과가 없다는 뜻이 아니에요.</div>}
      {contract.reviewState === 'guide' && <div className="note">개별 문서의 AI 분석 결과가 아닌 공통 확인 항목 예시예요.</div>}
      {contract.keyTerms.length > 0 && (
        <TermsContainer className="card">
          {demo && <summary className="h2" style={{ cursor: 'pointer' }}>주요 조건 {contract.keyTerms.length}개</summary>}
          <div className="cg" style={demo ? { gridTemplateColumns: '1fr' } : undefined}>
            {contract.keyTerms.map(term => (
              <div key={term.label} className={`cv${term.state ? ` ${term.state}` : ''}`}>
                <small>{term.label}</small><b>{term.value}</b>
                {term.state === 'warn' && <Tag color="red" icon="warn">확인 필요</Tag>}
                {term.state === 'miss' && <Tag color="amb">적혀 있지 않아요</Tag>}
                {term.state === 'unk' && <Tag color="amb" icon="warn">읽지 못함 · 확인 필요</Tag>}
              </div>
            ))}
          </div>
        </TermsContainer>
      )}
      <div className="card">
        <div className="h2">연결된 일정 {contract.schedules.length}</div>
        {contract.schedules.map(schedule => (
          <Link key={schedule.scheduleId} className="ev" to={`/schedules/${schedule.scheduleId}`}>
            <span className={`dday t-${schedule.daysLeft >= 365 ? 'gry' : schedule.source === 'review' ? 'amb' : 'blu'}`}>
              {schedule.daysLeft >= 365 ? schedule.date.slice(0, 4) : schedule.daysLeft === 0 ? 'D-day' : schedule.daysLeft > 0 ? `D-${schedule.daysLeft}` : `D+${Math.abs(schedule.daysLeft)}`}
            </span>
            <span><b>{schedule.title}</b><small>{schedule.date}</small></span>
            <Icon name="chev" size={16} />
          </Link>
        ))}
      </div>
      <Button to={`/analyses/${contract.analysisId}`} kind="l">{contract.reviewState === 'guide' ? '공통 확인 항목 보기' : '분석 결과 전체 보기'}</Button>
      {demo && [2, 4].includes(contract.contractId) && <Button to="/comparisons/new" kind="l">이전본·수정본 비교 예시 보기</Button>}
      <div className="note"><Icon name="info" size={14} />이 계약서로 질문하려면 위의 AI에게 질문을 눌러요</div>
    </Screen>
  )
}
