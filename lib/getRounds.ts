// lib/getRounds.ts
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { RoundInfo } from './types'

const ROOT = join(process.cwd(), 'data', 'exam-questions')

// 경로 구분자나 상위 디렉토리 참조가 섞인 입력은 파일시스템 접근 전에 즉시 거부한다.
function isSafeSegment(value: string): boolean {
  return value.length > 0 && !value.includes('/') && !value.includes('\\') && value !== '..'
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
    .sort()
    .reverse() // 최신 회차 먼저
    .map((date) => ({ cert, date, questionCount: 0 }))
}

export function roundExists(cert: string, round: string): boolean {
  if (!isSafeSegment(cert) || !isSafeSegment(round)) return false
  return existsSync(join(ROOT, cert, round, 'questions.json'))
}
