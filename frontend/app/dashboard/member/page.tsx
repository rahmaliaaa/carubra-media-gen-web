"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/contexts/language-context"

type PackageOption = {
  id: string
  title: string
  coins: number
  price: string
  unitPrice: string
  audience: string
  note: string
  badge?: string
}

type TransactionStatus = "success" | "pending" | "failed" | "expired"

type Transaction = {
  id: string
  orderId: string
  packageId: string
  title: string
  coins: number
  priceLabel: string
  status: TransactionStatus
  invoiceUrl?: string
  paidAt?: string
  createdAt: string
}

const packageOptions: PackageOption[] = [
  {
    id: "starter",
    title: "100 TOKEN",
    coins: 100,
    price: "Rp 120.000",
    unitPrice: "Rp 1.200 / token",
    audience: "Tester / user baru",
    note: "Cocok untuk percobaan dan konten ringan.",
  },
  {
    id: "popular",
    title: "250 TOKEN",
    coins: 250,
    price: "Rp 250.000",
    unitPrice: "Rp 1.000 / token",
    audience: "Content creator pemula",
    note: "Pilihan populer dengan harga menengah.",
    badge: "Populer",
  },
  {
    id: "semi-pro",
    title: "500 TOKEN",
    coins: 500,
    price: "Rp 450.000",
    unitPrice: "Rp 900 / token",
    audience: "User semi profesional",
    note: "Cocok untuk jadwal konten dan eksperimen berkala.",
  },
  {
    id: "best-value",
    title: "1000 TOKEN",
    coins: 1000,
    price: "Rp 800.000",
    unitPrice: "Rp 800 / token",
    audience: "Influencer / YouTuber",
    note: "Value terbaik untuk produksi konten reguler.",
    badge: "Best Value",
  },
  {
    id: "enterprise",
    title: "2000 TOKEN",
    coins: 2000,
    price: "Rp 1.500.000",
    unitPrice: "Rp 750 / token",
    audience: "Perusahaan / production house",
    note: "Ideal untuk penggunaan berat dan tim produksi.",
  },
]

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('carubra-token') : null
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export default function MemberPage() {
  const { t } = useLanguage()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingTx, setLoadingTx] = useState(true)
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [coinBalance, setCoinBalance] = useState<number | null>(null)
  const [lastTopup, setLastTopup] = useState<string | null>(null)

  const fetchTransactions = useCallback(async () => {
    try {
      setLoadingTx(true)
      const data = await apiFetch<{ transactions: Transaction[] }>('/api/payments/transactions')
      setTransactions(data.transactions)

      // Ambil tanggal last topup dari transaksi success terbaru
      const lastSuccess = data.transactions.find(tx => tx.status === 'success')
      if (lastSuccess?.paidAt) {
        setLastTopup(new Date(lastSuccess.paidAt).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }))
      }
    } catch (err: any) {
      console.error('[fetchTransactions]', err)
    } finally {
      setLoadingTx(false)
    }
  }, [])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  useEffect(() => {
    apiFetch<{ coins: number }>('/api/users/balance')
      .then(data => setCoinBalance(data.coins))
      .catch(() => setCoinBalance(0))
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const paymentResult = params.get('payment')
    const orderId = params.get('orderId')

    if (paymentResult && orderId) {
      const clean = window.location.pathname
      window.history.replaceState({}, '', clean)

      if (paymentResult === 'success') {
        setTimeout(() => {
          fetchTransactions()
          apiFetch<{ coins: number }>('/api/users/balance')
            .then(data => setCoinBalance(data.coins))
            .catch(() => {})
        }, 1500)
      }
    }
  }, [fetchTransactions])

  const handleBuy = async (option: PackageOption) => {
    try {
      setErrorMsg(null)
      setBuyingId(option.id)

      const data = await apiFetch<{ invoiceUrl: string; orderId: string }>(
        '/api/payments/create-invoice',
        {
          method: 'POST',
          body: JSON.stringify({ packageId: option.id }),
        }
      )

      window.location.href = data.invoiceUrl
    } catch (err: any) {
      console.error('[handleBuy]', err)
      setErrorMsg(err.message ?? 'Gagal membuat invoice. Coba lagi.')
    } finally {
      setBuyingId(null)
    }
  }

  const statusLabel: Record<TransactionStatus, string> = {
    success: 'Berhasil',
    pending: 'Menunggu Pembayaran',
    failed: 'Gagal',
    expired: 'Kedaluwarsa',
  }

  const statusVariant: Record<TransactionStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    success: 'default',
    pending: 'secondary',
    failed: 'destructive',
    expired: 'outline',
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t("member.title")}</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">{t("member.subtitle")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card className="bg-emerald-950 text-white shadow-lg">
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-emerald-200">Saldo Token</p>
              <h2 className="mt-3 text-4xl font-semibold">
                {coinBalance === null ? '— TOKEN' : `${coinBalance} TOKEN`}
              </h2>
              <p className="mt-2 text-sm text-emerald-100">
                Gunakan token untuk upload otomatis, analisis konten, dan promosi.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-emerald-900/80 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-emerald-200">Status</p>
                <p className="mt-2 text-xl font-semibold">
                  {coinBalance !== null && coinBalance > 0 ? 'Aktif' : 'Belum ada token'}
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-900/80 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-emerald-200">Last top-up</p>
                <p className="mt-2 text-xl font-semibold">{lastTopup ?? '—'}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                className="bg-white text-emerald-950 hover:bg-emerald-100"
                onClick={() => document.getElementById('packages')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Top Up Sekarang
              </Button>
              <Button
                variant="ghost"
                className="text-emerald-100"
                onClick={() => document.getElementById('transactions')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Lihat Riwayat
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-emerald-200/50 bg-emerald-50">
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-emerald-600">Paket Token</p>
              <h2 className="mt-2 text-2xl font-bold text-emerald-950">Pilih paket yang sesuai</h2>
            </div>
            <p className="text-sm text-emerald-700">Semakin besar paket, semakin murah biaya per token.</p>
            <p className="text-xs text-emerald-600 bg-emerald-100 rounded-xl px-3 py-2">
              🔒 Pembayaran aman melalui Xendit — mendukung transfer bank, QRIS, e-wallet, dan kartu kredit.
            </p>
          </CardContent>
        </Card>
      </div>

      {errorMsg && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-5 py-4 text-sm text-destructive flex items-center justify-between gap-4">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-destructive/70 hover:text-destructive font-medium">
            Tutup
          </button>
        </div>
      )}

      <section id="packages" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {packageOptions.map((option) => (
          <Card
            key={option.id}
            className={option.badge ? "border-2 border-emerald-500 shadow-sm" : ""}
          >
            <CardContent className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-600">
                    {option.audience}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-foreground">{option.title}</h3>
                </div>
                {option.badge && <Badge variant="secondary">{option.badge}</Badge>}
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{option.note}</p>
                <p className="text-sm font-medium text-foreground">{option.unitPrice}</p>
              </div>

              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Harga</p>
                  <p className="text-3xl font-bold text-foreground">{option.price}</p>
                </div>
                <Button
                  onClick={() => handleBuy(option)}
                  disabled={buyingId === option.id}
                >
                  {buyingId === option.id ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V4a10 10 0 100 10h-4a6 6 0 01-6-6z" />
                      </svg>
                      Memproses…
                    </span>
                  ) : (
                    t("member.buy")
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section id="transactions" className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t("member.recentTransactions")}</h2>
          <p className="text-muted-foreground mt-1">{t("member.transactionDescription")}</p>
        </div>

        {loadingTx ? (
          <Card className="border border-dashed border-border p-8 text-center">
            <CardContent>
              <p className="text-sm text-muted-foreground">Memuat riwayat transaksi…</p>
            </CardContent>
          </Card>
        ) : transactions.length === 0 ? (
          <Card className="rounded-3xl border border-dashed border-border p-8 text-center">
            <CardContent className="space-y-4">
              <p className="text-lg font-semibold text-foreground">Belum ada transaksi.</p>
              <p className="text-sm text-muted-foreground">
                Riwayat transaksi akan muncul setelah Anda melakukan pembayaran.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx) => (
              <Card key={tx.id} className="border border-border">
                <CardContent className="grid gap-4 sm:grid-cols-[1.2fr_auto] items-start">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span>
                        {new Date(tx.createdAt).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span>·</span>
                      <span>Order ID: {tx.orderId}</span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Paket</p>
                        <p className="font-medium">{tx.title}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Token</p>
                        <p className="font-medium">{tx.coins} token</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Harga</p>
                        <p className="font-medium">{tx.priceLabel}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Status</p>
                        <Badge variant={statusVariant[tx.status]} className="text-sm mt-1">
                          {statusLabel[tx.status]}
                        </Badge>
                      </div>
                    </div>

                    {tx.paidAt && (
                      <p className="text-xs text-muted-foreground">
                        Dibayar:{' '}
                        {new Date(tx.paidAt).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end justify-between gap-3 min-w-[140px]">
                    {tx.status === 'pending' && tx.invoiceUrl && (
                      <Button size="sm" asChild>
                        <a href={tx.invoiceUrl} target="_blank" rel="noopener noreferrer">
                          Bayar Sekarang
                        </a>
                      </Button>
                    )}
                    {tx.status === 'expired' && (
                      <div className="text-right space-y-1">
                        <p className="text-xs text-muted-foreground">Invoice kedaluwarsa.</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const pkg = packageOptions.find(p => p.id === tx.packageId)
                            if (pkg) handleBuy(pkg)
                          }}
                        >
                          Buat Invoice Baru
                        </Button>
                      </div>
                    )}
                    {tx.status === 'failed' && (
                      <div className="text-right text-sm text-muted-foreground space-y-1">
                        <p>Hubungi admin:</p>
                        <p className="font-semibold text-foreground">0819-9990-0900</p>
                      </div>
                    )}
                    {tx.status === 'success' && (
                      <p className="text-sm text-muted-foreground text-right">Pembayaran selesai ✓</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}