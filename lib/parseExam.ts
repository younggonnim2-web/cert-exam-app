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
    // plan-eng-review 추가 지적: 마지막 보기(④, index 3)의 텍스트가 마커 줄에는
    // 없고 다음 줄로 넘어가는 경우, choices[3]이 빈 문자열('')로 남아 falsy 취급되어
    // "어느 보기에 이어붙일지"를 문자열 truthy 여부로 판단하면 엉뚱한 보기(예: index 2)에
    // 텍스트가 잘못 덧붙는다. 마커를 찾을 때마다 별도 변수로 "마지막으로 본 보기 인덱스"를
    // 명시적으로 추적해, 빈 문자열이어도 이어붙이기 대상에서 누락되지 않게 한다.
    let lastMarkerIndex = -1

    for (const rawLine of block.lines) {
      if (!rawLine) continue
      const marker = findChoiceMarker(rawLine)
      if (marker) {
        inChoices = true
        choices[marker.index] = marker.rest
        lastMarkerIndex = marker.index
        if (marker.bold) answer = (marker.index + 1) as 1 | 2 | 3 | 4
        continue
      }
      if (!inChoices) {
        textParts.push(rawLine)
      } else if (lastMarkerIndex >= 0) {
        // 줄바꿈으로 쪼개진 보기 텍스트 이어붙이기 (마지막으로 발견된 마커의 보기에 덧붙임)
        choices[lastMarkerIndex] = `${choices[lastMarkerIndex]}${rawLine}`
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

    // 위와 같은 이유로: 보기 4개 중 하나라도 비어있으면(파싱 실패 or 원문 누락)
    // 조용히 빈 문자열을 배포하지 않고 즉시 실패시킨다.
    const emptyChoiceIndex = choices.findIndex((c) => c.trim() === '')
    if (emptyChoiceIndex >= 0) {
      throw new Error(
        `${cert}/${round} 문항 ${block.number}: 보기 ${emptyChoiceIndex + 1}번이 비어 있음`
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

  // 위와 같은 이유로: 과목 마커("N과목 : ...")가 파일 전체에서 하나도 발견되지 않으면
  // 모든 문항이 subject: ''로 조용히 채워진다. 실제 기출문제 파일에는 최소 1개 이상의
  // 과목 마커가 있어야 하므로, 0개인 경우는 원문 형식이 깨졌다는 신호로 보고 즉시 실패시킨다.
  if (sortedMarkerPoints.length === 0) {
    throw new Error(`${cert}/${round}: 과목 마커(N과목 : ...)를 하나도 찾지 못함`)
  }

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
