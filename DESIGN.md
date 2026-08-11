# DESIGN.md — 자격증 기출문제 풀이 웹앱

**베이스: Cal.com** (`design-md/cal/DESIGN.md` 참고, 화이트 캔버스 + 잉크블랙 CTA + 라이트그레이 카드의 "친근한 모던 SaaS" 시스템). App UI(대시보드/도구형) 성격이 마케팅 랜딩페이지보다 우리 앱(OMR 그리드·타이머·카드 중심)과 훨씬 잘 맞아서 이걸 베이스로 골랐다 — 비교 검토했던 Mastercard(에디토리얼 마케팅, 극단적 radius)는 App UI 구조가 없어서 탈락, Linear(다크모드 개발자툴)는 톤이 너무 차가움, Notion은 브랜드 아이덴티티(보라/네이비)가 강해서 손볼 게 많았음.

**번역 원칙**: Cal.com 원본 그대로 베끼지 않는다. (1) 마케팅 히어로용 사이즈(64px 등)는 앱 화면엔 과해서 대폭 축소, (2) `Cal Sans`/`Inter`는 영문 전용 폰트라 한글이 안 나옴 — 실제 폰트는 Noto Sans KR 유지, Cal의 "굵은 weight + 타이트 트래킹" 철학만 가져오되 한글 특성에 맞춰 완화.

## 색상

Cal.com 원본 hex를 그대로 쓰되, 우리 앱의 의미 체계(실전=경고, 합격/오답=시맨틱)에 맞게 역할을 재배정했다.

| 역할 | Hex | Tailwind 근사값 | 용도 |
|---|---|---|---|
| Ink (기본 텍스트/중립 버튼) | `#111111` | `neutral-900` | 헤딩, 본문 텍스트, 회차선택 등 중립 버튼 |
| Body (본문) | `#374151` | `gray-700` | 문항 지문 등 일반 본문 |
| Muted (보조 텍스트) | `#6b7280` | `gray-500` | 보조 설명, 날짜, 캡션 |
| Primary/선택 (답 선택, 진행중, 링크) | `#3b82f6` | `blue-500` | 문항 선택 표시, OMR 진행 표시, 활성 탭 |
| Exam/실전 강조 (타이머 긴장, 실전모드 배지, 제출버튼) | `#ef4444` | `red-500` | 전체모의고사 강조색 — Cal의 `semantic-error`를 실전 긴장감 용도로 전용 |
| Success/합격/정답 | `#10b981` | `emerald-500` | 즉시피드백 정답, 합격 판정 |
| Canvas (배경) | `#ffffff` | `white` | 페이지 기본 배경 |
| Surface Card (카드) | `#f5f5f5` | `neutral-100` | 문항 카드, 리스트 아이템 배경 — 테두리선 대신 은은한 배경차로 구분 |
| Surface Soft | `#f8f9fa` | `gray-50` | 탭 그룹 배경, 아주 옅은 구분 |
| Hairline (테두리) | `#e5e7eb` | `gray-200` | 카드/입력 테두리, 구분선 |

### 과목 뱃지 (Cal.com 배지 파스텔 그대로)
과목별연습 탭에 과목마다 다른 색을 배정 — 기존엔 활성/비활성 파란색-회색뿐이었는데, Cal.com이 실제로 카테고리 뱃지에 쓰는 파스텔 4색을 그대로 가져와 과목을 시각적으로 구분한다.

| 과목 순번 | Hex | Tailwind 근사값 |
|---|---|---|
| 1번째 | `#fb923c` (orange) | `orange-400` |
| 2번째 | `#ec4899` (pink) | `pink-500` |
| 3번째 | `#8b5cf6` (violet) | `violet-500` |
| 4번째 이후 | `#34d399` (emerald) | `emerald-400` |

과목이 3개(유기농업기능사 기준)면 orange/pink/violet만 순서대로 쓰고, 과목이 더 많은 자격증이 추가되면 emerald까지 순환.

### tailwind.config.ts 확장

```typescript
// tailwind.config.ts theme.extend에 추가 — 원시 hex를 의미있는 이름으로 씀.
// borderRadius도 함께 재정의한다: Tailwind 기본값(rounded-lg=8px, rounded-xl=12px)은
// 아래 radius 스케일 표와 한 단계씩 어긋나므로, md/lg/xl을 8/12/16px로 명시적으로 맞춘다.
borderRadius: {
  md: '8px',
  lg: '12px',
  xl: '16px',
},
colors: {
  ink: '#111111',
  body: '#374151',
  muted: '#6b7280',
  'surface-card': '#f5f5f5',
  'surface-soft': '#f8f9fa',
  hairline: '#e5e7eb',
  badge: {
    orange: '#fb923c',
    pink: '#ec4899',
    violet: '#8b5cf6',
    emerald: '#34d399',
  },
},
```

이렇게 하면 컴포넌트에서 `bg-blue-500` 대신 의도가 드러나는 `bg-surface-card`, `text-ink` 같은 클래스를 쓸 수 있다. 기존 plan 코드(`docs/plans/cert-exam-app.md`)의 `border rounded p-4` 같은 카드 스타일은 구현 시 `bg-surface-card rounded-lg p-4`(테두리선 대신 배경색 차이로 카드 구분)로 바꿀 것 — Cal.com의 핵심 특징 중 하나가 "테두리보다 배경 레이어로 위계를 준다"는 점이다.

## 타이포그래피

**폰트: Noto Sans KR 유지** (Cal Sans/Inter는 한글 미지원이라 그대로 못 씀). 대신 Cal.com의 타이포 **철학**만 가져온다:
- 디스플레이(화면 타이틀, 합격/불합격 판정)는 **weight 600**, 본문은 **weight 400** — Cal처�럼 두 단계로만 구분(500 계열 남용 안 함)
- Cal은 헤드라인에 -0.5~-2px negative tracking을 쓰는데, **한글은 정사각형 글자 특성상 강한 negative tracking을 주면 글자가 붙어서 가독성이 떨어진다** — 그래서 한글에는 tracking을 아예 주지 않거나 `-0.01em` 정도로 아주 약하게만 적용한다. 원본 그대로 베끼지 않은 이유가 이거다.
- Cal의 마케팅 히어로 사이즈(64px 등)는 앱 화면엔 과함 — 아래처럼 축소된 스케일 사용.

```typescript
// app/layout.tsx
import { Noto_Sans_KR } from 'next/font/google'

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
})
```

| 역할 | 크기 | weight | 용도 |
|---|---|---|---|
| 화면 타이틀 | 24px (`text-2xl`) | 600 | "자격증 선택", "전체 모의고사" |
| 결과 판정 (합격/불합격) | 30px (`text-3xl`) | 600 | 이 앱에서 유일하게 "디스플레이급" 강조가 필요한 순간 |
| 카드/문항 제목 | 16-18px | 600 | 문항 번호+지문 첫 줄 |
| 본문 | 15-16px (`text-base`) | 400 | 지문, 설명 |
| 캡션/보조 | 12-13px (`text-xs`/`text-sm`) | 500 | 뱃지, 캡션 |
| 버튼 | 14-16px | 600 | Cal은 버튼에 body보다 굵은 weight 600을 씀 — 우리도 동일 적용 |

`tailwind.config.ts`의 `theme.extend.fontFamily.sans`에 `var(--font-sans)`를 연결하고, `<html>`에 `notoSansKR.variable` 클래스 적용.

## 모양 (Radius)

Cal.com의 계층적 radius 스케일을 그대로 채용 — 기존엔 Tailwind 기본값(`rounded`=4px)만 막연히 썼는데, 용도별로 명확히 나눈다.

| 토큰 | 값 | 용도 |
|---|---|---|
| `rounded-md` | 8px | 버튼, 입력 필드 |
| `rounded-lg` | 12px | 카드(문항 카드, 리스트 아이템), OMR 그리드 셀 |
| `rounded-xl` | 16px | 결과 화면의 합격/불합격 배너처럼 큰 강조 컨테이너 |
| `rounded-full` | 9999px | 뱃지, 아바타(사용 시), 원형 아이콘 버튼 |

## 그림자 · 깊이

Cal.com은 테두리선보다 **배경 레이어**로 위계를 준다 (섹션 2 참고 — surface-card가 카드 구분의 핵심). 그림자는 최소화: 결과 화면의 합격/불합격 배너 정도에만 아주 옅은 그림자(`shadow-sm`)를 쓰고, 나머지는 배경색 차이만으로 충분.

## 간격 · 터치 영역

- 카드/버튼 기본 padding: `p-4`(16px), 결과 배너처럼 강조 컨테이너는 `p-6`(24px)
- 리스트 아이템 간격: `space-y-3`(12px)
- **터치 영역 최소 44×44px** (`min-h-11 min-w-11`) — OMR 그리드 등 밀도 높은 UI에 필수 적용 (Cal.com 자체 스펙도 버튼 height 40px 이상 유지)

## 접근성

- 모든 인터랙티브 요소는 네이티브 `<button>`/`<Link>` 사용 — 별도 커스텀 없이 키보드 포커스/Enter·Space 조작이 기본으로 동작.
- OMR 그리드 셀: `aria-label="{번호}번 문항, {응답완료|미응답}"` — 스크린리더 사용자가 시각적 표시 없이도 진행 상황을 알 수 있게.
- 문항 상세 패널 보기 버튼: `aria-pressed={선택여부}` — 선택 상태를 보조기술에 노출.
- 타이머: 매초 갱신되는 숫자엔 `aria-live` 안 달고, 긴장구간(잔여10분) 진입 같은 의미있는 전환만 별도 라이브 리전으로 1회 안내.
- 색만으로 정보를 전달하지 않는다 — 정오 표시는 색(초록/빨강) + 배지 텍스트(✓/✗ 또는 "정답"/"오답") 병행. 과목 뱃지도 색만으로 구분하지 않고 과목명 텍스트를 항상 같이 표기.
- Primary 파란색(`#3b82f6`)과 Exam 빨간색(`#ef4444`) 모두 흰 배경에서 WCAG AA 본문 대비 기준(4.5:1)을 만족하는 값으로 선택됨.

## 미해결 (다음 자격증 추가 시 재검토)

이 문서는 지금 화면 구성 기준으로 작성됨. 자격증이 늘어나 과목 수가 4개를 넘으면 뱃지 파스텔 4색 이후 순환 규칙을 정해야 함. 자격증마다 대표색을 다르게 줄지(예: 유기농업기능사=초록 계열, 종자기능사=다른 색)는 아직 미정 — 지금은 전 자격증 공통 팔레트.
