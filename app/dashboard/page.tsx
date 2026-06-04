"use client"

import { useLanguage } from "@/contexts/language-context"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Video, Image, Upload, Users } from "lucide-react"

export default function DashboardPage() {
  const { t } = useLanguage()
  const { user } = useAuth()

  const stats = [
    { 
      title: t("nav.videoAi"), 
      value: "12", 
      description: "Video dibuat bulan ini",
      icon: Video 
    },
    { 
      title: t("nav.imageAi"), 
      value: "48", 
      description: "Gambar dibuat bulan ini",
      icon: Image 
    },
    { 
      title: t("nav.autoUpload"), 
      value: "24", 
      description: "Konten dijadwalkan",
      icon: Upload 
    },
    { 
      title: t("nav.member"), 
      value: "5", 
      description: "Member aktif",
      icon: Users 
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t("auth.welcome")}, {user?.name}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Dashboard Carubra - Agent Marketing
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
