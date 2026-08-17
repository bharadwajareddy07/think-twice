'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { ArrowLeft, RefreshCw, Sparkles, Trophy } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { OFFICIAL_HOUSES } from '@/lib/constants'

interface HouseLeaderboardItem {
  name: string
  symbol: string
  color: string
  description: string
  players: number
  points: number
  averageScore: number
  rank: number
}

interface DbHouseRow {
  id: string
  name: string
  color: string
  description?: string | null
}

interface PlayerIdRow {
  id: string
}

interface ScoreRow {
  score: number | null
}

export default function HouseLeaderboardPage() {
  const [houses, setHouses] = useState<HouseLeaderboardItem[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  async function refreshHouseLeaderboard() {
    setLoading(true)
    try {
      const { data: dbHouses } = await supabase.from('houses').select('id, name, color, description')
      const typedDbHouses = (dbHouses as DbHouseRow[] | null) ?? []

      const items = await Promise.all(
        OFFICIAL_HOUSES.map(async (official) => {
          const dbH = typedDbHouses.find((h: DbHouseRow) => h.name === official.name)
          const houseId = dbH?.id ?? official.name

          const { count: playerCount } = await supabase
            .from('players')
            .select('*', { count: 'exact', head: true })
            .eq('house_id', houseId)

          const { data: playerRows } = dbH
            ? await supabase.from('players').select('id').eq('house_id', dbH.id)
            : { data: [] }

          const typedPlayerRows = (playerRows as PlayerIdRow[] | null) ?? []

          let points = 0
          let averageScore = 0

          if (typedPlayerRows.length > 0) {
            const pIds = typedPlayerRows.map((p: PlayerIdRow) => p.id)
            const { data: res } = await supabase.from('results').select('score').in('player_id', pIds)
            const typedRes = (res as ScoreRow[] | null) ?? []

            if (typedRes.length > 0) {
              points = typedRes.reduce((acc: number, r: ScoreRow) => acc + (r.score || 0), 0)
              averageScore = Math.round(points / typedRes.length)
            }
          }

          return {
            name: official.name,
            symbol: official.symbol,
            color: official.color,
            description: official.description,
            players: playerCount ?? 0,
            points,
            averageScore,
            rank: 1,
          }
        })
      )

      items.sort((a, b) => b.points - a.points || b.players - a.players)
      items.forEach((h, idx) => {
        h.rank = idx + 1
      })

      setHouses(items)
    } catch (err: unknown) {
      console.error('Error fetching house leaderboard:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    async function loadInitial() {
      try {
        const { data: dbHouses } = await supabase.from('houses').select('id, name, color, description')
        const typedDbHouses = (dbHouses as DbHouseRow[] | null) ?? []

        const items = await Promise.all(
          OFFICIAL_HOUSES.map(async (official) => {
            const dbH = typedDbHouses.find((h: DbHouseRow) => h.name === official.name)
            const houseId = dbH?.id ?? official.name

            const { count: playerCount } = await supabase
              .from('players')
              .select('*', { count: 'exact', head: true })
              .eq('house_id', houseId)

            const { data: playerRows } = dbH
              ? await supabase.from('players').select('id').eq('house_id', dbH.id)
              : { data: [] }

            const typedPlayerRows = (playerRows as PlayerIdRow[] | null) ?? []

            let points = 0
            let averageScore = 0

            if (typedPlayerRows.length > 0) {
              const pIds = typedPlayerRows.map((p: PlayerIdRow) => p.id)
              const { data: res } = await supabase.from('results').select('score').in('player_id', pIds)
              const typedRes = (res as ScoreRow[] | null) ?? []

              if (typedRes.length > 0) {
                points = typedRes.reduce((acc: number, r: ScoreRow) => acc + (r.score || 0), 0)
                averageScore = Math.round(points / typedRes.length)
              }
            }

            return {
              name: official.name,
              symbol: official.symbol,
              color: official.color,
              description: official.description,
              players: playerCount ?? 0,
              points,
              averageScore,
              rank: 1,
            }
          })
        )

        if (!active) return
        items.sort((a, b) => b.points - a.points || b.players - a.players)
        items.forEach((h, idx) => {
          h.rank = idx + 1
        })

        setHouses(items)
      } catch (err: unknown) {
        if (!active) return
        console.error('Error fetching house leaderboard:', err)
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
            <Link href="/leaderboard" className="text-primary hover:underline font-bold">
              ← Player Standings
            </Link>
            <Link href="/" className="text-muted-foreground hover:text-foreground flex items-center gap-1">
              <ArrowLeft className="size-3" /> Back to App
            </Link>
          </div>
        </header>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
              <Trophy className="size-7 text-amber-500" /> Five Houses Standings
            </h1>
            <p className="text-sm text-muted-foreground">
              🔥 AGNI • 🌍 BHUMI • 🌬️ VAYU • 💧 JAL • ✨ AKASH
            </p>
          </div>
          <button
            onClick={() => void refreshHouseLeaderboard()}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-bold hover:bg-muted"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Sync Standings
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {houses.map((house) => (
            <div
              key={house.name}
              className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between relative overflow-hidden"
            >
              <div
                className="absolute top-0 right-0 left-0 h-1.5"
                style={{ backgroundColor: house.color }}
              />

              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{house.symbol}</span>
                    <h2 className="text-2xl font-black">{house.name}</h2>
                  </div>
                  <div className="flex size-9 items-center justify-center rounded-xl bg-muted font-mono font-black text-sm">
                    #{house.rank}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{house.description}</p>

                <div className="mt-6 grid grid-cols-3 gap-2 text-center rounded-2xl bg-muted/40 p-4">
                  <div>
                    <p className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Players</p>
                    <p className="mt-1 text-lg font-black">{house.players}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Points</p>
                    <p className="mt-1 text-lg font-black text-primary">{house.points}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Avg Score</p>
                    <p className="mt-1 text-lg font-black">{house.averageScore}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
