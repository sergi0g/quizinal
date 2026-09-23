'use client'

import { ArrowRight, Check, PartyPopper, RotateCcw, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { QuestionImage } from '@/components/question-image'
import {
  getProgress,
  MASTERY_THRESHOLD,
  pickNext,
  type ProgressMap,
  type Question,
} from '@/lib/quiz'

export function PracticeMode({
  questions,
  progress,
  onAnswer,
  onReset,
}: {
  questions: Question[]
  progress: ProgressMap
  onAnswer: (id: number, correct: boolean) => void
  onReset: () => void
}) {
  const [current, setCurrent] = useState<Question | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [position, setPosition] = useState(1)

  // Choose the first question once questions are available.
  useEffect(() => {
    setCurrent((c) => c ?? pickNext(questions, progress, null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions])

  const revealed = selected !== null

  const handleSelect = (index: number) => {
    if (revealed || !current) return
    setSelected(index)
    onAnswer(current.id, index === current.correctChoice)
    if (index === current.correctChoice) {
      setTimeout(handleNext, 1000)
    }
  }

  const handleNext = useCallback(() => {
    setCurrent((c) => pickNext(questions, progress, c?.id ?? null))
    setSelected(null)
    setPosition((n) => n + 1)
  }, [questions, progress])

  if (!current) {
    return (
      <div className="flex flex-col items-center gap-5 rounded-3xl bg-card p-10 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-success/15 text-success">
          <PartyPopper className="size-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-extrabold">All mastered!</h2>
          <p className="text-pretty text-muted-foreground">
            You&apos;ve answered every question correctly {MASTERY_THRESHOLD} times in a row.
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-bold text-primary-foreground transition-transform hover:scale-[1.03]"
        >
          <RotateCcw className="size-4" /> Practice again
        </button>
      </div>
    )
  }

  const isCorrect = selected === current.correctChoice
  const streak = getProgress(progress, current.id).streak

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between text-sm font-bold text-muted-foreground">
        <span>Question {position}</span>
        <span className="flex items-center gap-1.5">
          {Array.from({ length: MASTERY_THRESHOLD }).map((_, i) => (
            <span
              key={i}
              className={`size-2.5 rounded-full ${
                i < streak ? 'bg-success' : 'bg-muted'
              }`}
              aria-hidden
            />
          ))}
          <span className="ml-1">streak</span>
        </span>
      </div>

      <div className="flex flex-col justify-between gap-5 rounded-3xl bg-card p-6 shadow-sm aspect-video">
        <h2 className="text-xl font-extrabold leading-snug text-balance">{current.question}</h2>
        {current.imageUrl && <QuestionImage src={current.imageUrl} alt="Question illustration" />}

        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-3">
          {current.choices.map((choice, index) => {
            const isChoiceCorrect = index === current.correctChoice
            let state = 'idle'
            if (revealed) {
              if (isChoiceCorrect) state = 'correct'
              else if (index === selected) state = 'wrong'
              else state = 'dim'
            }

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleSelect(index)}
                disabled={revealed}
                className={[
                  'flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition-all',
                  state === 'idle' &&
                    'border-border bg-background hover:border-primary hover:bg-primary/5',
                  state === 'correct' && 'border-success bg-success/10 text-foreground',
                  state === 'wrong' && 'border-destructive bg-destructive/10 text-foreground',
                  state === 'dim' && 'border-border bg-background opacity-50',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span>{choice}</span>
                {state === 'correct' && <Check className="size-5 shrink-0 text-success" />}
                {state === 'wrong' && <X className="size-5 shrink-0 text-destructive" />}
              </button>
            )
          })}
        </div>
      </div>

      {revealed && (
        <div className="flex flex-col gap-3">
          <p
            className={`text-center font-extrabold ${
              isCorrect ? 'text-success' : 'text-destructive'
            }`}
          >
            {isCorrect ? 'Nice — got it! 🎉' : 'Not quite. Moving on.'}
          </p>
          <button
            type="button"
            onClick={handleNext}
            autoFocus
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground transition-transform hover:scale-[1.02] max-w-xl lg:w-xl mx-auto"
          >
            Continue <ArrowRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  )
}
