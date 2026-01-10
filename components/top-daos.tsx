"use client"

import { useState, useEffect } from "react"
import { Search, Users, Crown, Shield, Loader2, UserPlus, Check, Globe, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useFirebase } from "./firebase-provider"
import { useWeb3 } from "./web3-provider"
import type { Project } from "@/lib/types"
import { Badge } from "@/components/ui/badge"

interface DAO {
  id: string
  name: string
  description: string
  logo: string
  memberCount: number
  isMember?: boolean
  isOwner?: boolean
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
      let currentWallet = account?.toLowerCase() ?? null
      if (isConnected && account) {
        try {
          const profile = await getUserProfile(account)
          currentUserId = profile?.id || null
          currentWallet = profile?.address?.toLowerCase() || currentWallet
        } catch (e) {
          console.warn("Failed to get user profile for membership check", e)
        }
      }
      const mapped: DAO[] = (projects || []).map((p) => {
        const members = Array.isArray(p.members) ? p.members : []
        const activeMembersCount = members.filter((m: any) => m.isActive).length
        const normalizedOwner = (p.createdBy || "").toLowerCase()

        const userIsActiveMember =
          currentUserId && members.some((m: any) => m.userId === currentUserId && m.isActive)

        const userIsOwner = !!currentWallet && normalizedOwner === currentWallet

        return {
          id: p.id,
          name: p.title,
          description: p.description || "",
          logo: (p as any).logoUrl || (p as any).coverImage || "/placeholder.svg",
          memberCount: activeMembersCount + 1, // include owner as a member
          isMember: Boolean(userIsActiveMember || userIsOwner),
          isOwner: userIsOwner,
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

  const handleApply = async (projectId: string, isOwner?: boolean) => {
    if (isOwner) {
      toast({
        title: "You own this project",
        description: "Owners already have full access to their project.",
      })
      return
    }
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
      
      // Get user profile to get userId
      const userProfile = await getUserProfile(account)
      if (!userProfile || !userProfile.id) {
        toast({ 
          title: "Profile Required", 
          description: "Please create a profile before applying to join projects.", 
          variant: "destructive" 
        })
        return
      }

      await applyToJoinProject(projectId, userProfile.id, account)
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
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search DAOs and projects..."
          className="h-11 rounded-xl border-slate-300 bg-white pl-10 shadow-sm transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900/50 dark:focus:border-cyan-600 dark:focus:ring-cyan-900/30"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Stats Header */}
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-cyan-50 to-blue-50 p-4 dark:border-slate-800 dark:from-cyan-950/30 dark:to-blue-950/30">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {filteredDaos.length}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">Active DAOs</p>
          </div>
        </div>
        <div className="h-8 w-px bg-slate-300 dark:bg-slate-700" />
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {filteredDaos.reduce((sum, d) => sum + d.memberCount, 0)}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">Total Members</p>
          </div>
        </div>
      </div>

      {/* DAOs Grid */}
      {isLoading ? (
        <div className="flex h-60 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-cyan-600 dark:text-cyan-400" />
            <p className="text-sm text-slate-600 dark:text-slate-400">Loading DAOs...</p>
          </div>
        </div>
      ) : filteredDaos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center dark:border-slate-700 dark:bg-slate-900/30">
          <Globe className="mx-auto h-12 w-12 text-slate-400" />
          <p className="mt-3 text-lg font-medium text-slate-900 dark:text-slate-50">No DAOs found</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Try a different search term
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDaos.map((dao, index) => (
            <Card
              key={dao.id}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/80"
            >
              {/* Rank Badge for Top 3 */}
              {index < 3 && (
                <div className="absolute right-3 top-3 z-10">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full shadow-lg ${
                    index === 0
                      ? "bg-gradient-to-br from-amber-400 to-yellow-500"
                      : index === 1
                      ? "bg-gradient-to-br from-slate-300 to-slate-400"
                      : "bg-gradient-to-br from-orange-400 to-amber-600"
                  }`}>
                    <span className="text-sm font-bold text-white">#{index + 1}</span>
                  </div>
                </div>
              )}

              <CardContent className="p-0">
                {/* Header */}
                <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-r from-cyan-50 to-blue-50 p-5 dark:border-slate-800 dark:from-cyan-950/30 dark:to-blue-950/30">
                  <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-white/50 to-transparent dark:from-slate-900/50" />
                  
                  <div className="relative flex items-center gap-3">
                    <Avatar className="h-14 w-14 border-2 border-white shadow-xl transition-transform group-hover:scale-110 dark:border-slate-700">
                      <AvatarImage src={dao.logo || "/placeholder.svg"} alt={dao.name} />
                      <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-500 text-lg font-semibold text-white">
                        {dao.name.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate dark:text-slate-50">
                        {dao.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                        <Users className="h-3.5 w-3.5" />
                        <span>{dao.memberCount} members</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="p-5">
                  <p className="text-sm text-slate-600 line-clamp-3 dark:text-slate-400">
                    {dao.description || "No description available"}
                  </p>
                </div>
              </CardContent>

              {/* Footer */}
              <CardFooter className="border-t border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                {dao.isOwner ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    className="w-full gap-2 rounded-xl border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                  >
                    <Crown className="h-4 w-4" />
                    You Own This DAO
                  </Button>
                ) : dao.isMember ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    className="w-full gap-2 rounded-xl border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400"
                  >
                    <Check className="h-4 w-4" />
                    Member
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleApply(dao.id, dao.isOwner)}
                    disabled={submittingId === dao.id}
                    className="w-full gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
                  >
                    {submittingId === dao.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        Apply to Join
                      </>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}