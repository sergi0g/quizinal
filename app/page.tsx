'use client'

import { Download, GraduationCap, ListChecks, Upload } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { PracticeMode } from '@/components/practice-mode'
import { StatsBar } from '@/components/stats-bar'
import { TestMode } from '@/components/test-mode'
import { ThemeToggle } from '@/components/theme-toggle'
import { UploadScreen } from '@/components/upload-screen'
import {
  applyAnswer,
  computeStats,
  exportSession,
  getProgress,
  type ProgressMap,
  type Question,
  signatureOf,
} from '@/lib/quiz'

const Q_KEY = 'quizinal:questions'
const P_KEY = 'quizinal:progress'
const S_KEY = 'quizinal:signature'

type Mode = 'practice' | 'test'

export default function Page() {
  const [questions, setQuestions] = useState<Question[] | null>(null)
  const [progress, setProgress] = useState<ProgressMap>({})
  const [mode, setMode] = useState<Mode>('practice')
  const [hydrated, setHydrated] = useState(false)

  // Load persisted state once on mount.
  useEffect(() => {
    try {
      const rawQ = localStorage.getItem(Q_KEY)
      const rawP = localStorage.getItem(P_KEY)
      if (rawQ) {
        setQuestions(JSON.parse(rawQ))
        if (rawP) setProgress(JSON.parse(rawP))
      }
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true)
  }, [])

  // Persist progress whenever it changes (small payload, even for ~1000 questions).
  useEffect(() => {
    if (!hydrated || !questions) return
    try {
      localStorage.setItem(P_KEY, JSON.stringify(progress))
    } catch {
      /* ignore quota errors */
    }
  }, [progress, hydrated, questions])

  const handleLoaded = useCallback((loaded: Question[]) => {
    const signature = signatureOf(loaded)
    let nextProgress: ProgressMap = {}
    try {
      // Keep progress if the exact same set is re-uploaded.
      if (localStorage.getItem(S_KEY) === signature) {
        nextProgress = JSON.parse(localStorage.getItem(P_KEY) ?? '{}')
      }
      localStorage.setItem(Q_KEY, JSON.stringify(loaded))
      localStorage.setItem(S_KEY, signature)
      localStorage.setItem(P_KEY, JSON.stringify(nextProgress))
    } catch {
      /* ignore quota errors */
    }
    setQuestions(loaded)
    setProgress(nextProgress)
    setMode('practice')
  }, [])

  const handleSessionLoaded = useCallback((loaded: { questions: Question[]; progress: ProgressMap }) => {
    const { questions: nextQuestions, progress: nextProgress } = loaded
    const signature = signatureOf(nextQuestions)
    try {
      localStorage.setItem(Q_KEY, JSON.stringify(nextQuestions))
      localStorage.setItem(P_KEY, JSON.stringify(nextProgress))
      localStorage.setItem(S_KEY, signature)
    } catch {
      /* ignore quota errors */
    }
    setQuestions(nextQuestions)
    setProgress(nextProgress)
    setMode('practice')
  }, [])

  const handleExport = useCallback(() => {
    if (!questions) return
    const payload = exportSession(questions, progress)
    const json = JSON.stringify(payload, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'quizinal-session.json'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }, [progress, questions])

  const handleAnswer = useCallback((id: number, correct: boolean) => {
    setProgress((prev) => ({ ...prev, [id]: applyAnswer(getProgress(prev, id), correct) }))
  }, [])

  const handleResetProgress = useCallback(() => {
    setProgress({})
  }, [])

  const handleNewFile = useCallback(() => {
    try {
      localStorage.removeItem(Q_KEY)
      localStorage.removeItem(P_KEY)
      localStorage.removeItem(S_KEY)
    } catch {
      /* ignore */
    }
    setQuestions(null)
    setProgress({})
  }, [])

  if (!hydrated) return null

  if (!questions) {
    return <UploadScreen onLoaded={handleLoaded} onSessionLoaded={handleSessionLoaded} />
  }

  const stats = computeStats(questions, progress)

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl lg:max-w-[50vw] flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="size-5" />
          </span>
          <span className="text-lg font-extrabold tracking-tight">Quizinal</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted"
            aria-label="Export study progress as JSON"
            title="Export progress"
          >
            <Download className="size-5" />
          </button>
          <button
            type="button"
            onClick={handleNewFile}
            className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted"
            aria-label="Load a different CSV"
            title="Load a different file"
          >
            <Upload className="size-5" />
          </button>
          <ThemeToggle />
        </div>
      </header>

      <StatsBar stats={stats} className="max-w-xl lg:w-xl mx-auto" />

      {/* Mode switcher — practice progress is preserved when switching to test. */}
      <div
        className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1 max-w-xl lg:w-xl lg:mx-auto"
        role="tablist"
        aria-label="Study mode"
      >
        <ModeTab
          active={mode === 'practice'}
          onClick={() => setMode('practice')}
          icon={<GraduationCap className="size-4" />}
          label="Practice"
        />
        <ModeTab
          active={mode === 'test'}
          onClick={() => setMode('test')}
          icon={<ListChecks className="size-4" />}
          label="Test"
        />
      </div>

      {mode === 'practice' ? (
        <PracticeMode
          questions={questions}
          progress={progress}
          onAnswer={handleAnswer}
          onReset={handleResetProgress}
        />
      ) : (
        <TestMode questions={questions} />
      )}
    </main>
  )
}

function ModeTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-full py-2 text-sm font-bold transition-colors ${
        active
          ? 'bg-card text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
