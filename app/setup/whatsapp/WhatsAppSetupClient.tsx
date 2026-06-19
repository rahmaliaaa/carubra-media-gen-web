"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy, RefreshCw, AlertTriangle, ArrowRight } from 'lucide-react'

type Props = {
  gowaBaseUrl: string | null
}

export default function WhatsAppSetupClient({ gowaBaseUrl }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleSavePhone = async () => {
    if (!phone.trim()) {
      setError('Nomor WhatsApp tidak boleh kosong.')
      return
    }

    setError(null)
    setSuccessMessage(null)
    setSaving(true)

    try {
      const res = await fetch('/api/social-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'whatsapp', username: phone.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan koneksi WhatsApp.')
      setSuccessMessage('Nomor WhatsApp tersimpan. Kembali ke dashboard untuk melihat koneksi.')
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan koneksi WhatsApp.')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!gowaBaseUrl) return
    setQrUrl(`${gowaBaseUrl.replace(/\/$/, '')}/setup/whatsapp`)
  }, [gowaBaseUrl])

  const handleCopy = async () => {
    if (!qrUrl) return
    try {
      await navigator.clipboard.writeText(qrUrl)
      setSuccessMessage('URL GoWA berhasil disalin ke clipboard.')
    } catch (err) {
      setError('Gagal menyalin URL ke clipboard.')
    }
  }

  const handleRefresh = () => {
    setQrUrl(null)
    setError(null)
    setSuccessMessage(null)
    setTimeout(() => {
      if (gowaBaseUrl) setQrUrl(`${gowaBaseUrl.replace(/\/$/, '')}/setup/whatsapp`)
    }, 100)
  }

  const details = (
    <div className="space-y-3 text-sm text-muted-foreground">
      <p>Scan QR code di GoWA untuk menghubungkan akun WhatsApp kamu ke sistem.</p>
      <p>Setelah terhubung, simpan nomor WhatsApp yang akan digunakan untuk penjadwalan pesan.</p>
      <p>Jika GoWA belum dikonfigurasi, hubungi developer untuk mengatur <code>GOWA_BASE_URL</code>.</p>
    </div>
  )

  if (!gowaBaseUrl) {
    return (
      <div className="mx-auto max-w-2xl py-16 px-4 text-center">
        <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-6">
          <p className="text-lg font-semibold text-red-700">GoWA belum dikonfigurasi</p>
          <p className="mt-2 text-sm text-red-600">Silakan atur environment variable <code>GOWA_BASE_URL</code> di developer atau server.</p>
        </div>
        {details}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl py-16 px-4">
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">WhatsApp Setup</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Hubungkan WhatsApp lewat QR GoWA</h1>
          <p className="mt-3 text-sm text-slate-600">Buka GoWA dan scan QR untuk menghubungkan akun WhatsApp kamu. Setelah berhasil, kembali ke dashboard untuk menyimpan nomor.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">URL Setup GoWA</p>
                  <p className="mt-1 text-xs text-slate-500">Buka URL berikut di browser untuk melihat QR code GoWA.</p>
                </div>
                <Button variant="secondary" size="sm" className="gap-2" onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4" /> Refresh
                </Button>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">URL</p>
                  <p className="mt-2 break-words text-sm font-medium">{qrUrl}</p>
                </div>
                {qrUrl && (
                  <div className="mb-4 rounded-2xl border border-slate-200 overflow-hidden bg-white">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrUrl)}`}
                      alt="QR code GoWA"
                      className="w-full block"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button onClick={handleCopy} className="gap-2" disabled={!qrUrl}>
                    <Copy className="h-4 w-4" /> Salin URL
                  </Button>
                  <Button asChild>
                    <a href={qrUrl || '#'} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2">
                      <ArrowRight className="h-4 w-4" /> Buka GoWA
                    </a>
                  </Button>
                </div>
                <p className="mt-3 text-xs text-slate-500">Jika GoWA menampilkan QR code, scan dengan aplikasi WhatsApp di ponsel kamu dan tunggu konfirmasi.</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Nomor WhatsApp</p>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Required</span>
              </div>
              <div className="mt-4 space-y-3">
                <p className="text-sm text-slate-600">Masukkan nomor WA yang sudah terhubung lewat GoWA. Ini diperlukan agar Carubra bisa menjadwalkan pesan ke nomor tersebut.</p>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Nomor WhatsApp</Label>
                  <Input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+62 812 3456 7890"
                  />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    onClick={handleSavePhone}
                    disabled={saving}
                    className="gap-2"
                  >
                    {saving ? 'Menyimpan...' : 'Simpan nomor WA'}
                  </Button>
                  <Button asChild>
                    <a href="/dashboard/auto-upload" className="inline-flex items-center justify-center">
                      Kembali ke Dashboard
                    </a>
                  </Button>
                </div>
                {successMessage && (
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                    {successMessage}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">Langkah cepat</p>
                <ol className="mt-3 space-y-2 text-sm text-slate-600 list-decimal list-inside">
                  <li>Buka link GoWA dan scan QR.</li>
                  <li>Tunggu GoWA menghubungkan akun WhatsApp kamu.</li>
                  <li>Kembali ke dashboard dan simpan nomor WA.</li>
                  <li>Gunakan nomor tersebut untuk menjadwalkan pesan WA.</li>
                </ol>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-800">Catatan penting</p>
                <p className="mt-2 text-sm text-slate-600">GoWA client ID dikelola oleh developer. Kamu hanya perlu scan QR dan memasukkan nomor WA.</p>
                <p className="mt-2 text-sm text-slate-500">Jika kamu butuh bantuan, minta developer untuk memastikan GoWA sudah online dan token QR tersedia.</p>
              </div>
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <AlertTriangle className="inline h-4 w-4 mr-2 align-text-bottom" /> {error}
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Tidak ada QR code? Gunakan link di atas atau hubungi developer.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
