"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/language-context"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CarubraLogo } from "@/components/carubra-brand"
import { CalendarClock, ShieldCheck, Sparkles, ArrowRight, CheckCircle2, Users } from "lucide-react"

type ScheduledPost = {
  _id: string
  caption: string
  date: string
  time: string
  platforms: string[]
  status: string
}

type Connection = {
  platform: string
  username: string
  connectedAt: string
}

function formatDateTime(date: string, time: string) {
  try {
    const d = new Date(`${date}T${time}`)
    return d.toLocaleString("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return `${date} ${time}`
  }
}

export default function DashboardPage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const router = useRouter()
  const isAdmin = user?.role?.toLowerCase().includes("admin")

  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (isAdmin) {
      router.replace("/dashboard/admin")
      return
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("carubra-token") : null
    const headers: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {}

    async function loadData() {
      setLoading(true)
      try {
        const [postsRes, connRes] = await Promise.all([
          fetch("/api/scheduled-posts", { headers }),
          fetch("/api/social-connect", { headers }),
        ])

        const postsData = postsRes.headers.get("content-type")?.includes("application/json")
          ? await postsRes.json()
          : { posts: [] }
        const connData = connRes.headers.get("content-type")?.includes("application/json")
          ? await connRes.json()
          : { connections: [] }

        setScheduledPosts(postsData.posts ?? [])
        setConnections(connData.connections ?? [])
        setFetchError(null)
      } catch (err: any) {
        setFetchError(err?.message || "Gagal memuat data")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const upcoming = useMemo(() => {
    return scheduledPosts
      .slice()
      .sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`).getTime()
        const dateB = new Date(`${b.date}T${b.time}`).getTime()
        return dateA - dateB
      })
      .slice(0, 3)
  }, [scheduledPosts])

  const scheduledLabel =
    scheduledPosts.length > 0
      ? `${scheduledPosts.length} konten sudah dijadwalkan`
      : "Belum ada konten terjadwalkan"
  const connectionLabel =
    connections.length > 0
      ? `${connections.length} akun sudah terhubung`
      : "Belum ada akun sosial yang terhubung"

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 p-8 shadow-xl shadow-slate-900/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.16),_transparent_30%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
          <div className="space-y-4 text-white">
            <div className="inline-flex items-center gap-3 rounded-full bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-emerald-200 shadow-sm shadow-emerald-500/10 backdrop-blur">
              <Sparkles className="h-4 w-4 text-emerald-200" />
              Selamat datang di Carubra
            </div>
            <h1 className="text-4xl font-black tracking-tight lg:text-5xl">
              Hai, {user?.name ?? "Creator"}.
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Platform marketing cerdas untuk konten sosial media kamu. Yuk cek jadwal konten dan lanjutkan ide kreatifmu dengan AI image/video.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push("/dashboard/auto-upload")}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
              >
                Atur Jadwal Konten
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard/image-ai")}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-emerald-300 hover:text-emerald-200"
              >
                Buat Konten AI
              </button>
            </div>
          </div>

          <div className="relative mx-auto flex h-full w-full max-w-[280px] items-center justify-center rounded-full border border-white/10 bg-white/5 p-6 shadow-xl shadow-slate-950/20">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400/20 via-slate-800/10 to-emerald-700/15 blur-2xl" />
            <div className="relative flex h-56 w-56 items-center justify-center rounded-full border border-white/10 bg-slate-950/95 shadow-inner shadow-black/30">
              <div className="absolute inset-0 animate-pulse-slow rounded-full bg-emerald-400/10" />
              <CarubraLogo className="text-4xl font-black text-emerald-300" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <Card className="bg-card">
            <CardHeader className="flex items-center justify-between gap-4 pb-2">
              <div>
                <CardTitle className="text-base font-semibold">Ringkasan Konten</CardTitle>
                <p className="text-sm text-muted-foreground">{scheduledLabel}</p>
              </div>
              <CalendarClock className="h-5 w-5 text-emerald-400" />
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="text-sm text-muted-foreground">Memuat jadwal...</div>
              ) : scheduledPosts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-sm text-slate-300">
                  Belum ada konten terjadwalkan. Bikin jadwal atau gunakan fitur Auto Upload sekarang.
                </div>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((post) => (
                    <div key={post._id} className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white line-clamp-2">
                            {post.caption || "Konten terjadwal"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(post.date, post.time)} · {post.platforms.join(", ")}
                          </p>
                        </div>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-emerald-200">
                          {post.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {fetchError ? (
            <Card className="bg-red-950/80 border border-red-700/40">
              <CardContent>
                <p className="text-sm text-red-200">
                  Terjadi kesalahan saat memuat data: {fetchError}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card className="bg-card">
            <CardHeader className="flex items-center justify-between gap-4 pb-2">
              <div>
                <CardTitle className="text-base font-semibold">Status Koneksi</CardTitle>
                <p className="text-sm text-muted-foreground">{connectionLabel}</p>
              </div>
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-slate-200">Akun sosial yang terhubung</p>
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                    {connections.length}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-400">
                  {connections.length > 0
                    ? "Lihat Auto Upload untuk kelola akun dan koneksi lebih lanjut."
                    : "Hubungkan Instagram, Facebook, TikTok, dan lainnya agar jadwal bisa dikirim otomatis."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/dashboard/auto-upload")}
                className="inline-flex items-center gap-2 rounded-full bg-white/5 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Kelola Koneksi
                <ArrowRight className="h-4 w-4" />
              </button>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="flex items-center justify-between gap-4 pb-2">
              <div>
                <CardTitle className="text-base font-semibold">Pengingat</CardTitle>
                <p className="text-sm text-muted-foreground">Kontenmu siap ditinjau</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-slate-300">
                <p>
                  Pastikan deskripsi, hashtag, dan tipe postingan sudah sesuai sebelum jadwal dijalankan.
                </p>
                <p>
                  Ingin lebih cepat? Gunakan fitur Image AI atau Video AI untuk konten berkualitas dengan cepat.
                </p>
                <p>Semakin lengkap koneksi sosial, semakin nyaman penjadwalan otomatis.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}