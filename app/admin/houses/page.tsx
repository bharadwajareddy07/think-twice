'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { ArrowLeft, RefreshCw, Users } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { OFFICIAL_HOUSES } from '@/lib/constants'
import type { HouseName } from '@/lib/types'

interface HouseStat {
  id: string
  name: HouseName
  symbol: string
  color: string
  description: string
  playerCount: number
  totalPoints: number
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

export default function AdminHousesPage() {
  const [houseStats, setHouseStats] = useState<HouseStat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const supabase = createClient()

  async function refreshHouseStats() {
    setLoading(true)
    setError('')
    try {
      const { data: dbHouses } = await supabase.from('houses').select('id, name, color, description')
      const typedDbHouses = (dbHouses as DbHouseRow[] | null) ?? []

      const statsMap = await Promise.all(
        OFFICIAL_HOUSES.map(async (official) => {
          const dbHouse = typedDbHouses.find((h: DbHouseRow) => h.name === official.name)
          const houseId = dbHouse?.id ?? official.name

          const { count: playerCount } = await supabase
            .from('players')
            .select('*', { count: 'exact', head: true })
            .eq('house_id', houseId)

          const { data: playerIds } = dbHouse
            ? await supabase.from('players').select('id').eq('house_id', dbHouse.id)
            : { data: [] }

          const typedPlayerIds = (playerIds as PlayerIdRow[] | null) ?? []

          let totalPoints = 0
          let averageScore = 0

          if (typedPlayerIds.length > 0) {
            const ids = typedPlayerIds.map((p: PlayerIdRow) => p.id)
            const { data: results } = await supabase.from('results').select('score').in('player_id', ids)
            const typedResults = (results as ScoreRow[] | null) ?? []

            if (typedResults.length > 0) {
              totalPoints = typedResults.reduce((acc: number, r: ScoreRow) => acc + (r.score || 0), 0)
              averageScore = Math.round(totalPoints / typedResults.length)
            }
          }

          return {
            id: houseId,
            name: official.name,
            symbol: official.symbol,
            color: official.color,
            description: official.description,
            playerCount: playerCount ?? 0,
            totalPoints,
            averageScore,
            rank: 1,
          }
        })
      )

      statsMap.sort((a, b) => b.totalPoints - a.totalPoints || b.playerCount - a.playerCount)
      statsMap.forEach((h, idx) => {
        h.rank = idx + 1
      })

      setHouseStats(statsMap)
    } catch (err: unknown) {
      console.error('Error fetching house statistics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load house data.')
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

        const statsMap = await Promise.all(
          OFFICIAL_HOUSES.map(async (official) => {
            const dbHouse = typedDbHouses.find((h: DbHouseRow) => h.name === official.name)
            const houseId = dbHouse?.id ?? official.name

            const { count: playerCount } = await supabase
              .from('players')
              .select('*', { count: 'exact', head: true })
              .eq('house_id', houseId)

            const { data: playerIds } = dbHouse
              ? await supabase.from('players').select('id').eq('house_id', dbHouse.id)
              : { data: [] }

            const typedPlayerIds = (playerIds as PlayerIdRow[] | null) ?? []

            let totalPoints = 0
            let averageScore = 0

            if (typedPlayerIds.length > 0) {
              const ids = typedPlayerIds.map((p: PlayerIdRow) => p.id)
              const { data: results } = await supabase.from('results').select('score').in('player_id', ids)
              const typedResults = (results as ScoreRow[] | null) ?? []

              if (typedResults.length > 0) {
                totalPoints = typedResults.reduce((acc: number, r: ScoreRow) => acc + (r.score || 0), 0)
                averageScore = Math.round(totalPoints / typedResults.length)
              }
            }

            return {
              id: houseId,
              name: official.name,
              symbol: official.symbol,
              color: official.color,
              description: official.description,
              playerCount: playerCount ?? 0,
              totalPoints,
              averageScore,
              rank: 1,
            }
          })
        )

        if (!active) return
        statsMap.sort((a, b) => b.totalPoints - a.totalPoints || b.playerCount - a.playerCount)
        statsMap.forEach((h, idx) => {
          h.rank = idx + 1
        })

        setHouseStats(statsMap)
      } catch (err: unknown) {
        if (!active) return
        console.error('Error fetching house statistics:', err)
        setError(err instanceof Error ? err.message : 'Failed to load house data.')
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
            <span>House Standings</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight mt-1">Five Houses Management</h1>
          <p className="text-sm text-muted-foreground">🔥 AGNI, 🌍 BHUMI, 🌬️ VAYU, 💧 JAL, ✨ AKASH live metrics.</p>
        </div>
        <button
          onClick={() => void refreshHouseStats()}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-bold hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Metrics
        </button>
      </div>

      {error && <div className="rounded-xl bg-destructive/10 p-4 text-sm font-semibold text-destructive">{error}</div>}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {houseStats.map((house) => (
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
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">{house.name}</h2>
                    <p className="text-xs text-muted-foreground">{house.description}</p>
                  </div>
                </div>
                <div className="flex size-9 items-center justify-center rounded-xl bg-muted font-mono font-black text-sm">
                  #{house.rank}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2 text-center rounded-2xl bg-muted/40 p-4">
                <div>
                  <p className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Players</p>
                  <p className="mt-1 text-lg font-black">{house.playerCount}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Total Points</p>
                  <p className="mt-1 text-lg font-black text-primary">{house.totalPoints}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Avg Score</p>
                  <p className="mt-1 text-lg font-black">{house.averageScore}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
              <Link
                href={`/admin/players?house=${house.id}`}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                <Users className="size-3.5" /> View Members
              </Link>
              <span className="text-xs font-mono text-muted-foreground">House Rank #{house.rank}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
