'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { HOUSE_SYMBOLS } from '@/lib/constants'
import type { Result } from '@/lib/types'

export default function AdminResultsPage() {
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const supabase = createClient()

  async function refreshResults() {
    setLoading(true)
    setError('')
    try {
      const { data, error: fetchErr } = await supabase
        .from('results')
        .select('*, player:players(name, college, player_code, house:houses(name))')
        .order('score', { ascending: false })

      if (fetchErr) throw fetchErr

      setResults((data as Result[]) || [])
    } catch (err: unknown) {
      console.error('Error fetching results:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch competition results.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    async function loadInitial() {
      try {
        const { data, error: fetchErr } = await supabase
          .from('results')
          .select('*, player:players(name, college, player_code, house:houses(name))')
          .order('score', { ascending: false })

        if (!active) return
        if (fetchErr) throw fetchErr

        setResults((data as Result[]) || [])
      } catch (err: unknown) {
        if (!active) return
        console.error('Error fetching results:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch competition results.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadInitial()
    return () => {
      active = false
    }
  }, [supabase])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-primary">
            <Link href="/admin" className="hover:underline flex items-center gap-1">
              <ArrowLeft className="size-3" /> Dashboard
            </Link>
            <span>/</span>
            <span>Results & Standings</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight mt-1">Competition Results</h1>
          <p className="text-sm text-muted-foreground">Comprehensive scores, Think Twice accuracy metrics, and player rankings.</p>
        </div>
        <button
          onClick={() => void refreshResults()}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-bold hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Results
        </button>
      </div>

      {error && <div className="rounded-xl bg-destructive/10 p-4 text-sm font-semibold text-destructive">{error}</div>}

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Rank</th>
                <th className="px-6 py-4">Player</th>
                <th className="px-6 py-4">House</th>
                <th className="px-6 py-4">Score</th>
                <th className="px-6 py-4">Accuracy</th>
                <th className="px-6 py-4">First vs Final Instinct</th>
                <th className="px-6 py-4">Changed to Correct</th>
                <th className="px-6 py-4">Changed to Wrong</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                    Loading results...
                  </td>
                </tr>
              ) : results.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                    No session results recorded yet.
                  </td>
                </tr>
              ) : (
                results.map((res, index) => {
                  const houseName = res.player?.house?.name as keyof typeof HOUSE_SYMBOLS | undefined
                  const symbol = houseName ? HOUSE_SYMBOLS[houseName] : '✨'

                  return (
                    <tr key={res.id} className="hover:bg-muted/30 transition">
                      <td className="px-6 py-4 font-mono font-black text-lg">#{index + 1}</td>
                      <td className="px-6 py-4">
                        <p className="font-bold">{res.player?.name ?? 'Unknown Player'}</p>
                        <p className="text-xs text-muted-foreground">{res.player?.college ?? 'General'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 font-bold">
                          <span>{symbol}</span> {houseName ?? 'Unassigned'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-black text-primary text-base">{res.score} pts</td>
                      <td className="px-6 py-4 font-mono font-bold">{res.accuracy}%</td>
                      <td className="px-6 py-4 font-mono text-xs">
                        <span className="text-muted-foreground">{res.first_answer_accuracy}%</span> → <span className="font-bold text-foreground">{res.final_answer_accuracy}%</span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-emerald-600">+{res.changed_to_correct}</td>
                      <td className="px-6 py-4 font-mono font-bold text-rose-500">-{res.changed_to_wrong}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
