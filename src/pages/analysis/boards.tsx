import type { Board } from '../../dev/types'
import { mockClauseDetail, mockLeaseAnalysis, mockNormalAnalysis, mockPartialAnalysis, mockSimilarAnalysis } from '../../api/mocks/analyses'
import { AnalysisResultView } from './AnalysisResultPage'
import { ClauseDetailView } from './ClauseDetailPage'

// 이 폴더의 와이어프레임 보드. 담당자가 둘이라 아래 주석으로 구역을 나눴다(같은 줄을 동시에 고치면 git 충돌).
// 화면을 만들면 render에 그 보드 상태를 mock 데이터로 그려 연결한다.
export const analysisBoards: Board[] = [
  // S07 분석 중 · #13 김지희
  { id: 'S07_분석중_진행', owner: '김지희', path: '/analyses/1/progress' },
  { id: 'S07_분석실패', owner: '김지희', path: '/analyses/1/progress' },
  // S08 분석 결과 · #17 구자건 (2026-11-17 재배정)
  { id: 'S08_분석결과_정상', owner: '구자건', path: '/analyses/1', render: () => <AnalysisResultView analysis={mockNormalAnalysis} /> },
  { id: 'S08_분석결과_일부확인필요', owner: '구자건', path: '/analyses/5', render: () => <AnalysisResultView analysis={mockPartialAnalysis} /> },
  { id: 'S08_분석결과_임대차', owner: '구자건', path: '/analyses/2', render: () => <AnalysisResultView analysis={mockLeaseAnalysis} /> },
  { id: 'S08_비슷한문서확인', owner: '구자건', path: '/analyses/6', render: () => <AnalysisResultView analysis={mockSimilarAnalysis} forceSimilarPrompt /> },

  // S09 조항 상세 · #18 구자건
  { id: 'S09_조항상세_기본', owner: '구자건', path: '/analyses/1/clauses/1', render: () => <ClauseDetailView clause={mockClauseDetail} fromChat /> },
]
