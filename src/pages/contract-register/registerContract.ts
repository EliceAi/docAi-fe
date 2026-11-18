import { createContract } from '../../api/contracts'
import { requestAnalysis } from '../../api/analyses'
import { createMaskedImage, maskedCounts } from './masking'
import type { RegisteredPage } from './RegisterFlowContext'

const realSteps = { createMaskedImage, createContract, requestAnalysis }

/**
 * 가린 이미지를 만들어 계약서를 등록하고 분석을 요청한다. 분석 번호를 돌려준다.
 * 같은 idempotencyKey로 다시 부르면 서버가 계약서를 새로 만들지 않고 만든 것을 돌려준다.
 * 가린 이미지를 만들지 못하면 원본으로 대신 보내지 않고 오류를 그대로 던진다.
 */
export async function registerContract(
  pages: RegisteredPage[],
  documentTypeCode: string,
  idempotencyKey: string,
  steps: typeof realSteps = realSteps,
): Promise<number> {
  const maskedImages = await Promise.all(pages.map(page => steps.createMaskedImage(page.file, page.masks)))
  const contract = await steps.createContract({ documentTypeCode, pages: maskedImages, maskedCounts: maskedCounts(pages) }, idempotencyKey)
  const analysis = await steps.requestAnalysis(contract.contractId)
  return analysis.analysisId
}

/** 사진이나 가린 곳이 바뀌었는지 알아보는 값. 바뀌면 새 등록이라 새 Idempotency-Key를 쓴다 */
export function pagesSignature(pages: RegisteredPage[]): string {
  return JSON.stringify(pages.map(page => [page.id, page.file.name, page.file.size, page.file.lastModified, page.masks]))
}
