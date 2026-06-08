"use client"

import { useEffect, useState } from "react"
import { DollarSign, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"

type PackageOption = {
  id: string
  name: string
  coins: number
  price: string
  description?: string | null
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api"

function getApiUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  if (path.startsWith("/api")) return path
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("carubra-token") : null
  const res = await fetch(getApiUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })

  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((payload as any).error ?? `HTTP ${res.status}`)
  }

  return payload as T
}

export default function AdminPricingPage() {
  const { user, isLoading } = useAuth()
  const [packages, setPackages] = useState<PackageOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading) {
      loadPackages()
    }
  }, [isLoading])

  const loadPackages = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<{ packages: PackageOption[] }>("/api/admin/packages")
      setPackages(data.packages ?? [])
    } catch (err: any) {
      setError(err.message ?? "Tidak dapat memuat paket")
    } finally {
      setLoading(false)
    }
  }

  const createPackage = async () => {
    const name = window.prompt("Nama paket baru:")
    if (!name) return
    const coinsString = window.prompt("Jumlah koin:", "100")
    if (!coinsString) return
    const coins = Number(coinsString)
    if (Number.isNaN(coins)) {
      setError("Jumlah koin tidak valid")
      return
    }
    const price = window.prompt("Harga paket (misal Rp 150.000):")
    if (!price) return
    const description = window.prompt("Deskripsi paket:")

    try {
      await apiFetch<{ package: PackageOption }>("/api/admin/packages", {
        method: "POST",
        body: JSON.stringify({ name, coins, price, description }),
      })
      await loadPackages()
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (isLoading || !user) {
    return <div className="min-h-[60vh] flex items-center justify-center text-base text-muted-foreground">Memuat pricing...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Admin Console</p>
        <h1 className="text-3xl font-bold">Manajemen Koin & Pricing</h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">Kelola paket koin dan harga yang tersedia untuk pengguna.</p>
      </div>

      {error && (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card className="border border-border bg-background">
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="h-6 w-6 text-amber-500" />
              <div>
                <p className="text-sm font-semibold">Paket Koin Supabase</p>
                <p className="text-xs text-muted-foreground">Data paket diambil langsung dari database.</p>
              </div>
            </div>
            <Button onClick={createPackage} disabled={loading} variant="secondary">
              <Plus className="mr-2 h-4 w-4" /> Tambah Paket
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((pkg) => (
              <div key={pkg.id} className="rounded-3xl border border-border p-4">
                <p className="font-semibold">{pkg.name}</p>
                <p className="text-xs text-muted-foreground">{pkg.coins} koin</p>
                <p className="mt-2 text-lg font-semibold">{pkg.price}</p>
                <p className="mt-3 text-sm text-muted-foreground">{pkg.description ?? 'Tidak ada deskripsi'}</p>
              </div>
            ))}
            {packages.length === 0 && !loading && (
              <div className="rounded-3xl border border-border bg-slate-50 p-4 text-sm text-muted-foreground">
                Belum ada paket koin. Tambahkan paket baru untuk membiarkan pengguna membeli koin.
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-slate-50 p-4 text-sm text-muted-foreground">
            Paket baru akan disimpan ke Supabase melalui API admin. Gunakan halaman Membership untuk melihat ringkasan transaksi.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
