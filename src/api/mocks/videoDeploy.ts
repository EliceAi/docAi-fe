import type { ContractDetail, ContractSummary } from '../contracts'
import type { AnalysisResult } from '../analyses'
import type { Schedule, ScheduleCandidateSet } from '../schedules'
import { toScheduleCandidateSet, type BackendCandidateSet } from '../backendResponses'
import { mockVideoEmploymentAnalysis, mockVideoLeaseAnalysis, VIDEO_ANALYSIS_ID, VIDEO_CONTRACT_ID, VIDEO_LEASE_ANALYSIS_ID, VIDEO_LEASE_CONTRACT_ID } from './analyses'
import { mockContractDetails, mockMyContracts } from './contracts'
import { videoScheduleCandidatesResponse } from './real/videoEmployment'
import { videoLeaseCandidatesResponse } from './real/videoLease'
import { mockAdditionalSchedules, mockScheduleToday, mockStoredSchedules } from './schedules'

// 보드의 와이어프레임 데이터는 유지하고 API가 읽는 목록에만 두 영상의 계약서를 연결한다.

const daysFromToday = (date: string) => Math.round((Date.parse(date.replaceAll('.', '-') + 'T00:00:00Z') - Date.parse(mockScheduleToday + 'T00:00:00Z')) / 86400000)

/** S13 일정 후보: 영상 계약서의 입사일·연봉계약 종료일 */
export const mockVideoCandidateSet: ScheduleCandidateSet = {
  ...toScheduleCandidateSet(VIDEO_ANALYSIS_ID, videoScheduleCandidatesResponse as BackendCandidateSet),
  contractId: VIDEO_CONTRACT_ID,
}
const leaseCandidates = toScheduleCandidateSet(VIDEO_LEASE_ANALYSIS_ID, videoLeaseCandidatesResponse as BackendCandidateSet)
export const mockVideoLeaseCandidateSet: ScheduleCandidateSet = {
  ...leaseCandidates,
  contractId: VIDEO_LEASE_CONTRACT_ID,
  // 제공 데이터의 MOVE_IN은 기간의 양 끝이다. 같은 날짜의 대안으로 취급하지 않는다.
  candidates: leaseCandidates.candidates
    .map(candidate => ({ ...candidate, conflictGroup: candidate.conflictGroup === 'MOVE_IN' ? null : candidate.conflictGroup })),
}

// 보관된 상태의 일정. 번호는 와이어프레임 예시(1~10)와 겹치지 않게 11부터 쓴다
function buildVideoContract(analysis: AnalysisResult, candidates: ScheduleCandidateSet, pageCount: number, firstScheduleId: number): ContractDetail {
  const videoSchedules = candidates.candidates.map((candidate, index) => ({
    scheduleId: firstScheduleId + index,
    title: candidate.title,
    date: candidate.date ?? '',
    daysLeft: daysFromToday(candidate.date ?? ''),
    source: candidate.source,
  }))

  return {
    contractId: analysis.contractId,
    title: analysis.documentTitle,
    documentTypeCode: analysis.documentTypeCode,
    lane: analysis.documentTypeCode === 'LEASE' ? '집' : '일',
    version: 1,
    savedAt: analysis.analyzedAt.replaceAll('.', '-'),
    needsCheckCount: analysis.checkCount,
    analysisId: analysis.analysisId,
    missingItemCount: analysis.missingItems.length,
    scheduleCount: videoSchedules.length,
    pageCount,
    scheduleIds: videoSchedules.map(schedule => schedule.scheduleId),
    reviewLabel: analysis.reviewLabel,
    keyTerms: analysis.keyTerms.map(term => ({ label: term.label, value: term.value ?? '확인 필요', ...(term.state === 'warn' || term.state === 'miss' || term.state === 'unk' ? { state: term.state } : {}) })),
    schedules: videoSchedules,
  }
}

export const mockVideoContract = buildVideoContract(mockVideoEmploymentAnalysis, mockVideoCandidateSet, 4, 11)
export const mockVideoLeaseContract = buildVideoContract(mockVideoLeaseAnalysis, mockVideoLeaseCandidateSet, 6, 13)
const videoContracts = [mockVideoContract, mockVideoLeaseContract]
const videoIds = new Set(videoContracts.map(contract => contract.contractId))
const videoSummaries = videoContracts.map(({ pageCount: _pageCount, scheduleIds: _scheduleIds, reviewLabel: _reviewLabel, keyTerms: _keyTerms, schedules: _schedules, ...summary }) => summary)

export const mockDeployMyContracts: ContractSummary[] = [...videoSummaries, ...mockMyContracts.filter(contract => !videoIds.has(contract.contractId))]
export const mockDeployContractDetails: ContractDetail[] = [...videoContracts, ...mockContractDetails.filter(contract => !videoIds.has(contract.contractId))]

export const mockDeployStoredSchedules: Schedule[] = [
  ...mockStoredSchedules.filter(schedule => !videoIds.has(schedule.contractId)),
  ...videoContracts.flatMap(contract => contract.schedules.map(schedule => ({
    ...schedule,
    contractId: contract.contractId,
    contractTitle: contract.title,
    documentTypeCode: contract.documentTypeCode,
    contractAnalyzedAt: contract.savedAt.slice(5).replace('-', '.'),
  }))),
]
export const mockDeployAdditionalSchedules: Schedule[] = mockAdditionalSchedules.filter(schedule => !videoIds.has(schedule.contractId))
