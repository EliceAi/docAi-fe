import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MascotDefs } from '../common/components/Mascot'
import { ALL_BOARDS, BOARD_BY_ID } from './boards'
import { LANES } from './lanes'
import type { Board, Owner } from './types'
import './boards.css'

const OWNERS: Owner[] = ['김지희', '구자건']
// 칸과 막대에서 담당자를 색으로도 구분한다 (글자로도 함께 적는다)
const OWNER_CLASS: Record<Owner, string> = { 김지희: 'owner-a', 구자건: 'owner-b' }

// /dev/boards: 와이어프레임 흐름 순서대로 보드 칸을 그리고, 누르면 그 상태를 크게 보여 준다
export function BoardsPage() {
  const selectedId = decodeURIComponent(useLocation().hash.slice(1))
  const selected = BOARD_BY_ID.get(selectedId)
  // 담당자 카드를 누르면 그 사람 보드만 진하게 보여 준다
  const [focusedOwner, setFocusedOwner] = useState<Owner | null>(null)

  return (
    <div className="boards-page">
      <MascotDefs />
      <main className="boards-map">
        <ProgressSummary focusedOwner={focusedOwner} onFocus={setFocusedOwner} />
        {LANES.map(lane => (
          <section key={lane.no} className="boards-lane">
            <h2><span>{lane.no}</span>{lane.title}</h2>
            <div className="boards-tiles">
              {lane.boardIds.map(id => {
                const board = BOARD_BY_ID.get(id)
                if (!board) return null
                const state = board.render ? 'done' : 'todo'
                const faded = focusedOwner && board.owner !== focusedOwner ? 'faded' : ''
                return (
                  <a key={id} href={`#${id}`} title={id}
                     className={`boards-tile ${OWNER_CLASS[board.owner]} ${state} ${faded} ${id === selectedId ? 'selected' : ''}`}>
                    <span className="boards-tile-name">{shortName(id)}</span>
                    <span className="boards-tile-owner">{board.owner}{board.render ? ' · 완료' : ''}</span>
                  </a>
                )
              })}
            </div>
          </section>
        ))}
      </main>
      <aside className="boards-preview">
        {selected ? <BoardPreview board={selected} /> : <p className="mut">왼쪽에서 보드를 누르세요.</p>}
      </aside>
    </div>
  )
}

type ProgressSummaryProps = { focusedOwner: Owner | null; onFocus: (owner: Owner | null) => void }

function ProgressSummary({ focusedOwner, onFocus }: ProgressSummaryProps) {
  return (
    <header className="boards-summary">
      <ProgressCard label="전체" boards={ALL_BOARDS} />
      {OWNERS.map(owner => (
        <ProgressCard
          key={owner}
          label={owner}
          ownerClass={OWNER_CLASS[owner]}
          boards={ALL_BOARDS.filter(board => board.owner === owner)}
          active={focusedOwner === owner}
          onClick={() => onFocus(focusedOwner === owner ? null : owner)}
        />
      ))}
      <p className="boards-legend">
        <i className="owner-a done" /> 김지희 <i className="owner-b done" /> 구자건 · 색이 찬 칸 = 완료, 점선 칸 = 아직 · 담당자 카드를 누르면 그 사람 보드만 보여요
      </p>
    </header>
  )
}

type ProgressCardProps = { label: string; boards: Board[]; ownerClass?: string; active?: boolean; onClick?: () => void }

function ProgressCard({ label, boards, ownerClass = 'owner-all', active = false, onClick }: ProgressCardProps) {
  const doneCount = boards.filter(board => board.render).length
  const percent = Math.round((doneCount / boards.length) * 100)
  return (
    <button type="button" className={`boards-progress ${ownerClass} ${active ? 'active' : ''}`} onClick={onClick} disabled={!onClick}>
      <span className="boards-progress-label">{label}</span>
      <b>{doneCount} / {boards.length}</b>
      <span className="boards-progress-bar"><i style={{ width: `${percent}%` }} /></span>
      <span className="boards-progress-percent">{percent}%</span>
    </button>
  )
}

function BoardPreview({ board }: { board: Board }) {
  return (
    <>
      <h3>{board.id}</h3>
      <p className="boards-preview-meta">
        <span className={`boards-owner-chip ${OWNER_CLASS[board.owner]}`}>담당 {board.owner}</span>
        {board.render ? '구현됨' : '아직 안 만듦'}
      </p>
      <div className="boards-phone">
        {board.render ? board.render() : <div className="boards-empty">아직 만들지 않은 보드예요</div>}
      </div>
      <div className="boards-actions">
        <Link className="btn l s" to={board.path}>앱에서 열기</Link>
        <a className="btn l s" href={`/docs/wireframe.html#${board.id}`} target="_blank" rel="noreferrer">와이어프레임 원본</a>
      </div>
    </>
  )
}

// S10_챗봇_범위밖 → 챗봇 범위밖: 칸 안에는 보드 이름만 짧게
function shortName(id: string) {
  return id.split('_').slice(1).join(' ')
}
