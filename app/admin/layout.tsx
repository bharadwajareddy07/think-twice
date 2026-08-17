import Link from 'next/link'
import { Activity, BarChart3, Eye, Home, LayoutDashboard, LogOut, Radio, Settings2, ShieldCheck, Users, Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: role } = user ? await supabase.from('admin_roles').select('role').eq('user_id', user.id).maybeSingle() : { data: null }

  // If unauthenticated or unauthorized, children will be handled by middleware or page-level checks
  const isAuthorized = user && role && ['admin', 'operator'].includes(role.role)

  if (!isAuthorized) {
    return <>{children}</>
  }

  const navItems = [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Players', href: '/admin/players', icon: Users },
    { label: 'Houses', href: '/admin/houses', icon: Trophy },
    { label: 'Competitions', href: '/admin/competitions', icon: Eye },
    { label: 'Questions', href: '/admin/questions', icon: Settings2 },
    { label: 'Live Control', href: '/admin/live', icon: Radio },
    { label: 'Results', href: '/admin/results', icon: ShieldCheck },
    { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { label: 'Settings', href: '/admin/settings', icon: Settings2 },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row">
      <aside className="w-full lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-card px-5 py-6">
        <div className="flex items-center justify-between lg:justify-start gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Activity className="size-4" />
            </div>
            <span className="font-mono text-sm font-bold tracking-tight">THINK TWICE ADMIN</span>
          </div>
          <Link href="/" className="lg:hidden text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <Home className="size-3" /> Player App
          </Link>
        </div>

        <nav className="mt-6 lg:mt-10 flex flex-row lg:flex-col overflow-x-auto gap-1 pb-2 lg:pb-0">
          {navItems.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground shrink-0"
            >
              <Icon className="size-4 shrink-0" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-8 bg-card/50">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">Administrator Console</p>
            <p className="text-xs text-muted-foreground">Logged in as {user?.email} ({role.role})</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="hidden sm:flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-muted">
              <Home className="size-3.5" /> Player View
            </Link>
            <form action="/auth/signout" method="post">
              <button type="submit" className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition">
                <LogOut className="size-3.5" /> Logout
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 p-5 sm:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
