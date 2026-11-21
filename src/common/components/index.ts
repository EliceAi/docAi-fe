// 공통 부품 목록. 화면을 만들기 전에 여기서 고르고, 없으면 만들지 말고 먼저 묻는다.
// 괄호 안은 docs/wireframe.html에서 같은 일을 하는 함수·클래스 이름이다.

export { Icon } from './Icon' // 아이콘 26종 (icon)
export type { IconName } from './iconPaths'
export { Mascot, MascotDefs, type MascotFace } from './Mascot' // 캐릭터 표정 1~9 (mascot)
export { Button, type ButtonKind } from './Button' // 버튼 p·l·g·off, 주소 이동 (button)
export { Tag, SourceTag, type TagColor } from './Tag' // 상태 표시 (tag, sourceTag)
export { Say } from './Say' // 캐릭터 + 말풍선 (say)
export { Screen, Footer } from './Screen' // 화면 틀과 아래 고정 버튼 줄 (screen, footer)
export { Header } from './Header' // 상단 헤더: 뒤로·제목·알림·AI에게 질문 (header)
export { TabBar, type TabName } from './TabBar' // 하단 탭 4개 (tabBar)
export { StepBar, StepFooter, type RegisterStep } from './StepBar' // 등록 4단계 표시와 이전·다음 버튼 (progressSteps, stepFooter)
export { Layered, Sheet, Dialog } from './Overlay' // 겹친 화면·아래 패널·확인창 (layered, sheet, dialog)
export { Toast, Disclaimer, LawSourceLink } from './Notices' // 안내 토스트·AI 안내 문구·법령 원문 링크 (.toast, disclaimer, .src)
