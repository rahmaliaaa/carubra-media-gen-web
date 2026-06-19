import Link from "next/link"

export default function BlockedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12 text-center">
      <div className="max-w-lg rounded-3xl border border-border bg-white p-10 shadow-sm">
        <h1 className="text-4xl font-bold text-foreground">Akun Anda Diblokir</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Mohon maaf, akun Anda saat ini tidak dapat diakses. Silakan daftar ulang dengan email baru untuk menggunakan kembali layanan.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary/90"
          >
            Daftar Ulang
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground hover:bg-slate-50"
          >
            Kembali ke Halaman Login
          </Link>
        </div>
      </div>
    </div>
  )
}
