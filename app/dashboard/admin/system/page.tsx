"use client"

import { useEffect, useState } from "react"
import { Settings } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api"

function getApiUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  if (path.startsWith("/api")) return path
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`
}

async function fetchHealth() {
  const res = await fetch(getApiUrl("/health"))
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function fetchMonitoring() {
  const token = typeof window !== "undefined" ? localStorage.getItem("carubra-token") : null
  const res = await fetch(getApiUrl("/admin/monitoring"), {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export default function AdminSystemPage() {
  const { user, isLoading } = useAuth()
  const [health, setHealth] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [monitoring, setMonitoring] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoading) {
      loadHealth()
    }
  }, [isLoading])

  const loadHealth = async () => {
    setLoading(true)
    setError(null)
    try {
      const [healthData, monitoringData] = await Promise.all([fetchHealth(), fetchMonitoring()])
      setHealth(healthData.status || 'ok')
      setMonitoring(monitoringData)
    } catch (err: any) {
      setError(err.message ?? 'Tidak dapat memeriksa status')
    } finally {
      setLoading(false)
    }
  }

  if (isLoading || !user) {
    return <div className="min-h-[60vh] flex items-center justify-center text-base text-muted-foreground">Memuat sistem...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Admin Console</p>
        <h1 className="text-3xl font-bold">Pengaturan Sistem & Log</h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">Pantau status API dan konfigurasi sistem.</p>
      </div>

      {error && (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card className="border border-border bg-background">
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold">Status API</p>
              <p className="text-xs text-muted-foreground">Pastikan backend dan Supabase tersedia.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-slate-50 p-4 text-sm text-muted-foreground">
            Status: <span className="font-semibold">{health ?? (loading ? 'Memeriksa...' : 'Tidak tersedia')}</span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-border bg-slate-50 p-4 text-sm text-muted-foreground">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Status API</p>
              <p className="mt-2 font-semibold text-foreground">{health ?? (loading ? 'Memeriksa...' : 'Tidak tersedia')}</p>
            </div>
            <div className="rounded-3xl border border-border bg-slate-50 p-4 text-sm text-muted-foreground">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Total Errors</p>
              <p className="mt-2 font-semibold text-foreground">{monitoring?.errorLogs?.length ?? '-'}</p>
            </div>
            <div className="rounded-3xl border border-border bg-slate-50 p-4 text-sm text-muted-foreground">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">AI Usage Events</p>
              <p className="mt-2 font-semibold text-foreground">{monitoring?.aiUsageSummary?.totalEvents ?? '-'}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-border bg-slate-50 p-4 text-sm text-muted-foreground">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">AI quota terakhir</p>
              <p className="mt-2 font-semibold text-foreground">{monitoring?.aiUsageSummary?.latestQuotaRemaining ?? 'Tidak tersedia'}</p>
            </div>

            <div className="rounded-3xl border border-border bg-slate-50 p-4 text-sm text-muted-foreground">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Log aktivitas terbaru</p>
              <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
                {monitoring?.activityLogs?.slice(0, 4).map((log: any) => (
                  <li key={log.id} className="truncate">
                    <span className="font-medium text-foreground">{log.action}</span>: {log.description}
                  </li>
                ))}
                {monitoring?.activityLogs?.length === 0 && <li>Tidak ada log aktivitas.</li>}
              </ul>
            </div>

            <div className="rounded-3xl border border-border bg-slate-50 p-4 text-sm text-muted-foreground">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Log error terbaru</p>
              <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
                {monitoring?.errorLogs?.slice(0, 4).map((log: any) => (
                  <li key={log.id} className="truncate">
                    <span className="font-medium text-foreground">{log.endpoint}</span>: {log.error_message}
                  </li>
                ))}
                {monitoring?.errorLogs?.length === 0 && <li>Tidak ada log error.</li>}
              </ul>
            </div>
          </div>

          <button
            className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
            onClick={loadHealth}
            disabled={loading}
          >
            {loading ? 'Memuat...' : 'Refresh Status'}
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
