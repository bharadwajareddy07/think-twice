'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { ArrowLeft, Pause, Play, Radio, RefreshCw, StopCircle } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Competition, CompetitionStatus } from '@/lib/types'

interface ScoreResultRow {
  score: number | null
}

export default function AdminLivePage() {
  const [liveComp, setLiveComp] = useState<Competition | null>(null)
  const [loading, setLoading] = useState(true)
  const [playersJoined, setPlayersJoined] = useState(0)
  const [playersPlaying, setPlayersPlaying] = useState(0)
  const [playersCompleted, setPlayersCompleted] = useState(0)
  const [avgScore, setAvgScore] = useState(0)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  async function refreshLiveData() {
    setLoading(true)
    setError('')
    try {
      const { data: comps } = await supabase
        .from('competitions')
        .select('*')
        .in('status', ['LIVE', 'UPCOMING', 'PAUSED'])
        .order('created_at', { ascending: false })
        .limit(1)

      const active = comps?.[0] || null
      setLiveComp(active)

      if (active) {
        const [{ count: joined }, { count: playing }, { count: completed }, { data: results }] =
          await Promise.all([
            supabase.from('game_sessions').select('*', { count: 'exact', head: true }).eq('competition_id', active.id),
            supabase.from('game_sessions').select('*', { count: 'exact', head: true }).eq('competition_id', active.id).eq('status', 'IN_PROGRESS'),
            supabase.from('game_sessions').select('*', { count: 'exact', head: true }).eq('competition_id', active.id).eq('status', 'COMPLETED'),
            supabase.from('results').select('score').eq('competition_id', active.id),
          ])

        setPlayersJoined(joined ?? 0)
        setPlayersPlaying(playing ?? 0)
        setPlayersCompleted(completed ?? 0)

        const typedResults = (results as ScoreResultRow[] | null) ?? []
        if (typedResults.length > 0) {
          const sum = typedResults.reduce((acc: number, r: ScoreResultRow) => acc + (r.score || 0), 0)
          setAvgScore(Math.round(sum / typedResults.length))
        } else {
          setAvgScore(0)
        }
      }
    } catch (err: unknown) {
      console.error('Error fetching live data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch live status.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    async function fetchInitial() {
      try {
        const { data: comps } = await supabase
          .from('competitions')
          .select('*')
          .in('status', ['LIVE', 'UPCOMING', 'PAUSED'])
          .order('created_at', { ascending: false })
          .limit(1)

        if (!active) return
        const currentComp = comps?.[0] || null
        setLiveComp(currentComp)

        if (currentComp) {
          const [{ count: joined }, { count: playing }, { count: completed }, { data: results }] =
            await Promise.all([
              supabase.from('game_sessions').select('*', { count: 'exact', head: true }).eq('competition_id', currentComp.id),
              supabase.from('game_sessions').select('*', { count: 'exact', head: true }).eq('competition_id', currentComp.id).eq('status', 'IN_PROGRESS'),
              supabase.from('game_sessions').select('*', { count: 'exact', head: true }).eq('competition_id', currentComp.id).eq('status', 'COMPLETED'),
              supabase.from('results').select('score').eq('competition_id', currentComp.id),
            ])

          if (!active) return
          setPlayersJoined(joined ?? 0)
          setPlayersPlaying(playing ?? 0)
          setPlayersCompleted(completed ?? 0)

          const typedResults = (results as ScoreResultRow[] | null) ?? []
          if (typedResults.length > 0) {
            const sum = typedResults.reduce((acc: number, r: ScoreResultRow) => acc + (r.score || 0), 0)
            setAvgScore(Math.round(sum / typedResults.length))
          } else {
            setAvgScore(0)
          }
        }
      } catch (err: unknown) {
        if (!active) return
        console.error('Error fetching live data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch live status.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void fetchInitial()
    const interval = setInterval(() => void fetchInitial(), 5000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [supabase])

  async function setStatus(newStatus: CompetitionStatus) {
    if (!liveComp) return
    setUpdating(true)
    setError('')
    try {
      const { error: updateErr } = await supabase
        .from('competitions')
        .update({ status: newStatus })
        .eq('id', liveComp.id)

      if (updateErr) throw updateErr

      await refreshLiveData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update live status.')
    } finally {
      setUpdating(false)
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
            <span>Live Command Center</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight mt-1 flex items-center gap-3">
            <Radio className="size-7 text-rose-500 animate-pulse" /> Live Competition Arena
          </h1>
          <p className="text-sm text-muted-foreground">Monitor real-time participant activity and trigger state transitions.</p>
        </div>
        <button
          onClick={() => void refreshLiveData()}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-bold hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Auto-Sync (5s)
        </button>
      </div>

      {error && <div className="rounded-xl bg-destructive/10 p-4 text-sm font-semibold text-destructive">{error}</div>}

      {!liveComp ? (
        <div className="rounded-3xl border border-border bg-card p-12 text-center space-y-4">
          <Radio className="mx-auto size-12 text-muted-foreground opacity-50" />
          <h2 className="text-2xl font-black">No Active Competition Right Now</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            To launch a live competition, create one in Competition Management and set its status to LIVE or UPCOMING.
          </p>
          <Link
            href="/admin/competitions"
            className="inline-block rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground text-sm"
          >
            Go to Competitions
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-mono font-bold uppercase ${
                    liveComp.status === 'LIVE'
                      ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                      : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                  }`}
                >
                  ● {liveComp.status}
                </span>
                <span className="text-xs font-mono text-muted-foreground">{liveComp.category}</span>
              </div>
              <h2 className="text-3xl font-black mt-2">{liveComp.name}</h2>
              {liveComp.description && <p className="text-sm text-muted-foreground mt-1">{liveComp.description}</p>}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {liveComp.status !== 'LIVE' && (
                <button
                  disabled={updating}
                  onClick={() => void setStatus('LIVE')}
                  className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-3 font-bold text-white text-sm hover:bg-rose-700 transition"
                >
                  <Play className="size-4 fill-current" /> START EVENT
                </button>
              )}

              {liveComp.status === 'LIVE' && (
                <button
                  disabled={updating}
                  onClick={() => void setStatus('PAUSED')}
                  className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-5 py-3 font-bold text-amber-600 text-sm hover:bg-amber-500/20 transition"
                >
                  <Pause className="size-4" /> PAUSE EVENT
                </button>
              )}

              <button
                disabled={updating}
                onClick={() => void setStatus('COMPLETED')}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white text-sm hover:bg-emerald-700 transition"
              >
                <StopCircle className="size-4" /> END EVENT
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs font-mono font-bold uppercase text-muted-foreground">Players Joined</p>
              <p className="mt-2 text-4xl font-black">{playersJoined}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs font-mono font-bold uppercase text-rose-500">Currently Playing</p>
              <p className="mt-2 text-4xl font-black text-rose-600">{playersPlaying}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs font-mono font-bold uppercase text-emerald-600">Completed</p>
              <p className="mt-2 text-4xl font-black text-emerald-600">{playersCompleted}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs font-mono font-bold uppercase text-primary">Live Average Score</p>
              <p className="mt-2 text-4xl font-black">{avgScore}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
