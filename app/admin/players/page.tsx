'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { ArrowLeft, Ban, RefreshCw, Search, UserCheck } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { HOUSE_SYMBOLS } from '@/lib/constants'
import type { House, Player } from '@/lib/types'

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [houses, setHouses] = useState<House[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [houseFilter, setHouseFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const supabase = createClient()

  async function refreshData() {
    setLoading(true)
    setError('')
    try {
      const [{ data: dbPlayers, error: pError }, { data: dbHouses, error: hError }] = await Promise.all([
        supabase
          .from('players')
          .select('*, house:houses(id, name, color)')
          .order('created_at', { ascending: false }),
        supabase.from('houses').select('id, name, color').order('name'),
      ])

      if (pError) throw pError
      if (hError) throw hError

      setPlayers((dbPlayers as Player[]) || [])
      setHouses((dbHouses as House[]) || [])
    } catch (err: unknown) {
      console.error('Error loading players:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch player records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    async function loadInitial() {
      try {
        const [{ data: dbPlayers, error: pError }, { data: dbHouses, error: hError }] = await Promise.all([
          supabase
            .from('players')
            .select('*, house:houses(id, name, color)')
            .order('created_at', { ascending: false }),
          supabase.from('houses').select('id, name, color').order('name'),
        ])

        if (!active) return
        if (pError) throw pError
        if (hError) throw hError

        setPlayers((dbPlayers as Player[]) || [])
        setHouses((dbHouses as House[]) || [])
      } catch (err: unknown) {
        if (!active) return
        console.error('Error loading players:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch player records.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadInitial()
    return () => {
      active = false
    }
  }, [supabase])

  async function handleHouseChange(playerId: string, newHouseId: string) {
    setUpdatingId(playerId)
    setError('')
    setSuccess('')
    try {
      const { error: updateErr } = await supabase
        .from('players')
        .update({ house_id: newHouseId || null })
        .eq('id', playerId)

      if (updateErr) throw updateErr

      setSuccess('House assignment updated successfully.')
      await refreshData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reassign house.')
    } finally {
      setUpdatingId(null)
    }
  }

  async function togglePlayerStatus(playerId: string, currentStatus: string) {
    setUpdatingId(playerId)
    setError('')
    setSuccess('')
    const nextStatus = currentStatus === 'active' ? 'disabled' : 'active'
    try {
      const { error: updateErr } = await supabase
        .from('players')
        .update({ status: nextStatus })
        .eq('id', playerId)

      if (updateErr) throw updateErr

      setSuccess(`Player ${nextStatus === 'active' ? 'restored' : 'disabled'} successfully.`)
      await refreshData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update player status.')
    } finally {
      setUpdatingId(null)
    }
  }

  const filteredPlayers = players.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.college.toLowerCase().includes(search.toLowerCase()) ||
      p.player_code.toLowerCase().includes(search.toLowerCase())

    const matchesHouse = houseFilter === 'all' || p.house_id === houseFilter
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter

    return matchesSearch && matchesHouse && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-primary">
            <Link href="/admin" className="hover:underline flex items-center gap-1">
              <ArrowLeft className="size-3" /> Dashboard
            </Link>
            <span>/</span>
            <span>Player Registry</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight mt-1">Player Management</h1>
          <p className="text-sm text-muted-foreground">Search, reassign houses, and manage player statuses.</p>
        </div>
        <button
          onClick={() => void refreshData()}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-bold hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Records
        </button>
      </div>

      {error && <div className="rounded-xl bg-destructive/10 p-4 text-sm font-semibold text-destructive">{error}</div>}
      {success && <div className="rounded-xl bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-600">{success}</div>}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, college, code..."
            className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <select
          value={houseFilter}
          onChange={(e) => setHouseFilter(e.target.value)}
          className="h-11 rounded-xl border border-input bg-card px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">All Houses</option>
          {houses.map((h) => (
            <option key={h.id} value={h.id}>
              {HOUSE_SYMBOLS[h.name as keyof typeof HOUSE_SYMBOLS] || '✨'} {h.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-11 rounded-xl border border-input bg-card px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="disabled">Disabled Only</option>
        </select>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Player Code</th>
                <th className="px-6 py-4">Name & College</th>
                <th className="px-6 py-4">House</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    Loading player records from Supabase...
                  </td>
                </tr>
              ) : filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No players found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((player) => {
                  return (
                    <tr key={player.id} className="hover:bg-muted/30 transition">
                      <td className="px-6 py-4 font-mono font-bold">{player.player_code}</td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-foreground">{player.name}</p>
                        <p className="text-xs text-muted-foreground">{player.college}</p>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          disabled={updatingId === player.id}
                          value={player.house_id || ''}
                          onChange={(e) => void handleHouseChange(player.id, e.target.value)}
                          className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <option value="">Unassigned</option>
                          {houses.map((h) => (
                            <option key={h.id} value={h.id}>
                              {HOUSE_SYMBOLS[h.name as keyof typeof HOUSE_SYMBOLS] || '✨'} {h.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                            player.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-destructive/10 text-destructive'
                          }`}
                        >
                          {player.status === 'active' ? (
                            <>
                              <UserCheck className="size-3" /> Active
                            </>
                          ) : (
                            <>
                              <Ban className="size-3" /> Disabled
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          disabled={updatingId === player.id}
                          onClick={() => void togglePlayerStatus(player.id, player.status)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition border ${
                            player.status === 'active'
                              ? 'border-destructive/30 text-destructive hover:bg-destructive/10'
                              : 'border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10'
                          }`}
                        >
                          {player.status === 'active' ? 'Disable' : 'Restore'}
                        </button>
                      </td>
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
