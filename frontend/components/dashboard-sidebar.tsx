"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { 
  User, 
  Users, 
  Video, 
  Image, 
  Upload, 
  BarChart2,
  LogOut, 
  Moon, 
  Sun, 
  Languages,
  Menu,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { useLanguage } from "@/contexts/language-context"
import { CarubraLogo } from "@/components/carubra-brand"

const navItems = [
  { href: "/dashboard/profile", icon: User, labelKey: "nav.profile" },
  { href: "/dashboard/member", icon: Users, labelKey: "nav.member" },
  { href: "/dashboard/video-ai", icon: Video, labelKey: "nav.videoAi" },
  { href: "/dashboard/image-ai", icon: Image, labelKey: "nav.imageAi" },
  { href: "/dashboard/content-analytics", icon: BarChart2, labelKey: "Content Analytics" },
  { href: "/dashboard/auto-upload", icon: Upload, labelKey: "nav.autoUpload" },
]


export function DashboardSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { language, setLanguage, t } = useLanguage()
  const { logout, user } = useAuth()

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const toggleLanguage = () => {
    setLanguage(language === "id" ? "en" : "id")
  }

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-sidebar-border">
            <Link href="/dashboard" onClick={() => setIsOpen(false)}>
              <CarubraLogo className="text-2xl" />
            </Link>
            {user && (
              <p className="text-sm text-muted-foreground mt-2 truncate">
                {user.email}
              </p>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                    isActive 
                      ? "bg-sidebar-accent text-sidebar-primary" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{t(item.labelKey)}</span>
                </Link>
              )
            })}
          </nav>

          {/* Settings */}
          <div className="p-4 border-t border-sidebar-border space-y-4">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-3">
                {theme === "dark" ? (
                  <Moon className="h-5 w-5 text-sidebar-foreground" />
                ) : (
                  <Sun className="h-5 w-5 text-sidebar-foreground" />
                )}
                <span className="text-sm text-sidebar-foreground">
                  {theme === "dark" ? t("common.darkMode") : t("common.lightMode")}
                </span>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={toggleTheme}
              />
            </div>

            {/* Language Toggle */}
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-3">
                <Languages className="h-5 w-5 text-sidebar-foreground" />
                <span className="text-sm text-sidebar-foreground">
                  {language === "id" ? "Indonesia" : "English"}
                </span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={toggleLanguage}
                className="text-xs"
              >
                {language === "id" ? "EN" : "ID"}
              </Button>
            </div>

            {/* Logout */}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 px-4 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={logout}
            >
              <LogOut className="h-5 w-5" />
              <span>{t("nav.logout")}</span>
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
