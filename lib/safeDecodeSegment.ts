// lib/safeDecodeSegment.ts
//
// Next.js App Router 동적 라우트 params(cert/round)를 다루는 모든 곳에서 쓰는 순수
// 디코딩 유틸. 원래 lib/getRounds.ts 안에 있었지만, 그 파일은 최상단에서
// node:fs/node:path를 import한다 — 서버 컴포넌트에서 쓸 때는 문제없지만, Task 8의
// exam/page.tsx처럼 'use client' 컴포넌트가 getRounds.ts에서 safeDecodeSegment 하나만
// 가져와도 webpack이 node:fs까지 클라이언트 번들에 포함시키려다
// `UnhandledSchemeError: Reading from "node:fs" is not handled by plugins`로 빌드
// 자체가 깨진다(런타임에 npm run dev로 실측 확인). fs 의존성이 전혀 없는 이 파일로
// 분리해 클라이언트 컴포넌트도 안전하게 import할 수 있게 한다. lib/getRounds.ts는
// 하위 호환을 위해 이 함수를 재수출한다.
export function safeDecodeSegment(value: string): string | null {
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}
