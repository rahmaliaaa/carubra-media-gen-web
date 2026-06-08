"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/auth-context"
import { useLanguage } from "@/contexts/language-context"

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const { t } = useLanguage()
  const [name, setName] = useState(user?.name || "")
  const [phone, setPhone] = useState(user?.phone || "")
  const [isSaving, setIsSaving] = useState(false)

  const roleDisplay = user?.role || "User"
  const passwordChangesUsed = user?.passwordChangesUsed ?? 0
  const passwordChangeLimit = 5
  const membershipOrder = user?.membershipOrder || "A7B9C2D"
  const totalCreatedVideos = user?.totalCreatedVideos ?? 0
  const connectedSocialAccounts = user?.connectedSocialAccounts ?? 0

  const [totalVideos, setTotalVideos] = useState<number | null>(null)
  const [totalSocials, setTotalSocials] = useState<number | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("carubra-token")
    if (!token) return

    fetch("/api/video-ai", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data && Array.isArray(data.videos)) {
          setTotalVideos(data.videos.length)
        }
      })
      .catch(() => {})

    fetch("/api/social-connect", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data && Array.isArray(data.accounts)) {
          setTotalSocials(data.accounts.length)
        }
      })
      .catch(() => {})
  }, [])

  const displayVideos = totalVideos !== null ? totalVideos : totalCreatedVideos
  const displaySocials = totalSocials !== null ? totalSocials : connectedSocialAccounts

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const token = localStorage.getItem("carubra-token")
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, phone }),
      })

      const data = await res.json()
      if (res.ok) {
        updateUser(data.user) // update context dengan data dari DB
      }
    } catch (err) {
      console.error("Gagal update profil:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const initials = name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold text-foreground">{t("profile.title")}</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {initials || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">{name || "User"}</CardTitle>
              <p className="text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">{t("auth.email")}</p>
              <p className="mt-1 font-medium">{user?.email || "-"}</p>
            </div>
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">{t("profile.username")}</p>
              <p className="mt-1 font-medium">{user?.name || "User"}</p>
            </div>
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">{t("profile.role")}</p>
              <p className="mt-1 font-medium">{roleDisplay}</p>
            </div>
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">{t("profile.membershipOrder")}</p>
              <p className="mt-1 font-medium">{membershipOrder}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 mt-4">
            <div className="rounded-2xl border bg-slate-500/5 dark:bg-slate-400/5 p-6 flex flex-col items-center justify-center text-center shadow-md transition-all duration-300 hover:border-indigo-500/40 hover:shadow-sm hover:scale-[1.01]">
              <p className="text-5xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight mb-1">
                {displayVideos}
              </p>
              <p className="text-[11px] font-bold text-muted-foreground/80 tracking-widest uppercase">
                VIDEO DIBUAT
              </p>
            </div>
            <div className="rounded-2xl border bg-slate-500/5 dark:bg-slate-400/5 p-6 flex flex-col items-center justify-center text-center shadow-md transition-all duration-300 hover:border-indigo-500/40 hover:shadow-sm hover:scale-[1.01]">
              <p className="text-5xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight mb-1">
                {displaySocials}
              </p>
              <p className="text-[11px] font-bold text-muted-foreground/80 tracking-widest uppercase">
                PLATFORM TERHUBUNG
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/50 p-4 mt-4">
            <p className="text-sm text-muted-foreground">{t("profile.passwordInfo")}</p>
            <p className="mt-1 font-medium">{passwordChangesUsed}/{passwordChangeLimit}</p>
            <p className="text-sm text-muted-foreground mt-1">Perubahan password dapat dilakukan hingga {passwordChangeLimit} kali.</p>
            <Button type="button" variant="secondary" className="mt-3">
              {t("profile.changePassword")}
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">{t("profile.name")}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama lengkap"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t("profile.phone")}</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+62 812-3456-7890"
              />
            </div>

            <Button type="submit" disabled={isSaving}>
              {isSaving ? t("common.loading") : t("profile.save")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
