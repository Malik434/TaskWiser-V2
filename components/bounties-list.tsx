"use client"

import { useState, useEffect } from "react"
import { useFirebase } from "./firebase-provider"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Loader2 } from "lucide-react"
import type { Bounty } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useWeb3 } from "./web3-provider"

export function BountiesList() {
  const { getBounties, isInitialized, updateTask, addTaskSubmission, getUserProfile } = useFirebase()
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

      const data = await getBounties()
      setBounties(data || [])
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
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Open Bounties</h1>
        <p className="text-muted-foreground">Find and explore tasks and bounties across hundreds of DAOs</p>
      </div>

      {!isInitialized ? (
        <div className="flex h-40 items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Initializing Firebase...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 pt-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Writing">Writing</SelectItem>
                <SelectItem value="Development">Development</SelectItem>
                <SelectItem value="Design">Design</SelectItem>
                <SelectItem value="Translation">Translation</SelectItem>
                <SelectItem value="Community">Community</SelectItem>
                <SelectItem value="Video">Video</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">ALL BOUNTIES</h2>

            {isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            ) : filteredBounties.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-muted-foreground">No bounties found matching your criteria</p>
              </div>
            ) : (
              filteredBounties.map((bounty) => (
                <Card key={bounty.id} className="overflow-hidden cursor-pointer" onClick={() => openBountyDialog(bounty)}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <Avatar className="h-12 w-12 rounded-full">
                      <AvatarImage src={(bounty as any).daoImage || "/placeholder.svg"} alt={(bounty as any).daoName} />
                      <AvatarFallback>{(bounty as any).daoName.substring(0, 2)}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <h3 className="font-medium">{bounty.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>
                          {(bounty as any).daysAgo} days ago by {(bounty as any).daoName}
                        </span>
                      </div>
                      <div className="mt-1">
                        <Badge variant="outline" className="rounded-sm bg-secondary/50 text-xs font-normal">
                          {(bounty as any).category
}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1">
                        <div className="h-4 w-4 rounded-full bg-blue-500"></div>
                        <span className="text-sm font-medium">
                          {(bounty as any).rewardAmount} {(bounty as any).reward}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Bounty Preview Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(o) => (o ? setIsDialogOpen(true) : closeBountyDialog())}>
        <DialogContent className="sm:max-w-xl">
          {selectedBounty && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedBounty.title}</DialogTitle>
                <DialogDescription>
                  {selectedBounty.description}
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-center gap-2 mb-3">
                {(selectedBounty.daoName) && (
                  <Badge variant="outline">{selectedBounty.daoName}</Badge>
                )}
                {selectedBounty.reward && selectedBounty.rewardAmount && (
                  <Badge variant="outline">{selectedBounty.rewardAmount} {selectedBounty.reward}</Badge>
                )}
                {selectedBounty.category && (
                  <Badge variant="outline">{selectedBounty.category}</Badge>
                )}
              </div>

              <div className="grid gap-3">
                <div>
                  <h3 className="text-sm font-medium mb-1">Submit Proposal</h3>
                  <Textarea
                    placeholder="Describe how you’ll approach this bounty"
                    value={proposalContent}
                    onChange={(e) => setProposalContent(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <div className="mt-2 flex gap-2">
                    <Button onClick={handleSubmitProposal} disabled={!canSubmitProposal(selectedBounty) || isSubmittingProposal}>
                      {isSubmittingProposal ? "Submitting..." : "Submit Proposal"}
                    </Button>
                  </div>
                </div>

                {canSubmitWork(selectedBounty) && (
                  <div className="pt-2 border-t">
                    <h3 className="text-sm font-medium mb-1">Submit Work</h3>
                    <Textarea
                      placeholder="Link or description of your work"
                      value={proposalContent}
                      onChange={(e) => setProposalContent(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <div className="mt-2 flex gap-2">
                      <Button onClick={handleSubmitWork} disabled={isSubmittingWork} className="gradient-button">
                        {isSubmittingWork ? "Submitting..." : "Submit Work"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={closeBountyDialog}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}