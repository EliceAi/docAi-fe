import type { Board } from '../../dev/types'

// 이 폴더의 와이어프레임 보드. 담당자가 둘이라 아래 주석으로 구역을 나눴다(같은 줄을 동시에 고치면 git 충돌).
// 화면을 만들면 render에 그 보드 상태를 mock 데이터로 그려 연결한다.
export const analysisBoards: Board[] = [
  // S07 분석 중 · S08 분석 결과 · #13 #17 김지희
  { id: 'S07_분석중_진행', owner: '김지희', path: '/analyses/1/progress' },
  { id: 'S07_분석실패', owner: '김지희', path: '/analyses/1/progress' },
  { id: 'S08_분석결과_정상', owner: '김지희', path: '/analyses/1' },
  { id: 'S08_분석결과_일부확인필요', owner: '김지희', path: '/analyses/1' },
  { id: 'S08_분석결과_임대차', owner: '김지희', path: '/analyses/1' },
  { id: 'S08_비슷한문서확인', owner: '김지희', path: '/analyses/1' },

  // S09 조항 상세 · #18 구자건
  { id: 'S09_조항상세_기본', owner: '구자건', path: '/analyses/1/clauses/1' },
]
