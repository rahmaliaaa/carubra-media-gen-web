"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Search, MoreVertical } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

type Member = {
  id: string
  name: string
  email: string
  status: "active" | "inactive"
  role: string
}

const initialMembers: Member[] = [
  { id: "1", name: "Ahmad Rizki", email: "ahmad@carubra.id", status: "active", role: "Admin" },
  { id: "2", name: "Siti Nurhaliza", email: "siti@carubra.id", status: "active", role: "Editor" },
  { id: "3", name: "Budi Santoso", email: "budi@carubra.id", status: "inactive", role: "Viewer" },
  { id: "4", name: "Dewi Putri", email: "dewi@carubra.id", status: "active", role: "Editor" },
]

export default function MemberPage() {
  const { t } = useLanguage()
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [search, setSearch] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newMember, setNewMember] = useState({ name: "", email: "", role: "Viewer" })

  const filteredMembers = members.filter(
    m => m.name.toLowerCase().includes(search.toLowerCase()) ||
         m.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault()
    const member: Member = {
      id: Date.now().toString(),
      ...newMember,
      status: "active"
    }
    setMembers([...members, member])
    setNewMember({ name: "", email: "", role: "Viewer" })
    setIsDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-3xl font-bold text-foreground">{t("member.title")}</h1>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("member.add")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("member.add")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("profile.name")}</Label>
                <Input
                  id="name"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full">{t("member.add")}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("common.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-4">
        {filteredMembers.map((member) => (
          <Card key={member.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {member.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">{member.name}</p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="outline">{member.role}</Badge>
                <Badge variant={member.status === "active" ? "default" : "secondary"}>
                  {member.status === "active" ? t("member.active") : t("member.inactive")}
                </Badge>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
