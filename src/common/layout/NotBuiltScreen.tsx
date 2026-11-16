import { Header } from '../components/Header'
import { Say } from '../components/Say'
import { Screen } from '../components/Screen'

// 주소만 먼저 등록해 둔 화면의 임시 내용. 담당 이슈에서 와이어프레임 보드로 바꾼다.
// issue는 이미 만들어진 이슈일 때만 넣는다(아직 없는 이슈 번호를 짐작해 적으면 틀리기 쉽다).
export function NotBuiltScreen({ title, issue }: { title: string; issue?: number }) {
  return (
    <Screen header={<Header title={title} />}>
      <Say face={8}>아직 만들지 않은 화면이에요. {issue ? `#${issue} 이슈에서` : '담당 이슈에서'} 만들어요.</Say>
    </Screen>
  )
}
