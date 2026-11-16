import { Link, useLocation } from 'react-router-dom'
import { MascotDefs } from '../common/components/Mascot'
import { ALL_BOARDS, BOARD_BY_ID } from './boards'
import { LANES } from './lanes'
import type { Board, Owner } from './types'
import './boards.css'

const OWNERS: Owner[] = ['지희', '구자건']

// /dev/boards: 와이어프레임 흐름 순서대로 보드 칸을 그리고, 누르면 그 상태를 크게 보여 준다
export function BoardsPage() {
  const selectedId = decodeURIComponent(useLocation().hash.slice(1))
  const selected = BOARD_BY_ID.get(selectedId)

  return (
    <div className="boards-page">
      <MascotDefs />
      <main className="boards-map">
        <ProgressSummary />
        {LANES.map(lane => (
          <section key={lane.no} className="boards-lane">
            <h2><span>{lane.no}</span>{lane.title}</h2>
            <div className="boards-tiles">
              {lane.boardIds.map(id => {
                const board = BOARD_BY_ID.get(id)
                const state = board?.render ? 'done' : 'todo'
                return (
                  <a key={id} href={`#${id}`} title={`${id} · ${board?.owner ?? '?'}`}
                     className={`boards-tile ${state} ${id === selectedId ? 'selected' : ''}`}>
                    {shortName(id)}
                  </a>
                )
              })}
            </div>
          </section>
        ))}
        <p className="boards-legend"><i className="done" /> 구현됨 <i className="todo" /> 미구현 · 칸을 누르면 오른쪽에 크게 보여요</p>
      </main>
      <aside className="boards-preview">
        {selected ? <BoardPreview board={selected} /> : <p className="mut">왼쪽에서 보드를 누르세요.</p>}
      </aside>
    </div>
  )
}

function ProgressSummary() {
  const doneCount = (boards: Board[]) => boards.filter(board => board.render).length
  return (
    <header className="boards-summary">
      <b>진행 {doneCount(ALL_BOARDS)} / {ALL_BOARDS.length}</b>
      {OWNERS.map(owner => {
        const owned = ALL_BOARDS.filter(board => board.owner === owner)
        return <span key={owner}>{owner} {doneCount(owned)}/{owned.length}</span>
      })}
    </header>
  )
}

function BoardPreview({ board }: { board: Board }) {
  return (
    <>
      <h3>{board.id}</h3>
      <p className="mut">담당 {board.owner} · {board.render ? '구현됨' : '미구현'}</p>
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

// S10_챗봇_범위밖 → 범위밖: 칸 안에는 상태 이름만 짧게
function shortName(id: string) {
  return id.split('_').slice(1).join(' ')
}
