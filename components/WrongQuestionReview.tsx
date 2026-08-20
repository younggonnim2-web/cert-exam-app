// components/WrongQuestionReview.tsx
import type { Question } from '@/lib/types'

// /history 목록의 과목별 연습 인라인 펼치기와, 모의고사 응시 상세 페이지 둘 다
// "문항 지문 + 보기(선택한 오답 빨강 / 정답 초록)"를 똑같이 그린다 — 여기 한 곳에
// 모아 중복을 없앤다.
export function WrongQuestionReview({
  question,
  chosenAnswer,
}: {
  question: Question
  chosenAnswer: 1 | 2 | 3 | 4
}) {
  return (
    <div>
      <p className="font-medium mb-2 text-ink">
        {question.number}. {question.text}
      </p>
      <div className="space-y-1">
        {question.choices.map((choice, i) => {
          const choiceNum = (i + 1) as 1 | 2 | 3 | 4
          const isCorrectChoice = choiceNum === question.answer
          const isChosen = choiceNum === chosenAnswer
          return (
            <p
              key={i}
              className={`px-3 py-1.5 rounded-md border text-sm ${
                isCorrectChoice
                  ? 'border-emerald-500 bg-emerald-50 text-ink'
                  : isChosen
                    ? 'border-red-500 bg-red-50 text-ink'
                    : 'border-hairline text-ink'
              }`}
            >
              {choiceNum}. {choice}
              {isCorrectChoice ? ' (정답)' : isChosen ? ' (선택한 오답)' : ''}
            </p>
          )
        })}
      </div>
    </div>
  )
}
