"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Video, Sparkles } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

export default function VideoAIPage() {
  const { t } = useLanguage()
  const [prompt, setPrompt] = useState("")
  const [style, setStyle] = useState("cinematic")
  const [duration, setDuration] = useState("15")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedVideos, setGeneratedVideos] = useState<string[]>([])

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    
    setIsGenerating(true)
    
    // Simulate video generation
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    setGeneratedVideos([...generatedVideos, prompt])
    setPrompt("")
    setIsGenerating(false)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">{t("videoAi.title")}</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t("videoAi.prompt")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt">{t("videoAi.prompt")}</Label>
              <Textarea
                id="prompt"
                placeholder={t("videoAi.promptPlaceholder")}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Style</Label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cinematic">Cinematic</SelectItem>
                    <SelectItem value="anime">Anime</SelectItem>
                    <SelectItem value="realistic">Realistic</SelectItem>
                    <SelectItem value="cartoon">Cartoon</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Durasi</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 detik</SelectItem>
                    <SelectItem value="10">10 detik</SelectItem>
                    <SelectItem value="15">15 detik</SelectItem>
                    <SelectItem value="30">30 detik</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || !prompt.trim()}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("videoAi.generating")}
                </>
              ) : (
                <>
                  <Video className="h-4 w-4 mr-2" />
                  {t("videoAi.generate")}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Riwayat Video</CardTitle>
          </CardHeader>
          <CardContent>
            {generatedVideos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Belum ada video yang dibuat</p>
              </div>
            ) : (
              <div className="space-y-3">
                {generatedVideos.map((video, index) => (
                  <div 
                    key={index}
                    className="p-4 rounded-lg bg-muted/50 border border-border"
                  >
                    <p className="text-sm font-medium text-foreground line-clamp-2">
                      {video}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Style: {style} | Durasi: {duration}s
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
