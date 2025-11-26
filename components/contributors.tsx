"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Trophy, Award, Medal, Loader2, Star, Zap } from "lucide-react"
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
      const [profiles, tasks] = (await Promise.all([
        getUserProfiles(),
        getAllTasks(),
      ])) as [UserProfile[], Task[]]

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

  const getTopContributorIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-amber-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-slate-400" />;
    if (index === 2) return <Medal className="h-5 w-5 text-orange-600" />;
    return <Star className="h-4 w-4 text-purple-500" />;
  };

  const getTopContributorGradient = (index: number) => {
    if (index === 0) return "from-amber-500/20 to-yellow-500/20 dark:from-amber-500/10 dark:to-yellow-500/10 border-amber-300 dark:border-amber-700";
    if (index === 1) return "from-slate-400/20 to-slate-500/20 dark:from-slate-400/10 dark:to-slate-500/10 border-slate-300 dark:border-slate-700";
    if (index === 2) return "from-orange-500/20 to-amber-600/20 dark:from-orange-500/10 dark:to-amber-600/10 border-orange-300 dark:border-orange-700";
    return "";
  };

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-purple-50 to-fuchsia-50 p-4 dark:border-slate-800 dark:from-purple-950/30 dark:to-fuchsia-950/30">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {contributors.length}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">Contributors</p>
          </div>
        </div>
        <div className="h-8 w-px bg-slate-300 dark:bg-slate-700" />
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-fuchsia-600 dark:text-fuchsia-400" />
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {contributors.reduce((sum, c) => sum + c.tasksCompleted, 0)}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">Tasks Completed</p>
          </div>
        </div>
      </div>

      {/* Contributors Leaderboard */}
      {isLoading ? (
        <div className="flex h-60 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-purple-600 dark:text-purple-400" />
            <p className="text-sm text-slate-600 dark:text-slate-400">Loading contributors...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {currentContributors.map((contributor, index) => {
              const globalIndex = startIndex + index;
              const isTopThree = globalIndex < 3;
              
              return (
                <Card
                  key={contributor.id}
                  className={`group overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-xl ${
                    isTopThree
                      ? `bg-gradient-to-r ${getTopContributorGradient(globalIndex)} shadow-lg`
                      : "border-slate-200 bg-white shadow-md hover:scale-[1.01] dark:border-slate-800 dark:bg-slate-900/80"
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center">
                        {isTopThree ? (
                          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                            globalIndex === 0
                              ? "bg-gradient-to-br from-amber-400 to-yellow-500"
                              : globalIndex === 1
                              ? "bg-gradient-to-br from-slate-300 to-slate-400"
                              : "bg-gradient-to-br from-orange-400 to-amber-600"
                          } shadow-lg`}>
                            <span className="text-lg font-bold text-white">#{globalIndex + 1}</span>
                          </div>
                        ) : (
                          <span className="text-2xl font-bold text-slate-400 dark:text-slate-600">
                            {globalIndex + 1}
                          </span>
                        )}
                      </div>

                      {/* Avatar */}
                      <Avatar className="h-14 w-14 border-2 border-white shadow-lg transition-transform group-hover:scale-110 dark:border-slate-700">
                        <AvatarImage src={contributor.avatar || "/placeholder.svg"} alt={contributor.name} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-fuchsia-500 text-lg font-semibold text-white">
                          {contributor.name.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900 truncate dark:text-slate-50">
                            {contributor.name}
                          </h3>
                          {isTopThree && getTopContributorIcon(globalIndex)}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                          <Award className="h-3.5 w-3.5" />
                          <span className="font-medium">{contributor.tasksCompleted}</span>
                          <span>tasks completed</span>
                        </div>

                        {/* Specialties */}
                        {contributor.specialties.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {contributor.specialties.slice(0, 3).map((s) => (
                              <Badge
                                key={s}
                                variant="secondary"
                                className="rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              >
                                {s}
                              </Badge>
                            ))}
                            {contributor.specialties.length > 3 && (
                              <Badge
                                variant="secondary"
                                className="rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              >
                                +{contributor.specialties.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Score */}
                      <div className="flex-shrink-0 text-right">
                        <div className={`rounded-xl px-4 py-2 ${
                          isTopThree
                            ? "bg-white/80 dark:bg-slate-900/80"
                            : "bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-950/30 dark:to-fuchsia-950/30"
                        }`}>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Score</p>
                          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {contributor.tasksCompleted * 10}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="rounded-xl"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-xl"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-2 px-4">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-50">
                  Page {currentPage} of {totalPages}
                </span>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-xl"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="rounded-xl"
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