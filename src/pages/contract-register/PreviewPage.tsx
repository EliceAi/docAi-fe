import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDocumentTypes } from '../../api/documentTypes'
import { useApiData } from '../../api/useApiData'
import { Button, Dialog, Header, Icon, Layered, Screen, StepBar, StepFooter, Tag } from '../../common/components'
import { checkImageQuality, type ImageQuality } from './blurCheck'
import { useRegisterFlow, type RegisteredPage } from './RegisterFlowContext'

type PageInspection = { file: File; quality?: ImageQuality; failed?: boolean }

export function PreviewPage() {
  const { documentTypeCode } = useRegisterFlow()
  const { data } = useApiData(getDocumentTypes, [])
  const name = data?.find(document => document.code === documentTypeCode)?.name ?? '계약서'
  return <PreviewScreen documentName={name} />
}

export function PreviewScreen({ documentName = '근로계약서', example = false }: { documentName?: string; example?: boolean }) {
  const { pages, editPage, maskingVisited, visitMasking } = useRegisterFlow()
  const navigate = useNavigate()
  const [inspections, setInspections] = useState<Record<string, PageInspection>>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [movingId, setMovingId] = useState<string | null>(null)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const draggingId = useRef<string | null>(null)
  const pressPoint = useRef({ x: 0, y: 0 })
  const deleteDialog = useRef<HTMLDivElement>(null)
  const reportInspection = useCallback((id: string, result: PageInspection) => {
    setInspections(previous => ({ ...previous, [id]: result }))
  }, [])

  useEffect(() => () => clearTimeout(holdTimer.current), [])
  useEffect(() => {
    if (!deletingId) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const buttons = deleteDialog.current?.querySelectorAll<HTMLElement>('[role="button"]')
    buttons?.[0]?.focus()
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setDeletingId(null) }
      if (event.key !== 'Tab' || !buttons?.length) return
      const first = buttons[0], last = buttons[buttons.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); if (previousFocus?.isConnected) previousFocus.focus() }
  }, [deletingId])

  const firstFlagged = pages.find(page => {
    const result = inspections[page.id]
    return result?.file === page.file && result.quality && (result.quality.blurred || result.quality.brightness !== 'normal')
  })
  const firstQuality = firstFlagged ? inspections[firstFlagged.id]?.quality : undefined
  const firstFlaggedNumber = pages.findIndex(page => page.id === firstFlagged?.id) + 1
  const deletingPageNumber = pages.findIndex(page => page.id === deletingId) + 1

  function openCamera(replacePageId?: string) {
    navigate('/contracts/new/capture', { state: { captureMode: 'camera', replacePageId } })
  }

  function moveWithKeyboard(event: KeyboardEvent<HTMLDivElement>, page: RegisteredPage, index: number) {
    const offset = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : 0
    if (!offset) return
    event.preventDefault()
    if (index + offset < 0 || index + offset >= pages.length) return
    editPage({ type: 'move', id: page.id, to: index + offset })
    setMessage(`${index + 1}쪽을 ${index + offset + 1}쪽으로 옮겼어요.`)
  }

  function finishMove(clientX: number, clientY: number) {
    clearTimeout(holdTimer.current)
    const id = draggingId.current
    const target = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>('[data-page-id]')
    const index = pages.findIndex(page => page.id === target?.dataset.pageId)
    if (id && index >= 0) {
      editPage({ type: 'move', id, to: index })
      setMessage(`${index + 1}쪽으로 옮겼어요.`)
    }
    draggingId.current = null
    setMovingId(null)
  }

  function confirmDeletion() {
    if (!deletingId) return
    editPage({ type: 'remove', id: deletingId })
    setDeletingId(null)
    setMessage(`${deletingPageNumber}쪽을 삭제했어요.`)
  }

  const content = (
    <Screen header={<Header title="올린 페이지 확인" back="/contracts/new/capture" chatFrom="S04"
      sub={<StepBar current={2} finishedAhead={maskingVisited ? [3] : []} />} />}
      footer={<StepFooter current={2} nextLabel="다음: 가리기" ready={pages.length > 0}
        onNext={() => { visitMasking(); navigate('/contracts/new/mask') }}
        onNotReady={() => setMessage('사진이나 파일을 올리면 눌러져요.')} />}>
      {firstFlagged ? (
        <div className="warnb"><Icon name="warn" size={18} /><span style={{ flex: 1 }}>
          <b>{firstFlaggedNumber}쪽 {firstQuality?.brightness === 'dark' ? '사진이 어두워요' : firstQuality?.brightness === 'bright' ? '사진이 너무 밝아요' : '글자가 흐려요'}</b><br />
          흐린 쪽은 일부를 읽지 못할 수 있어요. 그대로 넘어가도 돼요.
        </span><Button kind="l" small onClick={() => openCamera(firstFlagged.id)}>다시 찍기</Button></div>
      ) : maskingVisited ? (
        <div className="infob"><Icon name="info" size={18} /><span><b>이미 올린 {pages.length}쪽이에요. 여기서 고칠 수 있어요.</b><br />
          다시 찍거나 바꾼 쪽은 새로 가려야 해요. 바꾸지 않은 쪽의 가린 곳은 그대로 남아요.</span></div>
      ) : (
        <div className="row"><b style={{ fontSize: 16 }}>{documentName} {pages.length}쪽</b><span className="mut" style={{ marginLeft: 'auto' }}>길게 눌러 순서 바꾸기</span></div>
      )}
      <div className="pages">
        {pages.map((page, index) => {
          const inspection = inspections[page.id]?.file === page.file ? inspections[page.id] : undefined
          return (
            <div key={page.id} className="pth" data-page-id={page.id} style={{ minWidth: 0, outline: movingId === page.id ? '2px solid var(--primary)' : undefined }}>
              <div tabIndex={0} role="group" aria-label={`${index + 1}쪽, 길게 눌러 이동하거나 방향키로 순서 변경`} onKeyDown={event => moveWithKeyboard(event, page, index)}
                style={{ touchAction: 'none', userSelect: 'none' }} onContextMenu={event => event.preventDefault()}
                onPointerDown={event => {
                  if (event.button !== 0) return
                  clearTimeout(holdTimer.current)
                  pressPoint.current = { x: event.clientX, y: event.clientY }
                  holdTimer.current = setTimeout(() => { draggingId.current = page.id; setMovingId(page.id) }, 400)
                  event.currentTarget.setPointerCapture(event.pointerId)
                }}
                onPointerMove={event => {
                  if (!draggingId.current && Math.hypot(event.clientX - pressPoint.current.x, event.clientY - pressPoint.current.y) > 12) clearTimeout(holdTimer.current)
                }}
                onPointerUp={event => finishMove(event.clientX, event.clientY)}
                onPointerCancel={() => { clearTimeout(holdTimer.current); draggingId.current = null; setMovingId(null) }}>
                <PageImage page={page} example={example} onInspection={reportInspection} />
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}><b>{index + 1}쪽</b>
                {maskingVisited ? <Tag color={page.masks.length ? 'ink' : 'gry'}>가린 곳 {page.masks.length}</Tag> : inspection?.quality && (
                  inspection.quality.brightness !== 'normal' ? <Tag color="amb" icon="warn">{inspection.quality.brightness === 'dark' ? '어두움' : '너무 밝음'}</Tag>
                    : inspection.quality.blurred ? <Tag color="amb" icon="warn">흐림</Tag> : null
                )}
              </div>
              {inspection?.failed && <div className="mut" role="status">이미지를 읽지 못했어요. 다시 찍거나 다른 파일을 골라 주세요.</div>}
              {page.file.type === 'application/pdf' && <div className="mut">PDF 파일 · 쪽 분리와 흐림 검사는 지원하지 않아요.</div>}
              <div className="pa" onKeyDown={activateButton}>
                <a role="button" tabIndex={0} aria-label={`${index + 1}쪽 다시 찍기`} onClick={() => openCamera(page.id)}>다시 찍기</a>
                <a role="button" tabIndex={0} aria-label={`${index + 1}쪽 삭제`} onClick={() => setDeletingId(page.id)}>삭제</a>
              </div>
            </div>
          )
        })}
        <a className="addp" role="button" tabIndex={0} onKeyDown={activateButton} onClick={() => openCamera()}><Icon name="plus" size={22} />쪽 추가</a>
      </div>
      <div className="card"><div className="h2">넘어가기 전에 확인해 주세요</div><div className="mut">· 특약·별지까지 모든 쪽을 올렸나요?<br />· 금액·날짜 글자가 또렷한가요?</div></div>
      {message && <div className="note" role="status">{message}</div>}
    </Screen>
  )

  if (!deletingId) return content
  return <Layered base={<div inert>{content}</div>} layers={[
    <div key="delete-page" ref={deleteDialog} role="dialog" aria-modal="true" aria-label="쪽 삭제 확인" onKeyDown={activateButton}>
      <Dialog title={`${deletingPageNumber}쪽을 삭제할까요?`} text="이 쪽에 가린 곳도 함께 삭제돼요."
        buttons={<><Button kind="l" onClick={() => setDeletingId(null)}>취소</Button><Button onClick={confirmDeletion}>삭제</Button></>} />
    </div>,
  ]} />
}

export function activateButton(event: KeyboardEvent<HTMLElement>) {
  const target = event.target as HTMLElement
  if ((event.key === 'Enter' || event.key === ' ') && target.getAttribute('role') === 'button') {
    event.preventDefault()
    target.click()
  }
}

function PageImage({ page, example, onInspection }: { page: RegisteredPage; example: boolean; onInspection: (id: string, inspection: PageInspection) => void }) {
  const [source, setSource] = useState<{ file: File; url: string } | null>(null)
  useEffect(() => {
    if (example) return
    const url = URL.createObjectURL(page.file)
    setSource({ file: page.file, url })
    return () => URL.revokeObjectURL(url)
  }, [page.file, example])
  const url = source?.file === page.file ? source.url : undefined

  if (example) return <div className="pimg" aria-label="계약서 예시 이미지">
    {Array.from({ length: 10 }, (_, i) => <div key={i} className={`ln${page.masks.length && (i === 3 || i === 8) ? ' mk' : ''}`} style={i === 3 ? { width: '70%' } : i === 8 ? { width: '50%' } : undefined} />)}
  </div>
  if (page.file.type === 'application/pdf') return <div className="pimg" style={{ padding: 0, overflow: 'hidden' }}>
    {url && <object data={url} type="application/pdf" aria-label={page.file.name} style={{ width: '100%', height: '100%' }}><a href={url} target="_blank" rel="noreferrer">PDF 열기</a></object>}
  </div>

  return <div className="pimg" style={{ padding: 0, position: 'relative', overflow: 'hidden' }}>
    {url && <img key={url} src={url} alt={page.file.name} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'fill' }}
      onError={() => onInspection(page.id, { file: page.file, failed: true })}
      onLoad={event => {
        try {
          const image = event.currentTarget
          const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight))
          const canvas = document.createElement('canvas')
          canvas.width = Math.max(3, Math.round(image.naturalWidth * scale))
          canvas.height = Math.max(3, Math.round(image.naturalHeight * scale))
          const context = canvas.getContext('2d', { willReadFrequently: true })
          if (!context) throw new Error('이미지 검사용 캔버스를 열 수 없어요.')
          context.drawImage(image, 0, 0, canvas.width, canvas.height)
          const quality = checkImageQuality(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)
          onInspection(page.id, { file: page.file, quality })
        } catch { onInspection(page.id, { file: page.file, failed: true }) }
      }} />}
    {page.masks.map((mask, index) => <span key={index} style={{ position: 'absolute', left: `${mask.x * 100}%`, top: `${mask.y * 100}%`, width: `${mask.width * 100}%`, height: `${mask.height * 100}%`, background: 'var(--ink)', pointerEvents: 'none' }} />)}
  </div>
}
