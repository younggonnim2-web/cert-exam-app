// app/[cert]/[round]/practice/page.tsx
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { notFound } from 'next/navigation'
import { roundExists, safeDecodeSegment } from '@/lib/getRounds'
import { QuestionList } from '@/components/QuestionList'
import type { Question, ExamMeta } from '@/lib/types'

export default function PracticePage({
  params,
}: {
  params: { cert: string; round: string }
}) {
  // params.cert/round는 이 실행 환경에서 실측 확인 결과 percent-encoding이 남은 원문
  // 그대로 전달된다 — 디코딩이 필요하다. safeDecodeSegment는 잘못된 encoding(리터럴
  // '%')에서 URIError로 500 크래시하는 대신 null을 반환해 notFound()로 처리하게 한다.
  const round = safeDecodeSegment(params.round)
  const cert = safeDecodeSegment(params.cert)

  // 파일을 열기 전에 반드시 roundExists로 검증한다 (plan-eng-review — 경로 조작 방지,
  // 이게 이 프로젝트에서 파일시스템 접근 전 검증을 담당하는 유일한 통로다)
  if (cert === null || round === null || !roundExists(cert, round)) notFound()

  const certDir = join(process.cwd(), 'data', 'exam-questions', cert)
  const questions: Question[] = JSON.parse(readFileSync(join(certDir, round, 'questions.json'), 'utf-8'))
  const meta: ExamMeta = JSON.parse(readFileSync(join(certDir, 'meta.json'), 'utf-8'))

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold mb-4 text-ink">과목별 연습</h1>
      <QuestionList cert={cert} round={round} questions={questions} subjects={meta.subjects} />
    </main>
  )
}
