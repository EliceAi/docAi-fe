import { describe, expect, it, vi } from 'vitest'
import { drawMasks, maskedCounts, objectParticle, regionFromDrag, subjectParticle } from './masking'
import { editRegisteredPages, type RegisteredPage } from './RegisterFlowContext'

const region = { x: 0.1, y: 0.2, width: 0.3, height: 0.1 }
const pageWith = (id: string, masks = [region]): RegisteredPage => ({ id, file: new File(['x'], `${id}.jpg`), masks })

describe('regionFromDrag', () => {
  it('끝에서 시작 방향으로 끌어도 왼쪽 위 기준 영역을 만든다', () => {
    const result = regionFromDrag({ x: 0.5, y: 0.4 }, { x: 0.2, y: 0.3 })
    expect(result?.x).toBeCloseTo(0.2)
    expect(result?.y).toBeCloseTo(0.3)
    expect(result?.width).toBeCloseTo(0.3)
    expect(result?.height).toBeCloseTo(0.1)
  })
  it('사진 밖으로 끌어도 0~1 안으로 자른다', () => {
    expect(regionFromDrag({ x: 0.8, y: 0.8 }, { x: 1.5, y: -0.5 })).toEqual({ x: 0.8, y: 0, width: expect.closeTo(0.2), height: 0.8 })
  })
  it('손가락이 거의 안 움직였으면 가리지 않는다', () => {
    expect(regionFromDrag({ x: 0.5, y: 0.5 }, { x: 0.505, y: 0.7 })).toBeNull()
  })
})

describe('maskedCounts', () => {
  it('쪽 순서대로 가린 개수를 센다', () => {
    expect(maskedCounts([pageWith('a', [region, region]), pageWith('b', [])])).toEqual([2, 0])
  })
})

describe('drawMasks', () => {
  it('비율 좌표를 이미지 픽셀로 바꿔 검은 칸을 칠한다', () => {
    const context = { fillStyle: '', fillRect: vi.fn() }
    drawMasks(context, 1000, 500, [region])
    expect(context.fillStyle).toBe('#000')
    expect(context.fillRect).toHaveBeenCalledWith(100, 100, 300, 50)
  })
})

describe('objectParticle', () => {
  it('받침이 있으면 을, 없으면 를 붙인다', () => {
    expect(objectParticle('연락처')).toBe('연락처를')
    expect(objectParticle('주소')).toBe('주소를')
    expect(objectParticle('이름')).toBe('이름을')
    expect(subjectParticle('주소')).toBe('주소가')
    expect(subjectParticle('이름')).toBe('이름이')
  })
})

describe('editRegisteredPages 가림 편집', () => {
  it('가린 곳을 그 쪽 맨 뒤에 더한다', () => {
    const added = { x: 0.5, y: 0.5, width: 0.1, height: 0.1 }
    const result = editRegisteredPages([pageWith('a'), pageWith('b', [])], { type: 'mask-add', id: 'a', region: added })
    expect(result[0].masks).toEqual([region, added])
    expect(result[1].masks).toEqual([])
  })
  it('지정한 번째 가림만 지운다', () => {
    const other = { x: 0.5, y: 0.5, width: 0.1, height: 0.1 }
    const result = editRegisteredPages([pageWith('a', [region, other])], { type: 'mask-remove', id: 'a', index: 0 })
    expect(result[0].masks).toEqual([other])
  })
  it('지운 가림을 원래 자리로 되돌릴 수 있다', () => {
    const other = { x: 0.5, y: 0.5, width: 0.1, height: 0.1 }
    const result = editRegisteredPages([pageWith('a', [other])], { type: 'mask-add', id: 'a', region, index: 0 })
    expect(result[0].masks).toEqual([region, other])
  })
})
