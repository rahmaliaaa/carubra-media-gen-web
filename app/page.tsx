"use client"

import { CarubraLogo, CarubraFooter } from "@/components/carubra-brand"
import { LoginForm } from "@/components/login-form"
import { Badge } from "@/components/ui/badge"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center mb-8">
          <CarubraLogo className="text-4xl md:text-5xl" />
          <p className="text-muted-foreground mt-2">
            Platform AI Pemasaran Konten Terpadu
          </p>
          <Badge variant="outline" className="mt-3 border-primary text-primary">
            Agent Marketing
          </Badge>
        </div>
        
        <LoginForm />
      </main>
      
      <CarubraFooter />
    </div>
  )
}
