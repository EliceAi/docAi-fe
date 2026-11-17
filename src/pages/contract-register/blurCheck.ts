export type ImageQuality = { blurred: boolean; brightness: 'dark' | 'normal' | 'bright' }

export function checkImageQuality(pixels: Uint8ClampedArray, width: number, height: number): ImageQuality {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 3 || height < 3 || pixels.length !== width * height * 4) {
    throw new Error('이미지 크기와 픽셀을 확인해 주세요.')
  }
  const gray = new Float64Array(width * height)
  let brightnessSum = 0
  for (let i = 0; i < gray.length; i++) {
    const offset = i * 4
    const alpha = pixels[offset + 3] / 255
    const luminance = pixels[offset] * 0.299 + pixels[offset + 1] * 0.587 + pixels[offset + 2] * 0.114
    gray[i] = Math.round(luminance * alpha + 255 * (1 - alpha))
    brightnessSum += gray[i]
  }
  let edgeSum = 0
  let edgeSquares = 0
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x
      const edge = gray[i - 1] + gray[i + 1] + gray[i - width] + gray[i + width] - 4 * gray[i]
      edgeSum += edge
      edgeSquares += edge * edge
    }
  }
  const count = (width - 2) * (height - 2)
  const variance = edgeSquares / count - (edgeSum / count) ** 2
  const averageBrightness = brightnessSum / gray.length
  // ponytail: 축소 영상의 경계 분산을 쓰는 휴리스틱이다. 실촬영 표본이 쌓이면 임계값을 보정한다.
  return { blurred: variance < 100, brightness: averageBrightness < 45 ? 'dark' : averageBrightness > 245 ? 'bright' : 'normal' }
}
