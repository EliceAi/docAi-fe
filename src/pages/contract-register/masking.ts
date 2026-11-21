import type { MaskRegion, RegisteredPage } from './RegisterFlowContext'

type Point = { x: number; y: number }

// 손가락이 이 비율보다 덜 움직이면 실수로 눌렀다고 보고 가리지 않는다
const MIN_DRAG_RATIO = 0.01

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** 끌기 시작·끝 점(사진 크기에 대한 0~1 비율)으로 가림 영역을 만든다. 너무 작으면 null */
export function regionFromDrag(start: Point, end: Point): MaskRegion | null {
  const left = clamp01(Math.min(start.x, end.x))
  const right = clamp01(Math.max(start.x, end.x))
  const top = clamp01(Math.min(start.y, end.y))
  const bottom = clamp01(Math.max(start.y, end.y))
  if (right - left < MIN_DRAG_RATIO || bottom - top < MIN_DRAG_RATIO) return null
  return { x: left, y: top, width: right - left, height: bottom - top }
}

/** 쪽 순서대로 가린 개수 */
export function maskedCounts(pages: RegisteredPage[]): number[] {
  return pages.map(page => page.masks.length)
}

function hasBatchim(word: string): boolean {
  const lastCode = word.charCodeAt(word.length - 1)
  const isHangul = lastCode >= 0xac00 && lastCode <= 0xd7a3
  return isHangul && (lastCode - 0xac00) % 28 !== 0
}

/** "연락처" → "연락처를", "이름" → "이름을" */
export const objectParticle = (word: string) => word + (hasBatchim(word) ? '을' : '를')

/** "주소" → "주소가", "이름" → "이름이" */
export const subjectParticle = (word: string) => word + (hasBatchim(word) ? '이' : '가')

/** 비율 좌표를 이미지 픽셀로 바꿔 검은 칸을 칠한다 */
export function drawMasks(
  context: { fillStyle: string | CanvasGradient | CanvasPattern; fillRect: (x: number, y: number, width: number, height: number) => void },
  imageWidth: number,
  imageHeight: number,
  masks: MaskRegion[],
) {
  context.fillStyle = '#000'
  for (const mask of masks) {
    context.fillRect(mask.x * imageWidth, mask.y * imageHeight, mask.width * imageWidth, mask.height * imageHeight)
  }
}

/** 원본 위에 가림을 칠한 새 이미지를 만든다. 원본 파일은 바꾸지도 보내지도 않는다 */
export async function createMaskedImage(file: File, masks: MaskRegion[]): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('가린 이미지를 만들 캔버스를 열 수 없어요.')
  context.drawImage(bitmap, 0, 0)
  drawMasks(context, canvas.width, canvas.height, masks)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('가린 이미지를 만들지 못했어요.'))), 'image/jpeg', 0.92))
}
