import { mockDocumentTypes } from '../../api/mocks/documentTypes'
import type { Board } from '../../dev/types'
import { DocumentPicker } from './DocumentTypePage'
import { CaptureScreen } from './CapturePage'
import { ConfirmScreen } from './ConfirmPage'
import { MaskScreen } from './MaskPage'
import { PreviewScreen } from './PreviewPage'
import { RegisterFlowProvider, type MaskRegion } from './RegisterFlowContext'

// 실제 카메라를 켜지 않고 와이어프레임의 촬영 2장 상태를 보여 준다.
const mockCameraPhotos = [1, 2].map(page => new File([
  `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#ddd"/><g fill="#555" font-size="24"><text x="40" y="80">계약서 예시 ${page}쪽</text>${Array.from({ length: 14 }, (_, line) => `<text x="40" y="${150 + line * 42}">계약 조건 예시 ${line + 1}</text>`).join('')}</g></svg>`,
], `example-${page}.svg`, { type: 'image/svg+xml' }))

const mockBlurredPhoto = new File([
  '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><defs><filter id="blur"><feGaussianBlur stdDeviation="12"/></filter></defs><rect width="600" height="800" fill="#aaa"/><g filter="url(#blur)" fill="#333" font-size="48"><text x="40" y="180">계약서 예시 2쪽</text><text x="40" y="280">흐린 글자 예시</text></g></svg>',
], 'example-blurred-2.svg', { type: 'image/svg+xml' })

// S05 보드용 예시 계약서 2쪽. 1쪽은 글자 줄 위치(y)와 가림 칸 위치가 서로 맞는다.
const contractRows: [label: string, value: string][] = [
  ['사업주', '김사장'], ['근로자', '이알바'], ['주민등록번호', '000000-0000000'], ['주소', '서울시 예시구 1번지'],
  ['시급', '10,000원'], ['근로시간', '주 20시간'], ['연락처', '010-0000-0000'], ['계약기간', '2026.12.01 ~ 2027.02.28'],
]
const maskMockPages = [
  new File([`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#fff"/><g font-size="24" fill="#333"><text x="150" y="70" font-weight="700">단시간근로자 표준근로계약서</text>${contractRows.map(([label, value], row) => `<text x="40" y="${150 + row * 60}" fill="#777">${label}</text><text x="220" y="${150 + row * 60}">${value}</text>`).join('')}</g></svg>`], 'example-mask-1.svg', { type: 'image/svg+xml' }),
  new File(['<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#fff"/><g font-size="22" fill="#333"><text x="230" y="70" font-weight="700">특약 사항</text><text x="40" y="150">제7조 1년 이내 퇴사 시 교육비 30만 원을 반환한다.</text><text x="40" y="210">제8조 근무 시간 변경은 1주 전에 알린다.</text><text x="40" y="270">작성일 2026.11.10</text></g></svg>'], 'example-mask-2.svg', { type: 'image/svg+xml' }),
]
const maskOnRow = (row: number, width: number, label: string): MaskRegion => ({ x: 0.35, y: (150 + row * 60 - 26) / 800, width, height: 0.045, label })
const employerMask = maskOnRow(0, 0.15, '사업주 이름')
const workerMask = maskOnRow(1, 0.15, '근로자 이름')
const residentMask = maskOnRow(2, 0.36, '주민등록번호')
const addressMask = maskOnRow(3, 0.32, '주소')
const contactMask = maskOnRow(6, 0.3, '연락처')
const fourMasks = [employerMask, workerMask, residentMask, addressMask]

// 보드마다 새로 그려지도록 key를 다르게 준다
const maskMockPagesWith = (key: string, masks: MaskRegion[]) => maskMockPages.map((file, index) => ({ id: `${key}-${index}`, file, masks: index === 0 ? masks : [] }))
const maskBoard = (key: string, masks: MaskRegion[], screen: Parameters<typeof MaskScreen>[0] = {}) => (
  <RegisterFlowProvider key={key} initialPages={maskMockPagesWith(key, masks)}>
    <MaskScreen {...screen} />
  </RegisterFlowProvider>
)
// S06은 S05에서 가린 뒤의 2쪽(가린 곳 5 / 0)을 보여 준다
const confirmBoard = (key: string, initialFailed = false) => (
  <RegisterFlowProvider key={key} initialDocumentTypeCode="EMPLOYMENT" initialPages={maskMockPagesWith(key, [...fourMasks, contactMask])}>
    <ConfirmScreen initialFailed={initialFailed} />
  </RegisterFlowProvider>
)

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
  { id: 'S05_가리기_직접가리기', owner: '김지희', path: '/contracts/new/mask', render: () => maskBoard('mask-select', fourMasks, { initialDraft: { ...contactMask, label: undefined } }) },
  { id: 'S05_가리기_확대', owner: '김지희', path: '/contracts/new/mask', render: () => maskBoard('mask-zoom', fourMasks, { initialZoomTo: addressMask }) },
  { id: 'S05_가리기_가린곳목록', owner: '김지희', path: '/contracts/new/mask', render: () => maskBoard('mask-list', fourMasks, { initialSheetOpen: true }) },
  { id: 'S05_가리기_가린곳지움', owner: '김지희', path: '/contracts/new/mask', render: () => maskBoard('mask-removed', [employerMask, workerMask, residentMask], { initialSheetOpen: true, initialRemoved: [{ pageId: 'mask-removed-0', index: 3, region: addressMask }] }) },
  { id: 'S05_가리기_가릴것없음', owner: '김지희', path: '/contracts/new/mask', render: () => maskBoard('mask-empty', fourMasks, { initialPageIndex: 1 }) },
  { id: 'S05_가리기_가림추가', owner: '김지희', path: '/contracts/new/mask', render: () => maskBoard('mask-added', [...fourMasks, contactMask], { initialNotice: { kind: 'added', label: '연락처' } }) },
  { id: 'S05_가리기_되돌림', owner: '김지희', path: '/contracts/new/mask', render: () => maskBoard('mask-undone', fourMasks, { initialNotice: { kind: 'undone', label: '연락처' } }) },
  { id: 'S05_가리기_확인후수정', owner: '김지희', path: '/contracts/new/mask', render: () => maskBoard('mask-returned', [...fourMasks, contactMask], { returned: true }) },
  { id: 'S06_최종확인_정상', owner: '김지희', path: '/contracts/new/confirm', render: () => confirmBoard('confirm-normal') },
  { id: 'S06_최종확인_생성실패', owner: '김지희', path: '/contracts/new/confirm', render: () => confirmBoard('confirm-failed', true) },
]
