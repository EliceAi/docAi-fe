import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getDocumentTypes, type DocumentType } from '../../api/documentTypes'
import { useApiData } from '../../api/useApiData'
import { Button, Dialog, Header, Icon, Layered, Screen, StepBar, StepFooter } from '../../common/components'
import { CameraCapture } from './CameraCapture'
import { validateCaptureFiles } from './captureFiles'
import { useRegisterFlow } from './RegisterFlowContext'

export function CapturePage() {
  const [retry, setRetry] = useState(0)
  const { data, error } = useApiData(getDocumentTypes, [retry])
  if (!data) {
    return (
      <Screen header={<Header title="계약서 올리기" back="/contracts/new" chatFrom="S03" />}>
        <div className="note" role="status">{error ? '문서 목록을 불러오지 못했어요.' : '문서 목록을 불러오는 중이에요.'}</div>
        {error && <Button onClick={() => setRetry(value => value + 1)}>다시 시도</Button>}
      </Screen>
    )
  }
  return <CaptureScreen documentTypes={data} />
}

type CaptureMode = 'select' | 'camera' | 'permission'

export function CaptureScreen({ documentTypes, initialMode = 'select', cameraPreviewPhotos }: {
  documentTypes: DocumentType[]
  initialMode?: CaptureMode
  cameraPreviewPhotos?: File[]
}) {
  const location = useLocation()
  const captureRequest = location.state as { captureMode?: CaptureMode; replacePageId?: string; documentTypeCode?: string; comparisonId?: number; pageNo?: number; analysisId?: number } | null
  const [mode, setMode] = useState<CaptureMode>(captureRequest?.captureMode ?? initialMode)
  const [message, setMessage] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const { documentTypeCode, chooseDocumentType, addFiles, pages, editPage, comparisonRecapture, setComparisonRecapture } = useRegisterFlow()
  const navigate = useNavigate()
  const requestedDocumentTypeCode = documentTypes.find(document => document.code === captureRequest?.documentTypeCode)?.code
  const requestedComparisonId = captureRequest?.comparisonId
  const requestedPageNo = captureRequest?.pageNo
  const requestedAnalysisId = typeof captureRequest?.analysisId === 'number' && Number.isSafeInteger(captureRequest.analysisId) && captureRequest.analysisId > 0
    ? captureRequest.analysisId : undefined
  const selectedDocument = documentTypes.find(document => document.code === (requestedDocumentTypeCode ?? documentTypeCode ?? 'EMPLOYMENT'))
  const showCameraUnavailable = useCallback(() => setMode('permission'), [])

  // S11에서 다시 올릴 때 받은 종류를 S03 표시와 이후 등록 단계에 함께 유지한다.
  useEffect(() => {
    const typeChanged = !!requestedDocumentTypeCode && requestedDocumentTypeCode !== documentTypeCode
    if (typeChanged) chooseDocumentType(requestedDocumentTypeCode)
    if (typeof requestedComparisonId === 'number' && Number.isSafeInteger(requestedComparisonId) && requestedComparisonId > 0
        && typeof requestedPageNo === 'number' && Number.isSafeInteger(requestedPageNo) && requestedPageNo > 0
        && (typeChanged || requestedComparisonId !== comparisonRecapture?.comparisonId || requestedPageNo !== comparisonRecapture?.pageNo
          || requestedAnalysisId !== comparisonRecapture?.analysisId)) {
      setComparisonRecapture({ comparisonId: requestedComparisonId, pageNo: requestedPageNo, analysisId: requestedAnalysisId })
    }
  }, [requestedDocumentTypeCode, documentTypeCode, chooseDocumentType, requestedComparisonId, requestedPageNo,
    requestedAnalysisId, comparisonRecapture?.comparisonId, comparisonRecapture?.pageNo, comparisonRecapture?.analysisId, setComparisonRecapture])

  function finishCapture(files: File[]) {
    const error = validateCaptureFiles(files)
    if (error) {
      setMode('select')
      setMessage(error)
      return
    }
    if (comparisonRecapture && files.length !== 1) {
      setMode('select')
      setMessage('다시 찍을 쪽은 한 장만 골라 주세요.')
      return
    }
    if (captureRequest?.replacePageId) {
      if (!pages.some(page => page.id === captureRequest.replacePageId)) {
        setMode('select')
        setMessage('다시 찍을 쪽을 찾을 수 없어요. 미리보기에서 다시 골라 주세요.')
        return
      }
      if (files.length !== 1) {
        setMode('select')
        setMessage('다시 찍을 쪽은 한 장만 골라 주세요.')
        return
      }
      editPage({ type: 'replace', id: captureRequest.replacePageId, file: files[0] })
    } else if (comparisonRecapture && pages.length > 0) editPage({ type: 'replace', id: pages[0].id, file: files[0] })
    else addFiles(files)
    navigate('/contracts/new/preview', { replace: !!captureRequest })
  }

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? [])
    event.currentTarget.value = ''
    if (files.length === 0) return
    finishCapture(files)
  }

  const selection = (
    <Screen
      header={<Header title="계약서 올리기" back="/contracts/new" chatFrom="S03" sub={<StepBar current={2} />} />}
      footer={<StepFooter current={2} nextLabel="다음: 가리기" ready={false}
        onNotReady={() => setMessage('사진이나 파일을 올리면 눌러져요.')} />}
    >
      <div className="card row" style={{ padding: '12px 14px' }}>
        <Icon name="doc" size={20} /><b style={{ flex: 1 }}>{selectedDocument?.name ?? '문서 종류를 골라 주세요'}</b>
        <Link className="mut" to="/contracts/new">바꾸기</Link>
      </div>
      <a className="opt" role="button" tabIndex={0} onClick={() => { setMessage(''); setMode('camera') }}
        onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setMessage(''); setMode('camera') } }}>
        <span className="oi"><Icon name="camera" size={26} /></span>
        <span style={{ flex: 1 }}><b style={{ fontSize: 16 }}>카메라로 찍기</b><br /><span className="mut">여러 장을 이어서 찍을 수 있어요</span></span>
        <Icon name="chev" size={18} />
      </a>
      <label className="opt" tabIndex={0} role="button"
        onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileInput.current?.click() } }}>
        <span className="oi"><Icon name="image" size={26} /></span>
        <span style={{ flex: 1 }}><b style={{ fontSize: 16 }}>앨범·파일에서 고르기</b><br /><span className="mut">사진 여러 장, PDF</span></span>
        <Icon name="chev" size={18} />
        <input ref={fileInput} type="file" accept="image/*,application/pdf" multiple hidden onChange={selectFiles} />
      </label>
      <div className="card">
        <div className="h2">잘 읽히게 찍는 법</div>
        <div className="mut">· 네 모서리가 모두 보이게<br />· 그림자 없이 밝은 곳에서<br />· 특약·별지 페이지까지 빠짐없이</div>
      </div>
      <div className="note"><Icon name="lock" size={14} /> 찍은 사진은 다음 단계에서 직접 가린 뒤에만 AI에 보내요</div>
      {message && <div className="note" role="status">{message}</div>}
    </Screen>
  )

  if (mode === 'camera') {
    return <CameraCapture onCancel={() => comparisonRecapture ? navigate(`/comparisons/${comparisonRecapture.comparisonId}`, { replace: true })
      : captureRequest ? navigate('/contracts/new/preview', { replace: true }) : setMode('select')} onFinish={finishCapture} onUnavailable={showCameraUnavailable}
      previewPhotos={cameraPreviewPhotos} />
  }
  if (mode === 'permission') {
    return <Layered base={selection} layers={[
      <Dialog key="camera-permission" face={9} title="카메라를 쓸 수 없어요" text="설정에서 카메라 권한을 켜거나, 앨범·파일에서 골라 주세요."
        buttons={<>
          <Button kind="l" onClick={() => { setMode('select'); setMessage('브라우저의 사이트 설정에서 카메라 권한을 허용한 뒤 다시 눌러 주세요.') }}>설정 열기</Button>
          <Button onClick={() => fileInput.current?.click()}>앨범·파일에서</Button>
        </>} />,
    ]} />
  }
  return selection
}
