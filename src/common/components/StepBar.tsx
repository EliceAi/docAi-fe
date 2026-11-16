import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { Button } from './Button'
import { Footer } from './Screen'
import { Icon } from './Icon'

/** 계약서 등록 4단계: 1 종류 · 2 올리기 · 3 가리기 · 4 확인 */
export type RegisterStep = 1 | 2 | 3 | 4

const STEP_LABELS = ['종류', '올리기', '가리기', '확인']
const STEP_PATHS = ['/contracts/new', '/contracts/new/preview', '/contracts/new/mask', '/contracts/new/confirm']

type StepBarProps = {
  current: RegisterStep
  /** 갔다가 돌아온 뒷 단계. 끝낸 단계라 눌러서 바로 갈 수 있다 */
  finishedAhead?: RegisterStep[]
}

// 와이어프레임 progressSteps(current, finishedAhead)
export function StepBar({ current, finishedAhead = [] }: StepBarProps) {
  return (
    <div className="stp">
      {STEP_LABELS.map((label, index) => {
        const step = index + 1
        const isCurrent = step === current
        const isFinished = step < current || finishedAhead.includes(step as RegisterStep)
        const canMove = isFinished && !isCurrent
        const dotClass = `sd ${isCurrent ? 'cur' : isFinished ? 'done' : ''}`
        const labelClass = `sl ${isCurrent ? 'cur' : ''}`
        return (
          <Fragment key={label}>
            {canMove ? (
              <>
                <Link className={dotClass} to={STEP_PATHS[index]}><Icon name="check" size={12} /></Link>
                <Link className={labelClass} to={STEP_PATHS[index]}>{label}</Link>
              </>
            ) : (
              <>
                <span className={dotClass}>{step}</span>
                <span className={labelClass}>{label}</span>
              </>
            )}
            {step < 4 && <i />}
          </Fragment>
        )
      })}
    </div>
  )
}

type StepFooterProps = {
  current: 2 | 3 | 4
  /** 다음 버튼 글자(›는 자동으로 붙는다) */
  nextLabel: string
  nextTo?: string
  onNext?: () => void
  /** false면 다음 버튼이 회색이 되고, 누르면 onNotReady로 이유를 알린다 */
  ready?: boolean
  onNotReady?: () => void
  /** 이전 버튼이 기본 단계가 아닌 곳으로 갈 때 */
  previousTo?: string
}

// 와이어프레임 stepFooter(current, next): 왼쪽 이전 단계 · 오른쪽 다음 단계
export function StepFooter({ current, nextLabel, nextTo, onNext, ready = true, onNotReady, previousTo }: StepFooterProps) {
  return (
    <Footer>
      <Button kind="l" to={previousTo ?? STEP_PATHS[current - 2]}>‹ 이전: {STEP_LABELS[current - 2]}</Button>
      {ready ? (
        <Button to={nextTo} onClick={onNext}>{nextLabel} ›</Button>
      ) : (
        <Button kind="off" onClick={onNotReady}>{nextLabel} ›</Button>
      )}
    </Footer>
  )
}
