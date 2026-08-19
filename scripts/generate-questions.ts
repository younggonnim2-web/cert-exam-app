// scripts/generate-questions.ts
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { parseExam } from '../lib/parseExam'
import { validateExamMeta } from '../lib/examMeta'

const ROOT = join(process.cwd(), 'data', 'exam-questions')

function main() {
  const certs = readdirSync(ROOT).filter((name) =>
    statSync(join(ROOT, name)).isDirectory()
  )

  const failures: string[] = []

  for (const cert of certs) {
    const certDir = join(ROOT, cert)
    const metaPath = join(certDir, 'meta.json')
    const meta = JSON.parse(readFileSync(metaPath, 'utf-8'))
    validateExamMeta(meta)

    const rounds = readdirSync(certDir).filter((name) =>
      statSync(join(certDir, name)).isDirectory()
    )

    for (const round of rounds) {
      const rawPath = join(certDir, round, 'raw.md')
      const raw = readFileSync(rawPath, 'utf-8')

      // parseExam이 정답 인식 실패 시 throw한다 (plan-eng-review — 잘못된 정답이
      // 조용히 배포되는 것보다 이 회차만 건너뛰고 실패를 눈에 띄게 남기는 게 낫다).
      let questions
      try {
        questions = parseExam(raw, cert, round)
      } catch (err) {
        console.error(`FAIL: ${cert}/${round} — ${(err as Error).message}`)
        failures.push(`${cert}/${round}`)
        continue
      }

      // parseExam은 이제 보기 4개가 전부 그림뿐이라 텍스트화할 수 없는 문항을 조용히
      // 건너뛴다(lib/parseExam.ts 4단계 주석 참고) — 그래서 파싱된 개수가
      // meta.totalQuestions보다 "조금" 적은 것은 정상이다. 더 많이 나오는 것은 있을 수
      // 없는 일(블록을 중복 계산하는 버그)이라 그대로 실패시키고, 절반 넘게 사라지는
      // 것도 그림 문제 몇 개로는 설명되지 않는 규모라 안전장치로 실패시킨다.
      if (questions.length > meta.totalQuestions || questions.length < meta.totalQuestions / 2) {
        console.error(
          `FAIL: ${cert}/${round} — expected up to ${meta.totalQuestions} questions, parsed ${questions.length}`
        )
        failures.push(`${cert}/${round}`)
        continue
      }

      const outPath = join(certDir, round, 'questions.json')
      writeFileSync(outPath, JSON.stringify(questions, null, 2), 'utf-8')
      const skipped = meta.totalQuestions - questions.length
      const skippedNote = skipped > 0 ? `, 그림 전용 문제 ${skipped}개 제외` : ''
      console.log(`OK: ${cert}/${round} -> questions.json (${questions.length} questions${skippedNote})`)
    }
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length}개 회차 파싱 실패: ${failures.join(', ')}`)
    console.error('해당 회차의 questions.json은 생성되지 않았다 — 파서(lib/parseExam.ts)를 고치고 재실행할 것.')
    process.exit(1)
  }
}

main()
