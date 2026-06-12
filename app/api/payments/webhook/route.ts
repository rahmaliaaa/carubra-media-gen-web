import { NextRequest, NextResponse } from 'next/server'
import { findOne, updateOne } from '@/lib/supabase'
import { logApiError } from '@/lib/log'

export async function POST(req: NextRequest) {
  try {
    // ── 1. Verifikasi webhook token ──
    const webhookToken = req.headers.get('x-callback-token')
    const expectedToken = process.env.XENDIT_WEBHOOK_TOKEN
    if (!expectedToken) {
      console.error('[webhook] XENDIT_WEBHOOK_TOKEN not set')
      return NextResponse.json({ error: 'Webhook token not configured' }, { status: 500 })
    }
    if (webhookToken !== expectedToken) {
      console.warn('[webhook] Invalid webhook token')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── 2. Parse body Xendit ──
    const body = await req.json()
    const { external_id, status, paid_amount, paid_at, payment_method } = body

    if (!external_id) {
      return NextResponse.json({ error: 'Missing external_id' }, { status: 400 })
    }

    // ── 3. Cari transaksi berdasarkan invoice_number ──
    const transaction = await findOne('transactions', { invoice_number: external_id })
    if (!transaction) {
      console.warn('[webhook] Transaction not found:', external_id)
      return NextResponse.json({ received: true })
    }

    // Skip kalau sudah success (hindari double credit)
    if (transaction.payment_status === 'success' || transaction.payment_status === 'paid') {
      console.log('[webhook] Already processed:', external_id)
      return NextResponse.json({ received: true })
    }

    // Map status Xendit → status internal
    const statusMap: Record<string, string> = {
      PAID:    'success',
      SETTLED: 'success',
      EXPIRED: 'expired',
      FAILED:  'failed',
    }
    const newStatus = statusMap[status?.toUpperCase()]
    if (!newStatus) return NextResponse.json({ received: true })

    // ── 4. Update payment_status di transactions ──
    await updateOne('transactions', { invoice_number: external_id }, {
      payment_status: newStatus,
      paid_at:        newStatus === 'success' ? (paid_at ?? new Date().toISOString()) : null,
      payment_method: payment_method ?? transaction.payment_method,
    })

    // ── 5. Kalau PAID → kredit coins ke user ──
    if (newStatus === 'success') {
      const user = await findOne('users', { id: transaction.user_id })
      if (!user) {
        console.error('[webhook] User not found:', transaction.user_id)
        return NextResponse.json({ received: true })
      }

      const currentCoins: number = user.coins ?? 0
      const coinsToAdd: number = transaction.coins_purchased ?? 0

      await updateOne('users', { id: transaction.user_id }, {
        coins: currentCoins + coinsToAdd,
      })

      console.log(`[webhook] +${coinsToAdd} coins → user ${transaction.user_id}`)
    }

    return NextResponse.json({ received: true })

  } catch (error: any) {
    console.error('[webhook] Error:', error)
    await logApiError('/api/payments/webhook', error.message, 500).catch(() => null)
    return NextResponse.json({ received: true })
  }
}