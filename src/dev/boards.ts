import { createElement } from 'react'
import { analysisBoards } from '../pages/analysis/boards'
import { chatBoards } from '../pages/chat/boards'
import { comparisonBoards } from '../pages/comparison/boards'
import { contractRegisterBoards } from '../pages/contract-register/boards'
import { homeBoards } from '../pages/home/boards'
import { myContractsBoards } from '../pages/my-contracts/boards'
import { notificationsBoards } from '../pages/notifications/boards'
import { scheduleBoards } from '../pages/schedule/boards'
import { CommonPartsBoard } from './CommonPartsBoard'
import type { Board } from './types'

const commonPartsBoard: Board = {
  id: 'C01_공통요소',
  owner: '김지희',
  path: '/',
  render: () => createElement(CommonPartsBoard),
}

// 폴더별 보드 목록을 모은다. 보드를 추가·연결할 때는 이 파일이 아니라 각 폴더의 boards.tsx를 고친다.
export const ALL_BOARDS: Board[] = [
  commonPartsBoard,
  ...homeBoards,
  ...notificationsBoards,
  ...contractRegisterBoards,
  ...analysisBoards,
  ...chatBoards,
  ...comparisonBoards,
  ...scheduleBoards,
  ...myContractsBoards,
]

export const BOARD_BY_ID = new Map(ALL_BOARDS.map(board => [board.id, board]))
