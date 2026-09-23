'use client'

import { GraduationCap, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { parseCsv, parseSessionExport, type ProgressMap, type Question } from '@/lib/quiz'
import { ThemeToggle } from '@/components/theme-toggle'

export function UploadScreen({
  onLoaded,
  onSessionLoaded,
}: {
  onLoaded?: (q: Question[]) => void
  onSessionLoaded?: (session: { questions: Question[]; progress: ProgressMap }) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  async function handleFile(file: File | undefined) {
    setError(null)
    if (!file) return
    try {
      const text = await file.text()
      const trimmed = text.trim()

      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const session = parseSessionExport(text)
        if (session) {
          onSessionLoaded?.(session)
          return
        }
      }

      const questions = parseCsv(text)
      if (questions.length === 0) {
        setError('No valid questions found. Check the column order and try again.')
        return
      }
      onLoaded?.(questions)
    } catch {
      setError('Could not read that file. Make sure it is a valid CSV or saved Quizinal export.')
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center gap-8 px-5 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          <GraduationCap className="size-9" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-balance">Quizinal</h1>
        <p className="text-pretty text-muted-foreground">
          Upload your question set and practice until every answer sticks.
        </p>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          void handleFile(e.dataTransfer.files?.[0])
        }}
        className={`flex w-full flex-col items-center gap-3 rounded-3xl border-2 border-dashed p-10 text-center transition-colors ${
          dragging ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50'
        }`}
      >
        <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-primary">
          <Upload className="size-6" />
        </span>
        <span className="font-bold">Drop your CSV or resume JSON here</span>
        <span className="text-sm text-muted-foreground">or click to browse</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.json,text/csv,application/json"
        className="sr-only"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      {error && (
        <p className="text-center text-sm font-semibold text-destructive" role="alert">
          {error}
        </p>
      )}

      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        Expected CSV columns, in order: question, choice_1, choice_2, choice_3
        (optional), correct_choice (1–3), image_url (optional). You can also load a
        Quizinal export JSON to resume a study session on another device.
      </p>
    </main>
  )
}
