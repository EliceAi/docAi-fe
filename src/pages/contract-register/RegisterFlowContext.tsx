import { createContext, useContext, useState, type ReactNode } from 'react'

/** 가림 좌표는 원본 크기에 대한 0~1 비율이다. */
export type MaskRegion = { x: number; y: number; width: number; height: number }
export type RegisteredPage = { id: string; file: File; masks: MaskRegion[] }
type PageEdit = { type: 'move'; id: string; to: number } | { type: 'replace'; id: string; file: File } | { type: 'remove'; id: string }

export function editRegisteredPages(pages: RegisteredPage[], edit: PageEdit): RegisteredPage[] {
  const index = pages.findIndex(page => page.id === edit.id)
  if (index === -1) return pages
  if (edit.type === 'remove') return pages.filter(page => page.id !== edit.id)
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
  files: File[]
  addFiles: (files: File[]) => void
  pages: RegisteredPage[]
  editPage: (edit: PageEdit) => void
  maskingVisited: boolean
  visitMasking: () => void
}

// 보드 모아 보기처럼 Provider 밖에서 그려도 오류가 나지 않게, 아무 일도 하지 않는 기본값을 둔다
const RegisterFlowContext = createContext<RegisterFlow>({
  documentTypeCode: null, chooseDocumentType: () => {}, files: [], addFiles: () => {},
  pages: [], editPage: () => {}, maskingVisited: false, visitMasking: () => {},
})

// 계약서 등록 S02~S06이 함께 쓰는 값. 화면이 바뀌어도 유지된다. 사진·가린 곳은 해당 화면을 만들 때 더한다.
export function RegisterFlowProvider({ children, initialPages = [], initialMaskingVisited = false, initialDocumentTypeCode = null }: {
  children: ReactNode
  initialPages?: RegisteredPage[]
  initialMaskingVisited?: boolean
  initialDocumentTypeCode?: string | null
}) {
  const [documentTypeCode, setDocumentTypeCode] = useState<string | null>(initialDocumentTypeCode)
  const [pages, setPages] = useState<RegisteredPage[]>(initialPages)
  const [maskingVisited, setMaskingVisited] = useState(initialMaskingVisited)
  return (
    <RegisterFlowContext.Provider value={{ documentTypeCode, chooseDocumentType: setDocumentTypeCode,
      files: pages.map(page => page.file),
      addFiles: selected => setPages(previous => [...previous, ...selected.map(file => ({ id: crypto.randomUUID(), file, masks: [] }))]),
      pages, editPage: edit => setPages(previous => editRegisteredPages(previous, edit)),
      maskingVisited, visitMasking: () => setMaskingVisited(true),
    }}>
      {children}
    </RegisterFlowContext.Provider>
  )
}

export function useRegisterFlow() {
  return useContext(RegisterFlowContext)
}
