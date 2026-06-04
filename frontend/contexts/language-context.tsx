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
  t: (key: string) => string
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

  const t = (key: string): string => {
    const translation = translations[key]
    if (!translation) return key
    return translation[language]
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
