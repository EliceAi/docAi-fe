export function validateCaptureFiles(files: readonly Pick<File, 'name' | 'type' | 'size'>[]): string | null {
  if (files.length === 0) return '사진이나 파일을 골라 주세요.'
  if (files.some(file => file.size === 0)) return '내용이 없는 파일은 올릴 수 없어요.'
  if (files.some(file => !file.type.startsWith('image/') && file.type !== 'application/pdf')) {
    return '사진이나 PDF 파일을 골라 주세요.'
  }
  return null
}
