import { Header, Mascot, SourceTag, TabBar, Tag, type MascotFace } from '../common/components'

const FACES: [MascotFace, string][] = [
  [1, '기본 · 헤더 버튼·답변'], [2, '반가움 · 스플래시·홈'], [3, '생각 중 · 분석·답변 중'],
  [4, '돋보기 · 검색·근거'], [5, '짚어줌 · 확인 필요·비슷한 문서'], [6, '완료 · 저장·보관'],
  [7, '가리기 · S05'], [8, '쉬는 중 · 빈 상태'], [9, '미안 · 실패'],
]

// C01_공통요소: 공통 부품이 와이어프레임과 같게 그려지는지 보는 설명용 보드 (와이어프레임 commonPartsBoard)
export function CommonPartsBoard() {
  return (
    <div className="scr" style={{ background: '#fff' }}>
      <div className="bd" style={{ gap: 14 }}>
        <b style={{ fontSize: 18 }}>헤더 (모든 서비스 화면)</b>
        <Header home />
        <Header title="분석 결과" back="/" />
        <div className="mut">← 뒤로 / 화면 이름 / 종 아이콘 알림 / AI에게 질문(캐릭터). 질문하는 입구는 이 버튼 하나예요. 휴대폰 기본 카메라·파일 선택 화면에는 헤더가 없어요.</div>
        <b style={{ fontSize: 18 }}>하단 탭</b>
        <TabBar active="홈" />
        <b style={{ fontSize: 18 }}>캐릭터 9종 · 상태 표시용, 기능 아님</b>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {FACES.map(([face, label]) => (
            <div key={face} style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)' }}>
              <Mascot face={face} size={56} /><br />{face} {label}
            </div>
          ))}
        </div>
        <b style={{ fontSize: 18 }}>상태 표시 (글자 + 아이콘, 색만 쓰지 않음)</b>
        <div className="chips">
          <Tag color="red" icon="warn">확인 필요</Tag>
          <Tag color="amb">빠진 항목</Tag>
          <Tag color="grn">A 깊게 점검</Tag>
          <Tag color="amb">B 공통 점검</Tag>
          <SourceTag.written />
          <SourceTag.typed />
          <SourceTag.review />
          <Tag color="gry">예시</Tag>
        </div>
        <div className="mut">"안전한 계약" 같은 단정 표현은 쓰지 않아요. 문제가 안 보이면 "짚은 내용 없음".</div>
      </div>
    </div>
  )
}
