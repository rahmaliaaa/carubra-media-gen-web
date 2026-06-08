import { NextRequest, NextResponse } from 'next/server'
import { find } from '@/lib/supabase'
import { getUserFromRequest } from '@/middleware/auth'

type TransactionStatus = 'success' | 'pending' | 'failed' | 'expired'

function normalizeStatus(status: string | null): TransactionStatus {
  if (!status) return 'pending'
  const normalized = status.toLowerCase()
  if (normalized === 'paid') return 'success'
  if (normalized === 'pending') return 'pending'
  if (normalized === 'failed' || normalized === 'refunded') return 'failed'
  return 'pending'
}

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const transactions = await find('transactions', { user_id: user.id }, { orderBy: 'created_at', ascending: false, limit: 50 })

    const formattedTransactions = (transactions ?? []).map((transaction: any) => {
      const status = normalizeStatus(transaction.payment_status)
      const orderId = transaction.invoice_number || transaction.xendit_invoice_id || transaction.id
      const invoiceUrl = transaction.xendit_payment_url || transaction.invoice_url || `/dashboard/member?payment=${status === 'success' ? 'success' : status === 'pending' ? 'pending' : 'failed'}&orderId=${encodeURIComponent(orderId)}`

      return {
        id: transaction.id,
        orderId,
        packageId: transaction.package_id ?? 'membership',
        title: transaction.package_name || transaction.invoice_number || `Topup ${transaction.coins_purchased ?? 0} TOKEN`,
        coins: transaction.coins_purchased ?? 0,
        priceLabel: transaction.price_label ?? (transaction.amount ? `Rp ${Number(transaction.amount).toLocaleString('id-ID')}` : 'Rp 0'),
        status,
        invoiceUrl,
        paidAt: transaction.paid_at ? new Date(transaction.paid_at).toISOString() : undefined,
        createdAt: transaction.created_at ? new Date(transaction.created_at).toISOString() : new Date().toISOString(),
      }
    })

    return NextResponse.json({ transactions: formattedTransactions })
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? 'Unable to load transactions' }, { status: 500 })
  }
}
