"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { useFirebase } from "./firebase-provider"
import type { UserProfile, Task } from "@/lib/types"
import { Badge } from "@/components/ui/badge"

interface Contributor {
  id: string
  name: string
  avatar: string
  tasksCompleted: number
  specialties: string[]
}

export function Contributors() {
  const { isInitialized, getUserProfiles, getAllTasks } = useFirebase()
  const [contributors, setContributors] = useState<Contributor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 9

  useEffect(() => {
    if (isInitialized) {
      loadContributors()
    }
  }, [isInitialized])

  const loadContributors = async () => {
    setIsLoading(true)
    try {
      const [profiles, tasks] = await Promise.all<[
        UserProfile[],
        Task[]
      ]>([getUserProfiles(), getAllTasks()])

      const normalizedTasks = (tasks || [])
      const mapped: Contributor[] = (profiles || []).map((p) => {
        const completedForUser = normalizedTasks.filter((t) => {
          const assigneeMatchesProfile = t.assigneeId === p.id
          const assigneeMatchesAddress = t.assigneeId === p.address
          const isCompletedStatus = t.status === "done" || t.status === "approved"
          return (assigneeMatchesProfile || assigneeMatchesAddress) && isCompletedStatus
        }).length
        return {
          id: p.id,
          name: p.username,
          avatar: p.profilePicture || "/placeholder.svg",
          tasksCompleted: completedForUser,
          specialties: p.specialties || [],
        }
      })

      // Sort by tasks completed desc, then name
      const sorted = mapped.sort((a, b) => {
        if (b.tasksCompleted !== a.tasksCompleted) return b.tasksCompleted - a.tasksCompleted
        return a.name.localeCompare(b.name)
      })

      setContributors(sorted)
    } catch (e) {
      console.error("Failed to load contributors:", e)
      setContributors([])
    } finally {
      setIsLoading(false)
    }
  }

  const totalPages = Math.ceil(contributors.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentContributors = contributors.slice(startIndex, endIndex)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Contributors</h1>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentContributors.map((contributor) => (
              <Card key={contributor.id} className="bg-card hover:bg-card/80 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={contributor.avatar || "/placeholder.svg"} alt={contributor.name} />
                      <AvatarFallback>{contributor.name.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">{contributor.name}</h3>
                      <div className="text-sm text-muted-foreground">{contributor.tasksCompleted} tasks completed</div>
                    </div>
                  </div>
                  {contributor.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {contributor.specialties.map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-1 pt-4">
              <Button variant="outline" size="icon" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}