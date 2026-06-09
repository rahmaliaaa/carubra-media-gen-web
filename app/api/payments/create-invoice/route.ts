import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/middleware/auth'
import { findOne, insert } from '@/lib/supabase'
import { logUserActivity, logApiError } from '@/lib/log'

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  // ── Ambil paket dari DB, bukan hardcode ──
  const pkg = await findOne('membership_packages', { id: packageId, is_active: true })
  if (!pkg) return NextResponse.json({ error: 'Paket tidak ditemukan atau tidak aktif' }, { status: 400 })

  const pkgTitle = `${pkg.coins} TOKEN`
  const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') ?? ''
  const successUrl = `${baseUrl}/dashboard/member?payment=success&orderId=${encodeURIComponent(invoiceNumber)}`
  const failureUrl = `${baseUrl}/dashboard/member?payment=failed&orderId=${encodeURIComponent(invoiceNumber)}`

  try {
    const xenditKey = process.env.XENDIT_SECRET_KEY
    if (!xenditKey) throw new Error('XENDIT_SECRET_KEY not configured')

    const xenditRes = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(xenditKey + ':').toString('base64')}`,
      },
      body: JSON.stringify({
        external_id: invoiceNumber,
        amount: pkg.price,
        description: `Carubra — ${pkg.name} (${pkgTitle})`,
        payer_email: user.email,
        customer: {
          given_names: user.name ?? user.email,
          email: user.email,
        },
        items: [{
          name: `${pkg.name} — ${pkgTitle}`,
          quantity: 1,
          price: pkg.price,
          category: 'Token',
        }],
        success_redirect_url: successUrl,
        failure_redirect_url: failureUrl,
        currency: 'IDR',
        invoice_duration: 86400,
      }),
    })

    if (!xenditRes.ok) {
      const xenditErr = await xenditRes.json().catch(() => ({}))
      throw new Error(xenditErr.message ?? `Xendit error ${xenditRes.status}`)
    }

    const xenditData = await xenditRes.json()
    const xenditPaymentUrl: string = xenditData.invoice_url
    const xenditInvoiceId: string = xenditData.id

    const inserted = await insert('transactions', {
      user_id:            user.id,
      package_id:         pkg.id,
      coins_purchased:    pkg.coins,
      amount:             pkg.price,
      payment_method:     'xendit',
      payment_status:     'pending',
      xendit_invoice_id:  xenditInvoiceId,
      xendit_payment_url: xenditPaymentUrl,
      invoice_number:     invoiceNumber,
    })

    if (!inserted) throw new Error('Failed to save transaction')

    await logUserActivity(user.id, user.email, 'payment.create_invoice', 'Created Xendit invoice', {
      packageId, invoiceNumber, amount: pkg.price,
    }).catch(() => null)

    return NextResponse.json({ invoiceUrl: xenditPaymentUrl, orderId: invoiceNumber })

  } catch (error: any) {
    await logApiError('/api/payments/create-invoice', error.message, 500, user.id, user.email, { packageId }).catch(() => null)
    return NextResponse.json({ error: error.message ?? 'Failed to create invoice' }, { status: 500 })
  }
}