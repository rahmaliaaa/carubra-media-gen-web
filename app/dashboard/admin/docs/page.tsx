"use client"

import { useState } from "react"
import { Lock, Info, Copy, Printer } from "lucide-react"

type Tab = 'db' | 'fitur' | 'api' | 'sso'

export default function DocsDevPage() {
  const [pin, setPin] = useState("")
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('db')

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin === "uterocarubra123") {
      setIsVerified(true)
      setError(false)
    } else {
      setError(true)
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    // could show a toast here
  }

  if (!isVerified) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="bg-blue-50 text-blue-800 p-4 rounded-xl flex items-start gap-3 max-w-md border border-blue-100 shadow-sm">
          <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="text-sm leading-relaxed">
            <p>Ini adalah dokumentasi sistem untuk developer.</p>
            <p className="mt-2">Masukkan kunci untuk melanjutkan: pinnya ini <strong>uterocarubra123</strong></p>
          </div>
        </div>

        <div className="w-full max-w-md bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 text-center border-b bg-slate-50/50">
            <div className="mx-auto bg-blue-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Dokumentasi Developer</h2>
            <p className="text-sm text-slate-500 mt-1">Masukkan PIN untuk mengakses dokumentasi</p>
          </div>
          <div className="p-6">
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <input
                  type="password"
                  placeholder="Masukkan PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className={`flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent ${error ? 'border-red-500 focus:ring-red-500' : 'border-slate-300'}`}
                />
                {error && <p className="text-sm text-red-500">PIN salah, silakan coba lagi.</p>}
              </div>
              <button 
                type="submit" 
                className="w-full bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Buka Dokumentasi
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  const CodeBlock = ({ title, code }: { title: string, code: string }) => (
    <div className="rounded-xl border border-slate-200 overflow-hidden my-6 bg-slate-50">
       <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200">
         <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
         <button onClick={() => handleCopy(code)} className="text-xs font-medium text-slate-600 border px-2 py-1.5 rounded-md bg-white hover:bg-slate-50 flex items-center gap-1.5 transition-colors shadow-sm">
           <Copy className="w-3 h-3" /> Copy
         </button>
       </div>
       <pre className="p-5 text-sm font-mono overflow-x-auto text-slate-800 leading-relaxed">{code}</pre>
    </div>
  )

  const NavTab = ({ id, label }: { id: Tab, label: string }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`py-4 px-1 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
        activeTab === id 
        ? 'text-blue-600 border-blue-600' 
        : 'text-slate-500 border-transparent hover:text-slate-900 hover:border-slate-300'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="min-h-screen bg-white text-slate-900 -m-4 sm:-m-8">
      {/* Topbar */}
      <nav className="border-b sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
          <div className="flex gap-6">
            <NavTab id="db" label="Database & Triggers" />
            <NavTab id="fitur" label="Arsitektur Fitur" />
            <NavTab id="api" label="Kontrak API Auth" />
            <NavTab id="sso" label="Dokumentasi SSO" />
          </div>
          <button onClick={() => window.print()} className="hidden md:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto py-10 px-4 sm:px-8">
        
        {/* Banner */}
        <div className="bg-blue-50 border border-blue-100 text-blue-900 p-5 rounded-xl text-sm leading-relaxed mb-10 shadow-sm">
          Dokumentasi teknis sistem Carubra Media Generator. Sistem ini menggunakan <strong>Supabase</strong> dengan arsitektur modern untuk otentikasi, manajemen media AI, dan transaksi.
        </div>

        {/* Tab Content: Database */}
        {activeTab === 'db' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <h2 className="text-2xl font-bold mb-6 border-b border-slate-200 pb-3">Struktur Tabel Data (Schemas)</h2>
            <p className="text-slate-600 mb-6">Daftar seluruh tabel asli yang ada di skema <code>public</code> Supabase.</p>
            
            <div className="rounded-xl border border-slate-200 overflow-hidden my-6 shadow-sm">
               <table className="w-full text-sm text-left">
                 <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                   <tr>
                     <th className="px-5 py-3.5 font-semibold">Nama Tabel</th>
                     <th className="px-5 py-3.5 font-semibold">Deskripsi & Fungsi Utama</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 bg-white">
                    <tr className="hover:bg-slate-50/50"><td className="px-5 py-4 font-mono font-medium text-blue-600">ai_usage_logs</td><td className="px-5 py-4 text-slate-600">Log pemakaian token API (LLM/AI) untuk keperluan analitik & billing.</td></tr>
                    <tr className="hover:bg-slate-50/50"><td className="px-5 py-4 font-mono font-medium text-blue-600">api_error_logs</td><td className="px-5 py-4 text-slate-600">Log otomatis untuk menangkap error dari endpoint API eksternal/internal.</td></tr>
                    <tr className="hover:bg-slate-50/50"><td className="px-5 py-4 font-mono font-medium text-blue-600">content_analysis</td><td className="px-5 py-4 text-slate-600">Menyimpan data analitik terkait performa konten yang telah diterbitkan.</td></tr>
                    <tr className="hover:bg-slate-50/50"><td className="px-5 py-4 font-mono font-medium text-blue-600">generated_contents</td><td className="px-5 py-4 text-slate-600">Riwayat general dari konten AI (Gambar/Video/Teks) yang diproduksi.</td></tr>
                    <tr className="hover:bg-slate-50/50"><td className="px-5 py-4 font-mono font-medium text-blue-600">image_history</td><td className="px-5 py-4 text-slate-600">Log historis khusus untuk pemrosesan/pembuatan gambar (Image AI).</td></tr>
                    <tr className="hover:bg-slate-50/50"><td className="px-5 py-4 font-mono font-medium text-blue-600">images</td><td className="px-5 py-4 text-slate-600">Tabel master yang menyimpan detail gambar hasil generate AI.</td></tr>
                    <tr className="hover:bg-slate-50/50"><td className="px-5 py-4 font-mono font-medium text-blue-600">members</td><td className="px-5 py-4 text-slate-600">Data khusus member yang berlangganan (detail membership tier).</td></tr>
                    <tr className="hover:bg-slate-50/50"><td className="px-5 py-4 font-mono font-medium text-blue-600">membership_packages</td><td className="px-5 py-4 text-slate-600">Katalog data harga dan paket koin yang ditawarkan kepada user.</td></tr>
                    <tr className="hover:bg-slate-50/50"><td className="px-5 py-4 font-mono font-medium text-blue-600">scheduled_posts</td><td className="px-5 py-4 text-slate-600">Antrean post/upload yang dijadwalkan ke media sosial terhubung.</td></tr>
                    <tr className="hover:bg-slate-50/50"><td className="px-5 py-4 font-mono font-medium text-blue-600">social_connects</td><td className="px-5 py-4 text-slate-600">Menyimpan kredensial OAuth (Token) akun media sosial pengguna.</td></tr>
                    <tr className="hover:bg-slate-50/50"><td className="px-5 py-4 font-mono font-medium text-blue-600">transaction_history</td><td className="px-5 py-4 text-slate-600">Riwayat log tahapan atau mutasi transaksi pembayaran (status tracking).</td></tr>
                    <tr className="hover:bg-slate-50/50"><td className="px-5 py-4 font-mono font-medium text-blue-600">transactions</td><td className="px-5 py-4 text-slate-600">Tabel utama invoice dan status pembayaran pembelian paket koin.</td></tr>
                    <tr className="hover:bg-slate-50/50"><td className="px-5 py-4 font-mono font-medium text-blue-600">user_activity_logs</td><td className="px-5 py-4 text-slate-600">Audit trail aktivitas/tindakan pengguna di dalam sistem.</td></tr>
                    <tr className="hover:bg-slate-50/50"><td className="px-5 py-4 font-mono font-medium text-blue-600">user_profile_summary</td><td className="px-5 py-4 text-slate-600">Tabel agregasi data profil pengguna (view/summary table).</td></tr>
                    <tr className="hover:bg-slate-50/50"><td className="px-5 py-4 font-mono font-medium text-blue-600">users</td><td className="px-5 py-4 text-slate-600">Tabel sentral pengguna. Menyimpan info role, email, dan jumlah koin.</td></tr>
                    <tr className="hover:bg-slate-50/50"><td className="px-5 py-4 font-mono font-medium text-blue-600">video_history</td><td className="px-5 py-4 text-slate-600">Log historis khusus untuk pemrosesan/pembuatan video (Video AI).</td></tr>
                    <tr className="hover:bg-slate-50/50"><td className="px-5 py-4 font-mono font-medium text-blue-600">videos</td><td className="px-5 py-4 text-slate-600">Tabel master yang menyimpan detail video hasil generate AI.</td></tr>
                 </tbody>
               </table>
            </div>

            <h2 className="text-2xl font-bold mb-6 mt-12 border-b border-slate-200 pb-3">Database Functions & Triggers Asli</h2>
            <p className="text-slate-600 mb-6">Fungsi dan Trigger PostgreSQL yang aktif mengatur otomatisasi data di level database.</p>

            <div className="rounded-xl border border-slate-200 overflow-hidden my-6">
               <table className="w-full text-sm text-left">
                 <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                   <tr>
                     <th className="px-5 py-3.5 font-semibold">Nama Trigger / Function</th>
                     <th className="px-5 py-3.5 font-semibold">Event Pemicu</th>
                     <th className="px-5 py-3.5 font-semibold">Hasil Otomatisasi</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 bg-white">
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-5 py-4">
                        <span className="font-mono font-medium text-blue-600 block">set_invoice_number</span>
                        <span className="text-xs text-slate-400">Trigger: trigger_set_invoice_number</span>
                      </td>
                      <td className="px-5 py-4 text-slate-600 font-mono text-xs">BEFORE INSERT ON<br/>transactions</td>
                      <td className="px-5 py-4 text-slate-600">Menggunakan <code>generate_invoice_number()</code> untuk mengisi field nomor invoice secara otomatis sebelum record transaksi tersimpan.</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-5 py-4">
                        <span className="font-mono font-medium text-blue-600 block">set_membership_order</span>
                        <span className="text-xs text-slate-400">Trigger: trigger_set_membership_order</span>
                      </td>
                      <td className="px-5 py-4 text-slate-600 font-mono text-xs">BEFORE INSERT ON<br/>users</td>
                      <td className="px-5 py-4 text-slate-600">Menggunakan <code>generate_membership_order()</code> untuk men-generate identifier unik keanggotaan saat user baru mendaftar.</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-5 py-4">
                        <span className="font-mono font-medium text-blue-600 block">update_updated_at</span>
                        <span className="text-xs text-slate-400">Trigger: trigger_*_updated_at</span>
                      </td>
                      <td className="px-5 py-4 text-slate-600 font-mono text-xs">BEFORE UPDATE ON<br/>users, videos, images,<br/>transactions, dll</td>
                      <td className="px-5 py-4 text-slate-600">Secara otomatis memperbarui kolom <code>updated_at</code> ke waktu <code>now()</code> setiap kali ada perubahan data (UPDATE) pada row tersebut.</td>
                    </tr>
                 </tbody>
               </table>
            </div>
          </div>
        )}

        {/* Tab Content: Arsitektur Fitur */}
        {activeTab === 'fitur' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <h2 className="text-2xl font-bold mb-6 border-b border-slate-200 pb-3">A. Fitur Role: USER (Member)</h2>
            <p className="text-slate-600 mb-6">Hak akses dan fungsionalitas inti bagi pelanggan (end-user).</p>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="bg-white border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold mb-4">1</div>
                <h3 className="font-bold text-slate-900 mb-2">AI Video & Image Generator</h3>
                <p className="text-sm text-slate-600 leading-relaxed">Pengguna memasukkan prompt untuk generate aset. Sistem mengecek dan memotong saldo <code>users.coins</code>, memanggil API (Luma/OpenRouter), lalu menyimpan data ke tabel <code>videos</code> atau <code>images</code>.</p>
              </div>
              <div className="bg-white border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold mb-4">2</div>
                <h3 className="font-bold text-slate-900 mb-2">Social Connect & Auto Upload</h3>
                <p className="text-sm text-slate-600 leading-relaxed">Menggunakan OAuth untuk menyimpan kredensial ke <code>social_connects</code>. Postingan dijadwalkan masuk ke <code>scheduled_posts</code> dan dieksekusi oleh background worker ke media sosial.</p>
              </div>
              <div className="bg-white border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold mb-4">3</div>
                <h3 className="font-bold text-slate-900 mb-2">Pembelian Koin (Xendit)</h3>
                <p className="text-sm text-slate-600 leading-relaxed">Pembelian dari <code>membership_packages</code> memicu pembuatan invoice Xendit yang tersimpan di <code>transactions</code> dengan status PENDING. Webhook mengubahnya menjadi PAID.</p>
              </div>
              <div className="bg-white border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold mb-4">4</div>
                <h3 className="font-bold text-slate-900 mb-2">Content Analytics</h3>
                <p className="text-sm text-slate-600 leading-relaxed">Agregasi performa konten (Views, Likes) dari media sosial ditarik dan disajikan di dashboard pengguna dari data <code>content_analysis</code>.</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-6 mt-16 border-b border-slate-200 pb-3">B. Fitur Role: ADMIN</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <h3 className="font-bold text-slate-900 mb-2">Manajemen User</h3>
                <p className="text-sm text-slate-600 leading-relaxed">Admin dapat mengelola akses pengguna, melihat sisa koin, dan melakukan *Banned* (mengatur kolom <code>is_banned = true</code>).</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <h3 className="font-bold text-slate-900 mb-2">Manajemen Harga Paket</h3>
                <p className="text-sm text-slate-600 leading-relaxed">Admin mengatur penawaran harga di tabel <code>membership_packages</code> secara dinamis tanpa mengubah kode frontend.</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 md:col-span-2">
                <h3 className="font-bold text-slate-900 mb-2">Monitoring & System Logs</h3>
                <p className="text-sm text-slate-600 leading-relaxed">Akses penuh membaca <code>api_error_logs</code> untuk *debugging* dan <code>ai_usage_logs</code> untuk memantau beban operasional/biaya token LLM secara real-time.</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: API */}
        {activeTab === 'api' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <h2 className="text-2xl font-bold mb-6 border-b border-slate-200 pb-3">Daftar Endpoint API Terdeteksi</h2>
            <p className="text-slate-600 mb-6">Pemetaan rute (<code>/app/api</code>) beserta metodenya.</p>

            <div className="rounded-xl border border-slate-200 overflow-hidden my-6 shadow-sm">
               <table className="w-full text-sm text-left">
                 <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                   <tr>
                     <th className="px-5 py-3.5 font-semibold w-1/3">Endpoint Path</th>
                     <th className="px-5 py-3.5 font-semibold w-24">Method</th>
                     <th className="px-5 py-3.5 font-semibold">Deskripsi Fungsionalitas</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 bg-white">
                    <tr className="bg-slate-50/50"><td colSpan={3} className="px-5 py-2 font-bold text-xs text-slate-500 uppercase tracking-wider">Otentikasi & Profil</td></tr>
                    <tr>
                      <td className="px-5 py-3 font-mono text-slate-800">/api/auth/login</td>
                      <td className="px-5 py-3"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">POST</span></td>
                      <td className="px-5 py-3 text-slate-600">Validasi kredensial & set Session Cookie.</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 font-mono text-slate-800">/api/auth/register</td>
                      <td className="px-5 py-3"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">POST</span></td>
                      <td className="px-5 py-3 text-slate-600">Pendaftaran user baru ke DB.</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 font-mono text-slate-800">/api/users/profile</td>
                      <td className="px-5 py-3">
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold mr-1">GET</span>
                        <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">PUT</span>
                      </td>
                      <td className="px-5 py-3 text-slate-600">Ambil/update profil aktif.</td>
                    </tr>

                    <tr className="bg-slate-50/50"><td colSpan={3} className="px-5 py-2 font-bold text-xs text-slate-500 uppercase tracking-wider">Generator AI</td></tr>
                    <tr>
                      <td className="px-5 py-3 font-mono text-slate-800">/api/video-ai/generate</td>
                      <td className="px-5 py-3"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">POST</span></td>
                      <td className="px-5 py-3 text-slate-600">Generate video AI dari prompt (Potong Koin).</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 font-mono text-slate-800">/api/image-ai/generate</td>
                      <td className="px-5 py-3"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">POST</span></td>
                      <td className="px-5 py-3 text-slate-600">Generate gambar AI dari prompt (Potong Koin).</td>
                    </tr>

                    <tr className="bg-slate-50/50"><td colSpan={3} className="px-5 py-2 font-bold text-xs text-slate-500 uppercase tracking-wider">Top-up & Payment</td></tr>
                    <tr>
                      <td className="px-5 py-3 font-mono text-slate-800">/api/payments/create-invoice</td>
                      <td className="px-5 py-3"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">POST</span></td>
                      <td className="px-5 py-3 text-slate-600">Buat request invoice Xendit.</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 font-mono text-slate-800">/api/payments/webhook</td>
                      <td className="px-5 py-3"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">POST</span></td>
                      <td className="px-5 py-3 text-slate-600">Callback dari Xendit saat lunas.</td>
                    </tr>
                 </tbody>
               </table>
            </div>

            <h2 className="text-2xl font-bold mb-6 mt-12 border-b border-slate-200 pb-3">Format Response Aktual (JSON)</h2>
            <p className="text-slate-600 mb-6">Struktur balikan (response) asli berdasarkan file kode di server.</p>

            <CodeBlock 
              title="1. Registrasi Berhasil (/api/auth/register)"
              code={`{
  "user": {
    "id": "uuid-...",
    "email": "user@example.com",
    "name": "Budi Santoso",
    "role": "User",
    "coins": 0
  },
  "token": "eyJhbGciOiJIUzI1..."
}`}
            />

            <CodeBlock 
              title="2. Request Generate Video AI (/api/video-ai/generate)"
              code={`// HTTP Status: 202 (Accepted)
{
  "video": {
    "id": "uuid-lokal-db",
    "jobId": "id-dari-openrouter",
    "status": "processing"
  }
}`}
            />

            <CodeBlock 
              title="3. Buat Tagihan Pembayaran Xendit (/api/payments/create-invoice)"
              code={`{
  "invoiceUrl": "https://checkout-staging.xendit.co/web/...",
  "orderId": "INV-17188...-ABCDEF"
}`}
            />

            <CodeBlock 
              title="4. Response Jika Terjadi Error (Umum)"
              code={`// HTTP Status: 400 / 401 / 500
{
  "error": "Prompt is required" 
  // atau "Unauthorized", "User already exists", dll
}`}
            />
          </div>
        )}

        {/* Tab Content: SSO */}
        {activeTab === 'sso' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <h2 className="text-2xl font-bold mb-6 border-b border-slate-200 pb-3">Arsitektur Autentikasi</h2>
            <p className="text-slate-600 mb-6">Dashboard menggunakan <strong>Supabase Auth</strong> (email + password) sebagai identity provider.</p>

            <CodeBlock 
              title="Auth Flow"
              code={`Browser ──→ POST /api/auth/login  (email + password)
        │
        ▼
Supabase Auth  (signInWithPassword)
        │
        ▼
Validasi Role dari database public.users
        │
        ▼
Set HttpOnly Cookie JWT (auth token)
        │
        ▼
Redirect → Dashboard`}
            />

            <h2 className="text-2xl font-bold mb-6 mt-12 border-b border-slate-200 pb-3">Cookie Strategy</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Sistem menggunakan <strong>Cookie-based session</strong> yang aman. Token (access_token dan refresh_token) dikelola melalui mekanisme Next.js Middleware yang mengintersepsi rute privat. Jika token invalid/kedaluwarsa, pengguna secara otomatis dikembalikan ke halaman login.
            </p>
          </div>
        )}

      </main>
    </div>
  )
}
