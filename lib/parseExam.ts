// lib/parseExam.ts
import type { Question } from './types'

const BOLD_CIRCLED = ['❶', '❷', '❸', '❹']
const PLAIN_CIRCLED = ['①', '②', '③', '④']
const ALL_CIRCLED = [...BOLD_CIRCLED, ...PLAIN_CIRCLED]
const NOISE_LINE_PATTERNS = [
  /^전자문제집 CBT/,
  /^최강 자격증/,
  /^--- page \d+ ---$/,
  // 표본검수(Step 7) 중 발견: 페이지가 넘어갈 때마다 반복되는 헤더
  // "{자격증명}             ◐2005년 10월 02일 필기 기출문제 ◑"가 실제로는
  // ◐로 시작하지 않고 자격증명이 앞에 붙는다. 기존 정규식(^◐.*◑$)은 줄 전체가
  // ◐로 시작해야 매칭되어 52개 파일의 ◐...◑ 포함 줄 207개 중 203개를 걸러내지
  // 못했다 — 문제 중간에 페이지가 넘어가면 이 헤더 줄이 직전 문항의 마지막 보기에
  // 그대로 이어붙어 정답 표시는 있지만 내용이 오염된 보기를 조용히 만들어냈다
  // (표본검수에서 유기농업기능사 2005-10-02 문항60, 종자기능사 2002-01-27 문항60,
  // 종자기능사 2011-02-13 문항20에서 실제로 확인). ◐...◑ 쌍은 이 헤더 포맷에만
  // 쓰이므로, 줄 안 어디에 있든 매칭하도록 앵커를 제거했다.
  /◐.*◑/,
]

// 실제 raw.md 52개 파일 전수조사 결과, 모든 파일이 마지막 문항(60번) 뒤에
// "전자문제집 CBT 홈페이지 : ..."로 시작하는 안내문/정답표 꼬리말을 정확히 1회 포함한다
// (헤더의 "전자문제집 CBT : www.comcbt.com"과는 "홈페이지" 유무로 구별됨).
// 이 꼬리말 블록에는 줄 단위 숫자(1,2,3...)와 단독 원문자(④,③...)로 이루어진 정답표가
// 포함되어 있어, 라인 단위 노이즈 필터로는 걸러지지 않고 마지막 문항 블록에 섞여
// 보기를 덮어쓴다. 본문 파싱 전에 이 지점에서 원본 텍스트 자체를 잘라내
// 꼬리말 전체를 파싱 대상에서 원천 배제한다.
const FOOTER_BOUNDARY_PATTERN = /^전자문제집 CBT 홈페이지/m

interface RawBlock {
  number: number
  lines: string[]
}

function truncateAtFooter(raw: string): string {
  const idx = raw.search(FOOTER_BOUNDARY_PATTERN)
  return idx === -1 ? raw : raw.slice(0, idx)
}

function stripNoiseLines(raw: string): string[] {
  return raw
    .split('\n')
    .filter((line) => !NOISE_LINE_PATTERNS.some((p) => p.test(line.trim())))
}

function circledIndex(ch: string): number {
  const bold = BOLD_CIRCLED.indexOf(ch)
  if (bold >= 0) return bold
  return PLAIN_CIRCLED.indexOf(ch)
}

// pymupdf 추출 과정에서 인접한 두 보기가 줄바꿈 없이 한 물리적 줄에 붙어 나오는 경우가
// 있다 (예: "③ 토양유기물 분해 촉진  ④ 해충경감", "❶ homo도가 증가된다. ② homo도가
// 변하지 아니한다."). 이런 줄은 원문자가 "정확히 2개" 나타나고 그 두 인덱스가 연속
// (idx2 = idx1 + 1)이며 첫 원문자가 줄 맨 앞에 온다.
//
// 반대로 실수로 쪼개면 안 되는 경우도 있다: 보기 텍스트 자체가 원문자 나열을 답으로
// 담고 있는 문제(예: "❶ ①, ②", "① ① 1개, ② 1개" — 실제 유기농업기능사 2006-07-16
// 220번대, 종자기능사 2007-07-15 29번). 이런 줄은 원문자가 3개 이상 나타나므로
// (선두 마커 1개 + 답안 텍스트에 포함된 원문자 2개 이상) 아래 조건에서 자동으로
// 제외된다 — "정확히 2개"라는 조건이 핵심 방어선이다. 실제 52개 파일 전수조사로
// 이 규칙이 두 패턴을 정확히 구분함을 확인했다 (glued 165건 전부 count==2 &&
// 인접 인덱스, 오탐 후보 8건 전부 count>=3).
function splitGluedMarkerLine(line: string): string[] {
  const trimmed = line.trim()
  const markerRegex = new RegExp(`[${ALL_CIRCLED.join('')}]`, 'g')
  const matches = [...trimmed.matchAll(markerRegex)]
  if (matches.length !== 2) return [line]

  const [first, second] = matches
  if (first.index !== 0) return [line]

  const idx1 = circledIndex(first[0])
  const idx2 = circledIndex(second[0])
  if (idx2 !== idx1 + 1) return [line]

  const firstPart = trimmed.slice(0, second.index).trimEnd()
  const secondPart = trimmed.slice(second.index)
  return [firstPart, secondPart]
}

function splitGluedMarkerLines(lines: string[]): string[] {
  return lines.flatMap(splitGluedMarkerLine)
}

function isSubjectMarker(line: string): string | null {
  // 종자기능사 2011-02-13 원문 136행처럼 선두 숫자가 누락된 "과목 : 종자(임의구분)"
  // 형태도 있다 (원래는 "1과목 : ..."이어야 함). 52개 파일 전수조사 결과 "과목 :"이
  // 등장하는 모든 줄 중 이 1건만 선두 숫자가 없었고, 그 외 오탐 사례는 없었다.
  // 숫자값 자체는 파싱 로직에서 사용하지 않으므로(과목명만 추출) 선두 숫자를
  // 선택적으로 만들어도 안전하다 — 숫자가 없다고 이 문항 구간이 조용히 과목
  // 미배정(subject: '')으로 새는 것을 막는 게 더 중요하다.
  const m = line.trim().match(/^\d*과목\s*[:：]\s*(.+)$/)
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
  const content = truncateAtFooter(raw)
  const lines = splitGluedMarkerLines(stripNoiseLines(content))

  // 1단계: 줄을 문제 블록과 과목 마커로 분리
  const blocks: RawBlock[] = []
  // 마커를 발견 순서 그대로 배열에 쌓는다 — 문제 번호를 키로 쓰는 오브젝트였다면, 두
  // 마커가 문제 하나 사이에 두지 않고 연달아 나올 때(같은 문제 번호 뒤에 붙어서 등장)
  // 나중 마커가 앞 마커를 덮어써 과목 하나가 통째로 사라진다 (3단계 참고).
  const subjectMarkers: { afterNumber: number; subject: string }[] = []
  let current: RawBlock | null = null
  // 실전 52개 파일 전수 실행 중 발견된 세 번째 패턴: pymupdf가 문제 지문 중간의
  // 소수점 숫자(예: "1.325에서 1.06으로", "1.0 cmolc/kg")를 줄바꿈으로 잘라내면
  // 그 소수점 숫자가 물리적 줄의 맨 앞에 오게 되고, isQuestionStart의 "숫자+마침표"
  // 정규식이 이를 새 문제 시작("1.")으로 오인한다 (유기농업기능사 2014-01-26 문항22,
  // 2015-07-19 문항32에서 확인). 실제 문항 번호는 항상 1부터 결번 없이 1씩 증가하므로
  // (이미 정상 통과하는 48개 파일 모두 1..60 연속 번호), 직전 문제 번호+1과 정확히
  // 일치할 때만 진짜 새 문제 시작으로 인정한다. 그 외의 "N." 패턴은 지문 안의 숫자로
  // 보고 현재 블록에 그대로 이어붙인다.
  let lastQuestionNumber = 0

  for (const line of lines) {
    const subject = isSubjectMarker(line)
    if (subject !== null) {
      if (current) subjectMarkers.push({ afterNumber: current.number, subject })
      continue
    }
    const qNum = isQuestionStart(line)
    if (qNum !== null && qNum === lastQuestionNumber + 1) {
      if (current) blocks.push(current)
      current = { number: qNum, lines: [line.trim().replace(/^\d+\.\s*/, '')] }
      lastQuestionNumber = qNum
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

    // 보기 4개가 전부 비어있으면(마커만 있고 텍스트가 하나도 없음) 파싱 실패가 아니라
    // 원본 PDF에서 보기 자체가 그림(사진/도해)으로만 제공되는 문제다 — 조경기능사
    // 표본검수에서 실제로 확인(예: "자연석을 모양으로 볼 때 사석은?"의 ①②③④가 전부
    // 돌 모양 삽화). pymupdf는 텍스트만 추출하므로 이런 문제는 원천적으로 텍스트화할
    // 방법이 없다. 이 문항 하나만 건너뛰고 나머지 문항은 정상 발행한다 — 문항 하나
    // 때문에 회차 60문항 전체를 통째로 버리는 것은 낭비다.
    //
    // 보기 일부만 비어있는 경우(1~3개)는 계속 실패시킨다 — 그건 그림 문제가 아니라
    // 줄바꿈 이어붙이기 등 실제 파싱 버그일 가능성이 높고, 잘못된 정답이 조용히
    // 배포되는 것을 막는 기존 안전장치를 그대로 유지해야 한다.
    if (choices.every((c) => c.trim() === '')) {
      continue
    }
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

  // 위와 같은 이유로: 과목 마커("N과목 : ...")가 파일 전체에서 하나도 발견되지 않으면
  // 모든 문항이 subject: ''로 조용히 채워진다. 실제 기출문제 파일에는 최소 1개 이상의
  // 과목 마커가 있어야 하므로, 0개인 경우는 원문 형식이 깨졌다는 신호로 보고 즉시 실패시킨다.
  if (subjectMarkers.length === 0) {
    throw new Error(`${cert}/${round}: 과목 마커(N과목 : ...)를 하나도 찾지 못함`)
  }

  // 실전 데이터에서 흔한 패턴: 같은 문제 번호 뒤에 마커가 연달아 나온다 (문항 사이에
  // 별도 문제가 없어 "afterNumber"가 동일함 — 예: 유기농업기능사 2016-07-10 원문
  // 125-126행 "1과목 : 작물재배" 바로 다음 줄에 "2과목 : 토양관리"). 표본검수에서
  // 이 패턴으로 유기농업기능사 3개 회차, 종자기능사 12개 회차가 앞 과목 전체를
  // 잃고 있었음을 확인했다 (문항 21까지가 전부 뒤 과목으로 잘못 배정됨).
  //
  // 같은 위치(afterNumber)에 마커가 여럿 모이면, 그 위치에서는 첫 번째 마커만
  // 마감된다(자기 위치를 그대로 씀). 나머지는 "아직 마감되지 않은 과목"으로 이월되어,
  // 다음으로 나오는 서로 다른 위치의 마커가 마감될 때 그 위치에서 대신 마감된다 —
  // 정상 케이스(마커마다 위치가 다 다름)에서는 이 이월이 전혀 일어나지 않으므로
  // 기존 배정 결과에 영향이 없다.
  const markerGroups: { afterNumber: number; subjects: string[] }[] = []
  for (const marker of subjectMarkers) {
    const lastGroup = markerGroups[markerGroups.length - 1]
    if (lastGroup && lastGroup.afterNumber === marker.afterNumber) {
      lastGroup.subjects.push(marker.subject)
    } else {
      markerGroups.push({ afterNumber: marker.afterNumber, subjects: [marker.subject] })
    }
  }

  const resolvedBoundaries: { afterNumber: number; subject: string }[] = []
  let carryOver: string[] = []
  for (const group of markerGroups) {
    const pending = [...carryOver, ...group.subjects]
    resolvedBoundaries.push({ afterNumber: group.afterNumber, subject: pending[0] })
    carryOver = pending.slice(1)
  }
  // 마지막 그룹에서도 마감되지 못하고 남은 과목은 파일 끝까지 이어지는 과목이다 —
  // 배정 루프는 markerIdx가 배열 끝을 넘어가면 마지막 currentSubject를 계속 쓰므로
  // afterNumber 값 자체는 의미가 없다("다음 마커가 없다"는 사실만 중요함).
  for (const subject of carryOver) {
    resolvedBoundaries.push({ afterNumber: Infinity, subject })
  }

  let markerIdx = 0
  let currentSubject = resolvedBoundaries[0].subject
  for (const q of questions) {
    while (
      markerIdx < resolvedBoundaries.length &&
      q.number > resolvedBoundaries[markerIdx].afterNumber
    ) {
      markerIdx++
      currentSubject =
        markerIdx < resolvedBoundaries.length
          ? resolvedBoundaries[markerIdx].subject
          : currentSubject
    }
    q.subject = resolvedBoundaries[markerIdx]?.subject ?? currentSubject
  }

  // 위와 같은 이유: 글루드 마커가 몰려 있는 위치가 하필 실제 마지막 문제 번호와
  // 겹치면(예: "2과목"/"3과목" 마커가 문항 60 뒤에 함께 붙어 나오는 경우), 이월된
  // 과목이 자리 잡을 문제가 물리적으로 하나도 남지 않는다 — 이때는 앞선 collision
  // 처리로도 복구할 수 없는 원본 손상이므로, 조용히 그 과목을 잃는 대신 이 회차
  // 전체를 실패시킨다 (scripts/generate-questions.ts가 이 회차를 건너뛰고
  // questions.json을 만들지 않는다).
  const usedSubjects = new Set(questions.map((q) => q.subject))
  const unassignedSubjects = [...new Set(resolvedBoundaries.map((b) => b.subject))].filter(
    (s) => !usedSubjects.has(s)
  )
  if (unassignedSubjects.length > 0) {
    throw new Error(
      `${cert}/${round}: 과목 마커 위치가 몰려 있어 다음 과목이 문제를 하나도 배정받지 못함: ${unassignedSubjects.join(', ')}`
    )
  }

  // 4단계: 그림 전용 문제(2단계에서 continue로 건너뜀)가 있으면 원본 PDF 문항번호에
  // 구멍이 생긴다. exam/page.tsx의 이전/다음 버튼과 결과화면 오답 목록은 문항번호가
  // 1..questions.length로 빈틈없이 이어진다고 가정하므로(구멍이 있으면 다음 버튼이
  // 존재하지 않는 번호로 이동해 화면이 빈 채로 멈춘다), 과목 배정이 끝난 뒤 번호와
  // id를 1부터 다시 순서대로 매긴다. 과목 경계 계산은 이미 끝났으므로 안전하다.
  return questions.map((q, i) => {
    const number = i + 1
    return { ...q, number, id: `${cert}-${round}-${String(number).padStart(3, '0')}` }
  })
}
