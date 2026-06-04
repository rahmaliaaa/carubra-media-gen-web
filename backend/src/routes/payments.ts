import { Router, Response } from 'express'
import { authenticateToken, AuthRequest } from '../middleware/auth.js'
import { findOne, find, insert, updateOne } from '../lib/supabase.js'

const router = Router()

// ─── Config ───────────────────────────────────────────────────────────────────
const XENDIT_SECRET_KEY    = process.env.XENDIT_SECRET_KEY    ?? ''
const XENDIT_WEBHOOK_TOKEN = process.env.XENDIT_WEBHOOK_TOKEN ?? ''
const BASE_URL             = process.env.BASE_URL             ?? 'https://yourdomain.com'

const xenditAuthHeader = 'Basic ' + Buffer.from(XENDIT_SECRET_KEY + ':').toString('base64')

// ─── Types ────────────────────────────────────────────────────────────────────
type TransactionStatus = 'pending' | 'success' | 'failed' | 'expired'

// Dokumen di table "transactions" (Supabase)
type TransactionDoc = {
  id?: string
  order_id: string
  user_id: string
  package_id: string
  title: string
  coins: number
  price: number            // angka IDR, e.g. 120000
  price_label: string      // tampilan, e.g. "Rp 120.000"
  status: TransactionStatus
  invoice_id: string       // Xendit invoice ID
  invoice_url: string      // Xendit hosted payment URL
  paid_at?: Date
  created_at: Date
  updated_at: Date
}

// Shape yang dikirim ke frontend
type TransactionResponse = {
  id: string
  orderId: string
  packageId: string
  title: string
  coins: number
  priceLabel: string
  status: TransactionStatus
  invoiceUrl: string
  paidAt?: string
  createdAt: string
}

function toResponse(doc: any): TransactionResponse {
  return {
    id:         doc.id,
    orderId:    doc.order_id,
    packageId:  doc.package_id,
    title:      doc.title,
    coins:      doc.coins,
    priceLabel: doc.price_label,
    status:     doc.status,
    invoiceUrl: doc.invoice_url,
    paidAt:     doc.paid_at ? new Date(doc.paid_at).toISOString() : undefined,
    createdAt:  new Date(doc.created_at).toISOString(),
  }
}

// ─── Paket token (harga dijaga di server, bukan di frontend) ──────────────────
const PACKAGES: Record<string, {
  title: string; coins: number; price: number; priceLabel: string
}> = {
  'starter':    { title: '100 TOKEN',  coins: 100,  price: 120000,   priceLabel: 'Rp 120.000'   },
  'popular':    { title: '250 TOKEN',  coins: 250,  price: 250000,   priceLabel: 'Rp 250.000'   },
  'semi-pro':   { title: '500 TOKEN',  coins: 500,  price: 450000,   priceLabel: 'Rp 450.000'   },
  'best-value': { title: '1000 TOKEN', coins: 1000, price: 800000,   priceLabel: 'Rp 800.000'   },
  'enterprise': { title: '2000 TOKEN', coins: 2000, price: 1500000,  priceLabel: 'Rp 1.500.000' },
}

// ─── Xendit helper ────────────────────────────────────────────────────────────
async function createXenditInvoice(payload: {
  externalId: string
  amount: number
  payerEmail: string
  description: string
  successRedirectUrl: string
  failureRedirectUrl: string
}): Promise<{ id: string; invoiceUrl: string; expiryDate: string }> {
  const res = await fetch('https://api.xendit.co/v2/invoices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: xenditAuthHeader,
    },
    body: JSON.stringify({
      external_id:           payload.externalId,
      amount:                payload.amount,
      payer_email:           payload.payerEmail,
      description:           payload.description,
      invoice_duration:      86400,
      success_redirect_url:  payload.successRedirectUrl,
      failure_redirect_url:  payload.failureRedirectUrl,
      currency:              'IDR',
      should_send_email:     true,
      reminder_time:         1,
      items: [{
        name:     payload.description,
        quantity: 1,
        price:    payload.amount,
        category: 'Token',
      }],
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Xendit error: ${err.message ?? res.statusText}`)
  }

  const data = await res.json()
  return { id: data.id, invoiceUrl: data.invoice_url, expiryDate: data.expiry_date }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/payments/packages
 * Daftar paket token yang tersedia (public).
 */
router.get('/packages', (_req, res: Response) => {
  const list = Object.entries(PACKAGES).map(([id, pkg]) => ({ id, ...pkg }))
  return res.json({ packages: list })
})

/**
 * POST /api/payments/create-invoice
 * Body: { packageId: string }
 * Membuat Xendit Invoice dan mengembalikan URL pembayaran.
 */
router.post('/create-invoice', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { packageId } = req.body as { packageId: string }
    const userId = req.user?.id

    if (!packageId) return res.status(400).json({ error: 'packageId wajib diisi' })

    const pkg = PACKAGES[packageId]
    if (!pkg) return res.status(400).json({ error: `Paket tidak dikenal: ${packageId}` })

    // Ambil email user dari table users
    const user = await findOne('users', { id: userId })
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' })

    // Buat Order ID unik
    const orderId = `ORD-${Date.now().toString().slice(-8).padStart(8, '0')}`

    // Buat Xendit Invoice
    const invoice = await createXenditInvoice({
      externalId:          orderId,
      amount:              pkg.price,
      payerEmail:          user.email,
      description:         `Carubra ${pkg.title} — ${pkg.coins} token`,
      successRedirectUrl:  `${BASE_URL}/member?payment=success&orderId=${orderId}`,
      failureRedirectUrl:  `${BASE_URL}/member?payment=failed&orderId=${orderId}`,
    })

    // Simpan ke Supabase table "transactions"
    const now = new Date()
    const doc = {
      order_id:  orderId,
      user_id:   userId!,
      package_id: packageId,
      title:     pkg.title,
      coins:     pkg.coins,
      price:     pkg.price,
      price_label: pkg.priceLabel,
      status:    'pending' as TransactionStatus,
      invoice_id:  invoice.id,
      invoice_url: invoice.invoiceUrl,
      created_at:  now,
      updated_at:  now,
    }

    const result = await insert('transactions', doc)

    return res.status(201).json({
      transaction: toResponse({ ...doc, id: result.id }),
      invoiceUrl:  invoice.invoiceUrl,
      expiryDate:  invoice.expiryDate,
    })
  } catch (err: any) {
    console.error('[create-invoice]', err)
    return res.status(500).json({ error: err.message ?? 'Internal server error' })
  }
})

/**
 * GET /api/payments/transactions
 * Riwayat transaksi milik user yang sedang login.
 */
router.get('/transactions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id

    const docs = await find(
      'transactions',
      { user_id: userId },
      { orderBy: 'created_at', ascending: false, limit: 50 }
    )

    return res.json({ transactions: docs.map(toResponse) })
  } catch (err: any) {
    console.error('[get-transactions]', err)
    return res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/payments/transactions/:id
 * Detail satu transaksi.
 */
router.get('/transactions/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    const doc = await findOne('transactions', { id: req.params.id })

    if (!doc)              return res.status(404).json({ error: 'Transaksi tidak ditemukan' })
    if (doc.user_id !== userId) return res.status(403).json({ error: 'Forbidden' })

    return res.json({ transaction: toResponse(doc) })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/payments/webhook
 * Xendit mengirim callback ke sini setelah pembayaran selesai.
 *
 * Setup di Xendit Dashboard:
 *   Settings → Webhooks → Invoice paid  →  https://yourdomain.com/api/payments/webhook
 */
router.post('/webhook', async (req, res: Response) => {
  // Validasi x-callback-token dari Xendit
  const callbackToken = req.headers['x-callback-token']
  if (XENDIT_WEBHOOK_TOKEN && callbackToken !== XENDIT_WEBHOOK_TOKEN) {
    console.warn('[webhook] Token tidak valid')
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const event = req.body
  const externalId: string   = event.external_id ?? event.data?.external_id ?? ''
  const xenditStatus: string = (event.status      ?? event.data?.status      ?? '').toUpperCase()

  console.log(`[webhook] externalId=${externalId} status=${xenditStatus}`)

  const statusMap: Record<string, TransactionStatus> = {
    PAID:     'success',
    SETTLED:  'success',
    EXPIRED:  'expired',
    FAILED:   'failed',
  }

  const newStatus = statusMap[xenditStatus]
  if (!newStatus) return res.status(200).json({ received: true }) // status lain diabaikan

  try {
    const tx = await findOne('transactions', { order_id: externalId, status: 'pending' })

    if (!tx) {
      // Tidak ditemukan atau sudah diproses — tetap 200 agar Xendit tidak retry
      return res.status(200).json({ received: true })
    }

    const updateData: any = {
      status:    newStatus,
      updated_at: new Date(),
    }
    if (newStatus === 'success') {
      updateData.paid_at = new Date()
    }

    await updateOne('transactions', { id: tx.id }, updateData)

    // Kredit token ke user di table "users"
    if (newStatus === 'success') {
      const user = await findOne('users', { id: tx.user_id })
      if (user) {
        const newCoins = (user.coins ?? 0) + tx.coins
        await updateOne('users', { id: tx.user_id }, { 
          coins: newCoins,
          updated_at: new Date() 
        })
        console.log(`[webhook] ✅ +${tx.coins} token dikreditkan ke user ${tx.user_id}`)
      }
    }
  } catch (err) {
    console.error('[webhook] DB error:', err)
    // Tetap 200 — jangan buat Xendit retry untuk error internal kita
  }

  return res.status(200).json({ received: true })
})

export default router