import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyContracts, type ContractSummary } from '../../api/contracts'
import { useApiData } from '../../api/useApiData'
import { Button, Header, Icon, Mascot, Screen, TabBar, Tag } from '../../common/components'
import { mockDocumentTypes } from '../../api/mocks/documentTypes'

// S15 내 계약서 · #16 구자건 · 보드: S15_내계약서_목록 · S15_내계약서_빈상태
export function MyContractsPage() {
  const [retry, setRetry] = useState(0)
  const { data, error, loading } = useApiData(getMyContracts, [retry])

  if (loading || error || !data) {
    return (
      <Screen header={<Header title="내 계약서" back={false} chatFrom="S15" />} footer={<TabBar active="내 계약서" />}>
        <div className="note" role="status">
          {error ? '계약서를 불러오지 못했어요.' : '계약서를 불러오는 중이에요.'}
        </div>
        {error && <Button kind="l" onClick={() => setRetry(value => value + 1)}>다시 시도</Button>}
      </Screen>
    )
  }

  return <MyContractsView contracts={data} />
}

type ContractFilter = '전체' | ContractSummary['lane']
const filters: ContractFilter[] = ['전체', '집', '일']

function analysisDate(savedAt: string) {
  return savedAt.slice(5, 10).replace('-', '.')
}

// 보드에서도 실제 화면과 같은 목록·필터를 예시 데이터로 확인한다.
export function MyContractsView({ contracts }: { contracts: ContractSummary[] }) {
  const [filter, setFilter] = useState<ContractFilter>('전체')
  const visibleContracts = contracts.filter(contract => filter === '전체' || contract.lane === filter)

  if (contracts.length === 0) {
    return (
      <Screen header={<Header title="내 계약서" back={false} chatFrom="S15" />} footer={<TabBar active="내 계약서" />}>
        <div className="empty" style={{ marginTop: 120 }}>
          <Mascot face={8} size={96} />
          <b style={{ fontSize: 18 }}>분석한 계약서가 여기 모여요</b>
          <span className="mut">계약서를 분석하면 자동으로 보관돼요</span>
          <Button to="/contracts/new">계약서 등록하기</Button>
        </div>
      </Screen>
    )
  }


  return (
    <Screen header={<Header title="내 계약서" back={false} chatFrom="S15" />} footer={<TabBar active="내 계약서" />}>
      <div className="chips" aria-label="계약서 분류"
           style={{ position: 'sticky', top: 84, zIndex: 3, background: 'var(--bg)', padding: '16px 0 12px', margin: '-16px 0 -12px' }}>
        {filters.map(value => (
          <button key={value} type="button" className={`chip${filter === value ? ' on' : ''}`}
                  aria-pressed={filter === value} onClick={() => setFilter(value)} style={{ fontFamily: 'inherit', cursor: 'pointer' }}>
            {value} {value === '전체' ? contracts.length : contracts.filter(contract => contract.lane === value).length}
          </button>
        ))}
      </div>
      <div className="note"><Icon name="info" size={14} />분석을 마친 계약서가 모여요. 일정이 없어도 보관돼요.</div>
      {visibleContracts.map(contract => (
        <Link key={contract.contractId} className="card dc" to={`/contracts/${contract.contractId}`}>
          <span className="th"><Icon name="doc" size={22} /></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <b>{contract.title}</b>{' '}
            {contract.version > 1 && <Tag color="blu">v{contract.version}</Tag>}
            <br />
            <span className="mut">
              {mockDocumentTypes.find(type => type.code === contract.documentTypeCode)?.name ?? '계약서'} · {analysisDate(contract.savedAt)} 분석
              {contract.previousVersion && ` · 이전 버전 v${contract.previousVersion.version} (${analysisDate(contract.previousVersion.savedAt)})`}
            </span>
            <span className="row" style={{ gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
              {contract.needsCheckCount > 0 && <Tag color="red" icon="warn">확인 필요 {contract.needsCheckCount}</Tag>}
              {(contract.missingItemCount ?? 0) > 0 && <Tag color="amb">빠진 항목 {contract.missingItemCount}</Tag>}
              {contract.reviewState === 'insufficient' ? <Tag color="amb">정보 부족 · 확인 필요</Tag>
                : contract.reviewState === 'guide' ? <Tag>공통 확인 예시</Tag>
                : contract.needsCheckCount === 0 && !contract.missingItemCount && <Tag>짚은 내용 없음</Tag>}
              <Tag>{contract.scheduleCount ? `일정 ${contract.scheduleCount}` : '일정 없음'}</Tag>
            </span>
          </span>
          <Icon name="chev" size={16} />
        </Link>
      ))}
    </Screen>
  )
}
