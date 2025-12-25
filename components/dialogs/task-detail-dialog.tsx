
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Loader2,
    CheckCircle,
    CircleEllipsis,
    Circle,
    Clock,
    User,
    Calendar,
    AlertCircle,
    Award,
    Lock,
    X,
    Check,
    FileText,
    Download
} from "lucide-react";
import { StatusSelect, PrioritySelect, RewardInput, TaskPointsInput, TagsSelect } from "../task-form-fields";
import { UserSearchSelect } from "../user-search-select";
import { Task, UserProfile, Project, TaskProposal } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TaskDetailDialogProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task | null;
    currentUserId: string | null;
    currentUserAccount: string | null;
    isEditMode: boolean;
    setIsEditMode: (mode: boolean) => void;
    availableUsers: UserProfile[];
    projectMembers?: any[]; // optional, if we need to filter assignees
    currentProject: Project | null;

    // Handlers
    onUpdateTask: (updatedTask: Partial<Task>) => Promise<void>;
    onSubmitProposal: (taskId: string, content: string) => Promise<void>;
    onApproveProposal: (taskId: string, proposalId: string) => Promise<void>;
    onRejectProposal: (taskId: string, proposalId: string) => Promise<void>;
    onSubmitWork: (taskId: string, content: string) => Promise<void>;
    onApproveSubmission: (taskId: string) => Promise<void>;
    onRejectSubmission: (taskId: string) => Promise<void>;

    // Loading states
    isLoading: boolean;
    isSubmittingProposal: boolean;
    isManagingProposal: boolean;
    isSubmittingWork: boolean;
}

export function TaskDetailDialog({
    isOpen,
    onClose,
    task,
    currentUserId,
    currentUserAccount,
    isEditMode,
    setIsEditMode,
    availableUsers,
    currentProject,
    onUpdateTask,
    onSubmitProposal,
    onApproveProposal,
    onRejectProposal,
    onSubmitWork,
    onApproveSubmission,
    onRejectSubmission,
    isLoading,
    isSubmittingProposal,
    isManagingProposal,
    isSubmittingWork
}: TaskDetailDialogProps) {
    // Local state for edit mode
    const [editedTask, setEditedTask] = useState<Partial<Task>>({});

    // Sub-dialog states managed internally to keep parent clean
    const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);
    const [proposalContent, setProposalContent] = useState("");

    const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
    const [submissionContent, setSubmissionContent] = useState("");

    // Reset edited task when task changes or mode changes
    useEffect(() => {
        if (task) {
            setEditedTask({ ...task });
        }
    }, [task, isOpen]);

    if (!task) return null;

    const userIdentifier = currentUserId || currentUserAccount || "";

    // Permissions helpers
    const hasSubmittedProposal = task.proposals?.some(
        (proposal) =>
            proposal.userId === userIdentifier ||
            proposal.userId === currentUserAccount
    ) ?? false;

    const canSubmitProposal =
        task.isOpenBounty &&
        currentUserAccount &&
        task.userId !== currentUserAccount &&
        (!task.reviewerId || task.reviewerId !== currentUserId) &&
        task.assigneeId !== userIdentifier &&
        !hasSubmittedProposal;

    const canSubmitWork =
        task.assigneeId === userIdentifier &&
        (task.status === "inprogress" || task.status === "todo") &&
        !task.submission;

    const canApproveSubmission =
        task.status === "review" &&
        task.submission &&
        (task.userId === currentUserAccount ||
            (task.reviewerId && task.reviewerId === currentUserId));

    const handleSaveEdit = async () => {
        await onUpdateTask(editedTask);
        // Parent determines if we close edit mode or dialog, but usually we just stay or toggle back to view
        // The separate handler in parent should handle the success logic (toast etc)
    };

    const handleProposalSubmit = async () => {
        await onSubmitProposal(task.id, proposalContent);
        setProposalContent("");
        setIsProposalDialogOpen(false);
    };

    const handleWorkSubmit = async () => {
        await onSubmitWork(task.id, submissionContent);
        setSubmissionContent("");
        setIsSubmitDialogOpen(false);
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
                    <div className="flex h-full max-h-full overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <DialogHeader>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-1">
                                        {isEditMode ? (
                                            <Input
                                                value={editedTask.title || ""}
                                                onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                                                className="font-semibold text-lg"
                                                placeholder="Task Title"
                                            />
                                        ) : (
                                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                                {task.title}
                                                {task.paid && (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Paid</Badge>
                                                )}
                                            </DialogTitle>
                                        )}
                                        <DialogDescription>
                                            {isEditMode ? "Editing task details" : `Task ID: ${task.id}`}
                                        </DialogDescription>
                                    </div>
                                    {!isEditMode && !task.paid && (task.userId === currentUserAccount || task.userId === currentUserId) && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsEditMode(true)}
                                            className="rounded-xl"
                                        >
                                            <Check className="h-4 w-4 mr-2" />
                                            Edit Task
                                        </Button>
                                    )}
                                </div>
                            </DialogHeader>

                            {isEditMode ? (
                                // EDIT MODE
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase text-muted-foreground">Description</Label>
                                        <Textarea
                                            value={editedTask.description || ""}
                                            onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                                            className="min-h-[150px]"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <StatusSelect
                                            value={editedTask.status || "todo"}
                                            onValueChange={(val) => setEditedTask({ ...editedTask, status: val })}
                                        />
                                        <PrioritySelect
                                            value={editedTask.priority || "medium"}
                                            onValueChange={(val) => setEditedTask({ ...editedTask, priority: val })}
                                        />
                                    </div>

                                    <TagsSelect
                                        selected={editedTask.tags || []}
                                        onChange={(tags) => setEditedTask({ ...editedTask, tags })}
                                        options={currentProject?.tags || []} // We will just use passed project tags if any
                                        label="TAGS"
                                    />

                                    {/* Only allow editing assignee etc if not escrow locked/open bounty somewhat restricted */}
                                    {/* Parent handler handles the validation warnings, but we can disable fields here */}
                                    {!editedTask.isOpenBounty && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold uppercase text-muted-foreground">Assignee</Label>
                                                <UserSearchSelect
                                                    users={availableUsers}
                                                    value={editedTask.assigneeId || ""}
                                                    onChange={(val) => setEditedTask({ ...editedTask, assigneeId: val })}
                                                    placeholder="Select Assignee"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold uppercase text-muted-foreground">Reviewer</Label>
                                                <UserSearchSelect
                                                    users={availableUsers}
                                                    value={editedTask.reviewerId || ""}
                                                    onChange={(val) => setEditedTask({ ...editedTask, reviewerId: val })}
                                                    placeholder="Select Reviewer"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Reward editing usually restricted if escrow, but UI can show it */}
                                    <RewardInput
                                        reward={editedTask.reward}
                                        rewardAmount={editedTask.rewardAmount}
                                        onRewardChange={(val) => setEditedTask({ ...editedTask, reward: val })}
                                        onAmountChange={(val) => setEditedTask({ ...editedTask, rewardAmount: val })}
                                        disabled={!!task.escrowEnabled && !!task.escrowStatus && task.escrowStatus !== 'pending'}
                                    />

                                </div>
                            ) : (
                                // VIEW MODE
                                <div className="space-y-6">
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        <Badge className={cn(
                                            "capitalize",
                                            task.status === "done" ? "bg-green-100 text-green-700" :
                                                task.status === "inprogress" ? "bg-blue-100 text-blue-700" :
                                                    "bg-slate-100 text-slate-700"
                                        )}>
                                            {task.status.replace("inprogress", "In Progress")}
                                        </Badge>
                                        <Badge variant="outline" className={cn(
                                            "capitalize",
                                            task.priority === "high" ? "text-red-600 border-red-200" :
                                                task.priority === "medium" ? "text-amber-600 border-amber-200" :
                                                    "text-slate-600 border-slate-200"
                                        )}>
                                            {task.priority} Priority
                                        </Badge>
                                        {task.tags?.map(tag => (
                                            <Badge key={tag} variant="secondary">{tag}</Badge>
                                        ))}
                                    </div>

                                    <div className="prose dark:prose-invert max-w-none">
                                        <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                            {task.description || "No description provided."}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Assignee Card */}
                                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
                                            <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-500 mb-2">Assigned To</h3>
                                            {task.assignee ? (
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={task.assignee.profilePicture} />
                                                        <AvatarFallback>{task.assignee.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm font-medium">{task.assignee.username}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <User className="h-4 w-4" />
                                                    <span className="text-sm">Unassigned</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Reviewer Card */}
                                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
                                            <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-500 mb-2">Reviewer</h3>
                                            {task.reviewer ? (
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={task.reviewer.profilePicture} />
                                                        <AvatarFallback>{task.reviewer.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm font-medium">{task.reviewer.username}</span>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-slate-500">No reviewer assigned</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Status Cards (Bounty, Escrow, Payment) */}
                                    <div className="grid grid-cols-1 gap-4">
                                        {task.isOpenBounty && (
                                            <div className="rounded-xl border border-amber-300 bg-amber-50/50 p-4 flex items-start gap-3">
                                                <Award className="h-5 w-5 text-amber-600 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-semibold text-amber-900">Open Bounty Active</p>
                                                    <p className="text-xs text-amber-700 mt-1">Contributors can submit proposals.</p>
                                                </div>
                                            </div>
                                        )}
                                        {task.escrowEnabled && (
                                            <div className="rounded-xl border border-blue-300 bg-blue-50/50 p-4 flex items-start gap-3">
                                                <Lock className="h-5 w-5 text-blue-600 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-semibold text-blue-900">Escrow Enabled</p>
                                                    <p className="text-xs text-blue-700 mt-1">Payment is locked until completion.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Submissions Section */}
                                    {task.submission && (
                                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900/10">
                                            <div className="flex justify-between items-center mb-3">
                                                <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">Submission</h3>
                                                <Badge variant={task.submission.status === 'approved' ? 'default' : 'secondary'}>
                                                    {task.submission.status}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{task.submission.content}</p>
                                        </div>
                                    )}

                                    {/* Proposals Section */}
                                    {task.proposals && task.proposals.length > 0 && (
                                        <div className="space-y-3">
                                            <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">Proposals ({task.proposals.length})</h3>
                                            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                                                {task.proposals.map(proposal => {
                                                    const isApplicant = proposal.userId === userIdentifier;
                                                    const isOwner = task.userId === currentUserAccount;
                                                    return (
                                                        <div key={proposal.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div>
                                                                    <span className="text-sm font-medium">{proposal.username}</span>
                                                                    <span className="text-xs text-slate-500 block">{format(new Date(proposal.submittedAt), "PP")}</span>
                                                                </div>
                                                                <Badge variant={proposal.status === 'approved' ? 'default' : 'outline'}>{proposal.status}</Badge>
                                                            </div>
                                                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{proposal.message}</p>

                                                            {/* Action Buttons for Owner */}
                                                            {(isOwner || (task.reviewerId && task.reviewerId === currentUserId)) && proposal.status === 'pending' && (
                                                                <div className="flex justify-end gap-2 mt-2">
                                                                    <Button size="sm" variant="outline"
                                                                        onClick={() => onRejectProposal(task.id, proposal.id)}
                                                                        disabled={isManagingProposal}
                                                                        className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50"
                                                                    >
                                                                        Reject
                                                                    </Button>
                                                                    <Button size="sm"
                                                                        onClick={() => onApproveProposal(task.id, proposal.id)}
                                                                        disabled={isManagingProposal}
                                                                        className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                                                                    >
                                                                        Approve
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        {isEditMode ? (
                            <div className="flex justify-end gap-2 w-full">
                                <Button variant="outline" onClick={() => setIsEditMode(false)} disabled={isLoading}>Cancel</Button>
                                <Button onClick={handleSaveEdit} disabled={isLoading}>
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Save Changes
                                </Button>
                            </div>
                        ) : (
                            <div className="flex justify-between w-full">
                                <div className="flex gap-2">
                                    {canSubmitProposal && (
                                        <Button variant="outline" onClick={() => setIsProposalDialogOpen(true)}>
                                            <Award className="mr-2 h-4 w-4" />
                                            Submit Proposal
                                        </Button>
                                    )}
                                    {canSubmitWork && (
                                        <Button onClick={() => setIsSubmitDialogOpen(true)}>
                                            <FileText className="mr-2 h-4 w-4" />
                                            Submit Work
                                        </Button>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    {canApproveSubmission && (
                                        <>
                                            <Button variant="destructive" onClick={() => onRejectSubmission(task.id)} disabled={isLoading}>Reject</Button>
                                            <Button onClick={() => onApproveSubmission(task.id)} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                                Approve Submission
                                            </Button>
                                        </>
                                    )}
                                    <Button variant="ghost" onClick={onClose}>Close</Button>
                                </div>
                            </div>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Nested Dialogs */}
            {/* Proposal Dialog */}
            <Dialog open={isProposalDialogOpen} onOpenChange={setIsProposalDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Submit Proposal</DialogTitle>
                        <DialogDescription>Pitch your approach for this task.</DialogDescription>
                    </DialogHeader>
                    <Textarea
                        placeholder="I can help with this..."
                        value={proposalContent}
                        onChange={(e) => setProposalContent(e.target.value)}
                        className="min-h-[150px]"
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsProposalDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleProposalSubmit} disabled={isSubmittingProposal || !proposalContent.trim()}>
                            {isSubmittingProposal ? <Loader2 className="animate-spin" /> : "Submit"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Submission Dialog */}
            <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Submit Work</DialogTitle>
                        <DialogDescription>Provide details or links to your work.</DialogDescription>
                    </DialogHeader>
                    <Textarea
                        placeholder="GitHub PR link, or description..."
                        value={submissionContent}
                        onChange={(e) => setSubmissionContent(e.target.value)}
                        className="min-h-[150px]"
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSubmitDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleWorkSubmit} disabled={isSubmittingWork || !submissionContent.trim()}>
                            {isSubmittingWork ? <Loader2 className="animate-spin" /> : "Submit"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
