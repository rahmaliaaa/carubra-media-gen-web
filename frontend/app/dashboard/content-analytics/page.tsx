"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { apiFetch as _api } from "@/lib/utils"

export default function ContentAnalyticsPage() {
  const { user } = useAuth()
  const [url, setUrl] = useState("")
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchJobs = async () => {
    setLoading(true)
    try {
      const data = await fetch('/api/content-analysis', { headers: { 'Content-Type': 'application/json', ...(typeof window !== 'undefined' && localStorage.getItem('carubra-token') ? { Authorization: `Bearer ${localStorage.getItem('carubra-token')}` } : {}) } })
      const json = await data.json()
      if (!data.ok) throw new Error(json.error || 'Failed')
      setJobs(json.jobs || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchJobs() }, [])

  const handleSubmit = async () => {
    setError(null)
    if (!url) return setError('Masukkan link postingan')
    try {
      const res = await fetch('/api/content-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(typeof window !== 'undefined' && localStorage.getItem('carubra-token') ? { Authorization: `Bearer ${localStorage.getItem('carubra-token')}` } : {}),
        },
        body: JSON.stringify({ url })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal')
      setUrl("")
      fetchJobs()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const viewJob = async (id: string) => {
    try {
      const res = await fetch(`/api/content-analysis/${id}`, { headers: { 'Content-Type': 'application/json', ...(typeof window !== 'undefined' && localStorage.getItem('carubra-token') ? { Authorization: `Bearer ${localStorage.getItem('carubra-token')}` } : {}) } })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal')
      // show result inline
      setJobs(prev => prev.map(j => j._id === id ? { ...j, result: json.job.result, status: json.job.status } : j))
    } catch (e: any) {
      setError(e.message)
    }
  }
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="overflow-hidden border-primary/20">
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8">
            <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium">
              🚀 Coming Soon
            </div>

            <h1 className="mt-4 text-3xl font-bold">
              Content Analytics AI
            </h1>

            <p className="mt-3 max-w-2xl text-muted-foreground">
              Kami sedang mengembangkan fitur analisis performa konten berbasis AI
              yang akan membantu Anda memahami engagement, kualitas caption,
              efektivitas hashtag, sentimen audiens, dan rekomendasi optimasi
              secara otomatis.
            </p>
          </div>

          <div className="p-8">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="opacity-60 blur-[1px] pointer-events-none">
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">
                    Engagement Rate
                  </div>
                  <div className="mt-2 text-3xl font-bold">
                    8.7%
                  </div>
                  <div className="text-xs text-green-500">
                    +24% dari bulan lalu
                  </div>
                </CardContent>
              </Card>

              <Card className="opacity-60 blur-[1px] pointer-events-none">
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">
                    Content Score
                  </div>
                  <div className="mt-2 text-3xl font-bold">
                    92/100
                  </div>
                  <div className="text-xs text-blue-500">
                    Excellent Performance
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-4 opacity-60 blur-[1px] pointer-events-none">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-medium">
                    Performance Trend
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Last 30 Days
                  </span>
                </div>

                <div className="flex h-40 items-end gap-2">
                  {[20, 40, 35, 60, 45, 70, 90, 75, 85, 100].map(
                    (h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t bg-primary/40"
                        style={{ height: `${h}%` }}
                      />
                    )
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="mt-8">
              <h3 className="mb-4 font-semibold">
                Planned Features
              </h3>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  🤖 AI Content Evaluation
                </div>

                <div className="rounded-lg border p-4">
                  📈 Engagement Analysis
                </div>

                <div className="rounded-lg border p-4">
                  🎯 Audience Insights
                </div>

                <div className="rounded-lg border p-4">
                  🏷️ Hashtag Optimization
                </div>

                <div className="rounded-lg border p-4">
                  😊 Sentiment Detection
                </div>

                <div className="rounded-lg border p-4">
                  💡 AI Recommendations
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="font-medium">
                🚧 Under Development
              </div>

              <p className="mt-2 text-sm text-muted-foreground">
                Fitur ini sedang dalam tahap pengembangan dan akan tersedia
                pada update berikutnya. Nantinya Anda dapat menempelkan link
                postingan dari Instagram, TikTok, Facebook, YouTube, X,
                maupun Threads untuk mendapatkan insight mendalam berbasis AI.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
