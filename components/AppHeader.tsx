// components/AppHeader.tsx
import Link from 'next/link'

// 루트 레이아웃에서 모든 페이지에 공통으로 렌더링된다 — 자격증/회차/모드를 몇 단계
// 들어간 화면에서도 홈과 학습 기록으로 바로 이동할 수 있어야 한다는 요청 때문에,
// 화면마다 있는 "← 뒤로"(한 단계 위로) 링크와 별개로 최상단에 고정된 진입점을 둔다.
export function AppHeader() {
  return (
    <header className="border-b border-hairline">
      <div className="mx-auto max-w-2xl px-6 py-3 flex items-center gap-4 text-sm">
        <Link href="/" className="font-medium text-ink">
          홈
        </Link>
        <Link href="/history" className="text-muted">
          학습 기록
        </Link>
      </div>
    </header>
  )
}
