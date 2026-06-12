"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck, FileText, Settings, Sparkles, Search, BarChart2, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from "chart.js"
import { Bar, Pie } from "react-chartjs-2"

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Filler, Title, Tooltip, Legend)

type AdminUser = {
  id: string
  email: string
  name: string
  role: string
  coins?: number
  is_banned?: boolean
  isBanned?: boolean
  membership_order?: string
  membershipOrder?: string
  totalCreatedVideos?: number
  connectedSocialAccounts?: number
  createdAt?: string
}

type GeneratedContent = {
  id: string
  user_id: string
  title: string
  content: string
  metadata?: any
  created_at?: string
}

type DashboardStats = {
  totalUsers: number
  adminCount: number
  totalCoins: number
  contentCount: number
  bannedUsers: number
  membershipUsers: number
}

type AiUsageLog = {
  id: string
  created_at: string
  model: string
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  quota_remaining?: number
}

type AdminMonitoring = {
  aiUsageLogs: AiUsageLog[]
  aiUsageSummary: {
    totalEvents: number
    totalTokens: number
    latestQuotaRemaining: number | null
    latestUsageAt: string | null
  }
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

function formatDate(value?: string) {
  if (!value) return "-"
  try {
    return new Date(value).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return value
  }
}

function buildMonthlyTrend(logs?: AiUsageLog[]) {
  const grouped: Record<string, { label: string; total: number }> = {}

  logs?.forEach((item) => {
    const date = new Date(item.created_at)
    if (Number.isNaN(date.getTime())) return

    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    const label = date.toLocaleString("id-ID", { month: "short", year: "numeric" })

    if (!grouped[monthKey]) {
      grouped[monthKey] = { label, total: 0 }
    }
    grouped[monthKey].total += item.total_tokens ?? 0
  })

  const keys = Object.keys(grouped).sort()
  return {
    labels: keys.map((key) => grouped[key].label),
    totals: keys.map((key) => grouped[key].total),
  }
}

const PIE_COLORS = [
  "rgba(56,189,248,0.8)",
  "rgba(99,102,241,0.8)",
  "rgba(16,185,129,0.8)",
  "rgba(245,158,11,0.8)",
  "rgba(248,113,113,0.8)",
  "rgba(167,139,250,0.8)",
  "rgba(37,99,235,0.8)",
  "rgba(239,68,68,0.8)",
]

export default function AdminDashboardPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [contents, setContents] = useState<GeneratedContent[]>([])
  const [monitoring, setMonitoring] = useState<AdminMonitoring | null>(null)
  const [monthlyTrend, setMonthlyTrend] = useState<{ labels: string[]; totals: number[] }>({ labels: [], totals: [] })
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isAdmin = user?.role?.toString().toLowerCase().includes("admin")

  useEffect(() => {
    if (!isLoading && user && !isAdmin) {
      router.push("/dashboard")
    }
  }, [user, isLoading, isAdmin, router])

  useEffect(() => {
    if (!isLoading && isAdmin) {
      fetchAdminData()
    }
  }, [isLoading, isAdmin])

  const fetchAdminData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [dashboardData, usersData, contentsData, monitoringData] = await Promise.all([
        apiFetch<DashboardStats>("/api/admin/dashboard"),
        apiFetch<{ users: AdminUser[] }>("/api/admin/users"),
        apiFetch<{ contents: GeneratedContent[] }>("/api/admin/contents"),
        apiFetch<AdminMonitoring>("/api/admin/monitoring"),
      ])

      setStats(dashboardData)
      setUsers(usersData.users)
      setContents(contentsData.contents)
      setMonitoring(monitoringData)
      setMonthlyTrend(buildMonthlyTrend(monitoringData.aiUsageLogs))
    } catch (err: any) {
      console.error(err)
      setError(err.message ?? "Tidak dapat memuat data admin")
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (subject: AdminUser) => {
    const nextRole = window.prompt(
      `Ubah role untuk ${subject.email} (User / Developer / Admin / Developer/Admin)`,
      subject.role || "User"
    )
    if (!nextRole) return
    try {
      await apiFetch(`/api/admin/users/${subject.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: nextRole }),
      })
      fetchAdminData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleCoinsUpdate = async (subject: AdminUser) => {
    const newValue = window.prompt(
      `Masukkan saldo koin baru untuk ${subject.email}`,
      String(subject.coins ?? 0)
    )
    if (newValue === null) return
    const coins = Number(newValue)
    if (Number.isNaN(coins)) {
      setError("Nilai koin tidak valid")
      return
    }
    try {
      await apiFetch(`/api/admin/users/${subject.id}`, {
        method: "PATCH",
        body: JSON.stringify({ coins }),
      })
      fetchAdminData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleBanToggle = async (subject: AdminUser) => {
    const isBanned = subject.isBanned ?? subject.is_banned
    const nextState = !isBanned
    const confirmation = window.confirm(
      `${nextState ? "Blokir" : "Batalkan blokir"} pengguna ${subject.email}?`
    )
    if (!confirmation) return
    try {
      await apiFetch(`/api/admin/users/${subject.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_banned: nextState }),
      })
      fetchAdminData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleResetPassword = async (subject: AdminUser) => {
    const nextPassword = window.prompt(
      `Atur ulang kata sandi untuk ${subject.email}. Masukkan kata sandi baru:`
    )
    if (!nextPassword) return
    try {
      await apiFetch(`/api/admin/users/${subject.id}`, {
        method: "PATCH",
        body: JSON.stringify({ password: nextPassword }),
      })
      fetchAdminData()
      window.alert("Kata sandi berhasil diatur ulang.")
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDeleteContent = async (contentId: string) => {
    const confirmed = window.confirm("Hapus konten ini secara permanen?")
    if (!confirmed) return
    try {
      await apiFetch(`/api/admin/contents/${contentId}`, { method: "DELETE" })
      setContents((prev) => prev.filter((item) => item.id !== contentId))
    } catch (err: any) {
      setError(err.message)
    }
  }

  const filteredUsers = users.filter((subject) => {
    const normalized = query.trim().toLowerCase()
    return (
      !normalized ||
      subject.email.toLowerCase().includes(normalized) ||
      subject.name.toLowerCase().includes(normalized) ||
      subject.role.toLowerCase().includes(normalized)
    )
  })

  const hasAiLogs = (monitoring?.aiUsageLogs?.length ?? 0) > 0
  const hasMonthlyTrend = monthlyTrend.labels.length > 0

  if (isLoading || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-base text-muted-foreground">
        Memuat halaman admin…
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-base text-destructive">
        Akses ditolak. Halaman ini hanya untuk admin.
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Admin Console</p>
          <h1 className="text-3xl font-bold">Superadmin Dashboard</h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Kelola pengguna, isi konten, dan pantau kesehatan platform secara cepat.
          </p>
        </div>
        <div className="rounded-3xl border border-border bg-background p-4 text-center">
          <ShieldCheck className="mx-auto h-9 w-9 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Signed in as</p>
          <p className="mt-1 font-semibold">{user.email}</p>
        </div>
      </div>

      {/* Ringkasan + Kesehatan Sistem */}
      <div className="grid gap-4">
        <Card className="border border-border bg-background">
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground uppercase tracking-[0.24em]">Ringkasan</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl bg-primary/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-primary/80">Total Pengguna</p>
                <p className="mt-2 text-3xl font-semibold">{stats?.totalUsers ?? "—"}</p>
              </div>
              <div className="rounded-3xl bg-secondary/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Admin Aktif</p>
                <p className="mt-2 text-3xl font-semibold">{stats?.adminCount ?? "—"}</p>
              </div>
              <div className="rounded-3xl bg-emerald-950/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Pengguna Terblokir</p>
                <p className="mt-2 text-3xl font-semibold">{stats?.bannedUsers ?? "—"}</p>
              </div>
              <div className="rounded-3xl bg-slate-950/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-700">Membership Aktif</p>
                <p className="mt-2 text-3xl font-semibold">{stats?.membershipUsers ?? "—"}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 mt-3">
              <div className="rounded-3xl bg-emerald-950/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Total Koin</p>
                <p className="mt-2 text-3xl font-semibold">{stats?.totalCoins ?? "—"}</p>
              </div>
              <div className="rounded-3xl bg-slate-950/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-700">Konten Tersimpan</p>
                <p className="mt-2 text-3xl font-semibold">{stats?.contentCount ?? "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-background">
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-sm font-semibold">Kesehatan Sistem</p>
                <p className="text-xs text-muted-foreground">Semua layanan platform berjalan normal.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-950/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Autentikasi</p>
                <p className="mt-2 font-semibold">Berhasil</p>
              </div>
              <div className="rounded-2xl bg-slate-950/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Database</p>
                <p className="mt-2 font-semibold">Tersambung</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bar chart statistik */}
      <Card className="border border-border bg-background">
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Statistik</p>
            <h2 className="text-xl font-semibold">Ringkasan Kinerja</h2>
          </div>
          <Bar
            options={{
              responsive: true,
              plugins: {
                legend: { position: "bottom" },
                title: {
                  display: true,
                  text: "Perbandingan Pengguna dan Konten",
                  font: { size: 14 },
                },
              },
              scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } },
              },
            }}
            data={{
              labels: ["Pengguna", "Admin", "Diblokir", "Membership", "Konten", "Koin"],
              datasets: [
                {
                  label: "Jumlah",
                  data: [
                    stats?.totalUsers ?? 0,
                    stats?.adminCount ?? 0,
                    stats?.bannedUsers ?? 0,
                    stats?.membershipUsers ?? 0,
                    stats?.contentCount ?? 0,
                    stats?.totalCoins ?? 0,
                  ],
                  backgroundColor: [
                    "rgba(59,130,246,0.75)",
                    "rgba(16,185,129,0.75)",
                    "rgba(245,158,11,0.75)",
                    "rgba(123,63,248,0.75)",
                    "rgba(14,165,233,0.75)",
                    "rgba(248,113,113,0.75)",
                  ],
                  borderRadius: 12,
                },
              ],
            }}
          />
        </CardContent>
      </Card>

      {/* Monitor AI + Tren Bulanan — side by side */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Monitor AI */}
        <Card className="border border-border bg-background">
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Monitor AI</p>
              <h2 className="text-xl font-semibold">Penggunaan AI Terakhir</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl bg-slate-950/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total Event AI</p>
                <p className="mt-2 text-3xl font-semibold">{monitoring?.aiUsageSummary.totalEvents ?? "—"}</p>
              </div>
              <div className="rounded-3xl bg-slate-950/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total Token</p>
                <p className="mt-2 text-3xl font-semibold">{monitoring?.aiUsageSummary.totalTokens ?? "—"}</p>
              </div>
              <div className="rounded-3xl bg-slate-950/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Kuota Terakhir</p>
                <p className="mt-2 text-3xl font-semibold">{monitoring?.aiUsageSummary.latestQuotaRemaining ?? "—"}</p>
              </div>
              <div className="rounded-3xl bg-slate-950/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Terakhir Dipakai</p>
                <p className="mt-2 text-sm font-semibold">
                  {monitoring?.aiUsageSummary.latestUsageAt
                    ? new Date(monitoring.aiUsageSummary.latestUsageAt).toLocaleString("id-ID", {
                        day: "2-digit", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })
                    : "—"}
                </p>
              </div>
            </div>
            {hasAiLogs ? (
              <div className="flex justify-center">
                <div className="w-64 h-64">
                  <Pie
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { position: "bottom" },
                        title: { display: true, text: "Token AI per event", font: { size: 13 } },
                      },
                    }}
                    data={{
                      labels: monitoring!.aiUsageLogs.map((item) =>
                        new Date(item.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                      ),
                      datasets: [
                        {
                          label: "Total Token",
                          data: monitoring!.aiUsageLogs.map((item) => item.total_tokens ?? 0),
                          backgroundColor: PIE_COLORS,
                          borderWidth: 1,
                        },
                      ],
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
                Belum ada data penggunaan AI
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tren Bulanan */}
        <Card className="border border-border bg-background">
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Tren Bulanan</p>
              <h2 className="text-xl font-semibold">Penggunaan AI Bulanan</h2>
            </div>
            {hasMonthlyTrend ? (
              <div className="flex justify-center">
                <div className="w-64 h-64">
                  <Pie
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { position: "bottom" },
                        title: { display: true, text: "Total token AI per bulan", font: { size: 13 } },
                      },
                    }}
                    data={{
                      labels: monthlyTrend.labels,
                      datasets: [
                        {
                          label: "Total Token AI",
                          data: monthlyTrend.totals,
                          backgroundColor: PIE_COLORS,
                          borderWidth: 1,
                        },
                      ],
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
                Belum ada data tren bulanan
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Manajemen Pengguna + Sidebar */}
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <section id="users" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Pengguna</p>
              <h2 className="text-2xl font-bold">Manajemen Pengguna</h2>
            </div>
            <div className="flex items-center gap-2 rounded-3xl border border-border bg-background px-4 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Cari email, nama, role..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-border bg-background">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead className="bg-emerald-50 text-left text-xs uppercase tracking-[0.2em] text-emerald-700">                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Koin</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Tidak ada pengguna yang cocok.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((subject) => (
                    <tr key={subject.id} className="border-t border-border hover:bg-slate-50/70">
                      <td className="px-4 py-4 font-medium">{subject.email}</td>
                      <td className="px-4 py-4">{subject.name}</td>
                      <td className="px-4 py-4">
                        <Badge variant={subject.role.toLowerCase().includes("admin") ? "secondary" : "outline"}>
                          {subject.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={(subject.isBanned ?? subject.is_banned) ? "destructive" : "outline"}>
                          {(subject.isBanned ?? subject.is_banned) ? "Diblokir" : "Aktif"}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">{subject.coins ?? 0}</td>
                      <td className="px-4 py-4 space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleRoleChange(subject)}>Ubah Role</Button>
                        <Button size="sm" variant="secondary" onClick={() => handleCoinsUpdate(subject)}>Koin</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleBanToggle(subject)}>
                          {(subject.isBanned ?? subject.is_banned) ? "Batal Blokir" : "Blokir"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleResetPassword(subject)}>Reset PW</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-4">
          <Card id="content" className="border border-border bg-background">
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-sky-600" />
                <div>
                  <p className="text-sm font-semibold">Manajemen Konten</p>
                  <p className="text-xs text-muted-foreground">Kelola generated content yang telah tersimpan.</p>
                </div>
              </div>
              <div className="space-y-2">
                {contents.slice(0, 6).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-border p-3">
                    <p className="font-semibold truncate">{item.title || "(Tanpa judul)"}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{item.content ?? "Konten tidak tersedia."}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteContent(item.id)}>Hapus</Button>
                    </div>
                  </div>
                ))}
                {contents.length === 0 && (
                  <p className="text-sm text-muted-foreground">Belum ada konten untuk ditampilkan.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card id="membership" className="border border-border bg-background">
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <BarChart2 className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-sm font-semibold">Manajemen Membership & Transaksi</p>
                  <p className="text-xs text-muted-foreground">Pantau status membership, transaksi, dan status pembayaran.</p>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-slate-950/40 p-4 text-sm text-muted-foreground">
                Fitur transaksi belum diimplementasikan penuh. Untuk sekarang, gunakan data membership dari tabel pengguna dan history pembayaran jika tersedia.
              </div>
            </CardContent>
          </Card>

          <Card id="pricing" className="border border-border bg-background">
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-sm font-semibold">Manajemen Koin & Pricing</p>
                  <p className="text-xs text-muted-foreground">Atur harga koin, saldo, dan paket pembayaran.</p>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-slate-950/40 p-4 text-sm text-muted-foreground">
                Fitur harga koin dan paket belum tersedia di dashboard. Nanti bisa ditambahkan sebagai halaman admin baru.
              </div>
            </CardContent>
          </Card>

          <Card id="system" className="border border-border bg-background">
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold">Pengaturan Sistem</p>
                  <p className="text-xs text-muted-foreground">Pengaturan platform dapat disesuaikan dari database dan environment.</p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><span className="font-semibold">Auth:</span> Token JWT aktif</p>
                <p><span className="font-semibold">Supabase:</span> Tergantung konfigurasi environment.</p>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}