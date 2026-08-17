import Link from 'next/link'
import { ArrowRight, BarChart3, Eye, Radio, Settings2, ShieldCheck, Trophy, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { HOUSE_SYMBOLS, HOUSE_COLORS, OFFICIAL_HOUSES } from '@/lib/constants'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: role } = user ? await supabase.from('admin_roles').select('role').eq('user_id', user.id).maybeSingle() : { data: null }

  if (!user || !role || !['admin', 'operator'].includes(role.role)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5 text-center">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-destructive">Access denied</p>
          <h1 className="mt-3 text-4xl font-black">You are not authorized to access the administrator console.</h1>
          <Link href="/" className="mt-8 inline-block rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">
            Return to player app
          </Link>
        </div>
      </main>
    )
  }

  const [{ count: playersCount }, { data: dbHouses }, { count: competitionsCount }, { count: questionsCount }, { count: gamesCount }] = await Promise.all([
    supabase.from('players').select('*', { count: 'exact', head: true }),
    supabase.from('houses').select('id,name,color'),
    supabase.from('competitions').select('*', { count: 'exact', head: true }),
    supabase.from('questions').select('*', { count: 'exact', head: true }),
    supabase.from('game_sessions').select('*', { count: 'exact', head: true }),
  ])

  const housesList = (dbHouses && dbHouses.length > 0) ? dbHouses : OFFICIAL_HOUSES.map((h, i) => ({ id: `h-${i}`, name: h.name, color: h.color }))

  const houseStats = await Promise.all(
    housesList.map(async (house) => {
      const { count } = await supabase.from('players').select('*', { count: 'exact', head: true }).eq('house_id', house.id)
      return {
        ...house,
        count: count ?? 0,
        symbol: HOUSE_SYMBOLS[house.name as keyof typeof HOUSE_SYMBOLS] || '✨',
        color: HOUSE_COLORS[house.name as keyof typeof HOUSE_COLORS] || house.color || '#8b5cf6',
      }
    })
  )

  const quickLinks = [
    { title: 'Player Management', desc: 'View, search, filter, and reassign houses', href: '/admin/players', icon: Users, color: 'text-blue-500' },
    { title: 'Five Houses', desc: '🔥 AGNI, 🌍 BHUMI, 🌬️ VAYU, 💧 JAL, ✨ AKASH stats', href: '/admin/houses', icon: Trophy, color: 'text-amber-500' },
    { title: 'Competitions', desc: 'Create, schedule, publish and manage status', href: '/admin/competitions', icon: Eye, color: 'text-emerald-500' },
    { title: 'Question Bank', desc: 'Manage question prompts, options and timers', href: '/admin/questions', icon: Settings2, color: 'text-purple-500' },
    { title: 'Live Control', desc: 'Monitor active players and start/pause events', href: '/admin/live', icon: Radio, color: 'text-rose-500' },
    { title: 'Results & Ranks', desc: 'Player standings and detailed accuracy reports', href: '/admin/results', icon: ShieldCheck, color: 'text-indigo-500' },
    { title: 'Analytics', desc: 'Deep dive into Think Twice reconsideration rates', href: '/admin/analytics', icon: BarChart3, color: 'text-cyan-500' },
  ]

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Platform Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">Real-time statistics for Think Twice college competitions.</p>
        </div>
        <Link href="/admin/live" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90">
          <Radio className="size-4" /> Go to Live Arena
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ['Registered Players', playersCount ?? 0],
          ['Competitions', competitionsCount ?? 0],
          ['Question Bank', questionsCount ?? 0],
          ['Game Sessions', gamesCount ?? 0],
          ['Active Houses', OFFICIAL_HOUSES.length],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">{String(label)}</p>
            <p className="mt-2 text-3xl font-black tracking-tight">{String(value)}</p>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">Five Houses Allocation</p>
            <h2 className="mt-1 text-2xl font-black">Live House Standings</h2>
          </div>
          <Link href="/admin/houses" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
            Manage Houses <ArrowRight className="size-3" />
          </Link>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {houseStats.map((house) => (
            <div key={house.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/50">
              <div className="flex items-center justify-between">
                <span className="text-2xl">{house.symbol}</span>
                <span className="size-3 rounded-full" style={{ backgroundColor: house.color }} />
              </div>
              <h3 className="mt-4 text-lg font-black">{house.name}</h3>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">{house.count} registered players</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-black">Management Modules</h2>
        <p className="text-sm text-muted-foreground">Select a section to manage platform data and live events.</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:border-primary hover:shadow-md"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-muted group-hover:bg-primary group-hover:text-primary-foreground transition">
                      <Icon className="size-5" />
                    </div>
                    <h3 className="font-bold text-lg">{item.title}</h3>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
                <div className="mt-6 flex items-center text-xs font-bold text-primary group-hover:translate-x-1 transition-transform">
                  Open section <ArrowRight className="ml-1 size-3.5" />
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
