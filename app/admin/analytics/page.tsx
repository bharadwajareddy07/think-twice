'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { ArrowLeft, Brain, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [totalAnswers, setTotalAnswers] = useState(0)
  const [reconsideredCount, setReconsideredCount] = useState(0)
  const [changedToCorrect, setChangedToCorrect] = useState(0)
  const [changedToWrong, setChangedToWrong] = useState(0)

  const supabase = createClient()

  async function refreshAnalytics() {
    setLoading(true)
    try {
      const [{ count: total }, { count: reconsidered }, { count: toCorrect }, { count: toWrong }] = await Promise.all([
        supabase.from('answers').select('*', { count: 'exact', head: true }),
        supabase.from('answers').select('*', { count: 'exact', head: true }).eq('did_reconsider', true),
        supabase.from('answers').select('*', { count: 'exact', head: true }).eq('changed_to_correct', true),
        supabase.from('answers').select('*', { count: 'exact', head: true }).eq('changed_to_wrong', true),
      ])

      setTotalAnswers(total ?? 0)
      setReconsideredCount(reconsidered ?? 0)
      setChangedToCorrect(toCorrect ?? 0)
      setChangedToWrong(toWrong ?? 0)
    } catch (err: unknown) {
      console.error('Error loading analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    async function loadInitial() {
      try {
        const [{ count: total }, { count: reconsidered }, { count: toCorrect }, { count: toWrong }] = await Promise.all([
          supabase.from('answers').select('*', { count: 'exact', head: true }),
          supabase.from('answers').select('*', { count: 'exact', head: true }).eq('did_reconsider', true),
          supabase.from('answers').select('*', { count: 'exact', head: true }).eq('changed_to_correct', true),
          supabase.from('answers').select('*', { count: 'exact', head: true }).eq('changed_to_wrong', true),
        ])

        if (!active) return

        setTotalAnswers(total ?? 0)
        setReconsideredCount(reconsidered ?? 0)
        setChangedToCorrect(toCorrect ?? 0)
        setChangedToWrong(toWrong ?? 0)
      } catch (err: unknown) {
        if (!active) return
        console.error('Error loading analytics:', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadInitial()
    return () => {
      active = false
    }
  }, [supabase])

  const reconsiderRate = totalAnswers > 0 ? Math.round((reconsideredCount / totalAnswers) * 100) : 0
  const successRate = reconsideredCount > 0 ? Math.round((changedToCorrect / (changedToCorrect + changedToWrong || 1)) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-primary">
            <Link href="/admin" className="hover:underline flex items-center gap-1">
              <ArrowLeft className="size-3" /> Dashboard
            </Link>
            <span>/</span>
            <span>Analytics</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight mt-1">Behavioral Analytics</h1>
          <p className="text-sm text-muted-foreground">Deep analysis into player instinct vs Think Twice reflection outcomes.</p>
        </div>
        <button
          onClick={() => void refreshAnalytics()}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-bold hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Analytics
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-mono font-bold uppercase text-muted-foreground">Total Answer Submissions</p>
          <p className="mt-2 text-3xl font-black">{totalAnswers}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-mono font-bold uppercase text-primary">Think Twice Engagement</p>
          <p className="mt-2 text-3xl font-black">{reconsiderRate}%</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-mono font-bold uppercase text-emerald-600">Switched to Correct</p>
          <p className="mt-2 text-3xl font-black text-emerald-600">+{changedToCorrect}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-mono font-bold uppercase text-rose-500">Switched to Wrong</p>
          <p className="mt-2 text-3xl font-black text-rose-500">-{changedToWrong}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <Brain className="size-6 text-primary" />
          <h2 className="text-xl font-black">Think Twice Instinct Conversion Rate</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          When students were prompted to Think Twice, <strong className="text-foreground">{successRate}%</strong> of answer changes resulted in correcting an initial mistake.
        </p>
      </div>
    </div>
  )
}
