"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

type Language = "id" | "en"

type Translations = {
  [key: string]: {
    id: string
    en: string
  }
}

const translations: Translations = {
  // Auth
  "auth.welcome": { id: "Selamat Datang Kembali", en: "Welcome Back" },
  "auth.subtitle": { id: "Masuk ke akun Carubra Anda", en: "Sign in to your Carubra account" },
  "auth.email": { id: "Email", en: "Email" },
  "auth.password": { id: "Kata Sandi", en: "Password" },
  "auth.login": { id: "Masuk", en: "Sign In" },
  "auth.noAccount": { id: "Belum punya akun?", en: "Don't have an account?" },
  "auth.register": { id: "Daftar", en: "Register" },
  "auth.registerSubtitle": { id: "Buat akun baru untuk mulai menggunakan Carubra.", en: "Create a new account to start using Carubra." },
  "auth.confirmPassword": { id: "Konfirmasi Kata Sandi", en: "Confirm Password" },
  "auth.passwordMismatch": { id: "Kata sandi tidak cocok.", en: "Passwords do not match." },
  "auth.registerError": { id: "Gagal mendaftar. Silakan coba lagi.", en: "Registration failed. Please try again." },
  "auth.alreadyHaveAccount": { id: "Sudah punya akun?", en: "Already have an account?" },
  
  // Navigation
  "nav.profile": { id: "Profil", en: "Profile" },
  "nav.member": { id: "Membership", en: "Membership" },
  "nav.videoAi": { id: "Video AI", en: "Video AI" },
  "nav.imageAi": { id: "Image AI", en: "Image AI" },
  "nav.autoUpload": { id: "Upload Otomatis", en: "Auto Upload" },
  "nav.logout": { id: "Keluar", en: "Logout" },
  
  // Profile
  "profile.title": { id: "Profil Pengguna", en: "User Profile" },
  "profile.name": { id: "Nama Lengkap", en: "Full Name" },
  "profile.phone": { id: "Nomor Telepon", en: "Phone Number" },
  "profile.save": { id: "Simpan Perubahan", en: "Save Changes" },
  "profile.username": { id: "Username", en: "Username" },
  "profile.role": { id: "Role", en: "Role" },
  "profile.membershipOrder": { id: "Nomor Pesanan Membership", en: "Membership Order Number" },
  "profile.totalVideos": { id: "Total Video Dibuat", en: "Total Videos Created" },
  "profile.connectedSocialAccounts": { id: "Total Sosial Media Terhubung", en: "Total Connected Social Accounts" },
  "profile.passwordInfo": { id: "Informasi Ganti Password", en: "Password Change Info" },
  "profile.changePassword": { id: "Ubah Kata Sandi", en: "Change Password" },
  "profile.cancelChangePassword": { id: "Batal", en: "Cancel" },
  "profile.submitPasswordChange": { id: "Simpan Password", en: "Save Password" },
  "profile.currentPassword": { id: "Kata Sandi Saat Ini", en: "Current Password" },
  "profile.currentPasswordPlaceholder": { id: "Masukkan kata sandi saat ini", en: "Enter current password" },
  "profile.newPassword": { id: "Kata Sandi Baru", en: "New Password" },
  "profile.newPasswordPlaceholder": { id: "Masukkan kata sandi baru", en: "Enter new password" },
  "profile.confirmNewPassword": { id: "Konfirmasi Kata Sandi Baru", en: "Confirm New Password" },
  "profile.confirmNewPasswordPlaceholder": { id: "Konfirmasi kata sandi baru", en: "Confirm your new password" },
  "profile.fillAllPasswordFields": { id: "Silakan isi semua kolom password.", en: "Please fill all password fields." },
  "profile.passwordChangeFailed": { id: "Gagal mengubah password. Coba lagi.", en: "Failed to change password. Please try again." },
  "profile.passwordChangedSuccess": { id: "Password berhasil diubah.", en: "Password updated successfully." },
  "profile.passwordLimitInfo": { id: "Perubahan password dapat dilakukan hingga {count} kali.", en: "You may change your password up to {count} times." },
  
  // Member
  "member.title": { id: "Membership", en: "Membership" },
  "member.subtitle": { id: "Pilih paket koin membership yang paling sesuai dengan kebutuhan konten Anda.", en: "Choose the membership coin package that best fits your content needs." },
  "member.packagePrice": { id: "Harga Paket", en: "Package Price" },
  "member.buy": { id: "Beli", en: "Buy" },
  "member.recentTransactions": { id: "Daftar Transaksi Terakhir", en: "Recent Transactions" },
  "member.transactionDescription": { id: "Lihat status pembayaran dan invoice pembelian membership Anda.", en: "View your membership payment status and purchase invoices." },
  "member.invoice": { id: "Invoice", en: "Invoice" },
  "member.date": { id: "Tanggal", en: "Date" },
  "member.package": { id: "Paket", en: "Package" },
  "member.price": { id: "Harga", en: "Price" },
  "member.paymentProof": { id: "Bukti Pembayaran", en: "Payment Proof" },
  "member.viewProof": { id: "Lihat Bukti", en: "View Proof" },
  "member.selectedPackage": { id: "Paket Terpilih:", en: "Selected Package:" },
  "member.status.completed": { id: "Selesai", en: "Completed" },
  "member.status.pending": { id: "Pending", en: "Pending" },
  "member.status.failed": { id: "Gagal", en: "Failed" },
  "member.balanceTitle": { id: "Saldo Token", en: "Token Balance" },
  "member.balanceDescription": { id: "Gunakan token untuk upload otomatis, analisis konten, dan promosi.", en: "Use tokens for auto uploads, content analysis, and promotion." },
  "member.statusLabel": { id: "Status", en: "Status" },
  "member.lastTopup": { id: "Last top-up", en: "Last top-up" },
  "member.topUpNow": { id: "Top Up Sekarang", en: "Top Up Now" },
  "member.viewHistory": { id: "Lihat Riwayat", en: "View History" },
  "member.loadingPackages": { id: "Memuat paket…", en: "Loading packages…" },
  "member.noPackages": { id: "Belum ada paket tersedia.", en: "No packages available." },
  "member.processing": { id: "Memproses…", en: "Processing…" },
  "member.loadingTransactions": { id: "Memuat riwayat transaksi…", en: "Loading transaction history…" },
  "member.noTransactions": { id: "Belum ada transaksi.", en: "No transactions yet." },
  "member.emptyTransactionsDescription": { id: "Riwayat transaksi akan muncul setelah Anda melakukan pembayaran.", en: "Transaction history will appear after you complete a payment." },
  "member.invoiceExpired": { id: "Invoice kedaluwarsa.", en: "Invoice expired." },
  "member.payNow": { id: "Bayar Sekarang", en: "Pay Now" },
  "member.packageLabel": { id: "Paket", en: "Package" },
  "member.tokenLabel": { id: "Token", en: "Tokens" },
  "member.priceLabel": { id: "Harga", en: "Price" },
  "member.token": { id: "Token", en: "Tokens" },
  "member.later": { id: "Nanti saja", en: "Later" },
  "member.securePayment": { id: "Pembayaran Aman", en: "Secure Payment" },  
  "member.invoiceWillExpireIn": { id: "Invoice ini akan kedaluwarsa dalam {countdown}", en: "This invoice will expire in {countdown}" },  
  "member.minutes": { id: "mnt", en: "min" },
  "member.seconds": { id: "dtk", en: "sec" },
  "member.copy": { id: "Salin", en: "Copy" },
  "member.paymentMethods": { id: "Metode Pembayaran", en: "Payment Methods" },
  "member.noTokens": { id: "Tidak ada token", en: "No tokens" },
  "member.viewPackages": { id: "Lihat Paket", en: "View Packages" },
  "member.topUp": { id: "Top Up", en: "Top Up" },
  "member.topUpMembership": { id: "Top Up Membership", en: "Top Up Membership" }, 
  "member.success": { id: "Berhasil", en: "Success" },
  "member.failed": { id: "Gagal", en: "Failed" },
  "member.refunded": { id: "Dikembalikan", en: "Refunded" },
  "member.balance": { id: "Saldo Token", en: "Token Balance" },
  "member.totalTransactions": { id: "Total Transaksi", en: "Total Transactions" },
  "member.packagePurchased": { id: "Paket Berhasil Dibeli", en: "Package Purchased" },
  "member.membershipPackage": { id: "Paket Membership", en: "Membership Package" },
  "member.paymentDate": { id: "Tanggal Pembayaran", en: "Payment Date" },
  "member.invoiceId": { id: "Invoice ID", en: "Invoice ID" },
  "member.amount": { id: "Jumlah", en: "Amount" },  
  "member.paymentMethod": { id: "Metode Pembayaran", en: "Payment Method" },  
  "member.status": { id: "Status", en: "Status" },
  "member.transactionHistory": { id: "Riwayat Transaksi", en: "Transaction History" },
  "member.paidAt": { id: "Dibayar", en: "Paid At" },
  "member.transactionCount": { id: "Menampilkan {count} transaksi", en: "Showing {count} transactions" },
  
  // Admin
  "admin.invoiceTransactionsTitle": { id: "Invoice & Transaksi", en: "Invoices & Transactions" },
  "admin.invoiceTransactionsDescription": { id: "Kelola dan pantau seluruh transaksi pembelian token.", en: "Manage and monitor all token purchase transactions." },
  "admin.exportCsv": { id: "⬇ Export CSV", en: "⬇ Export CSV" },
  "admin.exporting": { id: "Mengekspor…", en: "Exporting…" },
  "admin.search": { id: "Cari", en: "Search" },
  "admin.searchPlaceholder": { id: "Invoice ID / User ID / Paket", en: "Invoice ID / User ID / Package" },
  "admin.status": { id: "Status", en: "Status" },
  "admin.statusAll": { id: "Semua", en: "All" },
  "admin.statusSuccess": { id: "Berhasil", en: "Success" },
  "admin.statusPending": { id: "Menunggu", en: "Pending" },
  "admin.statusFailed": { id: "Gagal", en: "Failed" },
  "admin.statusExpired": { id: "Kedaluwarsa", en: "Expired" },
  "admin.refunded": { id: "Dikembalikan", en: "Refunded" },
  "admin.dateFrom": { id: "Dari", en: "From" },
  "admin.dateTo": { id: "Sampai", en: "To" },
  "admin.reset": { id: "Reset", en: "Reset" },
  "admin.revenue": { id: "Pendapatan", en: "Revenue" },
  "admin.successful": { id: "berhasil", en: "successful" },
  "admin.displayed": { id: "Ditampilkan", en: "Displayed" },
  "admin.ofTotal": { id: "dari {count} total", en: "of {count} total" },
  "admin.waiting": { id: "Menunggu", en: "Waiting" },
  "admin.failed": { id: "Gagal", en: "Failed" },
  "admin.exportInvoiceId": { id: "Invoice ID", en: "Invoice ID" },
  "admin.exportUserId": { id: "User ID", en: "User ID" },
  "admin.exportPackage": { id: "Paket", en: "Package" },
  "admin.exportToken": { id: "Token", en: "Token" },
  "admin.exportAmount": { id: "Amount (IDR)", en: "Amount (IDR)" },
  "admin.exportMethod": { id: "Metode", en: "Method" },
  "admin.exportStatus": { id: "Status", en: "Status" },
  "admin.exportCreatedAt": { id: "Tanggal Buat", en: "Created At" },
  "admin.exportPaidAt": { id: "Tanggal Bayar", en: "Paid At" },
  "admin.tokensSold": { id: "Token Terjual", en: "Tokens Sold" },
  "admin.transactionsPending": { id: "transaksi pending", en: "pending transactions" },
  "admin.failedExpired": { id: "Gagal / Expired", en: "Failed / Expired" },
  "admin.expired": { id: "Kedaluwarsa", en: "Expired" },
  "admin.applyFilters": { id: "Terapkan Filter", en: "Apply Filters" },
  
  // Video AI
  "videoAi.title": { id: "Generator Video AI", en: "AI Video Generator" },
  "videoAi.script": { id: "Script", en: "Script" },
  "videoAi.scriptPlaceholder": { id: "Masukkan script video Anda...", en: "Enter your video script..." },
  "videoAi.resolution": { id: "Resolusi", en: "Resolution" },
  "videoAi.resolution480p": { id: "480p (Standar)", en: "480p (Standard)" },
  "videoAi.resolution720p": { id: "720p (HD)", en: "720p (HD)" },
  "videoAi.ratio": { id: "Rasio Video", en: "Video Ratio" },
  "videoAi.ratio2-3": { id: "2:3 (Potrait)", en: "2:3 (Portrait)" },
  "videoAi.ratio3-2": { id: "3:2 (Landscape)", en: "3:2 (Landscape)" },
  "videoAi.ratio1-1": { id: "1:1 (Square)", en: "1:1 (Square)" },
  "videoAi.ratio16-9": { id: "16:9 (Widescreen)", en: "16:9 (Widescreen)" },
  "videoAi.ratio9-16": { id: "9:16 (Vertical)", en: "9:16 (Vertical)" },
  "videoAi.model": { id: "Model", en: "Model" },
  "videoAi.textToVideo": { id: "Text to Video", en: "Text to Video" },
  "videoAi.imageToVideo": { id: "Image to Video", en: "Image to Video" },
  "videoAi.duration": { id: "Durasi Video", en: "Video Duration" },
  "videoAi.durationMax": { id: "Maksimal 1 menit (60 detik)", en: "Maximum 1 minute (60 seconds)" },
  "videoAi.coin": { id: "Biaya Koin", en: "Coin Cost" },
  "videoAi.coin480p": { id: "2 koin (480p)", en: "2 coins (480p)" },
  "videoAi.coin720p": { id: "3 koin (720p HD)", en: "3 coins (720p HD)" },
  "videoAi.coinBalance": { id: "Saldo Koin Tersisa", en: "Remaining Coin Balance" },
  "videoAi.generate": { id: "Generate Video", en: "Generate Video" },
  "videoAi.generating": { id: "Sedang membuat video...", en: "Generating video..." },
  "videoAi.selectOptions": { id: "Harap pilih dan isi semua opsi sebelum generate", en: "Please select and fill all options before generating" },
  "videoAi.caption": { id: "Caption", en: "Caption" },
  "videoAi.shareToSocial": { id: "Bagikan ke Sosial Media", en: "Share to Social Media" },
  "videoAi.history": { id: "Riwayat Generate Video", en: "Video Generation History" },
  "videoAi.gallery": { id: "Galeri Video", en: "Video Gallery" },
  "videoAi.detail": { id: "Detail", en: "Detail" },
  "videoAi.edit": { id: "Edit", en: "Edit" },
  "videoAi.send": { id: "Kirim", en: "Send" },
  "videoAi.delete": { id: "Hapus", en: "Delete" },
  "videoAi.completed": { id: "Selesai", en: "Completed" },
  "videoAi.failed": { id: "Gagal", en: "Failed" },
  "videoAi.completedIn": { id: "Selesai dalam", en: "Completed in" },
  "videoAi.noVideosGenerated": { id: "Belum ada video yang dibuat", en: "No videos generated yet" },
  
  // Image AI
  "imageAi.title": { id: "Generator Gambar AI", en: "AI Image Generator" },
  "imageAi.prompt": { id: "Deskripsi Gambar", en: "Image Description" },
  "imageAi.promptPlaceholder": { id: "Jelaskan gambar yang ingin Anda buat...", en: "Describe the image you want to create..." },
  "imageAi.generate": { id: "Generate Gambar", en: "Generate Image" },
  "imageAi.generating": { id: "Sedang membuat gambar...", en: "Generating image..." },
  
  // Auto Upload
  "autoUpload.title": { id: "Upload Otomatis", en: "Auto Upload" },
  "autoUpload.schedule": { id: "Jadwal Upload", en: "Upload Schedule" },
  "autoUpload.platform": { id: "Platform", en: "Platform" },
  "autoUpload.content": { id: "Konten", en: "Content" },
  "autoUpload.save": { id: "Simpan Jadwal", en: "Save Schedule" },
  
  // Common
  "common.search": { id: "Cari...", en: "Search..." },
  "common.settings": { id: "Pengaturan", en: "Settings" },
  "common.darkMode": { id: "Mode Gelap", en: "Dark Mode" },
  "common.lightMode": { id: "Mode Terang", en: "Light Mode" },
  "common.language": { id: "Bahasa", en: "Language" },
  "common.loading": { id: "Memuat...", en: "Loading..." },
  "common.success": { id: "Berhasil!", en: "Success!" },
  "common.error": { id: "Terjadi kesalahan", en: "An error occurred" },
  
  // Footer
  "footer.tagline": { id: "Platform AI Pemasaran Konten Terpadu", en: "Integrated AI Content Marketing Platform" },
  "footer.rights": { id: "Hak cipta dilindungi.", en: "All rights reserved." },
}

type LanguageContextType = {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("id")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedLang = localStorage.getItem("carubra-language") as Language
    if (savedLang && (savedLang === "id" || savedLang === "en")) {
      setLanguage(savedLang)
    }
  }, [])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("carubra-language", language)
    }
  }, [language, mounted])

  const t = (key: string, params?: Record<string, string | number>): string => {
    const translation = translations[key]
    if (!translation) return key
    let text = translation[language]
    if (params) {
      text = text.replace(/\{(\w+)\}/g, (_, paramName) => String(params[paramName] ?? ""))
    }
    return text
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
