"use client"

import { useState, useEffect } from "react"
import { useFirebase } from "./firebase-provider"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Loader2, DollarSign, Clock, Sparkles, Send, FileText, Award, Filter } from "lucide-react"
import type { Bounty } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useWeb3 } from "./web3-provider"

export function BountiesList() {
  const { getBounties, isInitialized, updateTask, addTaskSubmission, getUserProfile, getProjects, getProjectById } = useFirebase()
  const { account } = useWeb3()
  const { toast } = useToast()
  const [bounties, setBounties] = useState<Bounty[]>([])
  const [filteredBounties, setFilteredBounties] = useState<Bounty[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [selectedBounty, setSelectedBounty] = useState<any | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [proposalContent, setProposalContent] = useState("")
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false)
  const [isSubmittingWork, setIsSubmittingWork] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [projectsMap, setProjectsMap] = useState<Map<string, any>>(new Map())

  const generateId = () =>
    typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  const formatAddress = (address?: string | null) => {
    if (!address) return "Unknown"
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  useEffect(() => {
    if (isInitialized) {
      fetchBounties()
      // Resolve current user ID from wallet address
      if (account) {
        getUserProfile(account).then((profile) => {
          setCurrentUserId(profile?.id || null)
        }).catch(() => setCurrentUserId(null))
      }
    }
  }, [isInitialized, account])

  useEffect(() => {
    filterBounties()
  }, [bounties, searchQuery, categoryFilter])

  const fetchBounties = async () => {
    setIsLoading(true)
    try {
      if (!isInitialized) {
        return
      }

      // Fetch bounties and projects in parallel
      const [bountiesData, projectsData] = await Promise.all([
        getBounties(),
        getProjects()
      ])

      // Create a map of projectId -> project for quick lookup
      const projectMap = new Map()
      if (projectsData) {
        projectsData.forEach((project: any) => {
          projectMap.set(project.id, project)
        })
      }
      setProjectsMap(projectMap)

      setBounties(bountiesData || [])
    } catch (error) {
      console.error("Error fetching bounties:", error)
      setBounties([])
    } finally {
      setIsLoading(false)
    }
  }

  const filterBounties = () => {
    let filtered = [...bounties]

    if (searchQuery) {
      filtered = filtered.filter(
        (bounty) =>
          bounty.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bounty.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bounty.daoName.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((bounty) => (bounty as any).category === categoryFilter)
    }

    setFilteredBounties(filtered)
  }

  const openBountyDialog = (bounty: any) => {
    setSelectedBounty(bounty)
    setProposalContent("")
    setIsDialogOpen(true)
  }

  const closeBountyDialog = () => {
    setSelectedBounty(null)
    setProposalContent("")
    setIsDialogOpen(false)
  }

  const hasSubmittedProposal = (bounty: any) => {
    const userIdentifier = currentUserId || account || ""
    return (bounty?.proposals || []).some((p: any) => p.userId === userIdentifier || p.userId === account)
  }

  const canSubmitProposal = (bounty: any) => {
    if (!bounty || !account) return false
    const userIdentifier = currentUserId || account || ""
    return (
      // must be open bounty
      true &&
      // wallet connected
      !!account &&
      // not the task owner
      bounty.userId !== account &&
      // not the reviewer
      (!bounty.reviewerId || bounty.reviewerId !== currentUserId) &&
      // not already assigned
      bounty.assigneeId !== userIdentifier &&
      // not already proposed
      !hasSubmittedProposal(bounty)
    )
  }

  const handleSubmitProposal = async () => {
    if (!selectedBounty || !proposalContent.trim()) {
      toast({ title: "Proposal required", description: "Please add details about your proposal.", variant: "destructive" })
      return
    }
    if (!account) {
      toast({ title: "Wallet not connected", description: "Connect your wallet to submit a proposal.", variant: "destructive" })
      return
    }
    setIsSubmittingProposal(true)
    try {
      // Load user profile for display data
      const profile = (currentUserId && account) ? await getUserProfile(account) : null
      const applicantId = profile?.id || currentUserId || account
      const proposal = {
        id: generateId(),
        userId: applicantId,
        username: profile?.username || formatAddress(account),
        profilePicture: profile?.profilePicture,
        message: proposalContent.trim(),
        status: "pending" as const,
        submittedAt: new Date().toISOString(),
      }
      const updatedProposals = [ ...(selectedBounty.proposals || []), proposal ]
      await updateTask(selectedBounty.id, { proposals: updatedProposals, isOpenBounty: true })
      toast({ title: "Proposal submitted", description: "Your proposal has been sent to the task owner." })
      // Update local state
      setSelectedBounty({ ...selectedBounty, proposals: updatedProposals })
      setBounties((prev) => prev.map((b) => b.id === selectedBounty.id ? ({ ...(b as any), proposals: updatedProposals }) as any : b))
      setFilteredBounties((prev) => prev.map((b) => b.id === selectedBounty.id ? ({ ...(b as any), proposals: updatedProposals }) as any : b))
      setProposalContent("")
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error submitting proposal:", error)
      toast({ title: "Error", description: "Failed to submit proposal.", variant: "destructive" })
    } finally {
      setIsSubmittingProposal(false)
    }
  }

  const canSubmitWork = (bounty: any) => {
    if (!bounty) return false
    const userIdentifier = currentUserId || account
    if (!userIdentifier) return false
    return bounty.assigneeId === userIdentifier && !bounty.submission
  }

  const handleSubmitWork = async () => {
    if (!selectedBounty || !currentUserId || !proposalContent.trim()) {
      toast({ title: "Submission required", description: "Please include a link or description of your work.", variant: "destructive" })
      return
    }
    setIsSubmittingWork(true)
    try {
      await addTaskSubmission(selectedBounty.id, { userId: currentUserId, content: proposalContent.trim() })
      toast({ title: "Work submitted", description: "Your work has been submitted for review." })
      setProposalContent("")
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error submitting work:", error)
      toast({ title: "Error", description: "Failed to submit work.", variant: "destructive" })
    } finally {
      setIsSubmittingWork(false)
    }
  }

  return (
    <div className="space-y-6">
      {!isInitialized ? (
        <div className="flex h-40 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600 dark:text-indigo-400" />
            <p className="text-sm text-slate-600 dark:text-slate-400">Loading bounties...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Filters Section */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search bounties by title, description, or DAO..."
                className="h-11 rounded-xl border-slate-300 bg-white pl-10 shadow-sm transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900/50 dark:focus:border-indigo-600 dark:focus:ring-indigo-900/30"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-11 w-full rounded-xl border-slate-300 bg-white shadow-sm transition-all dark:border-slate-700 dark:bg-slate-900/50 sm:w-[200px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Writing">✍️ Writing</SelectItem>
                <SelectItem value="Development">💻 Development</SelectItem>
                <SelectItem value="Design">🎨 Design</SelectItem>
                <SelectItem value="Translation">🌐 Translation</SelectItem>
                <SelectItem value="Community">👥 Community</SelectItem>
                <SelectItem value="Video">🎥 Video</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-4 dark:border-slate-800 dark:from-indigo-950/30 dark:to-purple-950/30">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {filteredBounties.length}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Active Bounties</p>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-300 dark:bg-slate-700" />
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  ${filteredBounties.reduce((sum, b) => sum + ((b as any).rewardAmount || 0), 0).toFixed(0)}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Total Value</p>
              </div>
            </div>
          </div>

          {/* Bounties Grid */}
          {isLoading ? (
            <div className="flex h-60 items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Loading bounties...</p>
              </div>
            </div>
          ) : filteredBounties.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center dark:border-slate-700 dark:bg-slate-900/30">
              <Award className="mx-auto h-12 w-12 text-slate-400" />
              <p className="mt-3 text-lg font-medium text-slate-900 dark:text-slate-50">No bounties found</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredBounties.map((bounty) => {
                // Get project info from the bounty's projectId
                const project = (bounty as any).projectId ? projectsMap.get((bounty as any).projectId) : null;
                const projectLogo = project?.logoUrl || (bounty as any).daoImage || "/placeholder.svg";
                const projectName = project?.title || (bounty as any).daoName || "Unknown Project";
                
                return (
                <Card
                  key={bounty.id}
                  className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/80"
                  onClick={() => openBountyDialog(bounty)}
                >
                  <CardContent className="p-0">
                    {/* Header with Project Info */}
                    <div className="flex items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 p-4 dark:border-slate-800 dark:from-slate-800/50 dark:to-slate-900/50">
                      <Avatar className="h-12 w-12 border-2 border-white shadow-lg dark:border-slate-700">
                        <AvatarImage src={projectLogo} alt={projectName} />
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-semibold">
                          {projectName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50 truncate">
                          {projectName}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                          <Clock className="h-3 w-3" />
                          <span>{(bounty as any).daysAgo} days ago</span>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-3">
                      <h3 className="font-semibold text-slate-900 line-clamp-2 dark:text-slate-50">
                        {bounty.title}
                      </h3>
                      <p className="text-sm text-slate-600 line-clamp-2 dark:text-slate-400">
                        {bounty.description}
                      </p>

                      {/* Category Badge */}
                      <Badge
                        variant="secondary"
                        className="rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {(bounty as any).category}
                      </Badge>
                    </div>

                    {/* Footer with Reward */}
                    <div className="border-t border-slate-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4 dark:border-slate-800 dark:from-green-950/20 dark:to-emerald-950/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 shadow-md">
                            <DollarSign className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-600 dark:text-slate-400">Reward</p>
                            <p className="text-lg font-bold text-slate-900 dark:text-slate-50">
                              {(bounty as any).rewardAmount} {(bounty as any).reward}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-full text-indigo-600 hover:bg-indigo-100 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                          onClick={(e) => {
                            e.stopPropagation();
                            openBountyDialog(bounty);
                          }}
                        >
                          View Details →
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )})}
            </div>
          )}
        </>
      )}

      {/* Enhanced Bounty Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(o) => (o ? setIsDialogOpen(true) : closeBountyDialog())}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
          {selectedBounty && (() => {
            // Get project info for the dialog
            const project = (selectedBounty as any).projectId ? projectsMap.get((selectedBounty as any).projectId) : null;
            const projectLogo = project?.logoUrl || (selectedBounty as any).daoImage || "/placeholder.svg";
            const projectName = project?.title || (selectedBounty as any).daoName || "Unknown Project";

            return (
            <>
              {/* Header */}
              <div className="space-y-4 border-b border-slate-200 pb-6 dark:border-slate-800">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16 border-2 border-slate-200 shadow-lg dark:border-slate-700">
                    <AvatarImage src={projectLogo} alt={projectName} />
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-lg font-semibold text-white">
                      {projectName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <DialogTitle className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                      {selectedBounty.title}
                    </DialogTitle>
                    <DialogDescription className="mt-2 text-base text-slate-600 dark:text-slate-400">
                      {selectedBounty.description}
                    </DialogDescription>
                  </div>
                </div>

                {/* Metadata Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                    <Sparkles className="mr-1 h-3 w-3" />
                    {projectName}
                  </Badge>
                  {selectedBounty.reward && selectedBounty.rewardAmount && (
                    <Badge className="rounded-full bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300">
                      <DollarSign className="mr-1 h-3 w-3" />
                      {selectedBounty.rewardAmount} {selectedBounty.reward}
                    </Badge>
                  )}
                  {(selectedBounty as any).category && (
                    <Badge className="rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                      {(selectedBounty as any).category}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Proposal Section */}
              <div className="space-y-4 py-4">
                {canSubmitProposal(selectedBounty) && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                        Submit Your Proposal
                      </h3>
                    </div>
                    <Textarea
                      placeholder="Describe your approach, timeline, and why you're the right person for this bounty..."
                      value={proposalContent}
                      onChange={(e) => setProposalContent(e.target.value)}
                      className="min-h-[120px] rounded-xl border-slate-300 dark:border-slate-700"
                    />
                    <Button
                      onClick={handleSubmitProposal}
                      disabled={!canSubmitProposal(selectedBounty) || isSubmittingProposal || !proposalContent.trim()}
                      className="h-11 w-full gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
                    >
                      {isSubmittingProposal ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Submitting Proposal...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Submit Proposal
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {canSubmitWork(selectedBounty) && (
                  <div className="space-y-3 rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/20">
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                        Submit Your Work
                      </h3>
                    </div>
                    <Textarea
                      placeholder="Provide a link to your work or describe your deliverable..."
                      value={proposalContent}
                      onChange={(e) => setProposalContent(e.target.value)}
                      className="min-h-[100px] rounded-xl"
                    />
                    <Button
                      onClick={handleSubmitWork}
                      disabled={isSubmittingWork || !proposalContent.trim()}
                      className="h-11 w-full gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 font-semibold text-white shadow-lg"
                    >
                      {isSubmittingWork ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Submitting Work...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Submit Work
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {!canSubmitProposal(selectedBounty) && !canSubmitWork(selectedBounty) && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-900 dark:bg-amber-950/20">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      {hasSubmittedProposal(selectedBounty)
                        ? "You've already submitted a proposal for this bounty"
                        : "You cannot submit a proposal for this bounty"}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="border-t border-slate-200 pt-4 dark:border-slate-800">
                <Button
                  variant="outline"
                  onClick={closeBountyDialog}
                  className="rounded-xl"
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )})()}
        </DialogContent>
      </Dialog>
    </div>
  )
}