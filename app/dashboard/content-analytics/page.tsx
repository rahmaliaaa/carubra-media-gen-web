"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Filler,
} from "chart.js"
import { Line, Bar } from "react-chartjs-2"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Filler)

// ─── Types ────────────────────────────────────────────────────────────────────
type AnalysisResult = {
  engagement_rate: number
  caption_score: number
  hashtag_score: number
  estimated_reach: string
  best_post_time: string
  sentiment: { positive: number; neutral: number; negative: number }
  sentiment_summary: string
  hashtags: string[]
  hashtag_warning?: string | null
  recommendations: {
    icon: string
    title: string
    description: string
    color: string
    bg: string
  }[]
  platform_comparison: { platform: string; rate: number; color: string }[]
  trend: number[]
}

type HistoryItem = {
  id: string
  url?: string
  prompt?: string
  input_type: "link" | "prompt"
  platform: string
  status: "completed" | "processing" | "failed"
  created_at: string
  analysis_result?: AnalysisResult
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("carubra-token")
}

function apiFetch(path: string, options?: RequestInit) {
  const token = getToken()
  return fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  })
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (d > 0) return `${d} hari lalu`
  if (h > 0) return `${h} jam lalu`
  return "Baru saja"
}

function platformIcon(p: string) {
  const icons: Record<string, string> = {
    TikTok: "📱", Instagram: "📸", YouTube: "▶️", Facebook: "👥", "X / Twitter": "𝕏",
  }
  return icons[p] ?? "🌐"
}

const PLATFORMS = ["Instagram", "TikTok", "YouTube", "Facebook", "X / Twitter"]

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ContentAnalyticsPage() {
  const [tab, setTab] = useState<"link" | "prompt">("link")
  const [linkInput, setLinkInput] = useState("")
  const [promptInput, setPromptInput] = useState("")
  const [platform, setPlatform] = useState("Instagram")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [activeHistory, setActiveHistory] = useState<string | null>(null)
  const [historyLoading, setHistoryLoading] = useState(true)

  const trendLabels = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    return `${d.getDate()}/${d.getMonth() + 1}`
  })

  // ─── Fetch history ──────────────────────────────────────────────────────────
  const fetchHistory = async () => {
    try {
      const res = await apiFetch("/api/content-analysis")
      if (res.ok) {
        const json = await res.json()
        setHistory(json.jobs ?? [])
      }
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => { fetchHistory() }, [])

  // ─── Submit analysis ────────────────────────────────────────────────────────
  const handleAnalysis = async () => {
    setError(null)
    const input = tab === "link" ? linkInput : promptInput
    if (!input.trim()) return setError("Masukkan link atau deskripsi konten")

    setLoading(true)
    setResult(null)

    try {
      const body = tab === "link"
        ? { url: input.trim(), platform, input_type: "link" }
        : { prompt: input.trim(), platform, input_type: "prompt" }

      const res = await apiFetch("/api/content-analysis", {
        method: "POST",
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Gagal menganalisis")

      setResult(json.job.analysis_result)
      setActiveHistory(json.job.id)
      await fetchHistory()

      if (tab === "link") setLinkInput("")
      else setPromptInput("")
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleHistoryClick = (item: HistoryItem) => {
    setActiveHistory(item.id)
    if (item.analysis_result) setResult(item.analysis_result)
  }

  // ─── Chart data ─────────────────────────────────────────────────────────────
  const trendData = {
    labels: trendLabels,
    datasets: [{
      label: "Engagement Rate",
      data: result?.trend ?? [],
      borderColor: "#378ADD",
      backgroundColor: "rgba(55,138,221,0.08)",
      borderWidth: 2,
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 4,
    }],
  }

  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: "index" as const, intersect: false } },
    scales: {
      x: { ticks: { maxTicksLimit: 6, font: { size: 11 } }, grid: { display: false } },
      y: { ticks: { callback: (v: any) => v + "%", font: { size: 11 } }, grid: { color: "rgba(128,128,128,0.1)" } },
    },
  }

  const platformData = {
    labels: result?.platform_comparison.map(p => p.platform) ?? [],
    datasets: [{
      label: "Engagement Rate",
      data: result?.platform_comparison.map(p => p.rate) ?? [],
      backgroundColor: result?.platform_comparison.map(p => p.color) ?? [],
      borderRadius: 4,
    }],
  }

  const platformOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { font: { size: 11 } }, grid: { display: false } },
      y: { ticks: { callback: (v: any) => v + "%", font: { size: 11 } }, grid: { color: "rgba(128,128,128,0.1)" } },
    },
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-5">

      {/* Input Card */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex gap-1 mb-4 bg-muted rounded-lg p-1 w-fit">
            {(["link", "prompt"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-md text-sm transition-all ${
                  tab === t
                    ? "bg-background font-medium shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "link" ? "🔗 Paste Link" : "✍️ Tulis Deskripsi"}
              </button>
            ))}
          </div>

          {tab === "link" ? (
            <div className="flex gap-2">
              <input
                type="url"
                value={linkInput}
                onChange={e => setLinkInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAnalysis()}
                placeholder="https://instagram.com/p/..."
                className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
              />
              <select
                value={platform}
                onChange={e => setPlatform(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                {PLATFORMS.map(p => <option key={p}>{p}</option>)}
              </select>
              <button
                onClick={handleAnalysis}
                disabled={loading}
                className="h-9 px-4 rounded-md bg-foreground text-background text-sm font-medium hover:opacity-85 disabled:opacity-50 transition-opacity whitespace-nowrap"
              >
                {loading ? "Menganalisis..." : "Analisis →"}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={promptInput}
                onChange={e => setPromptInput(e.target.value)}
                placeholder="Deskripsikan konten kamu, misalnya: 'Video tutorial memasak nasi goreng 30 detik di TikTok dengan caption yang panjang dan 15 hashtag food...'"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              />
              <div className="flex gap-2 justify-end">
                <select
                  value={platform}
                  onChange={e => setPlatform(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                </select>
                <button
                  onClick={handleAnalysis}
                  disabled={loading}
                  className="h-9 px-4 rounded-md bg-foreground text-background text-sm font-medium hover:opacity-85 disabled:opacity-50 transition-opacity"
                >
                  {loading ? "Menganalisis..." : "Analisis →"}
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </CardContent>
      </Card>

      {/* Loading state */}
      {loading && (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">AI sedang menganalisis konten kamu...</p>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !result && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <div className="text-4xl">📊</div>
            <p className="font-medium">Belum ada hasil analisis</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Paste link konten media sosial kamu atau tulis deskripsi konten, lalu klik Analisis untuk mendapatkan insight dari AI.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {!loading && result && (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Engagement Rate", value: `${result.engagement_rate}%`, sub: "estimasi AI", subColor: "text-muted-foreground" },
              { label: "Caption Score", value: `${result.caption_score}/100`, sub: result.caption_score >= 80 ? "Sangat Baik" : result.caption_score >= 60 ? "Cukup Baik" : "Perlu Perbaikan", subColor: result.caption_score >= 80 ? "text-green-600" : result.caption_score >= 60 ? "text-amber-600" : "text-red-600" },
              { label: "Hashtag Score", value: `${result.hashtag_score}/100`, sub: result.hashtag_score >= 80 ? "Optimal" : "Bisa ditingkatkan", subColor: result.hashtag_score >= 80 ? "text-green-600" : "text-amber-600" },
              { label: "Est. Reach", value: result.estimated_reach, sub: "estimasi jangkauan", subColor: "text-muted-foreground" },
              { label: "Best Post Time", value: result.best_post_time, sub: "WIB", subColor: "text-muted-foreground" },
            ].map(m => (
              <div key={m.label} className="bg-muted rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">{m.label}</div>
                <div className="text-xl font-medium">{m.value}</div>
                <div className={`text-xs mt-0.5 ${m.subColor}`}>{m.sub}</div>
              </div>
            ))}
          </div>

          {/* Trend Chart */}
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Engagement trend — 30 hari</p>
              <div style={{ height: 180 }}>
                <Line data={trendData} options={trendOptions} />
              </div>
            </CardContent>
          </Card>

          {/* Sentiment + Hashtag */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Analisis sentimen</p>
                <div className="flex rounded-lg overflow-hidden h-2.5 mb-3">
                  <div style={{ width: `${result.sentiment.positive}%`, background: "#639922" }} />
                  <div style={{ width: `${result.sentiment.neutral}%`, background: "#EF9F27" }} />
                  <div style={{ width: `${result.sentiment.negative}%`, background: "#E24B4A" }} />
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground mb-3 flex-wrap">
                  {[
                    { label: `Positif ${result.sentiment.positive}%`, color: "#639922" },
                    { label: `Netral ${result.sentiment.neutral}%`, color: "#EF9F27" },
                    { label: `Negatif ${result.sentiment.negative}%`, color: "#E24B4A" },
                  ].map(s => (
                    <span key={s.label} className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm inline-block" style={{ background: s.color }} />
                      {s.label}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">{result.sentiment_summary}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Hashtag</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {result.hashtags.map(h => (
                    <span key={h} className="text-xs px-2.5 py-1 rounded-full bg-muted border border-border">{h}</span>
                  ))}
                </div>
                {result.hashtag_warning && (
                  <div className="text-xs rounded-lg px-3 py-2" style={{ background: "#FAEEDA", color: "#854F0B" }}>
                    ⚠️ {result.hashtag_warning}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Rekomendasi AI</p>
              <div className="divide-y divide-border">
                {result.recommendations.map((r, i) => (
                  <div key={i} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                      style={{ background: r.bg, color: r.color }}
                    >
                      {r.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{r.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Platform Comparison */}
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Perbandingan engagement per platform</p>
              <div style={{ height: 160 }}>
                <Bar data={platformData} options={platformOptions} />
              </div>
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                {result.platform_comparison.map(p => (
                  <span key={p.platform} className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: p.color }} />
                    {p.platform} {p.rate}%
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* History */}
      <Card>
        <CardContent className="pt-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Riwayat analisis</p>
          {historyLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Memuat riwayat...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Belum ada riwayat analisis.</p>
          ) : (
            <div className="divide-y divide-border">
              {history.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleHistoryClick(item)}
                  disabled={item.status !== "completed"}
                  className={`w-full flex items-center gap-3 py-3 text-left transition-colors rounded px-1 ${
                    activeHistory === item.id ? "bg-muted/50" : "hover:bg-muted/30"
                  } disabled:opacity-60 disabled:cursor-default`}
                >
                  <span className="text-lg">{platformIcon(item.platform)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.input_type === "link" ? item.url : item.prompt}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.platform} • {timeAgo(item.created_at)}</p>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                    style={
                      item.status === "completed"
                        ? { background: "#EAF3DE", color: "#3B6D11" }
                        : item.status === "processing"
                        ? { background: "#FAEEDA", color: "#854F0B" }
                        : { background: "#FCEBEB", color: "#A32D2D" }
                    }
                  >
                    {item.status === "completed" ? "Selesai" : item.status === "processing" ? "Diproses..." : "Gagal"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}