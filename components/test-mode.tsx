'use client'

import { Check, Frown, PartyPopper, RotateCcw, X } from 'lucide-react'
import { useState } from 'react'
import { QuestionImage } from '@/components/question-image'
import {
  sampleQuestions,
  TEST_MAX_MISTAKES,
  TEST_SIZE,
  type Question,
} from '@/lib/quiz'

type Test = { questions: Question[]; answers: (number | null)[] }
type Result = { passed: boolean; mistakes: number }

function draw(questions: Question[]): Test {
  const qs = sampleQuestions(questions, TEST_SIZE)
  return { questions: qs, answers: qs.map(() => null) }
}

export function TestMode({ questions }: { questions: Question[] }) {
  const [test, setTest] = useState<Test>(() => draw(questions))
  const [result, setResult] = useState<Result | null>(null)

  const answeredCount = test.answers.filter((a) => a !== null).length
  const allAnswered = answeredCount === test.questions.length

  const restart = () => {
    setTest(draw(questions))
    setResult(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const select = (qIndex: number, choice: number) => {
    if (result) return
    setTest((prev) => {
      const answers = [...prev.answers]
      answers[qIndex] = choice
      return { ...prev, answers }
    })
  }

  const submit = () => {
    let mistakes = 0
    test.questions.forEach((q, i) => {
      if (test.answers[i] !== q.correctChoice) mistakes++
    })
    setResult({ passed: mistakes <= TEST_MAX_MISTAKES, mistakes })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="flex flex-col gap-5">
      {result && (
        <div
          className={`flex flex-col items-center gap-3 rounded-3xl p-6 text-center ${
            result.passed ? 'bg-success/10' : 'bg-destructive/10'
          }`}
        >
          <div
            className={`flex size-14 items-center justify-center rounded-full ${
              result.passed
                ? 'bg-success/20 text-success'
                : 'bg-destructive/20 text-destructive'
            }`}
          >
            {result.passed ? (
              <PartyPopper className="size-7" />
            ) : (
              <Frown className="size-7" />
            )}
          </div>
          <h2 className="text-2xl font-extrabold">
            {result.passed ? 'You passed!' : 'You failed'}
          </h2>
          <p className="font-semibold text-muted-foreground">
            {result.mistakes} mistake{result.mistakes === 1 ? '' : 's'} out of{' '}
            {test.questions.length}. Passing needs {TEST_MAX_MISTAKES} or fewer.
          </p>
          <button
            type="button"
            onClick={restart}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-bold text-primary-foreground transition-transform hover:scale-[1.03]"
          >
            <RotateCcw className="size-4" /> New test
          </button>
        </div>
      )}

      {!result && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3">
          <span className="text-sm font-bold text-muted-foreground">
            Answered {answeredCount}/{test.questions.length}
          </span>
          <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${(answeredCount / test.questions.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      <ol className="flex flex-col gap-4">
        {test.questions.map((q, qIndex) => {
          const chosen = test.answers[qIndex]
          return (
            <li key={`${q.id}-${qIndex}`} className="flex flex-col gap-3 rounded-3xl bg-card p-5">
              <div className="flex gap-2">
                <span className="font-extrabold text-primary">{qIndex + 1}.</span>
                <h3 className="font-bold leading-snug text-balance">{q.question}</h3>
              </div>
              {q.imageUrl && <QuestionImage src={q.imageUrl} alt="Question illustration" />}

              <div className="grid gap-2">
                {q.choices.map((choice, cIndex) => {
                  const isChosen = chosen === cIndex
                  let cls =
                    'border-border bg-background hover:border-primary hover:bg-primary/5'
                  if (result) {
                    if (cIndex === q.correctChoice) cls = 'border-success bg-success/10'
                    else if (isChosen) cls = 'border-destructive bg-destructive/10'
                    else cls = 'border-border bg-background opacity-60'
                  } else if (isChosen) {
                    cls = 'border-primary bg-primary/10'
                  }

                  return (
                    <button
                      key={cIndex}
                      type="button"
                      disabled={!!result}
                      onClick={() => select(qIndex, cIndex)}
                      className={`flex items-center justify-between gap-3 rounded-xl border-2 px-3.5 py-2.5 text-left text-sm font-semibold transition-all ${cls}`}
                    >
                      <span>{choice}</span>
                      {result && cIndex === q.correctChoice && (
                        <Check className="size-4 shrink-0 text-success" />
                      )}
                      {result && isChosen && cIndex !== q.correctChoice && (
                        <X className="size-4 shrink-0 text-destructive" />
                      )}
                    </button>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ol>

      {!result && (
        <button
          type="button"
          onClick={submit}
          disabled={!allAnswered}
          className="sticky bottom-4 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 font-extrabold text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {allAnswered ? 'Submit test' : `Answer all ${test.questions.length} to submit`}
        </button>
      )}
    </div>
  )
}
