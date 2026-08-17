'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, Plus, RefreshCw, Trash2, Eye } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Question } from '@/lib/types'

interface DbQuestionRow {
  id: string
  question_text: string
  prompt?: string | null
  think_twice_prompt?: string | null
  options: unknown
  correct_option: string
  explanation?: string | null
  difficulty?: string
  category?: string
  time_limit: number
  position: number
  created_at?: string
}

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null)

  // Form state
  const [questionText, setQuestionText] = useState('')
  const [thinkTwicePrompt, setThinkTwicePrompt] = useState('Pause and reconsider your initial response. Are you certain?')
  const [optionA, setOptionA] = useState('')
  const [optionB, setOptionB] = useState('')
  const [optionC, setOptionC] = useState('')
  const [optionD, setOptionD] = useState('')
  const [correctOption, setCorrectOption] = useState('A')
  const [explanation, setExplanation] = useState('')
  const [timeLimit, setTimeLimit] = useState('30')
  const [position, setPosition] = useState('1')

  const supabase = createClient()

  async function refreshQuestions() {
    setLoading(true)
    setError('')
    try {
      const { data, error: fetchErr } = await supabase
        .from('questions')
        .select('*')
        .order('position', { ascending: true })

      if (fetchErr) throw fetchErr

      const typedData = (data as DbQuestionRow[] | null) ?? []
      const formatted: Question[] = typedData.map((q: DbQuestionRow) => ({
        id: q.id,
        question_text: q.question_text,
        prompt: q.prompt,
        think_twice_prompt: q.think_twice_prompt,
        options: Array.isArray(q.options) ? (q.options as string[]) : [],
        correct_option: q.correct_option,
        explanation: q.explanation,
        difficulty: q.difficulty,
        category: q.category,
        time_limit: q.time_limit,
        position: q.position,
        created_at: q.created_at,
      }))

      setQuestions(formatted)
    } catch (err: unknown) {
      console.error('Error loading questions:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch questions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    async function loadInitial() {
      try {
        const { data, error: fetchErr } = await supabase
          .from('questions')
          .select('*')
          .order('position', { ascending: true })

        if (!active) return
        if (fetchErr) throw fetchErr

        const typedData = (data as DbQuestionRow[] | null) ?? []
        const formatted: Question[] = typedData.map((q: DbQuestionRow) => ({
          id: q.id,
          question_text: q.question_text,
          prompt: q.prompt,
          think_twice_prompt: q.think_twice_prompt,
          options: Array.isArray(q.options) ? (q.options as string[]) : [],
          correct_option: q.correct_option,
          explanation: q.explanation,
          difficulty: q.difficulty,
          category: q.category,
          time_limit: q.time_limit,
          position: q.position,
          created_at: q.created_at,
        }))

        setQuestions(formatted)
      } catch (err: unknown) {
        if (!active) return
        console.error('Error loading questions:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch questions.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadInitial()
    return () => {
      active = false
    }
  }, [supabase])

  async function handleCreateQuestion(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const opts = [optionA.trim(), optionB.trim(), optionC.trim(), optionD.trim()].filter(Boolean)
    if (opts.length < 2) {
      setError('Please provide at least 2 option choices.')
      return
    }

    const selectedCorrectText =
      correctOption === 'A'
        ? optionA.trim()
        : correctOption === 'B'
        ? optionB.trim()
        : correctOption === 'C'
        ? optionC.trim()
        : optionD.trim()

    try {
      const { error: insertErr } = await supabase.from('questions').insert({
        question_text: questionText.trim(),
        prompt: questionText.trim(),
        think_twice_prompt: thinkTwicePrompt.trim() || 'Pause and reconsider your initial response. Are you certain?',
        options: opts,
        correct_option: selectedCorrectText,
        explanation: explanation.trim() || null,
        time_limit: parseInt(timeLimit, 10) || 30,
        position: parseInt(position, 10) || questions.length + 1,
      })

      if (insertErr) throw insertErr

      setSuccess('Question added to database successfully.')
      setShowModal(false)
      setQuestionText('')
      setOptionA('')
      setOptionB('')
      setOptionC('')
      setOptionD('')
      setExplanation('')
      await refreshQuestions()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save question.')
    }
  }

  async function handleDeleteQuestion(id: string) {
    if (!confirm('Are you sure you want to delete this question?')) return
    setError('')
    setSuccess('')
    try {
      const { error: delErr } = await supabase.from('questions').delete().eq('id', id)
      if (delErr) throw delErr
      setSuccess('Question deleted.')
      await refreshQuestions()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete question.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-primary">
            <Link href="/admin" className="hover:underline flex items-center gap-1">
              <ArrowLeft className="size-3" /> Dashboard
            </Link>
            <span>/</span>
            <span>Question Bank</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight mt-1">Question Management</h1>
          <p className="text-sm text-muted-foreground">Manage multi-choice questions, Think Twice prompts, and timers.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:opacity-90"
          >
            <Plus className="size-4" /> Add Question
          </button>
          <button
            onClick={() => void refreshQuestions()}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-bold hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl bg-destructive/10 p-4 text-sm font-semibold text-destructive">{error}</div>}
      {success && <div className="rounded-xl bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-600">{success}</div>}

      {/* Preview Modal */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-primary uppercase">Question Preview</span>
              <button onClick={() => setPreviewQuestion(null)} className="text-xs font-bold text-muted-foreground hover:text-foreground">Close</button>
            </div>
            <h2 className="text-2xl font-black">{previewQuestion.question_text}</h2>
            <p className="text-xs text-muted-foreground italic font-mono">&quot;{previewQuestion.think_twice_prompt}&quot;</p>
            <div className="grid gap-2">
              {previewQuestion.options.map((opt, i) => (
                <div key={opt} className={`p-3 rounded-xl border flex items-center justify-between text-sm ${opt === previewQuestion.correct_option ? 'border-emerald-500 bg-emerald-500/10 font-bold text-emerald-600' : 'border-border bg-background'}`}>
                  <span>{String.fromCharCode(65 + i)}. {opt}</span>
                  {opt === previewQuestion.correct_option && <span className="text-xs font-mono font-bold uppercase">(Correct Answer)</span>}
                </div>
              ))}
            </div>
            {previewQuestion.explanation && (
              <div className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
                <strong className="text-foreground">Explanation:</strong> {previewQuestion.explanation}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-xl space-y-4 my-8">
            <h2 className="text-2xl font-black">Add New Question</h2>
            <form onSubmit={handleCreateQuestion} className="space-y-4">
              <label className="flex flex-col gap-1 text-xs font-semibold">
                Question Text
                <input
                  required
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="e.g. Which element has the chemical symbol 'Fe'?"
                  className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold">
                Think Twice Reflection Prompt
                <input
                  value={thinkTwicePrompt}
                  onChange={(e) => setThinkTwicePrompt(e.target.value)}
                  placeholder="Pause and reconsider your initial response. Are you certain?"
                  className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-xs font-semibold">
                  Option A
                  <input required value={optionA} onChange={(e) => setOptionA(e.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm outline-none" />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold">
                  Option B
                  <input required value={optionB} onChange={(e) => setOptionB(e.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm outline-none" />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold">
                  Option C
                  <input required value={optionC} onChange={(e) => setOptionC(e.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm outline-none" />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold">
                  Option D
                  <input required value={optionD} onChange={(e) => setOptionD(e.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm outline-none" />
                </label>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <label className="flex flex-col gap-1 text-xs font-semibold">
                  Correct Choice
                  <select value={correctOption} onChange={(e) => setCorrectOption(e.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm outline-none">
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold">
                  Time Limit (sec)
                  <input type="number" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm outline-none" />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold">
                  Sequence Position
                  <input type="number" value={position} onChange={(e) => setPosition(e.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm outline-none" />
                </label>
              </div>

              <label className="flex flex-col gap-1 text-xs font-semibold">
                Explanation (shown after answer reveal)
                <textarea rows={2} value={explanation} onChange={(e) => setExplanation(e.target.value)} className="rounded-xl border border-input bg-background p-3 text-sm outline-none" />
              </label>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-border px-4 py-2 text-xs font-bold hover:bg-muted">
                  Cancel
                </button>
                <button type="submit" className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:opacity-90">
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List */}
      <div className="grid gap-4">
        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
            Loading question bank...
          </div>
        ) : questions.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
            No questions in database. Click &quot;Add Question&quot; to populate your bank.
          </div>
        ) : (
          questions.map((q: Question) => (
            <div key={q.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-primary">
                  <span>POSITION #{q.position}</span>
                  <span>•</span>
                  <span>{q.time_limit}s timer</span>
                </div>
                <h3 className="font-bold text-lg">{q.question_text}</h3>
                <p className="text-xs text-muted-foreground">Options: {q.options.join(', ')}</p>
                <p className="text-xs text-emerald-600 font-bold">Correct: {q.correct_option}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setPreviewQuestion(q)} className="flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:bg-muted">
                  <Eye className="size-3.5" /> Preview
                </button>
                <button onClick={() => void handleDeleteQuestion(q.id)} className="flex items-center gap-1 rounded-xl border border-destructive/30 text-destructive px-3 py-2 text-xs font-bold hover:bg-destructive/10">
                  <Trash2 className="size-3.5" /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
