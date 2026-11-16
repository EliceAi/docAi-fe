import type { ContractDetail, ContractSummary, CreatedContract } from '../contracts'

export const mockCreatedContract: CreatedContract = { contractId: 1, documentTypeCode: 'LABOR', pageCount: 2, status: 'REGISTERED' }

export const mockMyContracts: ContractSummary[] = [
  { contractId: 1, title: '카페 알바 근로계약서', documentTypeCode: 'LABOR', lane: '일', version: 1, savedAt: '2026-11-12', needsCheckCount: 2, analysisId: 1 },
  { contractId: 2, title: '역삼동 원룸 월세 계약서', documentTypeCode: 'LEASE', lane: '집', version: 2, savedAt: '2026-11-10', needsCheckCount: 1, analysisId: 2 },
]

export const mockContractDetail: ContractDetail = { ...mockMyContracts[0], pageCount: 2, scheduleIds: [2] }
