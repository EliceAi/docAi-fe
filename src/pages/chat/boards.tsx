import type { Board } from '../../dev/types'

// 이 폴더의 와이어프레임 보드. 화면을 만들면 render에 그 보드 상태를 mock 데이터로 그려 연결한다.
export const chatBoards: Board[] = [
  { id: 'S10_챗봇_처음열기_일반', owner: '구자건', path: '/' },
  { id: 'S10_챗봇_답변_사용법', owner: '구자건', path: '/' },
  { id: 'S10_챗봇_가리기중', owner: '구자건', path: '/' },
  { id: 'S10_챗봇_이동확인', owner: '구자건', path: '/' },
  { id: 'S10_챗봇_분석중', owner: '구자건', path: '/' },
  { id: 'S10_챗봇_분석완료안내', owner: '구자건', path: '/' },
  { id: 'S10_챗봇_내문서답변', owner: '구자건', path: '/' },
  { id: 'S10_챗봇_조항맥락', owner: '구자건', path: '/' },
  { id: 'S10_챗봇_문서바꾸기', owner: '구자건', path: '/' },
  { id: 'S10_챗봇_근거부족', owner: '구자건', path: '/' },
  { id: 'S10_챗봇_비교결과질문', owner: '구자건', path: '/' },
  { id: 'S10_챗봇_범위밖', owner: '구자건', path: '/' },
  { id: 'S10_챗봇_응답실패', owner: '구자건', path: '/' },
]
