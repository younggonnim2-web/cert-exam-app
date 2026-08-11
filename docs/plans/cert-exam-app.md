# 자격증 기출문제 풀이 웹앱 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 지인 그룹에게 링크로 공유해서, 확보된 기출문제(유기농업기능사 22회차, 종자기능사 30회차)를 실전 몰입감 있는 전체모의고사 또는 과목별연습으로 풀어볼 수 있는 웹앱을 만든다.

**Architecture:** Next.js App Router 기반 클라이언트 중심 웹앱. 서버 세션/인증 없음 — 기출문제 데이터는 빌드 타임에 `raw.md`에서 `questions.json`으로 파싱해 정적 파일로 포함하고, 응시 중 상태(답안/타이머)는 브라우저 `localStorage`에만 저장한다. 테스트는 순수 함수(파서, 스토리지, 채점 로직)에 집중하고 React 컴포넌트 자체는 수동 확인으로 커버한다 — "가볍게" 만드는 사이드 프로젝트 스코프에 맞춘 의도적 선택.

**Tech Stack:** Next.js (App Router, TypeScript) + Tailwind CSS + Vercel 배포. 패키지 매니저 npm. 테스트 러너 Vitest (순수 함수 유닛테스트 전용, 컴포넌트 테스트/E2E는 이번 스코프 제외).

**참고 문서:**
- `docs/prd/cert-exam-app.md` (제품 스펙, APPROVED)
- `docs/plans/cert-exam-app-options.md` (구현 옵션 확정 근거)
- `DESIGN.md` (색상/폰트/간격/터치영역/접근성 토큰, plan-design-review에서 신설)

---

## File Structure

```
package.json, tsconfig.json, next.config.mjs, tailwind.config.ts, postcss.config.mjs, vitest.config.ts
app/
  layout.tsx              # 루트 레이아웃
  globals.css              # Tailwind 진입점
  page.tsx                 # 자격증 선택 화면
  [cert]/
    page.tsx                # 회차 선택 화면
    [round]/
      page.tsx               # 모드 선택 화면 (전체모의고사 / 과목별연습)
      practice/page.tsx       # 과목별연습 모드
      exam/page.tsx            # 전체모의고사 모드
lib/
  types.ts                 # Question, ExamMeta, Attempt 등 타입 정의
  parseExam.ts               # raw.md → Question[] 파서 (순수 함수)
  examStorage.ts              # localStorage 응시 상태 저장/복원 (순수 함수 + 얇은 브라우저 API 래퍼)
  grading.ts                   # 채점 로직 (순수 함수)
components/
  QuestionDetail.tsx          # 전체모의고사 — 현재 문항 지문/보기 + 답 선택 패널
  OmrGrid.tsx                # 전체모의고사 — 문항 내비게이션 + 응답 진행률 요약
  ExamTimer.tsx                # 카운트다운 타이머 (긴장감 연출 포함)
  QuestionList.tsx              # 과목별연습용 필터링 리스트
scripts/
  generate-questions.ts      # raw.md → questions.json 일괄 생성 스크립트
data/exam-questions/
  {자격증명}/meta.json         # 자격증별 시험 규격 메타데이터 (신규 생성)
  {자격증명}/{날짜}/questions.json  # 생성된 구조화 데이터 (스크립트 산출물)
```

---

## Task 0: 프로젝트 스캐폴드 + git init

**Files:**
- Create: `.git/` (git init)
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`
- Create: `app/layout.tsx`, `app/globals.css`, `app/page.tsx` (Next.js 기본 스캐폴드)
- Modify: `.gitignore` (기존 루트 `.gitignore`에 Next.js 빌드 산출물 추가 확인 — `.next/`, `node_modules/`는 이미 있음)

- [ ] **Step 1: git 저장소 초기화**

```bash
git init
git add CLAUDE.md README.md .gitignore docs/ data/ templates/ scripts/ .claude/
git commit -m "chore: initial commit — project docs, data, templates"
```

Expected: `git log --oneline`에 커밋 1개 표시.

- [ ] **Step 2: Next.js 프로젝트 스캐폴드**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --yes
```

Expected: `package.json`, `app/`, `tsconfig.json`, `tailwind.config.ts` 등이 현재 디렉토리에 생성됨. 프롬프트 없이 진행되도록 `--yes` 사용 (Next.js 버전에 따라 일부 플래그명이 다를 수 있음 — 실행 후 `package.json`의 `next` 버전 확인).

- [ ] **Step 2b: 폰트 적용 (DESIGN.md 기준 — system-ui 기본값 대신 Noto Sans KR)**

`app/layout.tsx`를 수정:

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import { Noto_Sans_KR } from 'next/font/google'
import './globals.css'

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: '자격증 기출문제 풀이',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={notoSansKR.variable}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
```

`tailwind.config.ts`의 `theme.extend`에 추가 — 폰트 변수와 함께, DESIGN.md(Cal.com 베이스)의 의미있는 색상 이름도 같이 등록한다:

```typescript
fontFamily: {
  sans: ['var(--font-sans)', 'sans-serif'],
},
// DESIGN.md의 radius 스케일(8/12/16px)은 Tailwind 기본값(rounded-lg=8px, rounded-xl=12px)과
// 한 단계씩 어긋난다 — rounded-md/lg/xl을 명시적으로 재정의해서 코드에 쓴 클래스명이
// DESIGN.md 문서의 의도와 실제 렌더링 픽셀이 일치하게 만든다.
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

- [ ] **Step 3: Vitest 설치 및 설정**

```bash
npm install -D vitest
```

`vitest.config.ts` 생성:

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
})
```

`package.json`의 `scripts`에 추가:

```json
"test": "vitest run"
```

- [ ] **Step 4: 빈 테스트로 셋업 확인**

`lib/setup.test.ts` 임시 생성:

```typescript
import { describe, it, expect } from 'vitest'

describe('setup', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

Run: `npm test`
Expected: PASS (1 test)

이후 `lib/setup.test.ts` 삭제.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.mjs tailwind.config.ts postcss.config.mjs vitest.config.ts app/ .gitignore
git commit -m "chore: scaffold Next.js + Tailwind + Vitest"
```

---

## Task 1: 타입 정의

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: 타입 작성**

```typescript
// lib/types.ts

export interface Question {
  id: string // `${cert}-${round}-${number}` 형식, 예: "유기농업기능사-2016-07-10-001"
  number: number // 문제 번호 (1부터 시작)
  text: string
  choices: [string, string, string, string]
  answer: 1 | 2 | 3 | 4 // 1-indexed 정답 번호
  subject: string // 과목명, 예: "작물재배"
}

export interface ExamMeta {
  certName: string
  totalQuestions: number
  timeLimitMinutes: number
  passingScore: number // 100점 만점 기준 합격 점수
  subjects: string[] // 과목명 목록, 문제 순서와 일치
}

export interface RoundInfo {
  cert: string
  date: string // YYYY-MM-DD
  questionCount: number
}

export interface Attempt {
  cert: string
  round: string
  mode: 'exam' | 'practice'
  answers: Record<number, 1 | 2 | 3 | 4> // key: 문제 번호
  startedAt: number // epoch ms
  remainingSeconds?: number // exam 모드에서만 사용
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add core type definitions"
```

---

## Task 2: raw.md 파서

**Files:**
- Create: `lib/parseExam.ts`
- Test: `lib/parseExam.test.ts`

`raw.md`는 pymupdf로 추출된 텍스트로, 정답 문항은 굵은원문자(❶❷❸❹, U+2776-2779)로, 오답은 평범원문자(①②③④, U+2460-2463)로 표시된다. 과목 구분은 `"N과목 : 과목명"` 형태의 줄이 해당 과목의 마지막 문제 뒤에 등장한다 (예: 19번 문제 뒤에 `"1과목 : 작물재배"`가 나오고, 그 다음 20번부터 2과목).

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// lib/parseExam.test.ts
import { describe, it, expect } from 'vitest'
import { parseExam } from './parseExam'

const SAMPLE = `# 유기농업기능사 2016-07-10 필기 기출문제

- 자격증: 유기농업기능사
- 시행일: 2016-07-10

---

--- page 1 ---
유기농업기능사             ◐2016년 07월 10일 필기 기출문제 ◑
전자문제집 CBT : www.comcbt.com
최강 자격증 기출문제 전자문제집 CBT : www.comcbt.com
1. 잎의 가장자리에 있는 수공에서 물이 나오는 현상은?
   ❶ 일액현상
② 일비현상
   ③ 증산작용
④ Apoplast
2. 작물이 받는 냉해의 종류가 아닌 것은?
   ❶ 생태형냉해
② 지연형냉해
   ③ 병해형냉해
④ 장해형냉해
1과목 : 작물재배
3. 다음 중 토양의 것은?
   ① 보기1
❷ 보기2
   ③ 보기3
④ 보기4
2과목 : 토양관리
`

describe('parseExam', () => {
  it('extracts question text, choices, and 1-indexed answer', () => {
    const questions = parseExam(SAMPLE, '유기농업기능사', '2016-07-10')
    expect(questions).toHaveLength(3)
    expect(questions[0]).toEqual({
      id: '유기농업기능사-2016-07-10-001',
      number: 1,
      text: '잎의 가장자리에 있는 수공에서 물이 나오는 현상은?',
      choices: ['일액현상', '일비현상', '증산작용', 'Apoplast'],
      answer: 1,
      subject: '작물재배',
    })
  })

  it('assigns subject based on the following subject marker', () => {
    const questions = parseExam(SAMPLE, '유기농업기능사', '2016-07-10')
    expect(questions[1].subject).toBe('작물재배')
    expect(questions[2].subject).toBe('토양관리')
  })

  it('detects answer 2 correctly (bold circled digit in second position)', () => {
    const questions = parseExam(SAMPLE, '유기농업기능사', '2016-07-10')
    expect(questions[2].answer).toBe(2)
  })

  it('throws instead of silently defaulting when no bold marker is found', () => {
    const brokenSample = `--- page 1 ---
1. 정답 표시가 깨진 문제
   ① 보기1
① 보기2
   ① 보기3
① 보기4
`
    expect(() => parseExam(brokenSample, '유기농업기능사', '2099-01-01')).toThrow(
      /문항 1.*정답 표시/
    )
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- parseExam`
Expected: FAIL — `Cannot find module './parseExam'`

- [ ] **Step 3: 파서 구현**

```typescript
// lib/parseExam.ts
import type { Question } from './types'

const BOLD_CIRCLED = ['❶', '❷', '❸', '❹']
const PLAIN_CIRCLED = ['①', '②', '③', '④']
const NOISE_LINE_PATTERNS = [
  /^전자문제집 CBT/,
  /^최강 자격증/,
  /^--- page \d+ ---$/,
  /^◐.*◑$/,
]

interface RawBlock {
  number: number
  lines: string[]
}

function stripNoiseLines(raw: string): string[] {
  return raw
    .split('\n')
    .filter((line) => !NOISE_LINE_PATTERNS.some((p) => p.test(line.trim())))
}

function isSubjectMarker(line: string): string | null {
  const m = line.trim().match(/^\d+과목\s*[:：]\s*(.+)$/)
  return m ? m[1].trim() : null
}

function isQuestionStart(line: string): number | null {
  const m = line.trim().match(/^(\d+)\.\s*(.*)$/)
  if (!m) return null
  return Number(m[1])
}

function findChoiceMarker(line: string): { index: number; bold: boolean; rest: string } | null {
  const trimmed = line.trim()
  for (let i = 0; i < 4; i++) {
    if (trimmed.startsWith(BOLD_CIRCLED[i])) {
      return { index: i, bold: true, rest: trimmed.slice(BOLD_CIRCLED[i].length).trim() }
    }
    if (trimmed.startsWith(PLAIN_CIRCLED[i])) {
      return { index: i, bold: false, rest: trimmed.slice(PLAIN_CIRCLED[i].length).trim() }
    }
  }
  return null
}

export function parseExam(raw: string, cert: string, round: string): Question[] {
  const lines = stripNoiseLines(raw)

  // 1단계: 줄을 문제 블록과 과목 마커로 분리
  const blocks: RawBlock[] = []
  const subjectMarkerAfter: Record<number, string> = {} // key: 그 마커 직전 문제 번호
  let current: RawBlock | null = null

  for (const line of lines) {
    const subject = isSubjectMarker(line)
    if (subject !== null) {
      if (current) subjectMarkerAfter[current.number] = subject
      continue
    }
    const qNum = isQuestionStart(line)
    if (qNum !== null) {
      if (current) blocks.push(current)
      current = { number: qNum, lines: [line.trim().replace(/^\d+\.\s*/, '')] }
      continue
    }
    if (current) current.lines.push(line.trim())
  }
  if (current) blocks.push(current)

  // 2단계: 각 블록에서 지문/보기/정답 추출
  const questions: Question[] = []
  for (const block of blocks) {
    const choices: string[] = ['', '', '', '']
    let answer: (1 | 2 | 3 | 4) | null = null // null = 아직 굵은원문자를 못 찾음
    const textParts: string[] = []
    let inChoices = false

    for (const rawLine of block.lines) {
      if (!rawLine) continue
      const marker = findChoiceMarker(rawLine)
      if (marker) {
        inChoices = true
        choices[marker.index] = marker.rest
        if (marker.bold) answer = (marker.index + 1) as 1 | 2 | 3 | 4
        continue
      }
      if (!inChoices) {
        textParts.push(rawLine)
      } else {
        // 줄바꿈으로 쪼개진 보기 텍스트 이어붙이기 (마지막으로 채워진 보기에 덧붙임)
        const lastFilledIndex = choices.reduce(
          (acc, c, i) => (c ? i : acc),
          -1
        )
        if (lastFilledIndex >= 0) {
          choices[lastFilledIndex] = `${choices[lastFilledIndex]}${rawLine}`
        }
      }
    }

    // plan-eng-review에서 지적된 위험: 굵은원문자 인식 실패를 조용히 "1번 정답"으로
    // 처리하면 잘못된 정답이 소리 없이 배포될 수 있다. 표본검수(1% 샘플)로는 놓칠 수
    // 있는 리스크라, 파싱 단계에서 명시적으로 실패시킨다 — 빌드가 막히는 게 틀린
    // 정답이 지인들에게 배포되는 것보다 훨씬 안전하다.
    if (answer === null) {
      throw new Error(
        `${cert}/${round} 문항 ${block.number}: 정답 표시(굵은원문자 ❶❷❸❹)를 찾지 못함`
      )
    }

    questions.push({
      id: `${cert}-${round}-${String(block.number).padStart(3, '0')}`,
      number: block.number,
      text: textParts.join(' ').trim(),
      choices: choices as [string, string, string, string],
      answer,
      subject: '', // 3단계에서 채움
    })
  }

  // 3단계: 과목 마커를 역방향으로 적용 (마커가 나온 시점까지의 문제들에 과목 배정)
  const sortedMarkerPoints = Object.keys(subjectMarkerAfter)
    .map(Number)
    .sort((a, b) => a - b)
  let markerIdx = 0
  let currentSubject = sortedMarkerPoints.length > 0 ? subjectMarkerAfter[sortedMarkerPoints[0]] : ''
  for (const q of questions) {
    while (
      markerIdx < sortedMarkerPoints.length &&
      q.number > sortedMarkerPoints[markerIdx]
    ) {
      markerIdx++
      currentSubject =
        markerIdx < sortedMarkerPoints.length
          ? subjectMarkerAfter[sortedMarkerPoints[markerIdx]]
          : currentSubject
    }
    q.subject = subjectMarkerAfter[sortedMarkerPoints[markerIdx]] ?? currentSubject
  }

  return questions
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- parseExam`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/parseExam.ts lib/parseExam.test.ts
git commit -m "feat: add raw.md parser with subject assignment"
```

**참고 — 알려진 한계 (다음 태스크에서 다룸):** 이 파서는 관찰된 샘플 포맷을 기준으로 작성됨. 실제 52개 파일 전체에 대해 정확히 동작하는지는 Task 3의 표본 검수 단계에서 확인한다. 위 테스트의 "줄바꿈으로 쪼개진 보기" 처리(예: `Ca2` / `+` 분리 케이스)는 최소 사례만 다루며, 실제 파일에서 다른 패턴이 발견되면 이 파서에 케이스를 추가해야 한다.

---

## Task 3: 자격증 메타데이터 + 일괄 생성 스크립트

**Files:**
- Create: `data/exam-questions/유기농업기능사/meta.json`
- Create: `data/exam-questions/종자기능사/meta.json`
- Create: `scripts/generate-questions.ts`
- Test: `lib/examMeta.test.ts`
- Create: `lib/examMeta.ts` (meta.json 검증 스키마)

- [ ] **Step 1: meta.json 작성 (자격증별 시험 규격)**

`data/exam-questions/유기농업기능사/meta.json`:

```json
{
  "certName": "유기농업기능사",
  "totalQuestions": 60,
  "timeLimitMinutes": 60,
  "passingScore": 60,
  "subjects": ["작물재배", "토양관리", "유기농업일반"]
}
```

`data/exam-questions/종자기능사/meta.json`: 동일 구조로 종자기능사 실제 규격에 맞게 작성 (raw.md 원문에서 과목 수/문항 배분을 확인 후 채울 것 — 유기농업기능사와 과목 구성이 다를 수 있음. 확인 전까지 `subjects`는 실제 파일에서 관찰된 과목명을 그대로 사용).

- [ ] **Step 2: 실패하는 테스트 작성 (meta 검증)**

```typescript
// lib/examMeta.test.ts
import { describe, it, expect } from 'vitest'
import { validateExamMeta } from './examMeta'

describe('validateExamMeta', () => {
  it('accepts a well-formed meta object', () => {
    const meta = {
      certName: '테스트자격증',
      totalQuestions: 60,
      timeLimitMinutes: 60,
      passingScore: 60,
      subjects: ['과목1', '과목2'],
    }
    expect(() => validateExamMeta(meta)).not.toThrow()
  })

  it('rejects a meta object missing required fields', () => {
    const meta = { certName: '테스트자격증' }
    expect(() => validateExamMeta(meta)).toThrow()
  })
})
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test -- examMeta`
Expected: FAIL — `Cannot find module './examMeta'`

- [ ] **Step 4: 검증 함수 구현**

```typescript
// lib/examMeta.ts
import type { ExamMeta } from './types'

export function validateExamMeta(value: unknown): asserts value is ExamMeta {
  if (typeof value !== 'object' || value === null) {
    throw new Error('examMeta must be an object')
  }
  const v = value as Record<string, unknown>
  if (typeof v.certName !== 'string') throw new Error('certName must be a string')
  if (typeof v.totalQuestions !== 'number') throw new Error('totalQuestions must be a number')
  if (typeof v.timeLimitMinutes !== 'number') throw new Error('timeLimitMinutes must be a number')
  if (typeof v.passingScore !== 'number') throw new Error('passingScore must be a number')
  if (!Array.isArray(v.subjects) || !v.subjects.every((s) => typeof s === 'string')) {
    throw new Error('subjects must be a string array')
  }
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- examMeta`
Expected: PASS (2 tests)

- [ ] **Step 6: 일괄 생성 스크립트 작성**

```typescript
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

      if (questions.length !== meta.totalQuestions) {
        console.error(
          `FAIL: ${cert}/${round} — expected ${meta.totalQuestions} questions, parsed ${questions.length}`
        )
        failures.push(`${cert}/${round}`)
        continue
      }

      const outPath = join(certDir, round, 'questions.json')
      writeFileSync(outPath, JSON.stringify(questions, null, 2), 'utf-8')
      console.log(`OK: ${cert}/${round} -> questions.json (${questions.length} questions)`)
    }
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length}개 회차 파싱 실패: ${failures.join(', ')}`)
    console.error('해당 회차의 questions.json은 생성되지 않았다 — 파서(lib/parseExam.ts)를 고치고 재실행할 것.')
    process.exit(1)
  }
}

main()
```

문항 수 불일치도 이제 `WARN`이 아니라 `FAIL`이다 — 개수가 안 맞는 회차를 그대로 배포하면 위와 같은 위험(정답 신뢰도 훼손)이 동일하게 있으므로, 표본검수를 기다리지 않고 스크립트 단계에서 즉시 막는다.

`package.json`의 `scripts`에 추가:

```json
"generate-questions": "tsx scripts/generate-questions.ts"
```

```bash
npm install -D tsx
```

- [ ] **Step 7: 스크립트 실행 + 표본 검수**

```bash
npm run generate-questions
```

Expected: 52개 회차 전부 `questions.json` 생성, `WARN` 로그가 없거나 있으면 해당 회차의 파서 처리를 Task 2로 돌아가 보정.

**표본 검수 (PRD에 명시된 QA 단계, 스킵 금지):** 자격증당 회차 3개씩, 총 6개 회차를 무작위로 골라 각 회차의 문제 5개씩(총 30문항)을 원본 `source.pdf`와 생성된 `questions.json`을 나란히 놓고 수동 대조한다. 정답 번호, 보기 텍스트가 원문과 일치하는지 확인. 불일치 발견 시 Task 2 파서를 수정하고 전체 재생성.

- [ ] **Step 8: Commit**

```bash
git add data/exam-questions/*/meta.json scripts/generate-questions.ts lib/examMeta.ts lib/examMeta.test.ts package.json
git commit -m "feat: add exam metadata and batch question generation script"
```

`data/exam-questions/*/*/questions.json`은 생성물이지만 커밋한다 — Task 6-8의 서버 컴포넌트/API 라우트가 `readFileSync`로 빌드 타임/요청 타임에 바로 읽는 구조라, 커밋 없이는 배포 환경에 파일이 존재하지 않는다.

---

## Task 4: localStorage 응시 상태 저장/복원

**Files:**
- Create: `lib/examStorage.ts`
- Test: `lib/examStorage.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// lib/examStorage.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  saveAttempt,
  loadAttempt,
  clearAttempt,
  attemptKey,
  saveResult,
  loadResult,
  clearResult,
} from './examStorage'
import type { Attempt } from './types'

const sampleAttempt: Attempt = {
  cert: '유기농업기능사',
  round: '2016-07-10',
  mode: 'exam',
  answers: { 1: 2, 2: 4 },
  startedAt: 1000,
  remainingSeconds: 3000,
}

describe('examStorage', () => {
  beforeEach(() => {
    const store: Record<string, string> = {}
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v
      },
      removeItem: (k: string) => {
        delete store[k]
      },
    })
  })

  it('saves and loads an attempt round-trip', () => {
    saveAttempt(sampleAttempt)
    const loaded = loadAttempt('유기농업기능사', '2016-07-10', 'exam')
    expect(loaded).toEqual(sampleAttempt)
  })

  it('returns null when no attempt is saved', () => {
    expect(loadAttempt('유기농업기능사', '2016-07-10', 'exam')).toBeNull()
  })

  it('clears a saved attempt', () => {
    saveAttempt(sampleAttempt)
    clearAttempt('유기농업기능사', '2016-07-10', 'exam')
    expect(loadAttempt('유기농업기능사', '2016-07-10', 'exam')).toBeNull()
  })

  it('builds a stable storage key', () => {
    expect(attemptKey('유기농업기능사', '2016-07-10', 'exam')).toBe(
      'exam-attempt:유기농업기능사:2016-07-10:exam'
    )
  })

  it('returns null instead of throwing when stored data is corrupted', () => {
    localStorage.setItem(attemptKey('유기농업기능사', '2016-07-10', 'exam'), '{not valid json')
    expect(loadAttempt('유기농업기능사', '2016-07-10', 'exam')).toBeNull()
  })
})

describe('exam result persistence', () => {
  beforeEach(() => {
    const store: Record<string, string> = {}
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v
      },
      removeItem: (k: string) => {
        delete store[k]
      },
    })
  })

  const sampleResult = {
    correctCount: 40,
    totalCount: 60,
    scorePercent: 67,
    wrongQuestionNumbers: [3, 7, 15],
  }

  it('saves and loads a result round-trip', () => {
    saveResult('유기농업기능사', '2016-07-10', sampleResult)
    expect(loadResult('유기농업기능사', '2016-07-10')).toEqual(sampleResult)
  })

  it('returns null when no result is saved', () => {
    expect(loadResult('유기농업기능사', '2016-07-10')).toBeNull()
  })

  it('clears a saved result', () => {
    saveResult('유기농업기능사', '2016-07-10', sampleResult)
    clearResult('유기농업기능사', '2016-07-10')
    expect(loadResult('유기농업기능사', '2016-07-10')).toBeNull()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- examStorage`
Expected: FAIL — `Cannot find module './examStorage'`

- [ ] **Step 3: 구현**

```typescript
// lib/examStorage.ts
import type { Attempt } from './types'
import type { GradeResult } from './grading'

export function attemptKey(cert: string, round: string, mode: Attempt['mode']): string {
  return `exam-attempt:${cert}:${round}:${mode}`
}

export function saveAttempt(attempt: Attempt): void {
  localStorage.setItem(
    attemptKey(attempt.cert, attempt.round, attempt.mode),
    JSON.stringify(attempt)
  )
}

export function loadAttempt(
  cert: string,
  round: string,
  mode: Attempt['mode']
): Attempt | null {
  const raw = localStorage.getItem(attemptKey(cert, round, mode))
  if (!raw) return null
  try {
    return JSON.parse(raw) as Attempt
  } catch {
    // 손상된 데이터(사파리 프라이빗 모드 등)는 새로 시작한 것으로 취급 — 크래시 대신 조용히 무시
    return null
  }
}

export function clearAttempt(cert: string, round: string, mode: Attempt['mode']): void {
  localStorage.removeItem(attemptKey(cert, round, mode))
}

// 채점 결과는 응시 상태(Attempt)와 별개로 저장한다 — plan-eng-review에서 지적된 대로,
// finishExam()이 clearAttempt를 부르는 순간 결과 화면에서 새로고침하면 결과가 통째로
// 사라지는 문제가 있었다. 결과는 사용자가 "다시풀기" 등 다음 행동을 고를 때만 지운다.
function resultKey(cert: string, round: string): string {
  return `exam-result:${cert}:${round}`
}

export function saveResult(cert: string, round: string, result: GradeResult): void {
  localStorage.setItem(resultKey(cert, round), JSON.stringify(result))
}

export function loadResult(cert: string, round: string): GradeResult | null {
  const raw = localStorage.getItem(resultKey(cert, round))
  if (!raw) return null
  try {
    return JSON.parse(raw) as GradeResult
  } catch {
    return null
  }
}

export function clearResult(cert: string, round: string): void {
  localStorage.removeItem(resultKey(cert, round))
}
```

`GradeResult` 타입은 Task 5(`lib/grading.ts`)에서 정의된다 — `examStorage.ts` 상단 import에 `import type { GradeResult } from './grading'`를 추가해야 함. Task 4는 Task 5보다 먼저 나오지만, 타입 전용 import라 순환참조 문제는 없다 (런타임 의존성 없음).

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- examStorage`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/examStorage.ts lib/examStorage.test.ts
git commit -m "feat: add localStorage attempt persistence"
```

---

## Task 5: 채점 로직

**Files:**
- Create: `lib/grading.ts`
- Test: `lib/grading.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// lib/grading.test.ts
import { describe, it, expect } from 'vitest'
import { gradeAttempt } from './grading'
import type { Question } from './types'

const questions: Question[] = [
  { id: 'q1', number: 1, text: '', choices: ['a', 'b', 'c', 'd'], answer: 2, subject: 's1' },
  { id: 'q2', number: 2, text: '', choices: ['a', 'b', 'c', 'd'], answer: 4, subject: 's1' },
  { id: 'q3', number: 3, text: '', choices: ['a', 'b', 'c', 'd'], answer: 1, subject: 's2' },
]

describe('gradeAttempt', () => {
  it('counts correct and wrong answers, including unanswered as wrong', () => {
    const result = gradeAttempt(questions, { 1: 2, 2: 1 }) // 3번은 미응답
    expect(result.correctCount).toBe(1)
    expect(result.wrongQuestionNumbers).toEqual([2, 3])
    expect(result.scorePercent).toBe(Math.round((1 / 3) * 100))
  })

  it('returns 100 when all answers are correct', () => {
    const result = gradeAttempt(questions, { 1: 2, 2: 4, 3: 1 })
    expect(result.scorePercent).toBe(100)
    expect(result.wrongQuestionNumbers).toEqual([])
  })

  it('returns 0 (not NaN) when there are no questions', () => {
    const result = gradeAttempt([], {})
    expect(result.scorePercent).toBe(0)
    expect(result.wrongQuestionNumbers).toEqual([])
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- grading`
Expected: FAIL — `Cannot find module './grading'`

- [ ] **Step 3: 구현**

```typescript
// lib/grading.ts
import type { Question } from './types'

export interface GradeResult {
  correctCount: number
  totalCount: number
  scorePercent: number
  wrongQuestionNumbers: number[]
}

export function gradeAttempt(
  questions: Question[],
  answers: Record<number, 1 | 2 | 3 | 4>
): GradeResult {
  const wrongQuestionNumbers: number[] = []
  let correctCount = 0

  for (const q of questions) {
    if (answers[q.number] === q.answer) {
      correctCount++
    } else {
      wrongQuestionNumbers.push(q.number)
    }
  }

  return {
    correctCount,
    totalCount: questions.length,
    scorePercent: questions.length === 0 ? 0 : Math.round((correctCount / questions.length) * 100),
    wrongQuestionNumbers,
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- grading`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/grading.ts lib/grading.test.ts
git commit -m "feat: add grading logic"
```

---

## Task 6: 자격증 선택 → 회차 선택 → 모드 선택 페이지

**Files:**
- Create: `app/page.tsx` (자격증 선택)
- Create: `app/[cert]/page.tsx` (회차 선택)
- Create: `app/[cert]/[round]/page.tsx` (모드 선택)
- Create: `lib/getRounds.ts` (파일시스템에서 회차 목록 읽기)
- Test: `lib/getRounds.test.ts`

- [ ] **Step 1: 회차 목록 조회 함수 작성**

에러 상태(High #4)를 여기서부터 막는다: 존재하지 않는 자격증/회차로 접근해도 예외를 던지는 대신 빈 배열 또는 `null`을 반환해서, 페이지 쪽이 `notFound()`로 깔끔하게 처리할 수 있게 한다.

**보안 (plan-eng-review에서 발견):** `cert`/`round`는 URL 파라미터·쿼리 파라미터에서 그대로 들어오는 사용자 입력이다. 검증 없이 `join(ROOT, cert, ...)`에 넣으면 `cert=../../..` 같은 값으로 `data/exam-questions/` 바깥의 임의 경로를 읽으려는 시도(경로 조작)가 가능하다. `certExists`/`roundExists`가 이 프로젝트에서 파일시스템 접근 전 검증을 담당하는 **유일한 통로**가 되도록, 여기서 경로 구분자와 `..`를 먼저 걸러낸다. API 라우트와 모든 동적 라우트 페이지는 파일을 읽기 전에 반드시 이 함수들을 거친다 (Task 7 Step 2, Task 8 Step 4에서 재사용).

```typescript
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
```

- [ ] **Step 1b: 경로 검증 테스트 (Vitest)**

`readdirSync`/`existsSync`가 실제 파일시스템에 의존하므로, `isSafeSegment`의 판단 로직만 별도로 뽑아 순수 함수로 테스트하기는 어렵다 — 대신 `roundExists`/`certExists`를 통합 테스트한다. `data/exam-questions/유기농업기능사/`가 이미 실제로 존재하므로 이를 fixture로 사용한다.

```typescript
// lib/getRounds.test.ts
import { describe, it, expect } from 'vitest'
import { certExists, roundExists } from './getRounds'

describe('경로 검증', () => {
  it('정상 자격증명은 통과한다', () => {
    expect(certExists('유기농업기능사')).toBe(true)
  })

  it('상위 디렉토리 참조가 섞인 값은 거부한다', () => {
    expect(certExists('../../../etc')).toBe(false)
    expect(roundExists('유기농업기능사', '../../../etc/passwd')).toBe(false)
    expect(roundExists('../etc', '2016-07-10')).toBe(false)
  })

  it('경로 구분자가 섞인 값은 거부한다', () => {
    expect(certExists('foo/bar')).toBe(false)
    expect(certExists('foo\\bar')).toBe(false)
  })
})
```

`vitest.config.ts`의 `include`가 `lib/**/*.test.ts`라 이 파일도 자동으로 포함된다.

- [ ] **Step 2: 자격증 선택 페이지**

```tsx
// app/page.tsx
import Link from 'next/link'
import { getCerts } from '@/lib/getRounds'

export default function HomePage() {
  const certs = getCerts()
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-6">자격증 선택</h1>
      {certs.length === 0 ? (
        <p className="text-gray-500 text-sm">
          등록된 자격증이 없습니다. data/exam-questions/ 를 확인해주세요.
        </p>
      ) : (
        <ul className="space-y-3">
          {certs.map((cert) => (
            <li key={cert}>
              <Link
                href={`/${encodeURIComponent(cert)}`}
                className="block rounded-lg bg-surface-card p-4 text-ink hover:bg-gray-200"
              >
                {cert}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
```

- [ ] **Step 3: 회차 선택 페이지**

```tsx
// app/[cert]/page.tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { certExists, getRounds } from '@/lib/getRounds'

export default function RoundListPage({ params }: { params: { cert: string } }) {
  const cert = decodeURIComponent(params.cert)
  if (!certExists(cert)) notFound()

  const rounds = getRounds(cert)
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-6">{cert} — 회차 선택</h1>
      {rounds.length === 0 ? (
        <p className="text-gray-500 text-sm">
          아직 파싱된 회차가 없습니다. questions.json 생성이 필요합니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {rounds.map((r) => (
            <li key={r.date}>
              <Link
                href={`/${encodeURIComponent(cert)}/${r.date}`}
                className="block rounded-lg bg-surface-card p-4 text-ink hover:bg-gray-200"
              >
                {r.date} 시행
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
```

`notFound()`가 Next.js의 기본 404 화면을 띄운다. 프로젝트 톤에 맞는 커스텀 404가 필요하면 `app/not-found.tsx`를 추가할 수 있지만, "가볍게" 스코프에서는 기본 404로 충분 — 지인이 오타 URL을 치는 정도의 엣지케이스라 커스텀 디자인 우선순위는 낮음.

- [ ] **Step 4: 모드 선택 페이지**

```tsx
// app/[cert]/[round]/page.tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { roundExists } from '@/lib/getRounds'

export default function ModeSelectPage({
  params,
}: {
  params: { cert: string; round: string }
}) {
  const { cert, round } = params
  if (!roundExists(decodeURIComponent(cert), round)) notFound()

  const base = `/${cert}/${round}`
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-6">{decodeURIComponent(cert)} {round}</h1>
      <div className="space-y-3">
        <Link
          href={`${base}/exam`}
          className="block rounded-lg border-2 border-red-500 p-4 font-semibold text-red-600 hover:bg-red-50"
        >
          전체 모의고사 (실전 — 타이머, 일괄채점)
        </Link>
        <Link
          href={`${base}/practice`}
          className="block rounded-lg bg-surface-card p-4 text-ink hover:bg-gray-200"
        >
          과목별 연습 (즉시 정오 확인)
        </Link>
      </div>
    </main>
  )
}
```

- [ ] **Step 5: 수동 확인**

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속 → 자격증 클릭 → 회차 클릭 → 모드 선택 화면까지 링크가 끊기지 않고 이어지는지 확인. 존재하지 않는 자격증/회차 URL(예: `/없는자격증`, `/유기농업기능사/9999-99-99`)로 직접 접속했을 때 크래시 없이 404가 뜨는지도 확인.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx "app/[cert]/page.tsx" "app/[cert]/[round]/page.tsx" lib/getRounds.ts lib/getRounds.test.ts
git commit -m "feat: add cert/round/mode selection pages"
```

---

## Task 7: 과목별연습 모드

**Files:**
- Create: `app/[cert]/[round]/practice/page.tsx`
- Create: `components/QuestionList.tsx`

**설계 노트 (plan-design-review에서 발견/수정):** 최초 버전은 `QuestionList`가 선택 답안을 순수 인메모리 `useState`로만 들고 있어서, 새로고침하면 방금 푼 문제가 전부 사라졌다. PRD Approach B는 과목별연습에도 전체모의고사와 동일하게 localStorage 이탈 복구를 요구하는데 빠져 있던 부분 — 여기서 `lib/examStorage.ts`(Task 4)를 붙여 보정한다.

- [ ] **Step 1: QuestionList 컴포넌트 작성 (localStorage 연동 포함)**

```tsx
// components/QuestionList.tsx
'use client'

import { useEffect, useState } from 'react'
import { loadAttempt, saveAttempt } from '@/lib/examStorage'
import type { Question } from '@/lib/types'

export function QuestionList({
  cert,
  round,
  questions,
  subjects,
}: {
  cert: string
  round: string
  questions: Question[]
  subjects: string[]
}) {
  const [selected, setSelected] = useState<Record<number, 1 | 2 | 3 | 4>>({})
  const [activeSubject, setActiveSubject] = useState(subjects[0])

  // 이탈 복구: 마운트 시 저장된 답안이 있으면 불러온다
  useEffect(() => {
    const saved = loadAttempt(cert, round, 'practice')
    if (saved) setSelected(saved.answers)
  }, [cert, round])

  function handleSelect(questionNumber: number, choice: 1 | 2 | 3 | 4) {
    const next = { ...selected, [questionNumber]: choice }
    setSelected(next)
    saveAttempt({ cert, round, mode: 'practice', answers: next, startedAt: Date.now() })
  }

  const visible = questions.filter((q) => q.subject === activeSubject)

  // DESIGN.md 과목 뱃지 파스텔 — 과목 순번대로 순환 적용
  const BADGE_COLORS = ['bg-badge-orange', 'bg-badge-pink', 'bg-badge-violet', 'bg-badge-emerald']

  return (
    <div>
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {subjects.map((s, i) => (
          <button
            key={s}
            onClick={() => setActiveSubject(s)}
            className={`px-3 py-1.5 rounded-full whitespace-nowrap font-medium text-sm ${
              s === activeSubject
                ? `${BADGE_COLORS[i % BADGE_COLORS.length]} text-white`
                : 'bg-surface-soft text-muted'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <ul className="space-y-4">
        {visible.map((q) => (
          <li key={q.id} className="bg-surface-card rounded-lg p-4">
            <p className="font-semibold mb-2 text-ink">
              {q.number}. {q.text}
            </p>
            <div className="space-y-1">
              {q.choices.map((choice, i) => {
                const choiceNum = (i + 1) as 1 | 2 | 3 | 4
                const isSelected = selected[q.number] === choiceNum
                const isAnswered = selected[q.number] !== undefined
                const isCorrectChoice = choiceNum === q.answer
                return (
                  <button
                    key={i}
                    onClick={() => handleSelect(q.number, choiceNum)}
                    className={`block w-full text-left px-3 py-2 rounded-md border bg-white ${
                      isAnswered && isCorrectChoice
                        ? 'border-emerald-500 bg-emerald-50'
                        : isSelected
                          ? 'border-red-500 bg-red-50'
                          : 'border-hairline'
                    }`}
                  >
                    {choiceNum}. {choice}
                  </button>
                )
              })}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

`Attempt` 타입(Task 1)의 `mode`는 이미 `'exam' | 'practice'`로 정의돼 있어 타입 변경 불필요. `examStorage.ts`(Task 4)도 mode를 그대로 키에 포함하므로 exam/practice 저장이 서로 덮어쓰지 않는다. `subjects`는 문항 배열에서 추측하지 않고 `meta.json`의 `subjects`(Task 3, 정식 과목 순서)를 그대로 받는다 — plan-eng-review에서 지적된 대로, `meta.json`에 선언만 되고 아무 데서도 안 쓰이던 필드였다.

- [ ] **Step 2: 페이지에서 questions.json + meta.json 로드 (404 처리 포함)**

```tsx
// app/[cert]/[round]/practice/page.tsx
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { notFound } from 'next/navigation'
import { roundExists } from '@/lib/getRounds'
import { QuestionList } from '@/components/QuestionList'
import type { Question, ExamMeta } from '@/lib/types'

export default function PracticePage({
  params,
}: {
  params: { cert: string; round: string }
}) {
  const { round } = params
  const cert = decodeURIComponent(params.cert)

  // 파일을 열기 전에 반드시 roundExists로 검증한다 (plan-eng-review — 경로 조작 방지,
  // 이게 이 프로젝트에서 파일시스템 접근 전 검증을 담당하는 유일한 통로다)
  if (!roundExists(cert, round)) notFound()

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
```

- [ ] **Step 3: 수동 확인**

`npm run dev` 실행 후 과목별연습 화면 진입 → 문항 클릭 시 정답이면 초록, 오답이면 빨강으로 즉시 표시되는지, 과목 탭 전환이 되는지 확인. 몇 문제 풀고 새로고침했을 때 선택한 답이 그대로 복원되는지도 확인.

- [ ] **Step 4: Commit**

```bash
git add "app/[cert]/[round]/practice/page.tsx" components/QuestionList.tsx
git commit -m "feat: add subject practice mode with instant feedback"
```

---

## Task 8: 전체모의고사 모드 (문항 상세 패널 + OMR 요약 + 타이머 + 일괄채점)

**설계 노트 (sitemap-wireframe 승인 과정에서 발견된 수정):** 최초 플랜은 OMR 그리드에 문항 번호와 선택지 번호만 표시하고 문제 지문/보기 텍스트를 어디에도 렌더링하지 않아, 사용자가 문제를 읽을 방법이 없는 상태였다. 실제 시험은 문제지(지문)와 답안지(OMR)가 종이로 분리되어 동시에 볼 수 있지만, 단일 화면 웹앱에서는 이게 안 된다. 수정안: 화면 상단에 **현재 문항 상세 패널**(지문+보기, 선택하면 그 문항의 답으로 기록)을 두고, 하단에 **작은 OMR 요약 줄**(문항 번호 + 응답 여부만 표시, 탭하면 상세 패널이 그 문항으로 이동)을 배치한다. `OmrGrid`는 답 선택 UI가 아니라 진행률 표시 + 문항 내비게이션 역할로 바뀐다.

**Files:**
- Create: `components/QuestionDetail.tsx` (신규 — 현재 문항 지문/보기 + 답 선택)
- Create: `components/OmrGrid.tsx` (역할 변경 — 문항 번호 내비게이션 + 응답 진행률 요약)
- Create: `components/ExamTimer.tsx`
- Create: `app/[cert]/[round]/exam/page.tsx`

- [ ] **Step 1: ExamTimer 컴포넌트**

```tsx
// components/ExamTimer.tsx
'use client'

import { useEffect, useState } from 'react'

export function ExamTimer({
  remainingSeconds,
  onExpire,
  onTick,
}: {
  remainingSeconds: number
  onExpire: () => void
  onTick: (remaining: number) => void
}) {
  const [remaining, setRemaining] = useState(remainingSeconds)
  const [tenseAnnounced, setTenseAnnounced] = useState(false)

  useEffect(() => {
    if (remaining <= 0) {
      onExpire()
      return
    }
    const timer = setTimeout(() => {
      const next = remaining - 1
      setRemaining(next)
      onTick(next)
    }, 1000)
    return () => clearTimeout(timer)
  }, [remaining, onExpire, onTick])

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const isTense = remaining <= 600 // 잔여 10분 이하

  useEffect(() => {
    if (isTense) setTenseAnnounced(true)
  }, [isTense])

  return (
    <>
      {/* 매초 갱신되는 숫자는 aria-live를 달지 않는다 — 초 단위로 낭독되면 소음이 된다.
          잔여 10분 진입 "전환"만 한 번 별도 라이브 리전으로 알린다. */}
      <div
        aria-label={`남은 시간 ${minutes}분 ${seconds}초`}
        className={`text-2xl font-mono font-semibold px-4 py-2 rounded-md ${
          isTense ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-surface-soft text-ink'
        }`}
      >
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>
      <span className="sr-only" aria-live="polite">
        {isTense && !tenseAnnounced ? '잔여 시간 10분 이하입니다' : ''}
      </span>
    </>
  )
}
```

(원래 있던 `totalSeconds` prop은 컴포넌트 내부 어디에서도 쓰이지 않는 죽은 코드였다 — 삭제. 실제 제한시간은 `remainingSeconds`의 초기값으로만 전달된다.)

**설계 결정 — 타이머 일시정지 정책 (plan-design-review에서 명문화):** `remainingSeconds`는 마지막 저장값 그대로 복원된다. 즉 탭을 닫아두면 실제 경과 시간과 무관하게 남은 시간이 그대로 보존되어, 사실상 무제한 일시정지가 가능하다. 이건 버그가 아니라 의도된 선택이다 — 이 앱은 지인 그룹 대상 캐주얼 몰입감 앱이지 부정행위 방지가 필요한 진짜 시험이 아니므로, `startedAt` 기준 벽시계 경과시간으로 강제 계산하는 건 과잉 엔지니어링이다. 나중에 "왜 일시정지가 되지?"라는 질문이 나오면 이 문단을 참조.

- [ ] **Step 2a: QuestionDetail 컴포넌트 (문항 지문 + 답 선택)**

```tsx
// components/QuestionDetail.tsx
'use client'

import type { Question } from '@/lib/types'

export function QuestionDetail({
  question,
  selected,
  onSelect,
}: {
  question: Question
  selected: 1 | 2 | 3 | 4 | undefined
  onSelect: (choice: 1 | 2 | 3 | 4) => void
}) {
  return (
    <div className="bg-surface-card rounded-lg p-4">
      <p className="font-semibold mb-3 text-ink">
        {question.number}. {question.text}
      </p>
      <div className="space-y-2">
        {question.choices.map((choice, i) => {
          const choiceNum = (i + 1) as 1 | 2 | 3 | 4
          return (
            <button
              key={i}
              onClick={() => onSelect(choiceNum)}
              aria-pressed={selected === choiceNum}
              className={`block w-full text-left px-3 py-2 rounded-md border bg-white ${
                selected === choiceNum
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-hairline'
              }`}
            >
              {choiceNum}. {choice}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

정답/오답 색상 표시는 여기 없다 — 전체모의고사는 일괄채점이 원칙이라, 선택 여부(파란색)만 보여주고 정오는 제출 후 결과 화면에서만 공개한다 (과목별연습의 즉시피드백과의 차이점).

- [ ] **Step 2b: OmrGrid 컴포넌트 (문항 내비게이션 + 진행률 요약)**

```tsx
// components/OmrGrid.tsx
'use client'

import type { Question } from '@/lib/types'

export function OmrGrid({
  questions,
  answers,
  currentQuestionNumber,
  onNavigate,
}: {
  questions: Question[]
  answers: Record<number, 1 | 2 | 3 | 4>
  currentQuestionNumber: number
  onNavigate: (questionNumber: number) => void
}) {
  return (
    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
      {questions.map((q) => {
        const isAnswered = answers[q.number] !== undefined
        const isCurrent = q.number === currentQuestionNumber
        return (
          <button
            key={q.id}
            onClick={() => onNavigate(q.number)}
            aria-label={`${q.number}번 문항, ${isAnswered ? '응답완료' : '미응답'}`}
            aria-current={isCurrent ? 'true' : undefined}
            className={`min-h-11 min-w-11 text-xs rounded-md border bg-white ${
              isCurrent
                ? 'border-2 border-blue-500 font-semibold text-ink'
                : isAnswered
                  ? 'bg-blue-50 border-blue-300 text-ink'
                  : 'border-hairline text-gray-400'
            }`}
          >
            {q.number}
          </button>
        )
      })}
    </div>
  )
}
```

`min-h-11 min-w-11`은 Tailwind 기본 스케일에서 44px(`11 * 4px = 44px`)로, 모바일 터치 영역 최소 기준을 충족한다. `grid-cols-6`(모바일) → `sm:grid-cols-8` → `md:grid-cols-10`(데스크탑)으로 화면 폭에 따라 열 수를 줄여서, 60문항이 좁은 화면에서도 각 셀이 44px 밑으로 눌리지 않게 한다.

**설계 노트 (plan-design-review에서 추가된 상태들):** 최초 버전은 로딩 상태가 "문제를 불러오는 중..." 문구뿐이었고, API 실패 시 그 문구에서 영원히 멈췄다. 제출도 확인 없이 즉시 채점됐고, 결과 화면엔 합격/불합격 판정과 다음 행동 버튼이 없었다. 오래 방치된 저장 데이터를 아무 안내 없이 덮어씌우는 문제도 있었다. 아래 코드는 이 문제들을 전부 반영한 최종 버전이다.

- [ ] **Step 3: 전체모의고사 페이지 (상태관리 + localStorage 연동 + 자동제출 + 에러/재개 처리)**

```tsx
// app/[cert]/[round]/exam/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { OmrGrid } from '@/components/OmrGrid'
import { QuestionDetail } from '@/components/QuestionDetail'
import { ExamTimer } from '@/components/ExamTimer'
import { loadAttempt, saveAttempt, clearAttempt, saveResult, loadResult, clearResult } from '@/lib/examStorage'
import { gradeAttempt, type GradeResult } from '@/lib/grading'
import type { Question } from '@/lib/types'

type FetchedExam = { questions: Question[]; timeLimitMinutes: number; passingScore: number }
type PageStatus = 'loading' | 'error' | 'resume-prompt' | 'active' | 'result'

export default function ExamPage() {
  const params = useParams<{ cert: string; round: string }>()
  const cert = decodeURIComponent(params.cert)
  const round = params.round

  const [status, setStatus] = useState<PageStatus>('loading')
  const [exam, setExam] = useState<FetchedExam | null>(null)
  const [answers, setAnswers] = useState<Record<number, 1 | 2 | 3 | 4>>({})
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [result, setResult] = useState<GradeResult | null>(null)

  function load() {
    setStatus('loading')
    fetch(`/api/questions?cert=${encodeURIComponent(cert)}&round=${round}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<FetchedExam>
      })
      .then((data) => {
        setExam(data)

        // 이미 채점된 결과가 있으면 (제출 직후 새로고침 등) 그 결과를 그대로 복원한다 —
        // plan-eng-review에서 지적된 버그: 예전엔 finishExam이 clearAttempt만 부르고
        // 결과 자체는 어디에도 저장하지 않아서, 결과 화면 직후 새로고침하면 60문항을
        // 처음부터 다시 풀어야 했다.
        const savedResult = loadResult(cert, round)
        if (savedResult) {
          setResult(savedResult)
          setStatus('result')
          return
        }

        const saved = loadAttempt(cert, round, 'exam')
        if (saved && Object.keys(saved.answers).length > 0) {
          // 방치된 시험 재진입 — 조용히 덮어쓰지 않고 사용자에게 묻는다 (High #5)
          setStatus('resume-prompt')
        } else {
          setRemainingSeconds(data.timeLimitMinutes * 60)
          setStatus('active')
        }
      })
      .catch(() => setStatus('error'))
  }

  useEffect(load, [cert, round])

  function resumeSaved() {
    const saved = loadAttempt(cert, round, 'exam')
    if (saved && exam) {
      setAnswers(saved.answers)
      setRemainingSeconds(saved.remainingSeconds ?? exam.timeLimitMinutes * 60)
    }
    setStatus('active')
  }

  function startFresh() {
    clearAttempt(cert, round, 'exam')
    clearResult(cert, round)
    setResult(null)
    setAnswers({})
    setCurrentQuestionNumber(1)
    if (exam) setRemainingSeconds(exam.timeLimitMinutes * 60)
    setStatus('active')
  }

  function leaveResult() {
    // 결과를 보고 다른 화면(과목별연습/회차선택)으로 이동할 때는 결과를 지운다 —
    // "다시 풀기"가 아니라 결과 확인이 끝났다는 사용자의 명시적 신호이므로.
    clearResult(cert, round)
  }

  function handleSelect(choice: 1 | 2 | 3 | 4) {
    const next = { ...answers, [currentQuestionNumber]: choice }
    setAnswers(next)
    saveAttempt({
      cert,
      round,
      mode: 'exam',
      answers: next,
      startedAt: Date.now(),
      remainingSeconds,
    })
  }

  function finishExam() {
    if (!exam) return
    const graded = gradeAttempt(exam.questions, answers)
    setResult(graded)
    setStatus('result')
    saveResult(cert, round, graded) // 결과는 다음 행동을 고를 때까지 남겨둔다
    clearAttempt(cert, round, 'exam') // 진행 중이던 답안/타이머는 더 이상 필요 없음
  }

  function handleSubmitClick() {
    if (!exam) return
    const unanswered = exam.questions.length - Object.keys(answers).length
    const message =
      unanswered > 0
        ? `미응답 ${unanswered}문항이 있습니다. 제출하시겠습니까?`
        : '제출하시겠습니까?'
    if (window.confirm(message)) finishExam()
  }

  if (status === 'loading') {
    return <main className="mx-auto max-w-2xl p-6">문제를 불러오는 중...</main>
  }

  if (status === 'error') {
    return (
      <main className="mx-auto max-w-2xl p-6 text-center">
        <p className="text-red-600 mb-4">문제를 불러오지 못했습니다.</p>
        <button onClick={load} className="rounded-md border border-hairline px-4 py-2 text-ink">
          다시 시도
        </button>
      </main>
    )
  }

  if (status === 'resume-prompt') {
    return (
      <main className="mx-auto max-w-md p-6 text-center">
        <p className="mb-4 text-ink">이전에 시작한 시험이 있습니다.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={resumeSaved} className="rounded-md bg-blue-500 text-white px-4 py-2 font-semibold">
            이어풀기
          </button>
          <button onClick={startFresh} className="rounded-md border border-hairline px-4 py-2 text-ink">
            새로 시작
          </button>
        </div>
      </main>
    )
  }

  if (status === 'result' && result && exam) {
    const passed = result.scorePercent >= exam.passingScore
    return (
      <main className="mx-auto max-w-md p-6">
        <h1 className="text-2xl font-semibold mb-4 text-ink">결과</h1>
        <div
          className={`rounded-xl p-6 text-center mb-4 shadow-sm ${
            passed ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
          }`}
        >
          <p className="text-3xl font-semibold mb-1">{passed ? '합격' : '불합격'}</p>
          <p className="text-lg">
            {result.correctCount} / {result.totalCount} 정답 ({result.scorePercent}점 · 합격선{' '}
            {exam.passingScore}점)
          </p>
        </div>
        <p className="text-sm text-muted mb-6">
          오답 문항: {result.wrongQuestionNumbers.join(', ') || '없음'}
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={startFresh}
            className="rounded-md bg-blue-500 text-white py-3 font-semibold"
          >
            다시 풀기
          </button>
          <Link
            href={`/${encodeURIComponent(cert)}/${round}/practice`}
            onClick={leaveResult}
            className="rounded-md border border-hairline py-3 text-center text-ink"
          >
            과목별 연습으로
          </Link>
          <Link
            href={`/${encodeURIComponent(cert)}`}
            onClick={leaveResult}
            className="rounded-md border border-hairline py-3 text-center text-ink"
          >
            회차 선택으로
          </Link>
        </div>
      </main>
    )
  }

  if (!exam) return null // active 상태인데 exam이 없는 경우는 발생하지 않지만 타입 좁히기용
  const currentQuestion = exam.questions.find((q) => q.number === currentQuestionNumber)
  if (!currentQuestion) return null

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold text-ink">전체 모의고사</h1>
        <ExamTimer
          remainingSeconds={remainingSeconds}
          onExpire={finishExam}
          onTick={(r) => {
            setRemainingSeconds(r)
            saveAttempt({ cert, round, mode: 'exam', answers, startedAt: Date.now(), remainingSeconds: r })
          }}
        />
      </div>

      {/* 상세 패널 — 현재 문항의 지문/보기, 여기서 답을 선택 */}
      <QuestionDetail
        question={currentQuestion}
        selected={answers[currentQuestionNumber]}
        onSelect={handleSelect}
      />

      <div className="flex justify-between mt-4">
        <button
          onClick={() => setCurrentQuestionNumber((n) => Math.max(1, n - 1))}
          disabled={currentQuestionNumber === 1}
          className="rounded-md border border-hairline px-4 py-2 text-ink disabled:opacity-40"
        >
          이전
        </button>
        <button
          onClick={() => setCurrentQuestionNumber((n) => Math.min(exam.questions.length, n + 1))}
          disabled={currentQuestionNumber === exam.questions.length}
          className="rounded-md border border-hairline px-4 py-2 text-ink disabled:opacity-40"
        >
          다음
        </button>
      </div>

      {/* OMR 요약 — 문항 번호 탭하면 상세 패널이 그 문항으로 이동 */}
      <div className="mt-6">
        <OmrGrid
          questions={exam.questions}
          answers={answers}
          currentQuestionNumber={currentQuestionNumber}
          onNavigate={setCurrentQuestionNumber}
        />
      </div>

      <button
        onClick={handleSubmitClick}
        className="mt-6 w-full rounded-md bg-red-500 text-white py-3 font-semibold"
      >
        제출하고 채점하기
      </button>
    </main>
  )
}
```

타이머 만료(`onExpire`)는 `handleSubmitClick`이 아니라 `finishExam`을 직접 호출한다 — 자동제출은 실전 룰이므로 확인 절차 없이 그대로 진행된다는 뜻이다 (사용자가 확정한 동작).

**참고:** `/api/questions` 라우트는 클라이언트 컴포넌트에서 서버 파일시스템에 직접 접근할 수 없어서 필요함. Step 3의 `fetch` 처리부가 `{ questions, timeLimitMinutes, passingScore }` 형태의 응답과 non-2xx 상태 코드를 기대하므로, 라우트도 여기 맞춰 작성한다.

- [ ] **Step 4: questions API 라우트 (문항 + 제한시간 + 합격기준 반환, 404/500 처리)**

```typescript
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
```

- [ ] **Step 5: 수동 확인**

`npm run dev` → 전체모의고사 진입 → 상세 패널에 문제 지문/보기가 보이는지, 답 선택 시 파란색으로 표시되는지, 이전/다음 버튼과 하단 OMR 요약 탭으로 문항 이동이 되는지 확인. 몇 문항 풀고 새로고침하면 "이전에 시작한 시험이 있습니다" 화면이 뜨는지, 이어풀기/새로시작이 각각 의도대로 동작하는지 확인. 제출 버튼 클릭 시 미응답 개수가 포함된 확인창이 뜨는지, 확인 후 결과 화면에 합격/불합격이 정확히 표시되는지, 결과 화면의 세 버튼(다시풀기/과목별연습/회차선택)이 동작하는지 확인. 타이머 만료 자동제출은 `remainingSeconds`를 임시로 5초로 낮춰서 확인 없이 바로 채점되는지 확인. 존재하지 않는 회차로 `/api/questions`를 직접 호출해 404가 오는지, 개발자도구로 네트워크를 차단하고 진입해 "다시 시도" 버튼이 뜨는지도 확인. 500 경로 확인: 임시로 아무 `questions.json` 파일 내용을 깨진 JSON으로 바꾸고 해당 회차의 `/api/questions`를 호출해 500이 오는지, 클라이언트가 "다시 시도" 상태로 정상 전환되는지 확인한 뒤 파일을 원복. 결과 유지 확인: 제출해서 결과 화면이 뜬 직후 새로고침 → 결과가 그대로 유지되는지, "다시 풀기"/"과목별 연습으로"/"회차 선택으로" 중 하나를 누른 뒤에는 결과가 지워지고 새로 진입 시 처음부터 시작하는지 확인.

- [ ] **Step 6: Commit**

```bash
git add components/OmrGrid.tsx components/QuestionDetail.tsx components/ExamTimer.tsx "app/[cert]/[round]/exam/page.tsx" app/api/questions/route.ts
git commit -m "feat: add full mock exam mode with question detail panel, OMR navigator, timer, resume prompt, submit confirmation, and pass/fail result"
```

---

## Task 9: Vercel 배포

**설계 노트 (plan-eng-review에서 발견):** PRD Distribution Plan은 "구체적 배포 파이프라인은 writing-plans 단계에서 결정"이라 했지만 Task 0-8은 로컬 개발까지만 다뤘다. PRD Success Criteria("지인 3명에게 링크를 보내서...")는 실제 배포 없이는 검증 불가능하므로 여기서 채운다.

**Files:**
- Create: 없음 (Vercel CLI/대시보드 연결만)

- [ ] **Step 1: Vercel 프로젝트 연결**

```bash
npx vercel login
npx vercel link
```

Expected: 프로젝트가 Vercel 계정에 연결되고 `.vercel/` 디렉토리 생성됨 (이미 `.gitignore`의 Node 섹션에 준하는 빌드 산출물 규칙이 있으니, `.vercel/`도 `.gitignore`에 추가).

- [ ] **Step 2: 배포**

```bash
npx vercel --prod
```

Expected: 배포 URL 출력. 브라우저로 접속해 자격증 선택 → 회차 선택 → 전체모의고사 진입까지 실제 배포 환경에서 확인.

- [ ] **Step 3: `data/exam-questions/**/questions.json` 커밋 여부 재확인**

Task 3에서 이미 "커밋함"으로 확정했으므로, `git status`로 `questions.json` 파일들이 실제로 커밋에 포함돼 있는지 배포 전 확인 (누락 시 배포 환경에서 모든 회차가 404).

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "chore: add Vercel deployment config"
```

PRD Success Criteria 검증은 이 배포 URL을 지인 3명에게 보내는 것으로 완료된다 — 코드 작업은 아니므로 별도 자동화 태스크 없음.

---

## Self-Review 결과 (작성자가 직접 수행)

- **스펙 커버리지**: PRD의 전체모의고사(OMR+타이머+일괄채점+이탈복구), 과목별연습(즉시피드백), 데이터 소싱(52회차 파싱+표본검수), 자격증별 메타데이터(meta.json) 요구사항 모두 Task 0-8에 매핑됨. PRD Open Questions(오답노트, 서버저장, 해설, 오프라인, 그룹 리더보드)는 의도적으로 이 플랜 스코프 밖 — Approach B 1차 릴리즈 범위와 일치.
- **sitemap-wireframe 승인 과정에서 발견/수정된 이슈**: 최초 Task 8은 OMR 그리드에 문항 번호+선택지 번호만 그리고 문제 지문/보기를 어디에도 보여주지 않아 실제로는 쓸 수 없는 화면이었다. `QuestionDetail` 컴포넌트(지문+보기 상세 패널)를 추가하고 `OmrGrid`를 답 선택용에서 내비게이션/진행률 요약용으로 역할을 바꿔 수정함.
- **plan-design-review에서 발견/수정된 이슈 (독립 서브에이전트 리뷰 기반)**: (1) 결과 화면에 `meta.passingScore` 기반 합격/불합격 판정과 다음 행동 버튼(다시풀기/과목별연습/회차선택) 추가 — 원래는 점수 2줄만 있는 dead-end였음. (2) 과목별연습(`QuestionList`)에 PRD가 요구한 localStorage 이탈복구가 빠져있어 추가. (3) 시험 제출 전 미응답 개수 확인창 추가(타이머 만료 자동제출은 예외). (4) 오래 방치된 시험 재진입 시 조용히 덮어쓰지 않고 "이어풀기/새로시작" 선택지 추가. (5) API 라우트 404/500 처리, 서버 컴포넌트 `notFound()`, 클라이언트 fetch 에러+재시도 상태 추가 — 전부 비어있었음. (6) OMR 그리드 모바일 터치 영역을 44px 이상으로, 반응형 열 수 조정. (7) `examStorage.loadAttempt`에 JSON.parse try/catch 추가. (8) 타이머 탭-닫힘 시 사실상 무제한 일시정지되는 동작을 의도된 것으로 플랜에 명문화. (9) `ExamTimer`의 미사용 `totalSeconds` prop 제거. (10) `DESIGN.md` 신설 — system-ui 기본 폰트 대신 Noto Sans KR 지정, 색상/간격/터치영역 토큰 문서화. (11) OMR 그리드/문항상세/타이머에 `aria-label`/`aria-pressed`/`aria-live` 추가 — 스크린리더로 진행상황·선택상태·긴장구간 진입을 인지 가능하게.
- **플레이스홀더 스캔**: "TBD"/"나중에" 표현 없음. 종자기능사 meta.json의 `subjects` 항목만 "실제 파일에서 관찰된 과목명을 그대로 사용"이라고 되어 있는데, 이는 실제 자격증 실행 시 raw.md를 읽어야 알 수 있는 값이라 플레이스홀더가 아니라 Task 3 실행 시점에 확인 가능한 실데이터 참조임.
- **타입 일관성**: `Question`, `ExamMeta`, `Attempt`, `GradeResult` 타입이 Task 1에서 한 번 정의되고 이후 태스크에서 동일하게 재사용됨 (`answer: 1|2|3|4`, `choices: [string,string,string,string]` 등 함수 시그니처 일치 확인).

## DESIGN.md v2 반영 (Cal.com 베이스 리스킨)

plan-eng-review CLEARED 이후, `DESIGN.md`를 Cal.com 디자인 시스템(`design-md/cal/`) 기반으로 다시 작성하고 이 플랜의 모든 컴포넌트 코드(Task 6/7/8)를 새 토큰에 맞춰 갱신함 — 잉크블랙(`#111111`) 중립색, `surface-card`(#f5f5f5) 배경 레이어(테두리선 대신), radius 계층(8/12/16px, `tailwind.config.ts`에 명시적 재정의 필요 — Tailwind 기본 rounded-lg/xl과 한 단계 어긋남), 과목 뱃지 파스텔 4색. 기능/아키텍처 변경 없는 순수 시각 리스킨이라 plan-eng-review/plan-design-review를 재실행하지 않음. `docs/wireframes/cert-exam-app-sitemap.html`(구조 승인용 저해상도 와이어프레임)은 의도적으로 갱신하지 않음 — 색상 대신 회색 박스로 구조만 보여주는 용도라 최종 비주얼과 무관.

## Rollback 전략

각 태스크는 독립 커밋이므로, 문제가 생기면 `git revert <commit>`으로 개별 되돌리기 가능. Task 3(데이터 생성)은 `questions.json`이 커밋되므로, 파서 버그 발견 시 Task 2로 돌아가 파서를 고치고 `npm run generate-questions`를 다시 실행 + 재커밋하면 됨 (원본 `raw.md`/`source.pdf`는 건드리지 않으므로 데이터 손실 위험 없음).

---

## plan-design-review 결과

### NOT in scope
- 그룹 리더보드 (Approach C) — office-hours/PRD 단계에서 이미 1차 스코프 밖으로 결정. `TODOS.md`에 기록.
- 오답 문항 상세 리뷰 화면(정답 공개) — 결과 화면에 다음행동 버튼은 추가했지만, 문항별 리뷰 화면은 별도 기능으로 이연. `TODOS.md`에 기록.
- AI 자동 해설 생성, 서버 저장/로그인, 오프라인 지원 — PRD Open Questions에서 이미 결정된 1차 스코프 제외 사항.
- 커스텀 404 페이지 — Next.js 기본 404로 충분, `TODOS.md`에 기록.
- 벽시계 기준 타이머(탭 닫으면 일시정지되는 현재 방식 대신) — 캐주얼 몰입감 우선으로 의도적 유지, `TODOS.md`에 기록.
- 채점 방식 자유 토글(모드별 고정값 대신) — office-hours 단계에서 "가볍게" 제약과의 충돌을 이유로 이미 축소 결정.

### What already exists
이 프로젝트는 완전 신규 스캐폴드라 재사용할 기존 UI 패턴/컴포넌트가 없다. `DESIGN.md`도 이번 리뷰에서 처음 생성됨 — 이후 화면·자격증이 늘어나면 여기서부터 "기존 패턴"이 쌓인다.

### TODOS.md updates
사용자 승인 하에 `TODOS.md` 신설, 5개 항목 기록: 오답 리뷰 화면, 그룹 리더보드, AI 자동 해설, 커스텀 404, 벽시계 기준 타이머 전환.

## Implementation Tasks

이번 리뷰에서 발견된 critical/high/medium 이슈는 전부 플랜 자체(Task 4, 6, 7, 8, DESIGN.md)에 직접 반영되었다 — 별도로 남겨둘 구현 태스크가 없다. 실제 구현 시 각 Task의 코드를 그대로 따라가면 이번 리뷰의 수정사항이 전부 포함된다.

_No new tasks — all findings resolved inline in the plan._

## Completion Summary

```
+====================================================================+
|         DESIGN PLAN REVIEW — COMPLETION SUMMARY                    |
+====================================================================+
| System Audit         | DESIGN.md 없었음(신설함) / UI 스코프: 전체    |
| Step 0               | 초기 5/10, 포커스: 7개 차원 전부              |
| Pass 1  (Info Arch)  | 5/10 → 8/10 (결과화면 합격판정 추가)          |
| Pass 2  (States)     | 3/10 → 8/10 (에러/로딩/이탈복구 전부 추가)    |
| Pass 3  (Journey)    | 4/10 → 8/10 (확인모달 + dead-end 해소)        |
| Pass 4  (AI Slop)    | 6/10 → 8/10 (Noto Sans KR로 폰트 교체)        |
| Pass 5  (Design Sys) | 0/10 → 7/10 (DESIGN.md 신설)                  |
| Pass 6  (Responsive) | 4/10 → 8/10 (44px 터치영역 + ARIA)            |
| Pass 7  (Decisions)  | 10 resolved, 0 unresolved (5건 TODOS.md 이연) |
+--------------------------------------------------------------------+
| NOT in scope         | written (6 items)                            |
| What already exists  | written                                      |
| TODOS.md updates     | 5 items added                                |
| Approved Mockups     | 0 generated (design binary 미설치, 와이어프레임으로 대체) |
| Decisions made       | 10 added to plan                             |
| Decisions deferred   | 0 (전부 TODOS.md로 명시적 이연, 미해결 아님)    |
| Overall design score | 5/10 → 8/10                                  |
+====================================================================+
```

### Unresolved Decisions
없음 — 모든 AskUserQuestion에 응답 완료. 스코프 밖으로 이연한 항목은 전부 `TODOS.md`에 명시적으로 기록됨(침묵 생략 아님).

## Next Steps — Review Chaining (Design Review 시점 기록)

Design Review는 방금 완료(score 8/10). 다음 단계로 **Eng Review(`/plan-eng-review`)**가 필요하다 — 아직 실행 안 됨, 이 프로젝트의 필수 게이트. 이번 Design Review에서 상태관리(resume-prompt, 확인모달)와 API 에러처리 등 아키텍처에 영향 있는 변경이 있었으니, Eng Review가 이 구조를 검증해야 한다.

(이후 Eng Review 실행 완료 — 아래 섹션 참고)

---

## plan-eng-review 결과

### Step 0: Scope Challenge
25개+ 파일이 스코프 스멜 기준(8개+)을 넘었으나, 빈 저장소에서 앱 하나를 처음부터 만드는 플랜의 자연스러운 파일 수라고 판단 — 사용자 확인 후 하나의 플랜으로 유지, 분리하지 않음.

### Architecture Review — 2 issues found, 둘 다 반영
1. **[P1] (confidence: 9/10)** `app/api/questions/route.ts` + 동적 라우트 페이지들 — `cert`/`round` 쿼리·URL 파라미터가 검증 없이 파일 경로에 들어가 경로 조작(path traversal) 가능. **수정**: `lib/getRounds.ts`에 `isSafeSegment()` 추가, `certExists`/`roundExists`가 모든 파일시스템 접근의 유일한 검증 통로가 되도록 통일. `lib/getRounds.test.ts` 신규 추가로 경로조작/구분자 거부 케이스 테스트.
2. **[P2] (confidence: 7/10)** 배포 태스크가 플랜에 없었음 (PRD Success Criteria가 실제 배포 없이는 검증 불가). **수정**: Task 9 (Vercel 배포) 추가.

### Code Quality Review — 1 issue found (Architecture #1과 동일 원인, 함께 해결)
API 라우트가 `getRounds.ts`의 검증 로직을 재사용하지 않고 `ROOT` 경로를 독자적으로 재구성하던 중복 — `roundExists()` 하나로 통일해 검증 로직이 한 곳에만 존재하도록 정리.

### Test Review
다이어그램은 위 Section 3 대화 내용 참고 (요약: 순수 함수 전부 유닛테스트, `getRounds.test.ts` 신규 3케이스, `grading.test.ts` 0문항 엣지케이스 추가, `parseExam.test.ts` 정답인식 실패 케이스 추가, `examStorage.test.ts`에 결과 저장/복원 3케이스 추가). REGRESSION RULE 해당 없음(그린필드 앱).

### Performance Review
No issues found.

### Outside Voice — Claude 서브에이전트 (Codex 미설치로 대체)
7개 지적 중: 5개 실제 결함으로 확인·반영(정답 파싱 안전장치, 결과 유지 버그, subjects 필드 정리는 즉시 수정 / 정적생성 재설계는 TODOS.md 이연 / 비례성 지적은 그대로 수용), 1개는 리뷰 진행 중 문서 상태를 오독한 것(리뷰이력 "모순"), 정적 파일 구조 재설계(#3)는 이미 만든 방어코드를 되돌리는 비용을 이유로 지금은 보류.

CROSS-MODEL TENSION 해소 기록: 4-3(정적생성 vs 동적+방어코드)만 유일하게 진짜 텐션이었고, 사용자가 B(현행 유지)를 선택 — 재론하지 않음.

### NOT in scope
- **정적 생성(generateStaticParams) 재설계** — outside voice 제안, TODOS.md에 기록. 이미 경로검증+테스트를 만든 상태라 지금 되돌리는 비용이 이득보다 큼.
- **raw.md 포맷 52회차 전수 사전검토** — Task 3의 표본검수(6회차 30문항) + 이번에 강화된 `parseExam()`의 명시적 실패(정답 인식 실패 시 throw)로 충분히 보완된다고 판단. 전수조사는 안 함.
- **오답 리뷰 화면 / 그룹 리더보드 / AI 해설 / 커스텀 404** — plan-design-review에서 이미 TODOS.md로 이연됨, 여기서 재론 안 함.

### What already exists
plan-design-review에서 만든 `DESIGN.md`, `TODOS.md`를 그대로 재사용. 신규 추가 코드(`lib/getRounds.test.ts`, Task 9)는 기존 파일 구조·네이밍 컨벤션을 그대로 따름 — 새 패턴 도입 없음.

### Diagrams

`ExamPage`의 상태 전이가 이 플랜에서 가장 복잡한 상태 머신이라 다이어그램으로 남긴다 (구현 시 `app/[cert]/[round]/exam/page.tsx` 상단 주석으로 옮기는 걸 권장, 필수는 아님):

```
loading --(fetch 성공, 저장된 result 있음)--------> result
loading --(fetch 성공, 저장된 답안 있음)-----------> resume-prompt
loading --(fetch 성공, 아무것도 없음)---------------> active
loading --(fetch 실패)-----------------------------> error
error --(다시시도 클릭)-----------------------------> loading
resume-prompt --(이어풀기)--------------------------> active
resume-prompt --(새로시작)--------------------------> active (초기화됨)
active --(제출 확인 모달 승인 또는 타이머만료)----------> result
result --(다시풀기)----------------------------------> active (결과 삭제)
result --(과목별연습/회차선택 이동)---------------------> (결과 삭제 후 페이지 이탈)
```

### Failure modes

| 코드패스 | 실패 시나리오 | 테스트? | 에러처리? | 사용자 경험 |
|---|---|---|---|---|
| `parseExam` | 정답 글리프 인식 실패 | O (신규) | O (throw) | 생성 스크립트 단계에서 막힘 — 배포 전에 발견됨 |
| `/api/questions` | 존재하지 않는 cert/round | O (수동) | O (404) | 명확한 에러 상태 |
| `/api/questions` | JSON 손상 | O (수동, 신규) | O (500) | 명확한 에러 상태 |
| `examStorage.loadAttempt`/`loadResult` | 손상된 localStorage | O (유닛) | O (try/catch) | 조용히 새로 시작 — 의도된 설계 (사파리 프라이빗 모드 등) |
| `ExamPage` fetch | 네트워크 실패 | O (수동) | O (재시도 버튼) | 명확한 에러 상태 |

**Critical gap 없음** — 모든 실패 경로에 테스트 또는 에러처리가 있음. 유일하게 "조용히" 처리되는 경로(손상된 localStorage)는 실패해도 안전한 기본 상태(새 시험 시작)로 떨어지므로 의도된 설계.

### Worktree parallelization strategy
Sequential implementation, no parallelization opportunity — Task 0→9가 전부 이전 태스크의 산출물(타입 → 파싱함수 → 컴포넌트 → 페이지)에 순차 의존한다. Task 4(examStorage)와 Task 5(grading)만 서로 독립적이지만 둘 다 Task 8에서 함께 쓰여서, 병렬로 짜도 병합 시점에 다시 합쳐야 해 이득이 작다.

## Implementation Tasks (Eng Review)

이번 리뷰에서 발견된 이슈(경로조작, 배포 누락, 정답파싱 안전장치, 결과유지 버그, subjects 필드, 테스트 갭 2건)는 전부 플랜 자체(Task 2, 3, 4, 6, 7, 8, 9)에 직접 반영되었다 — 별도로 남겨둘 구현 태스크가 없다.

_No new tasks — all findings resolved inline in the plan._

## Completion Summary (Eng Review)

```
+====================================================================+
|         ENG PLAN REVIEW — COMPLETION SUMMARY                       |
+====================================================================+
| Step 0: Scope Challenge  | 스코프 그대로 진행 (25개+ 파일, 그린필드 앱이라 수용) |
| Architecture Review      | 2 issues found, 2 fixed                     |
| Code Quality Review      | 1 issue found, 1 fixed (Architecture와 동일 원인) |
| Test Review              | 다이어그램 작성, 4 gaps identified, 4 fixed  |
| Performance Review       | 0 issues found                              |
| NOT in scope             | written (3 items)                           |
| What already exists      | written                                     |
| TODOS.md updates         | 1 item proposed (정적생성 재설계), 추가됨      |
| Failure modes            | 0 critical gaps flagged                     |
| Outside voice            | ran (Claude subagent, Codex 미설치)          |
| Parallelization          | Sequential, 병렬화 기회 없음                  |
| Lake Score                | 8/8 — 모든 발견 이슈에서 완전한 버전 선택       |
+====================================================================+
```

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | 실행 안 됨 (선택적, 이 규모의 사이드 프로젝트엔 불필요 판단) |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | codex 미설치, Claude 서브에이전트로 대체 진행 (office-hours + plan-design-review + plan-eng-review 세 곳 모두) |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR | 3 issues found (경로조작 P1, 배포누락 P2, 검증중복), 3 fixed, outside voice에서 4건 추가 반영 |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | CLEAR | score: 5/10 → 8/10, 10 decisions |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | 실행 안 됨 (선택적) |

- **CROSS-MODEL:** office-hours·plan-design-review·plan-eng-review 세 스킬 모두에서 독립 Claude 서브에이전트(코덱스 미설치로 대체)를 돌렸고, 매번 실제 플랜 결함을 찾아 반영함 — office-hours: 그룹 경험 아이디어 제안 / plan-design-review: 결과화면 dead-end 등 13건 / plan-eng-review: 경로 조작 취약점(P1), 정답 파싱 안전장치 누락, 결과 유지 버그 등 7건 중 5건 반영.
- **VERDICT:** Design Review + Eng Review 둘 다 CLEARED — **CEO/ENG/DESIGN 준비 완료, 구현 착수 가능**. (CEO Review는 이 규모에서 선택사항이라 미실행이어도 게이트 아님.)

NO UNRESOLVED DECISIONS
