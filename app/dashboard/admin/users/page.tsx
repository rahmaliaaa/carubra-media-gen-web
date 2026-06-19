"use client"

import { useEffect, useState } from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"

type AdminUser = {
  id: string
  email: string
  name: string
  role: string
  coins?: number
  is_banned?: boolean
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api"

function getApiUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  if (path.startsWith("/api")) return path
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("carubra-token") : null
  const res = await fetch(getApiUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })

  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((payload as any).error ?? `HTTP ${res.status}`)
  }
  return payload as T
}

export default function AdminUsersPage() {
  const { user, isLoading } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading) {
      loadUsers()
    }
  }, [isLoading])

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<{ users: AdminUser[] }>('/api/admin/users')
      setUsers(data.users)
    } catch (err: any) {
      setError(err.message ?? 'Tidak dapat memuat pengguna')
    } finally {
      setLoading(false)
    }
  }

  const patchUser = async (userId: string, body: Record<string, any>) => {
    setError(null)
    try {
      await apiFetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      await loadUsers()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleRoleChange = async (target: AdminUser) => {
    const nextRole = window.prompt('Masukkan role baru (User / Admin / Developer):', target.role)
    if (!nextRole) return
    await patchUser(target.id, { role: nextRole })
  }

  const handleCoinsChange = async (target: AdminUser) => {
    const newAmount = window.prompt('Masukkan jumlah koin baru:', String(target.coins ?? 0))
    if (newAmount === null) return
    const coins = Number(newAmount)
    if (Number.isNaN(coins)) {
      setError('Nilai koin tidak valid')
      return
    }
    await patchUser(target.id, { coins })
  }

  const handleBanToggle = async (target: AdminUser) => {
    const nextState = !(target.is_banned ?? false)
    const confirmText = nextState ? 'blokir' : 'batalkan blokir'
    if (!window.confirm(`Apakah Anda yakin ingin ${confirmText} ${target.email}?`)) return
    await patchUser(target.id, { is_banned: nextState })
  }

  const handleResetPassword = async (target: AdminUser) => {
    const newPassword = window.prompt(`Masukkan kata sandi baru untuk ${target.email}:`)
    if (!newPassword) return
    await patchUser(target.id, { password: newPassword })
    window.alert('Kata sandi berhasil diatur ulang.')
  }

  const filteredUsers = users.filter((item) => {
    const normalized = query.trim().toLowerCase()
    return (
      !normalized ||
      item.email.toLowerCase().includes(normalized) ||
      item.name.toLowerCase().includes(normalized) ||
      item.role.toLowerCase().includes(normalized)
    )
  })

  if (isLoading || !user) {
    return <div className="min-h-[60vh] flex items-center justify-center text-base text-muted-foreground">Memuat pengguna...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Admin Console</p>
        <h1 className="text-3xl font-bold">Manajemen User</h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">Lihat semua pengguna, role, dan status blokir secara terpusat.</p>
      </div>

      {error && (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card className="border border-border bg-background">
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 rounded-3xl border border-border bg-slate-50 px-4 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Cari email, nama, role..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <Button onClick={loadUsers} disabled={loading}>
              {loading ? 'Memuat...' : 'Muat Ulang'}
            </Button>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Koin</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      {loading ? 'Memuat...' : 'Tidak ada pengguna yang cocok.'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((item) => (
                    <tr key={item.id} className="border-t border-border hover:bg-slate-50/80">
                      <td className="px-4 py-4 font-medium">{item.email}</td>
                      <td className="px-4 py-4">{item.name}</td>
                      <td className="px-4 py-4">{item.role}</td>
                      <td className="px-4 py-4">
                        <Badge variant={(item.is_banned ?? false) ? 'destructive' : 'outline'}>
                          {(item.is_banned ?? false) ? 'Diblokir' : 'Aktif'}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">{item.coins ?? 0}</td>
                      <td className="px-4 py-4 space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleRoleChange(item)} disabled>
                          Role
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => handleCoinsChange(item)}>
                          Koin
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleBanToggle(item)}>
                          {(item.is_banned ?? false) ? 'Unban' : 'Ban'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleResetPassword(item)}>
                          Reset PW
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
