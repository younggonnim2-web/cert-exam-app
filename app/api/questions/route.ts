// app/api/questions/route.ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import { roundExists } from '@/lib/getRounds'

export async function GET(req: NextRequest) {
  const cert = req.nextUrl.searchParams.get('cert')
  const round = req.nextUrl.searchParams.get('round')
  if (!cert || !round) {
    return NextResponse.json({ error: 'cert and round are required' }, { status: 400 })
  }

  // roundExists가 경로 구분자/상위디렉토리 참조를 걸러낸 뒤 존재를 확인한다 — 이 검증을
  // 통과하기 전에는 어떤 파일도 열지 않는다 (plan-eng-review — 경로 조작 방지)
  if (!roundExists(cert, round)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const base = join(process.cwd(), 'data', 'exam-questions', cert)
  try {
    const questions = JSON.parse(readFileSync(join(base, round, 'questions.json'), 'utf-8'))
    const meta = JSON.parse(readFileSync(join(base, 'meta.json'), 'utf-8'))
    return NextResponse.json({
      questions,
      timeLimitMinutes: meta.timeLimitMinutes,
      passingScore: meta.passingScore,
    })
  } catch {
    return NextResponse.json({ error: 'failed to read exam data' }, { status: 500 })
  }
}
