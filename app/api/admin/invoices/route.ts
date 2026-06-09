import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, isAdminUser } from '@/lib/admin'
import { find } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const admin = await getAdminUser(req)
  if (!isAdminUser(admin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const exportCsv = searchParams.get('export') === 'csv'

    let transactions = await find('transactions', {}, {
      orderBy: 'created_at',
      ascending: false,
    })

    // Filter status (pakai payment_status sesuai kolom DB)
    if (status && status !== 'all') {
      transactions = transactions.filter((tx: any) =>
        (tx.payment_status ?? '').toLowerCase() === status
      )
    }

    // Filter by date range
    if (startDate) {
      const start = new Date(startDate)
      transactions = transactions.filter((tx: any) => new Date(tx.created_at) >= start)
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      transactions = transactions.filter((tx: any) => new Date(tx.created_at) <= end)
    }

    // Ambil semua users untuk enrich data
    const users = await find('users', {})
    const userMap = new Map(users.map((u: any) => [u.id, u]))

    // Lookup title dari coins_purchased
    const packageMeta: Record<number, { title: string; priceLabel: string }> = {
      100:  { title: '100 TOKEN',  priceLabel: 'Rp 120.000' },
      250:  { title: '250 TOKEN',  priceLabel: 'Rp 250.000' },
      500:  { title: '500 TOKEN',  priceLabel: 'Rp 450.000' },
      1000: { title: '1000 TOKEN', priceLabel: 'Rp 800.000' },
      2000: { title: '2000 TOKEN', priceLabel: 'Rp 1.500.000' },
    }

    const enriched = transactions.map((tx: any) => {
      const u = userMap.get(tx.user_id)
      const coins: number = tx.coins_purchased ?? 0
      const meta = packageMeta[coins]
      const status = (tx.payment_status ?? 'pending').toLowerCase()

      return {
        id:           tx.id,
        userId:       tx.user_id,
        userName:     u?.name ?? u?.email ?? '-',
        userEmail:    u?.email ?? '-',
        packageId:    tx.package_id ?? null,
        packageName:  meta?.title ?? `Topup ${coins} TOKEN`,
        coins,
        amount:       tx.amount ?? 0,
        priceLabel:   meta?.priceLabel ?? (tx.amount ? `Rp ${Number(tx.amount).toLocaleString('id-ID')}` : 'Rp 0'),
        paymentMethod: tx.payment_method ?? 'xendit',
        status,
        invoiceId:    tx.invoice_number ?? tx.xendit_invoice_id ?? tx.id,
        invoiceUrl:   tx.xendit_payment_url ?? null,
        paidAt:       tx.paid_at ? new Date(tx.paid_at).toISOString() : null,
        createdAt:    tx.created_at ? new Date(tx.created_at).toISOString() : null,
      }
    })

    // Summary
    const successTx = enriched.filter((tx: any) => tx.status === 'success' || tx.status === 'paid')
    const summary = {
      totalTransactions: enriched.length,
      totalRevenue:      successTx.reduce((sum: number, tx: any) => sum + (tx.amount ?? 0), 0),
      successCount:      successTx.length,
      pendingCount:      enriched.filter((tx: any) => tx.status === 'pending').length,
      failedCount:       enriched.filter((tx: any) => tx.status === 'failed' || tx.status === 'refunded').length,
      expiredCount:      enriched.filter((tx: any) => tx.status === 'expired').length,
      totalTokensSold:   successTx.reduce((sum: number, tx: any) => sum + (tx.coins ?? 0), 0),
    }

    // Export CSV
    if (exportCsv) {
      const headers = ['Invoice ID', 'Nama User', 'Email User', 'Paket', 'Token', 'Harga', 'Amount (IDR)', 'Status', 'Tanggal Buat', 'Tanggal Bayar']
      const rows = enriched.map((tx: any) => [
        tx.invoiceId,
        tx.userName,
        tx.userEmail,
        tx.packageName,
        tx.coins,
        tx.priceLabel,
        tx.amount,
        tx.status,
        tx.createdAt ? new Date(tx.createdAt).toLocaleString('id-ID') : '-',
        tx.paidAt ? new Date(tx.paidAt).toLocaleString('id-ID') : '-',
      ])

      const csv = [
        headers.join(','),
        ...rows.map((row: any[]) => row.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      ].join('\n')

      return new NextResponse('\uFEFF' + csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="carubra-transaksi-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    return NextResponse.json({ transactions: enriched, summary })
  } catch (error: any) {
    console.error('[GET /api/admin/invoices]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}