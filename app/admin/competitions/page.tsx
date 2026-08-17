'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, Clock, Pause, Play, Plus, RefreshCw, StopCircle } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Competition, CompetitionStatus } from '@/lib/types'

function generateCompCode(): string {
  return `COMP-${Date.now().toString(36).toUpperCase()}`
}

export default function AdminCompetitionsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('1800')
  const [difficulty, setDifficulty] = useState('Medium')
  const [category, setCategory] = useState('General Knowledge')
  const [participantLimit, setParticipantLimit] = useState('1000')

  const supabase = createClient()

  async function refreshCompetitions() {
    setLoading(true)
    setError('')
    try {
      const { data, error: fetchErr } = await supabase
        .from('competitions')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchErr) throw fetchErr
      setCompetitions((data as Competition[]) || [])
    } catch (err: unknown) {
      console.error('Error fetching competitions:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch competitions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    async function loadInitial() {
      try {
        const { data, error: fetchErr } = await supabase
          .from('competitions')
          .select('*')
          .order('created_at', { ascending: false })

        if (!active) return
        if (fetchErr) throw fetchErr
        setCompetitions((data as Competition[]) || [])
      } catch (err: unknown) {
        if (!active) return
        console.error('Error fetching competitions:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch competitions.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadInitial()
    return () => {
      active = false
    }
  }, [supabase])

  async function handleCreateCompetition(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      const generatedCode = generateCompCode()
      const { error: insertErr } = await supabase.from('competitions').insert({
        name: name.trim(),
        code: generatedCode,
        description: description.trim() || null,
        duration: parseInt(duration, 10) || 1800,
        difficulty,
        category,
        participant_limit: participantLimit ? parseInt(participantLimit, 10) : null,
        status: 'DRAFT',
      })

      if (insertErr) throw insertErr

      setSuccess('Competition created successfully as DRAFT.')
      setShowModal(false)
      setName('')
      setDescription('')
      await refreshCompetitions()
    } catch (err: unknown) {
      const errMsg =
        err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to create competition.'
      setError(errMsg)
    }
  }

  async function updateStatus(id: string, newStatus: CompetitionStatus) {
    setUpdatingId(id)
    setError('')
    setSuccess('')
    try {
      const { error: updateErr } = await supabase
        .from('competitions')
        .update({ status: newStatus })
        .eq('id', id)

      if (updateErr) throw updateErr

      setSuccess(`Competition status updated to ${newStatus}.`)
      await refreshCompetitions()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update competition status.')
    } finally {
      setUpdatingId(null)
    }
  }

  const getStatusBadge = (status: CompetitionStatus) => {
    switch (status) {
      case 'LIVE':
        return 'bg-rose-500/10 text-rose-600 border-rose-500/30'
      case 'UPCOMING':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/30'
      case 'PAUSED':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30'
      case 'COMPLETED':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
      case 'CANCELLED':
        return 'bg-muted text-muted-foreground border-border'
      default:
        return 'bg-blue-500/10 text-blue-600 border-blue-500/30'
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
            <span>Competitions</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight mt-1">Competition Management</h1>
          <p className="text-sm text-muted-foreground">Create, publish, and control competition lifecycle states.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:opacity-90"
          >
            <Plus className="size-4" /> Create Competition
          </button>
          <button
            onClick={() => void refreshCompetitions()}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-bold hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl bg-destructive/10 p-4 text-sm font-semibold text-destructive">{error}</div>}
      {success && <div className="rounded-xl bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-600">{success}</div>}

      {/* Competition Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-xl space-y-4">
            <h2 className="text-2xl font-black">Create New Competition</h2>
            <form onSubmit={handleCreateCompetition} className="space-y-4">
              <label className="flex flex-col gap-1 text-xs font-semibold">
                Competition Title
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Think Twice Grand Championship 2026"
                  className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold">
                Description
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of event..."
                  className="rounded-xl border border-input bg-background p-3 text-sm outline-none"
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1 text-xs font-semibold">
                  Duration (seconds)
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-semibold">
                  Difficulty
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1 text-xs font-semibold">
                  Category
                  <input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-semibold">
                  Max Participants
                  <input
                    type="number"
                    value={participantLimit}
                    onChange={(e) => setParticipantLimit(e.target.value)}
                    className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-bold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:opacity-90"
                >
                  Save Draft
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
            Loading competitions...
          </div>
        ) : competitions.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
            No competitions created yet. Click &quot;Create Competition&quot; to get started.
          </div>
        ) : (
          competitions.map((comp) => (
            <div
              key={comp.id}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex rounded-full border px-3 py-0.5 text-xs font-bold ${getStatusBadge(comp.status)}`}>
                    {comp.status}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">{comp.category} • {comp.difficulty}</span>
                </div>
                <h3 className="text-xl font-black">{comp.name}</h3>
                {comp.description && <p className="text-xs text-muted-foreground">{comp.description}</p>}
                <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground pt-1">
                  <span className="flex items-center gap-1"><Clock className="size-3" /> {Math.round(comp.duration / 60)} mins</span>
                  <span>Limit: {comp.participant_limit ?? 'Unlimited'}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t md:border-t-0 pt-4 md:pt-0 border-border">
                {comp.status === 'DRAFT' && (
                  <button
                    disabled={updatingId === comp.id}
                    onClick={() => void updateStatus(comp.id, 'UPCOMING')}
                    className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-600 hover:bg-amber-500/20"
                  >
                    Publish (Upcoming)
                  </button>
                )}

                {(comp.status === 'DRAFT' || comp.status === 'UPCOMING' || comp.status === 'PAUSED') && (
                  <button
                    disabled={updatingId === comp.id}
                    onClick={() => void updateStatus(comp.id, 'LIVE')}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-700"
                  >
                    <Play className="size-3.5 fill-current" /> Go Live
                  </button>
                )}

                {comp.status === 'LIVE' && (
                  <>
                    <button
                      disabled={updatingId === comp.id}
                      onClick={() => void updateStatus(comp.id, 'PAUSED')}
                      className="flex items-center gap-1 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs font-bold text-amber-600 hover:bg-amber-500/20"
                    >
                      <Pause className="size-3.5" /> Pause
                    </button>
                    <button
                      disabled={updatingId === comp.id}
                      onClick={() => void updateStatus(comp.id, 'COMPLETED')}
                      className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      <StopCircle className="size-3.5" /> End Event
                    </button>
                  </>
                )}

                {comp.status !== 'CANCELLED' && comp.status !== 'COMPLETED' && (
                  <button
                    disabled={updatingId === comp.id}
                    onClick={() => void updateStatus(comp.id, 'CANCELLED')}
                    className="rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
