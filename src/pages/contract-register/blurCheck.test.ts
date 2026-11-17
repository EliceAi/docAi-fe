import { describe, expect, it } from 'vitest'
import { checkImageQuality } from './blurCheck'

function pixels(value: number, size = 8) {
  return new Uint8ClampedArray(Array.from({ length: size * size }, () => [value, value, value, 255]).flat())
}

describe('checkImageQuality', () => {
  it('대비가 선명한 글자 경계는 흐림으로 표시하지 않는다', () => {
    const data = pixels(255)
    for (let i = 0; i < 64; i += 2) data.fill(20, i * 4, i * 4 + 3)
    expect(checkImageQuality(data, 8, 8)).toMatchObject({ blurred: false, brightness: 'normal' })
  })
  it('경계가 없는 회색 이미지는 흐림으로 표시한다', () => {
    expect(checkImageQuality(pixels(150), 8, 8)).toMatchObject({ blurred: true, brightness: 'normal' })
  })
  it('어둡거나 과도하게 밝은 이미지를 구분한다', () => {
    expect(checkImageQuality(pixels(44), 8, 8).brightness).toBe('dark')
    expect(checkImageQuality(pixels(246), 8, 8).brightness).toBe('bright')
    expect(checkImageQuality(pixels(45), 8, 8).brightness).toBe('normal')
    expect(checkImageQuality(pixels(245), 8, 8).brightness).toBe('normal')
  })
  it('투명한 배경은 흰색에 합성해 밝기를 검사한다', () => {
    expect(checkImageQuality(new Uint8ClampedArray(8 * 8 * 4), 8, 8).brightness).toBe('bright')
  })
  it('픽셀이 부족하거나 크기가 잘못되면 검사하지 않는다', () => {
    expect(() => checkImageQuality(pixels(100), 2, 2)).toThrow()
    expect(() => checkImageQuality(pixels(100), 8, 9)).toThrow()
    expect(() => checkImageQuality(pixels(100), 3.5, 8)).toThrow()
  })
})
