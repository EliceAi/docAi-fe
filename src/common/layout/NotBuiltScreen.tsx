import { Header } from '../components/Header'
import { Say } from '../components/Say'
import { Screen } from '../components/Screen'

// 주소만 먼저 등록해 둔 화면의 임시 내용. 담당 이슈에서 와이어프레임 보드로 바꾼다.
export function NotBuiltScreen({ title, issue }: { title: string; issue: number }) {
  return (
    <Screen header={<Header title={title} />}>
      <Say face={8}>아직 만들지 않은 화면이에요. #{issue} 이슈에서 만들어요.</Say>
    </Screen>
  )
}
