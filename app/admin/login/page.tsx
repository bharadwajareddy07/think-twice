'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { Activity, ArrowRight, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { validateAdminNextUrl } from '@/lib/game'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()

  const queryError = searchParams.get('error')
  const nextParam = searchParams.get('next')

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (authError) {
        setError(authError.message || 'Invalid administrator credentials.')
        return
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        setError('Authentication succeeded, but user session could not be established.')
        return
      }

      const { data: role, error: roleError } = await supabase
        .from('admin_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()

      if (roleError) {
        setError(`Database verification error: ${roleError.message}`)
        await supabase.auth.signOut()
        return
      }

      if (!role || !['admin', 'operator'].includes(role.role)) {
        await supabase.auth.signOut()
        setError('Access denied: You are not assigned an administrator or operator role.')
        return
      }

      const safeDestination = validateAdminNextUrl(nextParam)
      router.refresh()
      router.replace(safeDestination)
    } catch (err: unknown) {
      console.error('Admin login error:', err)
      const errMessage = err instanceof Error ? err.message : 'An unexpected error occurred. Please check network connectivity.'
      setError(errMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <form onSubmit={login} className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Activity className="size-5" />
          </div>
          <span className="font-mono text-sm font-bold">THINK TWICE ADMIN</span>
        </div>

        <p className="mt-8 font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">
          Secure Access Portal
        </p>
        <h1 className="mt-2 text-3xl font-black">Administrator login</h1>

        {queryError === 'unauthorized' && !error && (
          <div role="alert" className="mt-4 flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs font-semibold text-destructive">
            <ShieldAlert className="size-4 shrink-0" />
            <span>Unauthorized access attempt. Please log in with an administrator account.</span>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm font-semibold">
            Admin Email
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-xl border border-input bg-background px-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="admin@college.edu"
              disabled={loading}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-semibold">
            Password
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl border border-input bg-background px-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="••••••••"
              disabled={loading}
            />
          </label>

          {error && (
            <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Console'} <ArrowRight className="size-4" />
          </button>
        </div>

        <Link
          href="/"
          className="mt-6 block text-center text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          Return to player experience
        </Link>
      </form>
    </main>
  )
}
