import { mockDocumentTypes } from '../../api/mocks/documentTypes'
import type { Board } from '../../dev/types'
import { DocumentPicker } from './DocumentTypePage'
import { CaptureScreen } from './CapturePage'
import { PreviewScreen } from './PreviewPage'
import { RegisterFlowProvider } from './RegisterFlowContext'

// 실제 카메라를 켜지 않고 와이어프레임의 촬영 2장 상태를 보여 준다.
const mockCameraPhotos = [1, 2].map(page => new File([
  `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#ddd"/><g fill="#555" font-size="24"><text x="40" y="80">계약서 예시 ${page}쪽</text>${Array.from({ length: 14 }, (_, line) => `<text x="40" y="${150 + line * 42}">계약 조건 예시 ${line + 1}</text>`).join('')}</g></svg>`,
], `example-${page}.svg`, { type: 'image/svg+xml' }))

const mockBlurredPhoto = new File([
  '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><defs><filter id="blur"><feGaussianBlur stdDeviation="12"/></filter></defs><rect width="600" height="800" fill="#aaa"/><g filter="url(#blur)" fill="#333" font-size="48"><text x="40" y="180">계약서 예시 2쪽</text><text x="40" y="280">흐린 글자 예시</text></g></svg>',
], 'example-blurred-2.svg', { type: 'image/svg+xml' })

// 이 폴더의 와이어프레임 보드. 화면을 만들면 render에 그 보드 상태를 mock 데이터로 그려 연결한다.
export const contractRegisterBoards: Board[] = [
  { id: 'S02_문서선택_기본', owner: '김지희', path: '/contracts/new', render: () => <DocumentPicker documentTypes={mockDocumentTypes} /> },
  { id: 'S02_문서선택_근로급여', owner: '김지희', path: '/contracts/new', render: () => <DocumentPicker documentTypes={mockDocumentTypes} initialLane="일" /> },
  { id: 'S02_문서선택_검색결과', owner: '김지희', path: '/contracts/new', render: () => <DocumentPicker documentTypes={mockDocumentTypes} initialQuery="보증금" /> },
  { id: 'S03_입력방식_선택', owner: '김지희', path: '/contracts/new/capture', render: () => <CaptureScreen key="capture-select" documentTypes={mockDocumentTypes} /> },
  { id: 'S03_권한없음', owner: '김지희', path: '/contracts/new/capture', render: () => <CaptureScreen key="capture-permission" documentTypes={mockDocumentTypes} initialMode="permission" /> },
  { id: 'S03_촬영_카메라', owner: '김지희', path: '/contracts/new/capture', render: () => <CaptureScreen key="capture-camera" documentTypes={mockDocumentTypes} initialMode="camera" cameraPreviewPhotos={mockCameraPhotos} /> },
  { id: 'S04_미리보기_정상', owner: '김지희', path: '/contracts/new/preview', render: () => <RegisterFlowProvider key="preview-normal" initialPages={mockCameraPhotos.map((file, index) => ({ id: `preview-${index}`, file, masks: [] }))}><PreviewScreen /></RegisterFlowProvider> },
  { id: 'S04_미리보기_흐림누락', owner: '김지희', path: '/contracts/new/preview', render: () => <RegisterFlowProvider key="preview-blurred" initialPages={mockCameraPhotos.map((file, index) => ({ id: `preview-blur-${index}`, file: index === 1 ? mockBlurredPhoto : file, masks: [] }))}><PreviewScreen /></RegisterFlowProvider> },
  { id: 'S04_미리보기_가리기후수정', owner: '김지희', path: '/contracts/new/preview', render: () => <RegisterFlowProvider key="preview-after-mask" initialMaskingVisited initialPages={mockCameraPhotos.map((file, index) => ({ id: `preview-masked-${index}`, file, masks: index === 0 ? [{ x: 0.2, y: 0.25, width: 0.45, height: 0.04 }, { x: 0.2, y: 0.4, width: 0.4, height: 0.04 }, { x: 0.2, y: 0.55, width: 0.5, height: 0.04 }, { x: 0.2, y: 0.7, width: 0.35, height: 0.04 }, { x: 0.2, y: 0.82, width: 0.4, height: 0.04 }] : [] }))}><PreviewScreen /></RegisterFlowProvider> },
  { id: 'S05_가리기_직접가리기', owner: '김지희', path: '/contracts/new/mask' },
  { id: 'S05_가리기_확대', owner: '김지희', path: '/contracts/new/mask' },
  { id: 'S05_가리기_가린곳목록', owner: '김지희', path: '/contracts/new/mask' },
  { id: 'S05_가리기_가린곳지움', owner: '김지희', path: '/contracts/new/mask' },
  { id: 'S05_가리기_가릴것없음', owner: '김지희', path: '/contracts/new/mask' },
  { id: 'S05_가리기_가림추가', owner: '김지희', path: '/contracts/new/mask' },
  { id: 'S05_가리기_되돌림', owner: '김지희', path: '/contracts/new/mask' },
  { id: 'S05_가리기_확인후수정', owner: '김지희', path: '/contracts/new/mask' },
  { id: 'S06_최종확인_정상', owner: '김지희', path: '/contracts/new/confirm' },
  { id: 'S06_최종확인_생성실패', owner: '김지희', path: '/contracts/new/confirm' },
]
