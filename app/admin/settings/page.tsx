import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-primary">
          <Link href="/admin" className="hover:underline flex items-center gap-1">
            <ArrowLeft className="size-3" /> Dashboard
          </Link>
          <span>/</span>
          <span>Platform Settings</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight mt-1">Platform Settings</h1>
        <p className="text-sm text-muted-foreground">Manage competition defaults, house allocations, and security options.</p>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-xl font-bold">Five Houses Policy</h2>
        <p className="text-sm text-muted-foreground">
          Platform enforces exactly 5 houses: 🔥 AGNI, 🌍 BHUMI, 🌬️ VAYU, 💧 JAL, ✨ AKASH.
        </p>
      </div>
    </div>
  )
}
