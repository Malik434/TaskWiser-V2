"use client"

import { useState, useEffect } from "react"
import { Search, Users } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useFirebase } from "./firebase-provider"
import { useWeb3 } from "./web3-provider"
import type { Project } from "@/lib/types"

interface DAO {
  id: string
  name: string
  description: string
  logo: string
  memberCount: number
  isMember?: boolean
}

export function TopDAOs() {
  const { isInitialized, getProjects, applyToJoinProject, getUserProfile } = useFirebase()
  const { toast } = useToast()
  const { account, isConnected } = useWeb3()
  const [daos, setDaos] = useState<DAO[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  useEffect(() => {
    if (isInitialized) {
      loadProjects()
    }
  }, [isInitialized])

  const loadProjects = async () => {
    setIsLoading(true)
    try {
      const projects: Project[] = await getProjects()
      let currentUserId: string | null = null
      if (isConnected && account) {
        try {
          const profile = await getUserProfile(account)
          currentUserId = profile?.id || null
        } catch (e) {
          console.warn("Failed to get user profile for membership check", e)
        }
      }
      const mapped: DAO[] = (projects || []).map((p) => {
        const members = Array.isArray(p.members) ? p.members : []
        const isMember = currentUserId ? members.some((m: any) => m.userId === currentUserId && m.isActive) : false
        return {
          id: p.id,
          name: p.title,
          description: p.description || "",
          logo: (p as any).logoUrl || (p as any).coverImage || "/placeholder.svg",
          memberCount: members.filter((m: any) => m.isActive).length,
          isMember,
        }
      })
      const sorted = mapped.sort((a, b) => b.memberCount - a.memberCount)
      setDaos(sorted)
    } catch (e) {
      console.error("Failed to load projects for TopDAOs:", e)
      setDaos([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleApply = async (projectId: string) => {
    if (!isConnected || !account) {
      toast({ title: "Wallet Required", description: "Connect your wallet first.", variant: "destructive" })
      return
    }
    const dao = daos.find(d => d.id === projectId)
    if (dao?.isMember) {
      toast({ title: "Already a member", description: "You are already part of this project." })
      return
    }
    try {
      setSubmittingId(projectId)
      await applyToJoinProject(projectId, account, account)
      toast({ title: "Request Sent", description: "Your application is pending review." })
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to apply", variant: "destructive" })
    } finally {
      setSubmittingId(null)
    }
  }

  const filteredDaos = daos.filter(
    (dao) =>
      dao.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dao.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="inline-flex items-center justify-center rounded-full bg-blue-600 h-6 w-6">
            <span className="text-white text-sm">🌐</span>
          </span>
          Top DAOs ({daos.length})
        </h1>
        <p className="text-muted-foreground">
          Explore projects and their open bounties. Sorted by active members.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search DAOs..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : filteredDaos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No projects found matching your search</div>
        ) : (
          filteredDaos.map((dao) => (
            <Card
              key={dao.id}
              className="hover:bg-secondary/10 transition-colors border-secondary/20 dark:border-gray-700"
            >
              <CardContent className="flex items-center p-4 gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={dao.logo || "/placeholder.svg"} alt={dao.name} />
                  <AvatarFallback>{dao.name.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-medium dark:text-white">{dao.name}</h3>
                  <p className="text-sm text-muted-foreground">{dao.description}</p>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{dao.memberCount.toLocaleString()} members</span>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => handleApply(dao.id)}
                  disabled={submittingId === dao.id || dao.isMember}
                  className="dark:bg-primary dark:hover:bg-primary/90"
                >
                  {dao.isMember ? "Member" : submittingId === dao.id ? "Applying..." : "Apply"}
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}