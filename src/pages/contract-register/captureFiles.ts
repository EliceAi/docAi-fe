export function validateCaptureFiles(files: readonly Pick<File, 'name' | 'type' | 'size'>[]): string | null {
  if (files.length === 0) return '사진이나 파일을 골라 주세요.'
  if (files.some(file => file.size === 0)) return '내용이 없는 파일은 올릴 수 없어요.'
  // 명세상 계약서 등록은 JPG·PNG만 받는다. PDF는 앱이 쪽 이미지로 바꿔 가려야 하는데 아직 지원하지 않는다
  if (files.some(file => file.type === 'application/pdf')) return 'PDF는 아직 올릴 수 없어요. 사진으로 찍거나 이미지 파일을 골라 주세요.'
  if (files.some(file => !file.type.startsWith('image/'))) return '사진 파일을 골라 주세요.'
  return null
}
