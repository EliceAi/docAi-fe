import { mockDocumentTypes } from '../../api/mocks/documentTypes'
import type { Board } from '../../dev/types'
import { DocumentPicker } from './DocumentTypePage'

// 이 폴더의 와이어프레임 보드. 화면을 만들면 render에 그 보드 상태를 mock 데이터로 그려 연결한다.
export const contractRegisterBoards: Board[] = [
  { id: 'S02_문서선택_기본', owner: '김지희', path: '/contracts/new', render: () => <DocumentPicker documentTypes={mockDocumentTypes} /> },
  { id: 'S02_문서선택_근로급여', owner: '김지희', path: '/contracts/new', render: () => <DocumentPicker documentTypes={mockDocumentTypes} initialLane="일" /> },
  { id: 'S02_문서선택_검색결과', owner: '김지희', path: '/contracts/new', render: () => <DocumentPicker documentTypes={mockDocumentTypes} initialQuery="보증금" /> },
  { id: 'S03_입력방식_선택', owner: '김지희', path: '/contracts/new/capture' },
  { id: 'S03_권한없음', owner: '김지희', path: '/contracts/new/capture' },
  { id: 'S03_촬영_카메라', owner: '김지희', path: '/contracts/new/capture' },
  { id: 'S04_미리보기_정상', owner: '김지희', path: '/contracts/new/preview' },
  { id: 'S04_미리보기_흐림누락', owner: '김지희', path: '/contracts/new/preview' },
  { id: 'S04_미리보기_가리기후수정', owner: '김지희', path: '/contracts/new/preview' },
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
