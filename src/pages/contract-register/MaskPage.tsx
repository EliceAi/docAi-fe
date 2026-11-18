import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Button, Header, Icon, Layered, Say, Screen, Sheet, StepBar, StepFooter, Tag, Toast } from '../../common/components'
import { maskedCounts, objectParticle, regionFromDrag, subjectParticle } from './masking'
import { activateButton } from './PreviewPage'
import { useRegisterFlow, type MaskRegion } from './RegisterFlowContext'

// S05 개인정보 가리기 · #11 김지희
type Point = { x: number; y: number }
/** 확대 상태: 사진 크기에 대한 비율. 사진 왼쪽 위가 (tx, ty) 만큼 밀려 있다 */
type View = { scale: number; tx: number; ty: number }
type Notice = { kind: 'added' | 'undone'; label?: string }
type RemovedMask = { pageId: string; index: number; region: MaskRegion }

const MIN_SCALE = 1
const MAX_SCALE = 4
const FULL_VIEW: View = { scale: 1, tx: 0, ty: 0 }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
// 확대한 사진이 화면 밖으로 완전히 빠져나가지 않게 한다
const keepInside = (view: View): View => ({
  scale: view.scale,
  tx: clamp(view.tx, 1 - view.scale, 0),
  ty: clamp(view.ty, 1 - view.scale, 0),
})
const viewCenteredOn = (region: MaskRegion, scale = 2): View => keepInside({
  scale,
  tx: 0.5 - (region.x + region.width / 2) * scale,
  ty: 0.5 - (region.y + region.height / 2) * scale,
})

export function MaskPage() {
  return <MaskScreen />
}

type MaskScreenProps = {
  /** 아래는 보드 모아 보기에서 상태를 그대로 그리기 위한 시작값이다 */
  initialPageIndex?: number
  initialZoomTo?: MaskRegion
  initialSheetOpen?: boolean
  initialNotice?: Notice
  initialDraft?: MaskRegion
  initialRemoved?: RemovedMask[]
  returned?: boolean
}

export function MaskScreen({ initialPageIndex = 0, initialZoomTo, initialSheetOpen = false, initialNotice, initialDraft, initialRemoved = [], returned = false }: MaskScreenProps) {
  const { pages, editPage } = useRegisterFlow()
  const location = useLocation()
  const returnedFromConfirm = returned || Boolean(location.state?.returnedFromConfirm)
  const [pageIndex, setPageIndex] = useState(initialPageIndex)
  const [zoomMode, setZoomMode] = useState(Boolean(initialZoomTo))
  const [view, setView] = useState<View>(initialZoomTo ? viewCenteredOn(initialZoomTo, 1.6) : FULL_VIEW)
  const [draft, setDraft] = useState<{ start: Point; end: Point } | null>(
    initialDraft ? { start: initialDraft, end: { x: initialDraft.x + initialDraft.width, y: initialDraft.y + initialDraft.height } } : null)
  const [notice, setNotice] = useState<Notice | undefined>(initialNotice)
  // 되돌리기는 마지막으로 가린 쪽부터 하나씩 취소한다
  const [addedPageIds, setAddedPageIds] = useState<string[]>(
    () => initialNotice?.kind === 'added' && pages[initialPageIndex] ? [pages[initialPageIndex].id] : [])
  const [sheetOpen, setSheetOpen] = useState(initialSheetOpen)
  const [removed, setRemoved] = useState<RemovedMask[]>(initialRemoved)
  const viewport = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, Point>())
  const lastPinchDistance = useRef(0)

  useEffect(() => {
    if (!sheetOpen) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setSheetOpen(false); setRemoved([]) } }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [sheetOpen])

  // 안내 토스트가 아래 버튼을 계속 가리지 않게 잠깐 뒤 치운다. 보드에 고정해 둔 처음 상태는 그대로 둔다.
  useEffect(() => {
    if (!notice || notice === initialNotice) return
    const timer = setTimeout(() => setNotice(undefined), 4000)
    return () => clearTimeout(timer)
  }, [notice, initialNotice])

  const page = pages[pageIndex]
  if (!page) {
    return (
      <Screen header={<Header title="개인정보 가리기" back="/contracts/new/preview" chatFrom="S05" sub={<StepBar current={3} />} />}>
        <Say face={8}>가릴 계약서 사진이 없어요. 먼저 사진을 올려 주세요.</Say>
        <Button to="/contracts/new">계약서 종류 고르기</Button>
      </Screen>
    )
  }

  const totalMasked = maskedCounts(pages).reduce((sum, count) => sum + count, 0)
  const isEmptyLaterPage = pageIndex > 0 && page.masks.length === 0
  const lastRemoved = removed[removed.length - 1]
  const highlightedMask = notice?.kind === 'added' ? page.masks.length - 1 : -1

  function toImagePoint(clientX: number, clientY: number): Point {
    const box = viewport.current!.getBoundingClientRect()
    return { x: ((clientX - box.left) / box.width - view.tx) / view.scale, y: ((clientY - box.top) / box.height - view.ty) / view.scale }
  }

  function pinchDistance() {
    const [a, b] = [...pointers.current.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  function startPointer(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size === 2) { setDraft(null); lastPinchDistance.current = pinchDistance() }
    else if (!zoomMode) { const start = toImagePoint(event.clientX, event.clientY); setDraft({ start, end: start }) }
  }

  function movePointer(event: PointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId)
    if (!previous) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const box = viewport.current!.getBoundingClientRect()
    if (pointers.current.size === 2) {
      // 두 손가락 벌리기: 두 손가락 가운데 점이 제자리에 있도록 확대한다
      const distance = pinchDistance()
      const [a, b] = [...pointers.current.values()]
      const middle = { x: ((a.x + b.x) / 2 - box.left) / box.width, y: ((a.y + b.y) / 2 - box.top) / box.height }
      const scale = clamp(view.scale * (distance / lastPinchDistance.current), MIN_SCALE, MAX_SCALE)
      const imagePoint = { x: (middle.x - view.tx) / view.scale, y: (middle.y - view.ty) / view.scale }
      setView(keepInside({ scale, tx: middle.x - imagePoint.x * scale, ty: middle.y - imagePoint.y * scale }))
      lastPinchDistance.current = distance
    } else if (zoomMode) {
      setView(current => keepInside({ ...current, tx: current.tx + (event.clientX - previous.x) / box.width, ty: current.ty + (event.clientY - previous.y) / box.height }))
    } else if (draft) {
      setDraft({ ...draft, end: toImagePoint(event.clientX, event.clientY) })
    }
  }

  function endPointer(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId)
    if (!draft || zoomMode || pointers.current.size > 0) return
    const region = regionFromDrag(draft.start, draft.end)
    setDraft(null)
    if (!region) return
    editPage({ type: 'mask-add', id: page.id, region })
    setAddedPageIds(ids => [...ids, page.id])
    setNotice({ kind: 'added' })
  }

  function undo() {
    const ids = [...addedPageIds]
    while (ids.length) {
      const target = pages.find(candidate => candidate.id === ids.pop())
      if (!target || !target.masks.length) continue
      editPage({ type: 'mask-remove', id: target.id, index: target.masks.length - 1 })
      setAddedPageIds(ids)
      setNotice({ kind: 'undone', label: target.masks[target.masks.length - 1].label })
      return
    }
    setAddedPageIds([])
  }

  function goToPage(index: number) {
    if (index < 0 || index >= pages.length) return
    setPageIndex(index)
    setNotice(undefined)
    setDraft(null)
    setView(FULL_VIEW)
  }

  function changeMode(zoom: boolean) {
    setZoomMode(zoom)
    setNotice(undefined)
    setDraft(null)
    if (!zoom) setView(FULL_VIEW)
  }

  function showMask(pageId: string, region: MaskRegion) {
    setPageIndex(pages.findIndex(candidate => candidate.id === pageId))
    setNotice(undefined)
    setZoomMode(true)
    setView(viewCenteredOn(region))
    closeSheet()
  }

  function removeMask(pageId: string, index: number, region: MaskRegion) {
    editPage({ type: 'mask-remove', id: pageId, index })
    setRemoved(list => [...list, { pageId, index, region }])
  }

  function restoreRemoved() {
    if (!lastRemoved) return
    editPage({ type: 'mask-add', id: lastRemoved.pageId, region: lastRemoved.region, index: lastRemoved.index })
    setRemoved(list => list.slice(0, -1))
  }

  function closeSheet() {
    setSheetOpen(false)
    setRemoved([])
  }

  const say = notice?.kind === 'added'
    ? <Say face={6} size={40}><b>{notice.label ?? '선택한 곳'}</b>{notice.label ? objectParticle(notice.label).slice(-1) : '을(를)'} 가렸어요. 가린 칸은 노란 테두리로 잠깐 표시돼요.</Say>
    : notice?.kind === 'undone'
      ? <Say face={1} size={40}>마지막으로 가린 <b>{notice.label ?? '곳'}</b>{notice.label ? objectParticle(notice.label).slice(-1) : '을(를)'} 되돌렸어요. 다시 끌어서 가릴 수 있어요.</Say>
      : zoomMode
        ? <Say face={4} size={40}>두 손가락으로 벌려 <b>확대</b>하고, 한 손가락으로 끌어 <b>옮겨</b> 보세요. 목록의 <b>보기</b>를 누르면 그 위치로 확대돼요.</Say>
        : returnedFromConfirm
          ? <Say face={1} size={40}>확인 단계에서 돌아왔어요. 가린 곳을 고친 뒤 <b>다시 확인</b>을 받아요. 위의 <b>4 확인</b>을 눌러도 바로 갈 수 있어요.</Say>
          : isEmptyLaterPage
            ? <Say face={1} size={40}>이 쪽에 이름·번호처럼 <b>나를 알아볼 수 있는 정보가 없다면</b> 가리지 않고 넘어가도 돼요.</Say>
            : <Say face={7} size={40}>가릴 곳을 손가락으로 <b>끌어서</b> 지정하고, 손을 떼면 가려져요. (파란 점선 = 지정 중)</Say>

  const draftRegion = draft && regionFromDrag(draft.start, draft.end)
  const screen = (
    <Screen header={<Header title="개인정보 가리기" back="/contracts/new/preview" chatFrom="S05"
      sub={<StepBar current={3} finishedAhead={returnedFromConfirm ? [4] : []} />} />}
      footer={<StepFooter current={3} nextLabel={isEmptyLaterPage ? '가릴 곳 없음, 다음: 확인' : '다음: 확인'} nextTo="/contracts/new/confirm" />}>
      {say}
      <div ref={viewport} role="img" aria-label={`${pageIndex + 1}쪽 계약서 사진. 가리기 모드에서 끌면 가릴 곳이 정해져요`}
        style={{ position: 'relative', overflow: 'hidden', touchAction: 'none', userSelect: 'none', borderRadius: 10, border: '1px solid #DDE1E6', background: '#fff' }}
        onPointerDown={startPointer} onPointerMove={movePointer} onPointerUp={endPointer} onPointerCancel={endPointer}>
        <div style={{ position: 'relative', transformOrigin: '0 0', transform: `translate(${view.tx * 100}%, ${view.ty * 100}%) scale(${view.scale})` }}>
          <PageImage file={page.file} />
          {page.masks.map((mask, index) => (
            <span key={index} className="mkb" style={{ ...boxStyle(mask), outline: index === highlightedMask ? '3px solid #FFC94D' : undefined }} />
          ))}
          {draftRegion && <span className="sel" style={{ ...boxStyle(draftRegion), position: 'absolute' }} />}
        </div>
      </div>
      <div className="note"><Icon name="info" size={14} /> 금액·날짜·근무 장소는 남겨 두세요. 가린 곳은 분석하지 않아요.</div>
      <div className="tools" onKeyDown={activateButton}>
        <a className={`tool ${zoomMode ? '' : 'on'}`} role="button" tabIndex={0} onClick={() => changeMode(false)}><Icon name="edit" size={18} />가리기</a>
        <a className={`tool ${zoomMode ? 'on' : ''}`} role="button" tabIndex={0} onClick={() => changeMode(true)}><Icon name="move" size={18} />이동·확대</a>
        <a className="tool" role="button" tabIndex={0} onClick={undo}><Icon name="undo" size={18} />되돌리기</a>
      </div>
      <div className="row" style={{ justifyContent: 'space-between' }} onKeyDown={activateButton}>
        <a className="chip" role="button" tabIndex={0} onClick={() => goToPage(pageIndex - 1)}>‹ 이전 쪽</a>
        <b>{pageIndex + 1} / {pages.length}쪽</b>
        <a className="chip" role="button" tabIndex={0} onClick={() => goToPage(pageIndex + 1)}>다음 쪽 ›</a>
      </div>
      {!isEmptyLaterPage && (
        <a className="chip" role="button" tabIndex={0} style={{ alignSelf: 'center' }} onKeyDown={activateButton} onClick={() => setSheetOpen(true)}>
          <Icon name="list" size={16} /> 가린 곳 {totalMasked}개 보기
        </a>
      )}
      {notice?.kind === 'added' && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 96 }} onKeyDown={activateButton}>
          <Toast><Icon name="check" size={16} /><span style={{ flex: 1 }}>{notice.label ? `${objectParticle(notice.label)} 가렸어요` : '가렸어요'}</span>
            <a role="button" tabIndex={0} onClick={undo} style={{ fontWeight: 700, color: '#8FB0FF' }}>되돌리기</a></Toast>
        </div>
      )}
      {notice?.kind === 'undone' && (
        <Toast><Icon name="undo" size={16} /><span>{notice.label ?? '마지막'} 가림을 되돌렸어요</span></Toast>
      )}
    </Screen>
  )

  if (!sheetOpen) return screen
  return <Layered base={<div inert>{screen}</div>} layers={[
    <div key="masked-list" role="dialog" aria-modal="true" aria-label="가린 곳 목록" onKeyDown={activateButton}>
      <Sheet small>
        <div className="grab" />
        <div className="sh-t"><b>가린 곳 {totalMasked}개</b>
          <a className="x" role="button" tabIndex={0} aria-label="닫기" onClick={closeSheet}><Icon name="x" size={22} /></a></div>
        {lastRemoved && (
          <div className="warnb" style={{ margin: '8px 16px 0' }}><Icon name="warn" size={18} />
            <span style={{ flex: 1 }}><b>{lastRemoved.region.label ? `${lastRemoved.region.label} 가림을 지웠어요` : '가림을 지웠어요'}</b><br />지금은 {lastRemoved.region.label ? subjectParticle(lastRemoved.region.label) : '지운 곳이'} 보이는 채로 AI에 보내져요.</span>
            <Button kind="l" small onClick={restoreRemoved}>되돌리기</Button></div>
        )}
        <div style={{ padding: '0 16px' }}>
          {pages.map((listedPage, pageNumber) => listedPage.masks.map((mask, index) => (
            <div className="li" key={`${listedPage.id}-${index}`}>
              <Tag color="ink">{pageNumber + 1}쪽</Tag>
              <span style={{ flex: 1 }}>{mask.label ?? `가린 곳 ${index + 1}`}</span>
              <a className="chip" role="button" tabIndex={0} onClick={() => showMask(listedPage.id, mask)}>보기</a>
              <a className="chip" role="button" tabIndex={0} onClick={() => removeMask(listedPage.id, index, mask)}>지우기</a>
            </div>
          )))}
        </div>
        <div style={{ padding: '12px 16px' }} className="note"><Icon name="info" size={14} /> 내가 직접 가린 곳이에요. 앱이 자동으로 찾은 것이 아니에요. 보기 = 그 위치로 확대 · 지우기 = 가림 해제</div>
      </Sheet>
    </div>,
  ]} />
}

const boxStyle = (region: MaskRegion) => ({
  position: 'absolute' as const,
  left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.width * 100}%`, height: `${region.height * 100}%`,
})

function PageImage({ file }: { file: File }): ReactNode {
  const [source, setSource] = useState<{ file: File; url: string } | null>(null)
  useEffect(() => {
    const url = URL.createObjectURL(file)
    setSource({ file, url })
    return () => URL.revokeObjectURL(url)
  }, [file])
  if (file.type === 'application/pdf') return <div className="mut" style={{ padding: 24 }}>PDF 파일은 여기서 가릴 수 없어요. 사진으로 다시 올려 주세요.</div>
  const url = source?.file === file ? source.url : undefined
  return url ? <img src={url} alt={file.name} draggable={false} style={{ width: '100%', display: 'block' }} /> : <div style={{ aspectRatio: '3 / 4' }} />
}
