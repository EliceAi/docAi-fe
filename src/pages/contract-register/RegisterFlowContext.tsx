import { createContext, useContext, useState, type ReactNode } from 'react'

type RegisterFlow = {
  /** S02에서 고른 문서 종류. 아직 안 골랐으면 null */
  documentTypeCode: string | null
  chooseDocumentType: (code: string) => void
  files: File[]
  addFiles: (files: File[]) => void
}

// 보드 모아 보기처럼 Provider 밖에서 그려도 오류가 나지 않게, 아무 일도 하지 않는 기본값을 둔다
const RegisterFlowContext = createContext<RegisterFlow>({
  documentTypeCode: null, chooseDocumentType: () => {}, files: [], addFiles: () => {},
})

// 계약서 등록 S02~S06이 함께 쓰는 값. 화면이 바뀌어도 유지된다. 사진·가린 곳은 해당 화면을 만들 때 더한다.
export function RegisterFlowProvider({ children }: { children: ReactNode }) {
  const [documentTypeCode, setDocumentTypeCode] = useState<string | null>(null)
  const [files, setFiles] = useState<File[]>([])
  return (
    <RegisterFlowContext.Provider value={{ documentTypeCode, chooseDocumentType: setDocumentTypeCode,
      files, addFiles: selected => setFiles(previous => [...previous, ...selected]) }}>
      {children}
    </RegisterFlowContext.Provider>
  )
}

export function useRegisterFlow() {
  return useContext(RegisterFlowContext)
}
