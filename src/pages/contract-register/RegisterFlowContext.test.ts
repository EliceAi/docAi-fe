import { describe, expect, it } from 'vitest'
import { editRegisteredPages, type RegisteredPage } from './RegisterFlowContext'

const first: RegisteredPage = { id: 'first', file: new File(['one'], 'one.jpg'), masks: [{ x: 0.1, y: 0.2, width: 0.3, height: 0.1 }] }
const second: RegisteredPage = { id: 'second', file: new File(['two'], 'two.jpg'), masks: [] }

describe('editRegisteredPages', () => {
  it('순서 변경 시 쪽 ID와 가림 정보를 함께 이동한다', () => {
    expect(editRegisteredPages([first, second], { type: 'move', id: first.id, to: 1 })).toEqual([second, first])
  })
  it('다시 찍은 쪽만 가림을 초기화하고 다른 쪽은 보존한다', () => {
    const replacement = new File(['new'], 'new.jpg')
    const result = editRegisteredPages([first, second], { type: 'replace', id: first.id, file: replacement })
    expect(result[0]).toEqual({ id: first.id, file: replacement, masks: [] })
    expect(result[1]).toBe(second)
    expect(first.masks).toHaveLength(1)
  })
  it('선택한 쪽만 삭제하고 다른 쪽은 그대로 둔다', () => {
    expect(editRegisteredPages([first, second], { type: 'remove', id: second.id })).toEqual([first])
  })
  it('없는 쪽이나 범위 밖 순서 변경은 무시한다', () => {
    const pages = [first, second]
    expect(editRegisteredPages(pages, { type: 'remove', id: 'missing' })).toBe(pages)
    expect(editRegisteredPages(pages, { type: 'move', id: first.id, to: -1 })).toBe(pages)
    expect(editRegisteredPages(pages, { type: 'move', id: first.id, to: 2 })).toBe(pages)
    expect(editRegisteredPages(pages, { type: 'move', id: first.id, to: 0.5 })).toBe(pages)
  })
})
