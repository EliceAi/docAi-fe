import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getDocumentTypes, type DocumentType } from '../../api/documentTypes'
import { useApiData } from '../../api/useApiData'
import { Button, Header, Icon, Mascot, Say, Screen, TabBar, Tag } from '../../common/components'
import { useAppPanels } from '../../common/layout/AppPanels'
import { useRegisterFlow } from './RegisterFlowContext'

type Lane = DocumentType['lane']

const LANES: Lane[] = ['집', '일']
const SELECT_DOCUMENT_TO = '/contracts/new/capture' // S03
// 와이어프레임 "많이 찾는 계약서"
const POPULAR_DOCUMENTS: { code: string; lane: Lane; note: string }[] = [
  { code: 'LABOR', lane: '일', note: '알바·정규·계약직' },
  { code: 'LEASE', lane: '집', note: '전세·월세·반전세' },
]

// S02 계약서 등록 · #8 김지희 · 보드: S02_문서선택_기본 · S02_문서선택_근로급여 · S02_문서선택_검색결과
export function DocumentTypePage() {
  const [retry, setRetry] = useState(0)
  const location = useLocation()
  const { data, error } = useApiData(getDocumentTypes, [retry])

  if (!data) {
    return (
      <Screen header={<Header title="계약서 등록" back={false} chatFrom="S02" />} footer={<TabBar active="계약서 등록" />}>
        <div className="note" role="status">{error ? '문서 목록을 불러오지 못했어요.' : '문서 목록을 불러오는 중이에요.'}</div>
        {error && <Button kind="l" onClick={() => setRetry(value => value + 1)}>다시 시도</Button>}
      </Screen>
    )
  }

  // 검색 결과에서 뒤로 가기(같은 주소로 이동)를 누르면 location.key가 바뀌어 처음 상태로 돌아간다
  return <DocumentPicker key={location.key} documentTypes={data} />
}

type DocumentPickerProps = {
  documentTypes: DocumentType[]
  initialLane?: Lane
  initialQuery?: string
}

// 와이어프레임 documentPickerScreen · searchResultScreen: 보드에서도 같은 화면을 예시 데이터로 그린다
export function DocumentPicker({ documentTypes, initialLane = '집', initialQuery = '' }: DocumentPickerProps) {
  const [lane, setLane] = useState<Lane>(initialLane)
  const [query, setQuery] = useState(initialQuery)
  const { chooseDocumentType } = useRegisterFlow()
  const { openChat } = useAppPanels()
  const isSearching = query.trim() !== ''
  const searchResults = isSearching ? findDocumentTypes(documentTypes, query.trim()) : []
  const laneDocuments = documentTypes.filter(documentType => documentType.lane === lane)

  return (
    <Screen
      header={<Header title="계약서 등록" back={isSearching ? '/contracts/new' : false} chatFrom="S02" />}
      footer={<TabBar active="계약서 등록" />}
    >
      <div className="srch" style={isSearching ? { color: 'var(--ink)' } : undefined}>
        <Icon name="search" size={18} />
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="문서 이름이나 단어로 찾기 (예: 보증금)"
          aria-label="문서 검색"
          style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: 'transparent', font: 'inherit', color: 'var(--ink)' }}
        />
        {isSearching && (
          <span role="button" tabIndex={0} aria-label="검색어 지우기" style={{ marginLeft: 'auto' }}
                onClick={() => setQuery('')}
                onKeyDown={event => { if (event.key === 'Enter') setQuery('') }}>
            <Icon name="x" size={16} />
          </span>
        )}
      </div>
      {isSearching ? (
        <SearchResults query={query.trim()} documentTypes={searchResults} onChoose={chooseDocumentType} />
      ) : (
        <>
          <div className="h2" style={{ margin: '4px 0 0' }}>많이 찾는 계약서</div>
          <div className="pop">
            {POPULAR_DOCUMENTS.map(popular => (
              <Link key={popular.code} to={SELECT_DOCUMENT_TO} onClick={() => chooseDocumentType(popular.code)}>
                <Tag color="blu">{popular.lane}</Tag>
                <b>{documentTypes.find(documentType => documentType.code === popular.code)?.name}</b>
                <span className="mut">{popular.note}</span>
              </Link>
            ))}
          </div>
          <div className="seg">
            {LANES.map(tab => (
              <a key={tab} className={tab === lane ? 'on' : ''} role="button" tabIndex={0}
                 onClick={() => setLane(tab)}
                 onKeyDown={event => { if (event.key === 'Enter') setLane(tab) }}>
                {tab} {documentTypes.filter(documentType => documentType.lane === tab).length}종
              </a>
            ))}
          </div>
          <div className="note"><GradeTag grade="A" /> 확인할 조항·근거 조문까지 <GradeTag grade="B" /> 공통 항목과 기한</div>
          {groupByName(laneDocuments).map(([groupName, documents]) => (
            <div key={groupName}>
              <div className="sec-h">{groupName} {documents.length}</div>
              <div className="card" style={{ padding: '4px 16px' }}>
                {documents.map(document => (
                  <DocumentRow key={document.code} document={document} note={document.checkNote} onChoose={chooseDocumentType} />
                ))}
              </div>
            </div>
          ))}
          <a className="card row" role="button" tabIndex={0}
             onClick={() => openChat({ from: 'S02' })}
             onKeyDown={event => { if (event.key === 'Enter') openChat({ from: 'S02' }) }}>
            <Mascot face={1} size={40} />
            <span style={{ flex: 1 }}>
              <b>어떤 문서인지 모르겠어요</b><br />
              <span className="mut">AI에게 물어보면 골라 드려요</span>
            </span>
            <Icon name="chev" size={16} />
          </a>
        </>
      )}
    </Screen>
  )
}

function SearchResults({ query, documentTypes, onChoose }: { query: string; documentTypes: DocumentType[]; onChoose: (code: string) => void }) {
  return (
    <>
      <Say face={4} size={40}>‘{query}’{hasFinalConsonant(query) ? '이' : '가'} 들어간 문서가 <b>{documentTypes.length}종</b> 있어요</Say>
      <div className="card" style={{ padding: '4px 16px' }}>
        {documentTypes.map(document => (
          <DocumentRow key={document.code} document={document} note={`${document.group} · ${document.searchNote ?? document.checkNote}`} onChoose={onChoose} />
        ))}
      </div>
      <div className="note"><Icon name="info" size={14} /> 찾는 문서가 없으면 AI에게 질문에서 문서 이름을 물어보세요</div>
    </>
  )
}

// 와이어프레임 docRow: 문서를 고르면 S03으로 간다. PoC에서 분석하지 않는 문서도 같은 흐름이다
function DocumentRow({ document, note, onChoose }: { document: DocumentType; note: string; onChoose: (code: string) => void }) {
  return (
    <Link className="li" to={SELECT_DOCUMENT_TO} onClick={() => onChoose(document.code)}>
      <span style={{ flex: 1 }}>
        <b>{document.name}</b> <GradeTag grade={document.grade} /><br />
        <span className="mut">{note}</span>
        {document.urgentNote && <><br /><Tag color="red" icon="warn">{document.urgentNote}</Tag></>}
      </span>
      <Icon name="chev" size={16} />
    </Link>
  )
}

function GradeTag({ grade }: { grade: DocumentType['grade'] }) {
  return grade === 'A' ? <Tag color="grn">A 깊게 점검</Tag> : <Tag color="amb">B 공통 점검</Tag>
}

function findDocumentTypes(documentTypes: DocumentType[], query: string): DocumentType[] {
  return documentTypes.filter(documentType => [documentType.name, documentType.group, documentType.checkNote, ...(documentType.keywords ?? [])].some(text => text.includes(query)))
}

// 목록에 나온 순서대로 묶음(집 구하기·입주·거주…)을 모은다
function groupByName(documentTypes: DocumentType[]): [string, DocumentType[]][] {
  const groups = new Map<string, DocumentType[]>()
  for (const documentType of documentTypes) {
    groups.set(documentType.group, [...(groups.get(documentType.group) ?? []), documentType])
  }
  return [...groups]
}

// "보증금이" / "임대차가"처럼 마지막 글자에 받침이 있는지로 이·가를 고른다
function hasFinalConsonant(text: string): boolean {
  const lastCode = text.charCodeAt(text.length - 1)
  const isHangulSyllable = lastCode >= 0xac00 && lastCode <= 0xd7a3
  return isHangulSyllable ? (lastCode - 0xac00) % 28 !== 0 : true
}
