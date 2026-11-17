import { useEffect, useRef, useState } from 'react'

type CameraCaptureProps = {
  onCancel: () => void
  onFinish: (files: File[]) => void
  onUnavailable: () => void
  previewPhotos?: File[]
}

export function CameraCapture({ onCancel, onFinish, onUnavailable, previewPhotos }: CameraCaptureProps) {
  const video = useRef<HTMLVideoElement>(null)
  const active = useRef(false)
  const takingPhoto = useRef(false)
  const [photos, setPhotos] = useState<File[]>(previewPhotos ?? [])
  const [ready, setReady] = useState(previewPhotos !== undefined)
  const [capturing, setCapturing] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (previewPhotos) return
    let cancelled = false
    let stream: MediaStream | undefined
    active.current = true
    async function startCamera() {
      try {
        const camera = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' } } })
        // 권한 창을 띄운 채 취소했더라도 늦게 열린 카메라를 바로 끈다.
        if (cancelled) { camera.getTracks().forEach(track => track.stop()); return }
        stream = camera
        if (video.current) video.current.srcObject = camera
      } catch {
        if (!cancelled) onUnavailable()
      }
    }
    void startCamera()
    return () => {
      cancelled = true
      active.current = false
      stream?.getTracks().forEach(track => track.stop())
    }
  }, [onUnavailable, previewPhotos])

  function capturePhoto() {
    if (previewPhotos?.length) {
      setPhotos(previous => [...previous, new File([previewPhotos[0]], `example-${crypto.randomUUID()}.svg`, { type: 'image/svg+xml' })])
      return
    }
    const source = video.current
    if (!source || source.videoWidth === 0 || !ready || takingPhoto.current) return
    takingPhoto.current = true
    setCapturing(true)
    setMessage('')
    try {
      const canvas = document.createElement('canvas')
      canvas.width = source.videoWidth
      canvas.height = source.videoHeight
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Camera canvas unavailable')
      context.drawImage(source, 0, 0)
      canvas.toBlob(blob => {
        takingPhoto.current = false
        if (!active.current) return
        setCapturing(false)
        if (!blob) { setMessage('사진을 저장하지 못했어요. 다시 찍어 주세요.'); return }
        setPhotos(previous => [...previous, new File([blob], `capture-${crypto.randomUUID()}.jpg`, { type: 'image/jpeg' })])
      }, 'image/jpeg', 0.92)
    } catch {
      takingPhoto.current = false
      setCapturing(false)
      setMessage('사진을 저장하지 못했어요. 다시 찍어 주세요.')
    }
  }

  return (
    <div className="cam" style={{ width: '100%', height: 'min(844px, 100dvh)' }}>
      <div className="sb"><span>9:41</span><span>●●● ▮</span></div>
      <div className="row" style={{ justifyContent: 'space-between', padding: '8px 18px' }}>
        <a role="button" tabIndex={0} onClick={onCancel}
          onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onCancel() } }}>취소</a>
        <span className="mut" style={{ color: '#bbb' }}>휴대폰 기본 카메라</span><span style={{ width: 30 }} />
      </div>
      <div className="frame" style={{ overflow: 'hidden' }}>
        {!previewPhotos && <video ref={video} autoPlay playsInline muted onCanPlay={() => setReady(true)}
          onError={onUnavailable} aria-label="문서 촬영 미리보기"
          style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'contain' }} />}
        <span style={{ position: 'relative', pointerEvents: 'none' }}>문서 네 모서리를<br />틀에 맞춰 주세요</span>
      </div>
      {message && <div role="status" style={{ textAlign: 'center' }}>{message}</div>}
      <div className="row" style={{ justifyContent: 'space-between', padding: '10px 24px 34px' }}>
        <span className="row" aria-live="polite" style={{ gap: 6 }}>
          {photos.slice(-2).map((photo, index) => <span key={photo.name} style={{ width: 40, height: 52, borderRadius: 6, background: '#eee', color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{photos.length - Math.min(photos.length, 2) + index + 1}</span>)}
        </span>
        <button type="button" className="shutter" aria-label="사진 찍기" disabled={!ready || capturing} onClick={capturePhoto} />
        <button type="button" className={`btn ${photos.length ? 'p' : 'off'} s`} disabled={photos.length === 0 || capturing}
          onClick={() => onFinish(photos)}>완료 {photos.length}</button>
      </div>
    </div>
  )
}
