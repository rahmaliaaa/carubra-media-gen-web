"use client"

import { useEffect, useState } from "react"
import { ArrowRight, BarChart2, Sparkles } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"

type PackageItem = {
  id: string
  name: string
  price: string
  coins: number
  description?: string | null
}

type TransactionItem = {
  id: string
  user_id: string
  amount: number
  payment_status: string
  created_at: string
}

type DashboardStats = {
  totalUsers: number
  totalCoins: number
  membershipUsers: number
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

export default function AdminMembershipPage() {
  const { user, isLoading } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [packages, setPackages] = useState<PackageItem[]>([])
  const [transactions, setTransactions] = useState<TransactionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading) {
      loadData()
    }
  }, [isLoading])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [packageData, transactionData] = await Promise.all([
        apiFetch<{ packages: PackageItem[] }>("/api/admin/packages"),
        apiFetch<{ transactions: TransactionItem[] }>("/api/admin/transactions"),
      ])

      setPackages(packageData.packages ?? [])
      setTransactions(transactionData.transactions ?? [])
      setStats({
        totalUsers: 0,
        totalCoins: transactionData.transactions.reduce((sum, item) => sum + item.amount, 0),
        membershipUsers: packageData.packages.length,
      })
    } catch (err: any) {
      setError(err.message ?? "Tidak dapat memuat data membership")
    } finally {
      setLoading(false)
    }
  }

  if (isLoading || !user) {
    return <div className="min-h-[60vh] flex items-center justify-center text-base text-muted-foreground">Memuat membership...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Admin Console</p>
        <h1 className="text-3xl font-bold">Manajemen Membership & Transaksi</h1>
        <p className="text-muted-foreground max-w-2xl">Pantau status membership, transaksi, dan saldo koin pengguna.</p>
      </div>

      {error && (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card className="border border-border bg-background">
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <BarChart2 className="h-6 w-6 text-emerald-500" />
            <div>
              <p className="text-sm font-semibold">Ringkasan Membership</p>
              <p className="text-xs text-muted-foreground">Lihat pembayaran dan paket aktif langsung dari Supabase.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-emerald-950/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Paket Terdaftar</p>
              <p className="mt-2 text-3xl font-semibold">{packages.length}</p>
            </div>
            <div className="rounded-3xl bg-slate-950/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-700">Transaksi Pembayaran</p>
              <p className="mt-2 text-3xl font-semibold">{transactions.length}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-slate-50 p-4 text-sm text-muted-foreground">
            Data transaksi dan paket diambil langsung dari Supabase. Gunakan menu Pricing untuk mengubah paket dan admin content untuk memantau hasil konten.
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {packages.slice(0, 3).map((pkg) => (
          <Card key={pkg.id} className="border border-border bg-background">
            <CardContent>
              <div className="flex items-center justify-between gap-2">
                <p className="text-lg font-semibold">{pkg.name}</p>
                <span className="text-sm text-muted-foreground">{pkg.coins} koin</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{pkg.description ?? 'Paket membership aktif'}</p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="font-semibold">{pkg.price}</span>
                <ArrowRight className="h-4 w-4 text-slate-500" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border border-border bg-background">
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Transaksi Terbaru</p>
              <p className="text-xs text-muted-foreground">Daftar pembayaran terbaru dari Supabase.</p>
            </div>
            <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">{transactions.length} transaksi</span>
          </div>

          <div className="mt-4 space-y-3">
            {transactions.length === 0 ? (
              <div className="rounded-3xl border border-border bg-slate-50 p-4 text-sm text-muted-foreground">Belum ada transaksi.</div>
            ) : (
              transactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="rounded-3xl border border-border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{transaction.payment_status.toUpperCase()}</p>
                    <span className="text-xs text-muted-foreground">{new Date(transaction.created_at).toLocaleDateString('id-ID')}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">ID pengguna: {transaction.user_id}</p>
                  <p className="mt-1 text-sm">Jumlah: Rp {transaction.amount.toLocaleString('id-ID')}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
