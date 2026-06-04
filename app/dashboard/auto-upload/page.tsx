"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Instagram, Youtube, Facebook, Trash2 } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

type Schedule = {
  id: string
  platform: string
  content: string
  date: string
  time: string
  status: "scheduled" | "published" | "draft"
}

const initialSchedules: Schedule[] = [
  { 
    id: "1", 
    platform: "instagram", 
    content: "Tips marketing konten AI untuk bisnis kecil", 
    date: "2026-05-25", 
    time: "09:00",
    status: "scheduled"
  },
  { 
    id: "2", 
    platform: "youtube", 
    content: "Tutorial membuat video AI dalam 5 menit", 
    date: "2026-05-26", 
    time: "14:00",
    status: "scheduled"
  },
  { 
    id: "3", 
    platform: "facebook", 
    content: "Promo diskon 50% untuk member baru", 
    date: "2026-05-24", 
    time: "10:00",
    status: "published"
  },
]

const platformIcons: Record<string, typeof Instagram> = {
  instagram: Instagram,
  youtube: Youtube,
  facebook: Facebook,
}

export default function AutoUploadPage() {
  const { t } = useLanguage()
  const [schedules, setSchedules] = useState<Schedule[]>(initialSchedules)
  const [platform, setPlatform] = useState("instagram")
  const [content, setContent] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [autoRepeat, setAutoRepeat] = useState(false)

  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || !date || !time) return

    const newSchedule: Schedule = {
      id: Date.now().toString(),
      platform,
      content,
      date,
      time,
      status: "scheduled"
    }

    setSchedules([newSchedule, ...schedules])
    setContent("")
    setDate("")
    setTime("")
  }

  const handleDelete = (id: string) => {
    setSchedules(schedules.filter(s => s.id !== id))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">{t("autoUpload.title")}</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("autoUpload.schedule")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddSchedule} className="space-y-4">
              <div className="space-y-2">
                <Label>{t("autoUpload.platform")}</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="twitter">Twitter/X</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("autoUpload.content")}</Label>
                <Textarea
                  placeholder="Tulis konten yang akan diupload..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Tanggal
                  </Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Waktu
                  </Label>
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <Label htmlFor="auto-repeat">Ulangi setiap minggu</Label>
                <Switch
                  id="auto-repeat"
                  checked={autoRepeat}
                  onCheckedChange={setAutoRepeat}
                />
              </div>

              <Button type="submit" className="w-full">
                {t("autoUpload.save")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Jadwal Upload</CardTitle>
          </CardHeader>
          <CardContent>
            {schedules.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Belum ada jadwal upload</p>
              </div>
            ) : (
              <div className="space-y-3">
                {schedules.map((schedule) => {
                  const PlatformIcon = platformIcons[schedule.platform] || Instagram
                  return (
                    <div 
                      key={schedule.id}
                      className="flex items-start justify-between p-4 rounded-lg bg-muted/50 border border-border"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <PlatformIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground line-clamp-2">
                            {schedule.content}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-muted-foreground">
                              {schedule.date} | {schedule.time}
                            </span>
                            <Badge 
                              variant={schedule.status === "published" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {schedule.status === "published" ? "Dipublikasi" : "Terjadwal"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDelete(schedule.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
