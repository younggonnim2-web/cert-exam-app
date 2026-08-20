// components/WrongQuestionReview.tsx
import type { Question } from '@/lib/types'

// /history 목록의 과목별 연습 인라인 펼치기와, 모의고사 응시 상세 페이지 둘 다
// "문항 지문 + 보기(선택한 오답 빨강 / 정답 초록)"를 똑같이 그린다 — 여기 한 곳에
// 모아 중복을 없앤다.
export function WrongQuestionReview({
  question,
  chosenAnswer,
  timesWrong,
}: {
  question: Question
  chosenAnswer: 1 | 2 | 3 | 4
  // 같은 자격증+회차+모드에서 이 문항을 틀린 적이 있는 서로 다른 날짜 수(오늘 포함).
  // 1이면(처음이자 유일하게 틀림) 굳이 표시할 정보가 아니므로 생략한다.
  timesWrong?: number
}) {
  return (
    <div>
      <p className="font-medium mb-2 text-ink">
        {question.number}. {question.text}
        {timesWrong !== undefined && timesWrong > 1 && (
          <span className="ml-2 inline-block rounded-full bg-red-100 text-red-600 text-xs font-medium px-2 py-0.5 align-middle">
            총 {timesWrong}번 틀림
          </span>
        )}
      </p>
      {question.stemImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={question.stemImage}
          alt={`${question.number}번 문제 그림`}
          className="mb-2 max-w-full rounded-md border border-hairline"
        />
      )}
      <div className="space-y-1">
        {question.choices.map((choice, i) => {
          const choiceNum = (i + 1) as 1 | 2 | 3 | 4
          const isCorrectChoice = choiceNum === question.answer
          const isChosen = choiceNum === chosenAnswer
          const choiceImage = question.choiceImages?.[i]
          return (
            <div
              key={i}
              className={`px-3 py-1.5 rounded-md border text-sm ${
                isCorrectChoice
                  ? 'border-emerald-500 bg-emerald-50 text-ink'
                  : isChosen
                    ? 'border-red-500 bg-red-50 text-ink'
                    : 'border-hairline text-ink'
              }`}
            >
              <p>
                {choiceNum}. {choice}
                {isCorrectChoice ? ' (정답)' : isChosen ? ' (선택한 오답)' : ''}
              </p>
              {choiceImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={choiceImage}
                  alt={`${choiceNum}번 보기 그림`}
                  className="mt-1 max-h-32 rounded border border-hairline"
                />
              )}
            </div>
          )
        })}
      </div>
      {question.explanation && (
        <div className="mt-3 rounded-md border-l-4 border-blue-400 bg-blue-50 p-3">
          <p className="text-xs font-semibold text-blue-700 mb-1">해설</p>
          <p className="text-sm text-ink">{question.explanation}</p>
        </div>
      )}
    </div>
  )
}
