import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

/** 가림 좌표는 원본 크기에 대한 0~1 비율이다. */
export type MaskRegion = { x: number; y: number; width: number; height: number; /** 가린 곳 목록에 보일 이름(예: 주소). 없으면 번호로 보인다 */ label?: string }
export type RegisteredPage = { id: string; file: File; masks: MaskRegion[] }
/**
 * 한 쪽만 다시 찍는 흐름. comparisonId가 있으면 S12 비교의 그 쪽을 다시 분석하고,
 * contractId가 있으면 분석한 계약서의 그 쪽만 바꿔 다시 분석한다(S07 실패·S08 부분 분석, 명세 "페이지 재업로드").
 */
type PageRecapture = { pageNo: number; comparisonId?: number; contractId?: number; analysisId?: number }
type PageEdit = { type: 'move'; id: string; to: number } | { type: 'replace'; id: string; file: File } | { type: 'remove'; id: string }
  | { type: 'mask-add'; id: string; region: MaskRegion; index?: number } | { type: 'mask-remove'; id: string; index: number }

export function editRegisteredPages(pages: RegisteredPage[], edit: PageEdit): RegisteredPage[] {
  const index = pages.findIndex(page => page.id === edit.id)
  if (index === -1) return pages
  if (edit.type === 'remove') return pages.filter(page => page.id !== edit.id)
  if (edit.type === 'mask-add') return pages.map(page => page.id !== edit.id ? page : { ...page, masks: page.masks.toSpliced(edit.index ?? page.masks.length, 0, edit.region) })
  if (edit.type === 'mask-remove') return pages.map(page => page.id !== edit.id ? page : { ...page, masks: page.masks.filter((_, i) => i !== edit.index) })
  if (edit.type === 'replace') return pages.map(page => page.id === edit.id ? { ...page, file: edit.file, masks: [] } : page)
  if (!Number.isInteger(edit.to) || edit.to < 0 || edit.to >= pages.length || edit.to === index) return pages
  const reordered = [...pages]
  reordered.splice(edit.to, 0, ...reordered.splice(index, 1))
  return reordered
}

type RegisterFlow = {
  /** S02에서 고른 문서 종류. 아직 안 골랐으면 null */
  documentTypeCode: string | null
  chooseDocumentType: (code: string) => void
  pageRecapture: PageRecapture | null
  setPageRecapture: (target: PageRecapture | null) => void
  files: File[]
  addFiles: (files: File[]) => void
  pages: RegisteredPage[]
  editPage: (edit: PageEdit) => void
  maskingVisited: boolean
  visitMasking: () => void
  /** S06 최종 확인에 다녀왔는지. S05가 '확인 단계에서 돌아왔어요'를 보여 줄 때 쓴다 */
  confirmVisited: boolean
  visitConfirm: () => void
  /** 같은 쪽·가림이면 같은 키를 돌려준다. 다시 시도해도 계약서가 두 번 만들어지지 않는다 */
  getIdempotencyKey: (signature: string) => string
}

// 보드 모아 보기처럼 Provider 밖에서 그려도 오류가 나지 않게, 아무 일도 하지 않는 기본값을 둔다
const RegisterFlowContext = createContext<RegisterFlow>({
  documentTypeCode: null, chooseDocumentType: () => {}, files: [], addFiles: () => {},
  pageRecapture: null, setPageRecapture: () => {},
  pages: [], editPage: () => {}, maskingVisited: false, visitMasking: () => {},
  confirmVisited: false, visitConfirm: () => {}, getIdempotencyKey: () => crypto.randomUUID(),
})

// 계약서 등록 S02~S06이 함께 쓰는 값. 화면이 바뀌어도 유지된다. 사진·가린 곳은 해당 화면을 만들 때 더한다.
export function RegisterFlowProvider({ children, initialPages = [], initialMaskingVisited = false, initialConfirmVisited = false, initialDocumentTypeCode = null }: {
  children: ReactNode
  initialPages?: RegisteredPage[]
  initialMaskingVisited?: boolean
  initialConfirmVisited?: boolean
  initialDocumentTypeCode?: string | null
}) {
  const [documentTypeCode, setDocumentTypeCode] = useState<string | null>(initialDocumentTypeCode)
  const [pageRecapture, setPageRecapture] = useState<PageRecapture | null>(null)
  const chooseDocumentType = useCallback((code: string) => {
    setDocumentTypeCode(code)
    // S02에서 문서를 새로 고르면 이전 비교의 재촬영 요청은 이어받지 않는다.
    setPageRecapture(null)
  }, [])
  const [pages, setPages] = useState<RegisteredPage[]>(initialPages)
  const [maskingVisited, setMaskingVisited] = useState(initialMaskingVisited)
  const [confirmVisited, setConfirmVisited] = useState(initialConfirmVisited)
  const idempotencyKey = useRef<{ signature: string; key: string } | null>(null)
  return (
    <RegisterFlowContext.Provider value={{ documentTypeCode, chooseDocumentType, pageRecapture, setPageRecapture,
      files: pages.map(page => page.file),
      addFiles: selected => setPages(previous => [...previous, ...selected.map(file => ({ id: crypto.randomUUID(), file, masks: [] }))]),
      pages, editPage: edit => setPages(previous => editRegisteredPages(previous, edit)),
      maskingVisited, visitMasking: () => setMaskingVisited(true),
      confirmVisited, visitConfirm: () => setConfirmVisited(true),
      getIdempotencyKey: signature => {
        if (idempotencyKey.current?.signature !== signature) idempotencyKey.current = { signature, key: crypto.randomUUID() }
        return idempotencyKey.current.key
      },
    }}>
      {children}
    </RegisterFlowContext.Provider>
  )
}

export function useRegisterFlow() {
  return useContext(RegisterFlowContext)
}
