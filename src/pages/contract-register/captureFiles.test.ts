import { describe, expect, it } from 'vitest'
import { validateCaptureFiles } from './captureFiles'

describe('validateCaptureFiles', () => {
  it('파일 선택을 취소하면 진행하지 않는다', () => {
    expect(validateCaptureFiles([])).toBe('사진이나 파일을 골라 주세요.')
  })

  it('여러 사진과 PDF를 선택할 수 있다', () => {
    expect(validateCaptureFiles([
      { name: 'photo.jpg', type: 'image/jpeg', size: 10 },
      { name: 'photo.png', type: 'image/png', size: 10 },
      { name: 'contract.pdf', type: 'application/pdf', size: 10 },
    ])).toBeNull()
  })

  it('지원하지 않는 파일이 섞이면 선택 전체를 거절한다', () => {
    expect(validateCaptureFiles([
      { name: 'photo.jpg', type: 'image/jpeg', size: 10 },
      { name: 'program.exe', type: 'application/octet-stream', size: 10 },
    ])).toBe('사진이나 PDF 파일을 골라 주세요.')
  })

  it('내용이 없는 파일은 다음 단계로 보내지 않는다', () => {
    expect(validateCaptureFiles([{ name: 'empty.pdf', type: 'application/pdf', size: 0 }]))
      .toBe('내용이 없는 파일은 올릴 수 없어요.')
  })
})
