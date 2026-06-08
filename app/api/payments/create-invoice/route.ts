import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/middleware/auth'
import { insert } from '@/lib/supabase'
import { logUserActivity, logApiError } from '@/lib/log'

const packageOptions: Record<string, { title: string; coins: number; amount: number; priceLabel: string }> = {
  starter: { title: '100 TOKEN', coins: 100, amount: 120000, priceLabel: 'Rp 120.000' },
  popular: { title: '250 TOKEN', coins: 250, amount: 250000, priceLabel: 'Rp 250.000' },
  'semi-pro': { title: '500 TOKEN', coins: 500, amount: 450000, priceLabel: 'Rp 450.000' },
  'best-value': { title: '1000 TOKEN', coins: 1000, amount: 800000, priceLabel: 'Rp 800.000' },
  enterprise: { title: '2000 TOKEN', coins: 2000, amount: 1500000, priceLabel: 'Rp 1.500.000' },
}

function buildInvoiceUrl(orderId: string) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? ''
  return `${apiBase}/dashboard/member?payment=pending&orderId=${encodeURIComponent(orderId)}`
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const packageId = body?.packageId
  if (!packageId || typeof packageId !== 'string') {
    return NextResponse.json({ error: 'Missing packageId' }, { status: 400 })
  }

  const selectedPackage = packageOptions[packageId]
  if (!selectedPackage) {
    return NextResponse.json({ error: 'Invalid packageId' }, { status: 400 })
  }

  const orderId = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  const invoiceUrl = buildInvoiceUrl(orderId)

  try {
    const inserted = await insert('transactions', {
      user_id: user.id,
      coins_purchased: selectedPackage.coins,
      amount: selectedPackage.amount,
      payment_method: 'manual',
      payment_status: 'pending',
      xendit_payment_url: invoiceUrl,
      invoice_number: orderId,
    })

    if (!inserted) {
      throw new Error('Failed to create transaction')
    }

    await logUserActivity(user.id, user.email, 'payment.create_invoice', 'Created pending transaction', {
      packageId,
      orderId,
      amount: selectedPackage.amount,
    }).catch(() => null)

    return NextResponse.json({ invoiceUrl, orderId })
  } catch (error: any) {
    await logApiError('/api/payments/create-invoice', error.message ?? 'Failed to create invoice', 500, user.id, user.email, {
      packageId,
    }).catch(() => null)
    return NextResponse.json({ error: error.message ?? 'Failed to create invoice' }, { status: 500 })
  }
}
