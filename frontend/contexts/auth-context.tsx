"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"

type User = {
  id: string
  email: string
  name: string
  role?: "User" | "Developer" | "Admin" | "Developer/Admin"
  phone?: string
  avatar?: string
  passwordChangesUsed?: number
  membershipOrder?: string
  totalCreatedVideos?: number
  connectedSocialAccounts?: number
}

type AuthContextType = {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string) => Promise<boolean>
  logout: () => void
  updateUser: (data: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const savedUser = localStorage.getItem("carubra-user")
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Call backend API for authentication
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        localStorage.setItem("carubra-user", JSON.stringify(data.user))
        localStorage.setItem("carubra-token", data.token)
        return true
      }
      
      // Fallback for demo (when backend is not running)
      if (email && password) {
        const newUser: User = {
          id: "1",
          email,
          name: email.split("@")[0],
          role: email.includes("admin") ? "Admin" : "User",
          passwordChangesUsed: 0,
          membershipOrder: "A7B9C2D",
          totalCreatedVideos: 0,
          connectedSocialAccounts: 0,
        }
        setUser(newUser)
        localStorage.setItem("carubra-user", JSON.stringify(newUser))
        return true
      }
      return false
    } catch {
      // Fallback for demo
      if (email && password) {
        const newUser: User = {
          id: "1",
          email,
          name: email.split("@")[0],
          role: email.includes("admin") ? "Admin" : "User",
          passwordChangesUsed: 0,
          membershipOrder: "A7B9C2D",
          totalCreatedVideos: 0,
          connectedSocialAccounts: 0,
        }
        setUser(newUser)
        localStorage.setItem("carubra-user", JSON.stringify(newUser))
        return true
      }
      return false
    }
  }

  const register = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        localStorage.setItem("carubra-user", JSON.stringify(data.user))
        localStorage.setItem("carubra-token", data.token)
        return true
      }

      // Fallback for demo
      if (email && password) {
        const newUser: User = {
          id: "2",
          email,
          name: email.split("@")[0],
          role: "User",
          passwordChangesUsed: 0,
          membershipOrder: "B1C2D3E",
          totalCreatedVideos: 0,
          connectedSocialAccounts: 0,
        }
        setUser(newUser)
        localStorage.setItem("carubra-user", JSON.stringify(newUser))
        return true
      }

      return false
    } catch {
      if (email && password) {
        const newUser: User = {
          id: "2",
          email,
          name: email.split("@")[0],
          role: "User",
          passwordChangesUsed: 0,
          membershipOrder: "B1C2D3E",
          totalCreatedVideos: 0,
          connectedSocialAccounts: 0,
        }
        setUser(newUser)
        localStorage.setItem("carubra-user", JSON.stringify(newUser))
        return true
      }
      return false
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("carubra-user")
    localStorage.removeItem("carubra-token")
    router.push("/")
  }

  const updateUser = (data: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...data }
      setUser(updatedUser)
      localStorage.setItem("carubra-user", JSON.stringify(updatedUser))
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
