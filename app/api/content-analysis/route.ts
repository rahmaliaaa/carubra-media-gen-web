import { NextRequest, NextResponse } from "next/server"
import { CONTENT_STRATEGY_SYSTEM_PROMPT, buildUserPrompt } from "./prompts"


export type StrategyResult = {
  concept_title: string
  concept_description: string
  hook: string
  content_flow: string[]
  caption: string
  caption_score: number
  caption_tone: string
  hashtags: string[]
  hashtag_warning: string | null
  estimated_views: { min: string; max: string }
  engagement_rate: number
  viral_score: number
  best_post_time: string
  best_post_days: string
  content_formats: string[]
  audience_match: { segment: string; pct: number }[]
  platform_reach: { platform: string; reach: string; color: string }[]
  trend_30d: number[]
  sentiment: { positive: number; neutral: number; negative: number }
  sentiment_summary: string
  recommendations: {
    icon: string
    title: string
    description: string
    priority: "high" | "medium" | "low"
  }[]
  competitor_insight: string
  cta_suggestions: string[]
}

export type StrategyJob = {
  id: string
  prompt: string
  platform: string
  target_audience: string
  status: "completed" | "processing" | "failed"
  created_at: string
  result: StrategyResult | null
  error?: string
}

// ─── In-memory store (ganti dengan DB di production) ─────────────────────────
// Di production: ganti ini dengan Prisma / Supabase / MongoDB
const jobStore: Map<string, StrategyJob> = new Map()

// ─── POST /api/content-strategy ──────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { prompt, platform, target_audience, content_type } = body

    // Validasi input
    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt tidak boleh kosong" }, { status: 400 })
    }
    if (!platform) {
      return NextResponse.json({ error: "Platform harus dipilih" }, { status: 400 })
    }

    // Buat job record
    const jobId = `ca_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const job: StrategyJob = {
      id: jobId,
      prompt,
      platform,
      target_audience: target_audience ?? "Umum",
      status: "processing",
      created_at: new Date().toISOString(),
      result: null,
    }
    jobStore.set(jobId, job)

    // ─── Panggil AI API ───────────────────────────────────────────────────────
    const userMessage = buildUserPrompt({
      prompt,
      platform,
      targetAudience: target_audience,
      contentType: content_type,
    })

    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.CONTENT_API_KEY!}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 2000,
        response_format: { type: "json_object" },
        system: CONTENT_STRATEGY_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    })

    if (!aiResponse.ok) {
      const errText = await aiResponse.text()
      throw new Error(`AI API error: ${aiResponse.status} — ${errText}`)
    }

    const aiData = await aiResponse.json()

    // ─── Parse JSON dari response AI ─────────────────────────────────────────
    const rawText = aiData.choices[0].message.content

    // Strip markdown backtick kalau AI tetap ngirim (defensive parsing)
    const cleanText = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim()

    let result: StrategyResult
    try {
      result = JSON.parse(cleanText)
    } catch {
      throw new Error("AI tidak mengembalikan JSON valid. Response: " + cleanText.slice(0, 200))
    }

    // Validasi field wajib
    // const required: (keyof StrategyResult)[] = [
    //   "concept_title", "caption", "hashtags", "viral_score",
    //   "engagement_rate", "platform_reach", "recommendations",
    // ]
    // for (const field of required) {
    //   if (result[field] === undefined || result[field] === null) {
    //     throw new Error(`Field wajib hilang dari response AI: ${field}`)
    //   }
    // }
    // Array berisi field bertipe string yang wajib ada cadangannya
    const stringFields = [
      "concept_title", "concept_description", "hook", "caption", 
      "caption_tone", "best_post_time", "best_post_days", "sentiment_summary", "competitor_insight"
    ];

    for (const field of stringFields) {
      if (!result[field]) {
        // Jika AI lupa memberikan field ini, isi dengan teks default alih-alih melempar error
        result[field] = `Strategi ${field.replace('_', ' ')}`; 
      }
    }

    // Lakukan hal yang sama untuk field bertipe array jika kosong
    if (!Array.isArray(result.content_flow)) result.content_flow = ["Langkah 1: Pengenalan produk"];
    if (!Array.isArray(result.hashtags)) result.hashtags = ["#foryou", "#trending"];
    if (!Array.isArray(result.recommendations)) result.recommendations = [];

    // Update job jadi completed
    job.status = "completed"
    job.result = result
    jobStore.set(jobId, job)

    return NextResponse.json({ job }, { status: 201 })

  } catch (err: any) {
    console.error("[content-strategy POST]", err)
    return NextResponse.json(
      { error: err.message ?? "Terjadi kesalahan internal" },
      { status: 500 }
    )
  }
}

// ─── GET /api/content-strategy — ambil history ───────────────────────────────
export async function GET(req: NextRequest) {
  try {
    // Di production: query DB dengan user ID dari session/JWT
    // Contoh dengan Prisma:
    // const userId = getUserIdFromToken(req)
    // const jobs = await prisma.contentJob.findMany({
    //   where: { userId },
    //   orderBy: { createdAt: "desc" },
    //   take: 20,
    // })

    const jobs = Array.from(jobStore.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20)

    return NextResponse.json({ jobs })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─── GET /api/content-strategy/[id] — detail satu job ────────────────────────
// Buat file terpisah: app/api/content-strategy/[id]/route.ts
//
// export async function GET(req, { params }) {
//   const job = jobStore.get(params.id)
//   if (!job) return NextResponse.json({ error: "Job tidak ditemukan" }, { status: 404 })
//   return NextResponse.json({ job })
// }