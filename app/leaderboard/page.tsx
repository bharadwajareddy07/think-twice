'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { ArrowLeft, RefreshCw, Sparkles, Trophy } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { HOUSE_SYMBOLS } from '@/lib/constants'
import type { Result } from '@/lib/types'

export default function PublicLeaderboardPage() {
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  async function refreshLeaderboard() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('results')
        .select('*, player:players(name, college, house:houses(name))')
        .order('score', { ascending: false })
        .limit(50)

      setResults((data as Result[]) || [])
    } catch (err: unknown) {
      console.error('Error fetching leaderboard:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    async function loadInitial() {
      try {
        const { data } = await supabase
          .from('results')
          .select('*, player:players(name, college, house:houses(name))')
          .order('score', { ascending: false })
          .limit(50)

        if (!active) return
        setResults((data as Result[]) || [])
      } catch (err: unknown) {
        if (!active) return
        console.error('Error fetching leaderboard:', err)
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
    <main className="min-h-screen bg-background text-foreground px-5 py-6 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between border-b border-border pb-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </div>
            <span className="font-mono text-sm font-bold tracking-tight">THINK TWICE</span>
          </Link>

          <div className="flex items-center gap-3 text-xs font-semibold">
            <Link href="/leaderboard/houses" className="text-primary hover:underline font-bold">
              House Standings →
            </Link>
            <Link href="/" className="text-muted-foreground hover:text-foreground flex items-center gap-1">
              <ArrowLeft className="size-3" /> Back to App
            </Link>
          </div>
        </header>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
              <Trophy className="size-7 text-amber-500" /> Player Leaderboard
            </h1>
            <p className="text-sm text-muted-foreground">Live standings calculated from validated competition submissions.</p>
          </div>
          <button
            onClick={() => void refreshLeaderboard()}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-bold hover:bg-muted"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Sync Rankings
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/50 font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Rank</th>
                  <th className="px-6 py-4">Player</th>
                  <th className="px-6 py-4">College</th>
                  <th className="px-6 py-4">House</th>
                  <th className="px-6 py-4">Score</th>
                  <th className="px-6 py-4">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      Loading player leaderboard...
                    </td>
                  </tr>
                ) : results.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      No scores recorded yet. Be the first to compete!
                    </td>
                  </tr>
                ) : (
                  results.map((res, index) => {
                    const houseName = res.player?.house?.name as keyof typeof HOUSE_SYMBOLS | undefined
                    const symbol = houseName ? HOUSE_SYMBOLS[houseName] : '✨'

                    return (
                      <tr key={res.id} className="hover:bg-muted/30 transition">
                        <td className="px-6 py-4 font-mono font-black text-lg">#{index + 1}</td>
                        <td className="px-6 py-4 font-bold">{res.player?.name ?? 'Anonymous'}</td>
                        <td className="px-6 py-4 text-muted-foreground text-xs">{res.player?.college ?? 'General'}</td>
                        <td className="px-6 py-4 font-semibold">
                          <span>{symbol}</span> {houseName ?? 'Unassigned'}
                        </td>
                        <td className="px-6 py-4 font-mono font-black text-primary text-base">{res.score} pts</td>
                        <td className="px-6 py-4 font-mono font-bold">{res.accuracy}%</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}
