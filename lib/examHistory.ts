import { z } from 'zod'
import type { WrongAnswerEntry } from './types'

// examStorage.ts와 같은 이유: localStorage는 사용자가 devtools로 직접 편집할 수 있는
// 시스템 경계라, 컴파일 타임 캐스트만으로는 부족하다 — zod로 형태까지 검증한다.
const wrongAnswerEntrySchema = z.object({
  cert: z.string(),
  round: z.string(),
  mode: z.enum(['exam', 'practice']),
  questionNumber: z.number(),
  chosenAnswer: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  attemptDate: z.string(),
})

const historySchema = z.array(wrongAnswerEntrySchema)

const STORAGE_KEY = 'exam-wrong-history'

// 시도별로 개별 키를 쓰는 examStorage.ts와 달리, 이력은 계속 누적되는 하나의 로그라
// 배열 하나를 통째로 저장한다 — 자격증당 최대 수백 건 수준이라 매번 전체를
// read/write하는 비용은 무시할 수 있다.
function loadHistory(): WrongAnswerEntry[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    const result = historySchema.safeParse(parsed)
    // 손상된 JSON이거나 스키마가 어긋난 데이터는 크래시 대신 빈 이력으로 취급한다 —
    // examStorage.ts/parseExam.ts와 동일한 "조용히 실패하지 않되 죽지도 않는다" 원칙.
    return result.success ? (result.data as WrongAnswerEntry[]) : []
  } catch {
    return []
  }
}

function saveHistory(entries: WrongAnswerEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

function dedupKey(entry: WrongAnswerEntry): string {
  return `${entry.cert}:${entry.round}:${entry.mode}:${entry.questionNumber}:${entry.attemptDate}`
}

// 같은 문항을 같은 날 여러 번 틀려도 1건으로 기록한다(자격증+회차+모드+문항번호+
// 응시일 기준). 그날 나중에 정답을 골라도 이 함수가 다시 호출되지 않는 한(정답
// 선택은 오답이 아니므로 호출부에서 애초에 부르지 않는다) 이력은 지워지지 않는다 —
// "그날 틀렸었다"는 기록이 목적이지, 현재 시점 오답 목록이 아니다.
export function recordWrongAnswer(entry: WrongAnswerEntry): void {
  const history = loadHistory()
  const key = dedupKey(entry)
  const hasExisting = history.some((e) => dedupKey(e) === key)
  const nextHistory = hasExisting
    ? history.map((e) => (dedupKey(e) === key ? entry : e))
    : [...history, entry]
  saveHistory(nextHistory)
}

export function getWrongHistory(): WrongAnswerEntry[] {
  return loadHistory()
}
