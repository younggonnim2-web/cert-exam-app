// lib/getRounds.ts
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { RoundInfo } from './types'

const ROOT = join(process.cwd(), 'data', 'exam-questions')

// 경로 구분자나 상위 디렉토리 참조(및 그 자체를 가리키는 '.')가 섞인 입력은
// 파일시스템 접근 전에 즉시 거부한다. ':' 도 함께 막는다 — cert/round 이름에
// 정당하게 등장할 이유가 없고, Task 7/8에서 이 값으로 실제 파일 내용을 읽게 되므로
// 지금 막아두는 비용이 거의 없다.
function isSafeSegment(value: string): boolean {
  return (
    value.length > 0 &&
    !value.includes('/') &&
    !value.includes('\\') &&
    !value.includes(':') &&
    value !== '.' &&
    value !== '..'
  )
}

export function getCerts(): string[] {
  if (!existsSync(ROOT)) return []
  return readdirSync(ROOT).filter((name) => statSync(join(ROOT, name)).isDirectory())
}

export function certExists(cert: string): boolean {
  if (!isSafeSegment(cert)) return false
  return existsSync(join(ROOT, cert))
}

export function getRounds(cert: string): RoundInfo[] {
  if (!isSafeSegment(cert)) return []
  const certDir = join(ROOT, cert)
  if (!existsSync(certDir)) return []
  return readdirSync(certDir)
    .filter((name) => statSync(join(certDir, name)).isDirectory())
    // roundExists와 동일한 기준(questions.json 존재 여부)을 적용한다 — 디렉토리는
    // 있지만 파싱 실패로 questions.json이 없는 회차(Task 3 표본검수에서 제외된
    // 이미지 전용 보기 회차 등)를 목록에 노출해 죽은 링크를 만들지 않기 위함.
    .filter((name) => roundExists(cert, name))
    .sort()
    .reverse() // 최신 회차 먼저
    .map((date) => ({ cert, date, questionCount: 0 }))
}

export function roundExists(cert: string, round: string): boolean {
  if (!isSafeSegment(cert) || !isSafeSegment(round)) return false
  return existsSync(join(ROOT, cert, round, 'questions.json'))
}

// Next.js App Router 동적 라우트 페이지에서 cert/round params를 읽을 때 반드시 이
// 함수를 거친다. 실제 실행 환경(Next.js 14.2.35, dev server)에서 curl로 직접 확인한
// 결과 params.cert/round는 percent-encoding이 남아있는 원문 그대로 전달된다 — 디코딩
// 없이 곧장 certExists/roundExists에 넘기면 한글 등 인코딩된 자격증명이 전부 매치
// 실패해 정상 경로도 404가 난다. 따라서 디코딩은 여기서도 필수다.
// 동시에, 디코딩은 isSafeSegment 검증 *이전에* 끝나 있어야 한다 — 그렇지 않으면
// '%2e%2e%2f' 같은 인코딩된 경로 조작 문자열이 디코딩되지 않은 채로 isSafeSegment를
// 통과해버릴 수 있다. decodeURIComponent는 잘못된 percent-encoding(예: 리터럴 '%')에
// URIError를 던지므로, 페이지가 500으로 크래시하는 대신 notFound()로 처리할 수
// 있도록 여기서 잡아 null을 반환한다.
export function safeDecodeSegment(value: string): string | null {
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}
