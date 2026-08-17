'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, KeyRound, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function AuthPage() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setMessage('')
    const supabase = createClient()
    const result = mode === 'sign-in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`,
          },
        })
    setPending(false)
    if (result.error) {
      setMessage('We could not complete that request. Check your details and try again.')
      return
    }
    setMessage(mode === 'sign-up' ? 'Check your email to confirm your account.' : 'You are signed in. Return to the challenge.')
  }

  return (
    <main className="min-h-screen bg-background px-5 py-6 text-foreground sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between border-b border-border pb-5">
          <Link href="/" className="flex items-center gap-3 font-mono text-sm font-bold tracking-tight"><span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Sparkles className="size-4" /></span> THINK TWICE</Link>
          <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Back to challenge</Link>
        </header>
        <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <div className="mb-8"><div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground"><KeyRound className="size-5" /></div><p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">Player account</p><h1 className="mt-3 text-4xl font-black tracking-[-0.04em]">Keep your results.</h1><p className="mt-3 leading-7 text-muted-foreground">Sign in to save sessions, compare your first instinct with your final answer, and build your thinking profile.</p></div>
          <form onSubmit={submit} className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
            {mode === 'sign-up' && <label className="flex flex-col gap-2 text-sm font-semibold">Name<input required value={name} onChange={(event) => setName(event.target.value)} className="h-12 rounded-xl border border-input bg-background px-4 outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>}
            <label className="flex flex-col gap-2 text-sm font-semibold">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 rounded-xl border border-input bg-background px-4 outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
            <label className="flex flex-col gap-2 text-sm font-semibold">Password<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 rounded-xl border border-input bg-background px-4 outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
            {message && <p role="status" className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">{message}</p>}
            <button disabled={pending} className="mt-2 flex h-12 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">{pending ? 'Working…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}</button>
            <button type="button" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setMessage('') }} className="text-sm font-semibold text-primary hover:underline">{mode === 'sign-in' ? 'New here? Create an account' : 'Already have an account? Sign in'}</button>
          </form>
        </section>
      </div>
    </main>
  )
}
