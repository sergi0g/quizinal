import Papa from 'papaparse'

export type Question = {
  id: number
  question: string
  choices: string[]
  correctChoice: number // 0-based index
  imageUrl?: string
}

export type Progress = {
  streak: number // consecutive corrects since the last failure
  correct: number
  wrong: number
  attempts: number
}

export type ProgressMap = Record<number, Progress>

export type SessionExport = {
  version: 1
  exportedAt: string
  signature: string
  questions: Question[]
  progress: ProgressMap
}

export type Stats = {
  mastered: number
  working: number
  unattempted: number
  total: number
}

// Consecutive correct answers (with no failure in between) needed to master.
export const MASTERY_THRESHOLD = 2

// Number of questions drawn for a test.
export const TEST_SIZE = 30

// Allowed mistakes before a test is failed.
export const TEST_MAX_MISTAKES = 1

const EMPTY_PROGRESS: Progress = { streak: 0, correct: 0, wrong: 0, attempts: 0 }

export function getProgress(map: ProgressMap, id: number): Progress {
  return map[id] ?? EMPTY_PROGRESS
}

export function isMastered(p: Progress): boolean {
  return p.streak >= MASTERY_THRESHOLD
}

/** Parse a CSV string using fixed column order: question, choice_1, choice_2, choice_3, correct_choice, image_url. */
export function parseCsv(text: string): Question[] {
  const result = Papa.parse<string[]>(text.trim(), { skipEmptyLines: 'greedy' })
  let rows = result.data.filter((r) => Array.isArray(r))
  if (rows.length === 0) return []

  // Drop a header row if the first cell is literally the "question" header.
  const firstCell = (rows[0]?.[0] ?? '').trim().toLowerCase()
  if (firstCell === 'question') rows = rows.slice(1)

  const questions: Question[] = []
  for (const row of rows) {
    const q = (row[0] ?? '').trim()
    if (!q) continue

    const choices = [row[1], row[2], row[3]]
      .map((c) => (c ?? '').trim())
      .filter(Boolean)
    if (choices.length < 2) continue

    let correct = Number.parseInt((row[4] ?? '').trim(), 10)
    if (!(correct >= 1 && correct <= choices.length)) correct = 1

    const image = (row[5] ?? '').trim()

    questions.push({
      id: questions.length,
      question: q,
      choices,
      correctChoice: correct - 1,
      imageUrl: image || undefined,
    })
  }
  return questions
}

/** A stable-ish fingerprint built from the full question set, not from a single question. */
export function signatureOf(questions: Question[]): string {
  const payload = questions
    .map(({ question, choices, correctChoice, imageUrl }) =>
      JSON.stringify([
        question.trim(),
        choices.map((choice) => choice.trim()),
        correctChoice,
        imageUrl ?? '',
      ]),
    )
    .join('|')

  let hash = 2166136261
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0).toString(36)
}

export function exportSession(questions: Question[], progress: ProgressMap): SessionExport {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    signature: signatureOf(questions),
    questions,
    progress,
  }
}

export function parseSessionExport(input: string | unknown): { questions: Question[]; progress: ProgressMap } | null {
  try {
    const parsed = typeof input === 'string' ? JSON.parse(input) : input

    const rawQuestions = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && Array.isArray((parsed as { questions?: unknown }).questions)
        ? (parsed as { questions: unknown[] }).questions
        : null

    if (!Array.isArray(rawQuestions)) return null

    const questions: Question[] = []
    for (let index = 0; index < rawQuestions.length; index++) {
      const question = rawQuestions[index]
      if (!question || typeof question !== 'object') continue

      const candidate = question as Record<string, unknown>
      const choices = Array.isArray(candidate.choices)
        ? (candidate.choices as unknown[])
            .map((choice) => String(choice ?? '').trim())
            .filter(Boolean)
        : []

      if (typeof candidate.question !== 'string' || !candidate.question.trim()) continue
      if (choices.length < 2) continue

      const correctChoice = Number(candidate.correctChoice)
      const safeChoiceIndex = Number.isFinite(correctChoice)
        ? Math.min(Math.max(Math.trunc(correctChoice), 0), choices.length - 1)
        : 0
      const imageUrl =
        typeof candidate.imageUrl === 'string' && candidate.imageUrl.trim()
          ? candidate.imageUrl.trim()
          : undefined

      const normalizedQuestion: Question = {
        id: typeof candidate.id === 'number' ? candidate.id : index,
        question: String(candidate.question).trim(),
        choices,
        correctChoice: safeChoiceIndex,
        ...(imageUrl ? { imageUrl } : {}),
      }
      questions.push(normalizedQuestion)
    }

    if (questions.length === 0) return null

    const rawProgress = Array.isArray(parsed)
      ? {}
      : parsed && typeof parsed === 'object' && parsed !== null && 'progress' in parsed
        ? (parsed as { progress?: Record<string, unknown> }).progress
        : {}

    const progress: ProgressMap = {}
    if (rawProgress && typeof rawProgress === 'object') {
      for (const [key, value] of Object.entries(rawProgress)) {
        const id = Number(key)
        if (!Number.isFinite(id)) continue
        const candidate = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
        const streak = Number(candidate.streak ?? 0)
        const correct = Number(candidate.correct ?? 0)
        const wrong = Number(candidate.wrong ?? 0)
        const attempts = Number(candidate.attempts ?? 0)

        progress[id] = {
          streak: Number.isFinite(streak) ? streak : 0,
          correct: Number.isFinite(correct) ? correct : 0,
          wrong: Number.isFinite(wrong) ? wrong : 0,
          attempts: Number.isFinite(attempts) ? attempts : 0,
        }
      }
    }

    return { questions, progress }
  } catch {
    return null
  }
}

export function computeStats(questions: Question[], progress: ProgressMap): Stats {
  let mastered = 0
  let working = 0
  let unattempted = 0
  for (const q of questions) {
    const p = getProgress(progress, q.id)
    if (p.attempts === 0) unattempted++
    else if (isMastered(p)) mastered++
    else working++
  }
  return { mastered, working, unattempted, total: questions.length }
}

export function applyAnswer(p: Progress, correct: boolean): Progress {
  return {
    streak: correct ? p.streak + 1 : 0,
    correct: p.correct + (correct ? 1 : 0),
    wrong: p.wrong + (correct ? 0 : 1),
    attempts: p.attempts + 1,
  }
}

/**
 * Weighted pick of the next practice question. Mastered questions are skipped.
 * Questions with more wrong answers get shown more often; fresh questions are
 * introduced steadily. The current question is avoided when alternatives exist.
 */
export function pickNext(
  questions: Question[],
  progress: ProgressMap,
  excludeId: number | null,
): Question | null {
  const candidates = questions.filter((q) => !isMastered(getProgress(progress, q.id)))
  if (candidates.length === 0) return null

  const pool =
    candidates.length > 1 && excludeId !== null
      ? candidates.filter((q) => q.id !== excludeId)
      : candidates

  const weights = pool.map((q) => {
    const p = getProgress(progress, q.id)
    if (p.attempts === 0) return 3 // unattempted: introduce steadily
    return 2 + p.wrong * 3 // struggling questions surface more often
  })

  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i]
    if (r <= 0) return pool[i]
  }
  return pool[pool.length - 1]
}

/** Fisher–Yates sample of up to `n` questions for a test. */
export function sampleQuestions(questions: Question[], n: number): Question[] {
  const arr = [...questions]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.slice(0, Math.min(n, arr.length))
}
