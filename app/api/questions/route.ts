// app/api/questions/route.ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { roundExists } from '@/lib/getRounds'

// 이 라우트가 읽는 questions.json/meta.json은 사실상 이 앱의 "데이터베이스"다.
// lib/examStorage.ts가 localStorage(사용자가 devtools로 직접 편집 가능한 시스템 경계)를
// zod로 검증하는 것과 같은 이유로, 디스크에서 읽어온 이 데이터도 형태를 검증한다 —
// 지금은 생성 스크립트가 만든 데이터라 항상 well-formed지만, 나중에 회차를 수작업으로
// 추가/수정하다가 timeLimitMinutes 같은 필드가 빠지면 JSON.parse는 성공하고도
// ExamTimer가 NaN:NaN을 표시하고, `remaining <= 0` 가드가 절대 참이 되지 않아(자동제출이
// 영원히 안 걸림) 조용히 고장나는 진단하기 어려운 실패 모드가 된다. 문항 하나하나의
// 내부 구조까지는 검증하지 않는다 — 그건 파서/생성 파이프라인이 이미 보장한다.
const metaSchema = z.object({
  timeLimitMinutes: z.number(),
  passingScore: z.number(),
})

const questionsSchema = z.array(z.unknown()).min(1)

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
    const questionsRaw = JSON.parse(readFileSync(join(base, round, 'questions.json'), 'utf-8'))
    const metaRaw = JSON.parse(readFileSync(join(base, 'meta.json'), 'utf-8'))

    const questionsResult = questionsSchema.safeParse(questionsRaw)
    const metaResult = metaSchema.safeParse(metaRaw)
    if (!questionsResult.success || !metaResult.success) {
      // 코드 리뷰 지적 — 검증 실패는 파싱 실패와 마찬가지로 조용히 지나가면 안 된다.
      // 손상된 회차 데이터를 디버깅할 유일한 단서가 이 로그다.
      console.error(`[api/questions] schema validation failed for ${cert}/${round}`, {
        questionsError: questionsResult.success ? undefined : questionsResult.error.flatten(),
        metaError: metaResult.success ? undefined : metaResult.error.flatten(),
      })
      return NextResponse.json({ error: 'failed to read exam data' }, { status: 500 })
    }

    return NextResponse.json({
      questions: questionsResult.data,
      timeLimitMinutes: metaResult.data.timeLimitMinutes,
      passingScore: metaResult.data.passingScore,
    })
  } catch (error) {
    // 손상된 JSON, 파일 누락 등 — 프로덕션에서 흔적 없이 사라지지 않도록 로그를 남긴다.
    console.error(`[api/questions] failed to read/parse exam data for ${cert}/${round}`, error)
    return NextResponse.json({ error: 'failed to read exam data' }, { status: 500 })
  }
}
