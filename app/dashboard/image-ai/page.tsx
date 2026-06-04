"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Image as ImageIcon, Sparkles, Download } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

type GeneratedImage = {
  id: string
  prompt: string
  style: string
  size: string
}

export default function ImageAIPage() {
  const { t } = useLanguage()
  const [prompt, setPrompt] = useState("")
  const [style, setStyle] = useState("realistic")
  const [size, setSize] = useState("1024x1024")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    
    setIsGenerating(true)
    
    // Simulate image generation
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const newImage: GeneratedImage = {
      id: Date.now().toString(),
      prompt,
      style,
      size
    }
    
    setGeneratedImages([newImage, ...generatedImages])
    setPrompt("")
    setIsGenerating(false)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">{t("imageAi.title")}</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t("imageAi.prompt")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt">{t("imageAi.prompt")}</Label>
              <Textarea
                id="prompt"
                placeholder={t("imageAi.promptPlaceholder")}
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
                    <SelectItem value="realistic">Realistic</SelectItem>
                    <SelectItem value="anime">Anime</SelectItem>
                    <SelectItem value="watercolor">Watercolor</SelectItem>
                    <SelectItem value="oil-painting">Oil Painting</SelectItem>
                    <SelectItem value="digital-art">Digital Art</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ukuran</Label>
                <Select value={size} onValueChange={setSize}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="512x512">512 x 512</SelectItem>
                    <SelectItem value="1024x1024">1024 x 1024</SelectItem>
                    <SelectItem value="1024x1792">1024 x 1792 (Portrait)</SelectItem>
                    <SelectItem value="1792x1024">1792 x 1024 (Landscape)</SelectItem>
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
                  {t("imageAi.generating")}
                </>
              ) : (
                <>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  {t("imageAi.generate")}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Riwayat Gambar</CardTitle>
          </CardHeader>
          <CardContent>
            {generatedImages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Belum ada gambar yang dibuat</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {generatedImages.map((image) => (
                  <div 
                    key={image.id}
                    className="relative group rounded-lg overflow-hidden bg-muted aspect-square"
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                      <p className="text-white text-xs line-clamp-2">{image.prompt}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-white/70 text-xs">{image.style}</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:text-white">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
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
