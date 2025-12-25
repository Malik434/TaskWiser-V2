
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, HelpCircle, AlertCircle, Wand2 } from "lucide-react";
import { StatusSelect, PrioritySelect, RewardInput, TaskPointsInput, TagsSelect } from "../task-form-fields";
import { UserSearchSelect } from "../user-search-select";
import { UserProfile, Task, Project } from "@/lib/types";
import { useFirebase } from "../firebase-provider";
import { ThreeBackground } from "../three-bg";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCircle, DollarSign, Award, Lock, SortDesc, Filter, Search } from "lucide-react";
import { useWeb3 } from "../web3-provider";
import { useToast } from "@/components/ui/use-toast";
import { TaskPredictorSidebar } from "../TaskPredictorSidebar";

interface CreateTaskDialogProps {
    isOpen: boolean;
    onClose: () => void;
    projectId?: string;
    currentProject: Project | null;
    availableUsers: UserProfile[];
    userId: string | null; // For verifying access if needed, but we mostly use account from Web3
    onCreateTask: (task: any) => Promise<void>;
    allTasks: Task[];
    userProjectRole?: string | null;
}

export function CreateTaskDialog({
    isOpen,
    onClose,
    projectId,
    currentProject,
    availableUsers,
    onCreateTask,
    allTasks = [],
    userProjectRole,
}: CreateTaskDialogProps) {

    const { account } = useWeb3();
    const { toast } = useToast();
    const { inviteUserToProject, getUserProfile } = useFirebase(); // Assuming we might need these utils if logic was inline
    // Note: onCreateTask prop should handle the heavy lifting (addTask, inviting, updating state)
    // to keep the dialog cleaner, OR we move that logic here. 
    // The plan said "Move newTask state and handleCreateTask function".
    // So we should implement handleCreateTask mostly here, but we need the hooks.
    const firebase = useFirebase();

    const [newTask, setNewTask] = useState<Partial<Task>>({
        title: "",
        description: "",
        status: "todo",
        priority: "medium",
        isOpenBounty: false,
        escrowEnabled: false,
        tags: [],
    });

    const [isLoading, setIsLoading] = useState(false);
    const [showRewardSection, setShowRewardSection] = useState(false);
    const [useAIEstimator, setUseAIEstimator] = useState(false);
    const [aiEstimate, setAiEstimate] = useState<any>(null);
    const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);
    const [analysisTag, setAnalysisTag] = useState<string | null>(null);
    const [contributorStats, setContributorStats] = useState<Array<{
        user: UserProfile,
        tasksCompleted: number,
        totalAssigned: number,
        tagCompleted: number,
        tagTotal: number,
        avgCompletionMs: number | null,
        isMember: boolean,
    }>>([]);
    const [recommendedContributor, setRecommendedContributor] = useState<UserProfile | null>(null);

    // Cost estimate (placeholder logic or passed prop?)
    // For now, simple mock or rely on AI estimate
    const costEstimate: any = null;

    // Update analysis tag when task tags change
    React.useEffect(() => {
        const tags = newTask.tags || [];
        if (tags.length > 0 && tags[0] !== analysisTag) {
            setAnalysisTag(tags[0]);
        } else if (tags.length === 0 && analysisTag) {
            setAnalysisTag(null);
        }
    }, [newTask.tags]);

    // Compute contributor analysis when dialog opens or data changes
    React.useEffect(() => {
        if (!isOpen || !availableUsers.length) {
            setContributorStats([]);
            return;
        }

        const targetTag = analysisTag || (newTask.tags && newTask.tags.length > 0 ? newTask.tags[0] : null);

        const stats = availableUsers.map((user) => {
            // Count all tasks assigned to this user
            const userTasks = allTasks.filter(
                (task) => task.assigneeId === user.id || task.assigneeId === user.address
            );
            const completedTasks = userTasks.filter((task) => task.status === "done");

            // Count tasks with the specific tag
            const tagTasks = targetTag
                ? userTasks.filter((task) => task.tags?.includes(targetTag))
                : [];
            const tagCompletedTasks = targetTag
                ? tagTasks.filter((task) => task.status === "done")
                : [];

            // Calculate average completion time
            const completedWithDates = completedTasks.filter(
                (task) => task.createdAt && task.updatedAt
            );
            const avgCompletionMs = completedWithDates.length > 0
                ? completedWithDates.reduce((sum, task) => {
                    const created = new Date(task.createdAt!).getTime();
                    const updated = new Date(task.updatedAt!).getTime();
                    return sum + (updated - created);
                }, 0) / completedWithDates.length
                : null;

            // Check if user is a project member
            const isMember = currentProject
                ? !!currentProject.members?.some((m: any) => m.userId === user.id && m.isActive)
                : true;

            return {
                user,
                tasksCompleted: completedTasks.length,
                totalAssigned: userTasks.length,
                tagCompleted: tagCompletedTasks.length,
                tagTotal: tagTasks.length,
                avgCompletionMs,
                isMember,
            };
        });

        // Sort by completion rate (for the selected tag if applicable), then by total completed
        const sorted = stats.sort((a, b) => {
            const aRate = targetTag && a.tagTotal > 0 ? a.tagCompleted / a.tagTotal : a.totalAssigned > 0 ? a.tasksCompleted / a.totalAssigned : 0;
            const bRate = targetTag && b.tagTotal > 0 ? b.tagCompleted / b.tagTotal : b.totalAssigned > 0 ? b.tasksCompleted / b.totalAssigned : 0;

            if (bRate !== aRate) return bRate - aRate;
            return b.tasksCompleted - a.tasksCompleted;
        });

        setContributorStats(sorted);

        // Set recommended contributor
        const recommended = sorted.find((s) => s.totalAssigned > 0 && s.isMember);
        setRecommendedContributor(recommended?.user || null);
    }, [isOpen, availableUsers, allTasks, analysisTag, newTask.tags, currentProject]);

    const handleCreateTask = async () => {
        if (!newTask.title) {
            toast({
                title: "Title required",
                description: "Please enter a title for the task",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);
        try {
            await onCreateTask({
                ...newTask,
                // If utilizing AI estimate override, apply it here if acceptable?
                // Original code used these values into hidden/meta fields
                // keeping it simple, passing the task state up.
                estimatedCostUSD: useAIEstimator && aiEstimate ? aiEstimate.totalUSD : undefined,
                estimatedHours: useAIEstimator && aiEstimate ? aiEstimate.estimatedHours : undefined,
                projectId: projectId
            });

            // Reset state on success (parent handles closing usually, but good to reset form)
            setNewTask({
                title: "",
                description: "",
                status: "todo",
                priority: "medium",
                isOpenBounty: false,
                escrowEnabled: false,
                tags: [],
            });
            setShowRewardSection(false);
            setUseAIEstimator(false);
            setAiEstimate(null);
            onClose();

        } catch (error) {
            console.error(error);
            // Toast handled by parent or here? Parent likely.
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
                <div className="flex h-full max-h-full overflow-hidden">
                    <ResizablePanelGroup direction="horizontal" className="flex-1 h-full min-h-0 overflow-hidden">
                        {showAnalysisPanel && userProjectRole === "admin" && (
                            <ResizablePanel defaultSize={28} minSize={24} className="min-h-0 p-6">
                                <div className="relative h-full min-h-0 overflow-y-auto overscroll-contain space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                    <ThreeBackground />
                                    <div className="text-xs font-semibold tracking-wide uppercase">Contributor Analysis</div>
                                    <div className="text-[11px] text-muted-foreground">
                                        {analysisTag ? `Tag: ${String(analysisTag)}` : "General performance"}
                                    </div>

                                    {/* Contributor Stats List */}
                                    {!!contributorStats.length ? (
                                        <div className="space-y-3">
                                            {contributorStats.slice(0, 4).map((s, idx) => {
                                                const name = s.user.displayName || s.user.username || "Unknown";
                                                const total = analysisTag ? (s.tagTotal || 0) : (s.totalAssigned || 0);
                                                const completed = analysisTag ? (s.tagCompleted || 0) : (s.tasksCompleted || 0);
                                                const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
                                                const radius = 16;
                                                const circumference = 2 * Math.PI * radius;
                                                const dashOffset = circumference - (percent / 100) * circumference;
                                                return (
                                                    <div key={s.user.id || idx} className="space-y-3 rounded-xl border shadow-sm backdrop-blur-sm bg-white/80 dark:bg-[#1e1e1e]/70 overflow-hidden p-3 md:p-4">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarImage src={s.user.profilePicture || undefined} />
                                                                <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <div className="text-xs font-medium">{name}</div>
                                                                {s.user.specialties?.length ? (
                                                                    <div className="text-[10px] text-muted-foreground truncate max-w-[220px]">
                                                                        {s.user.specialties.join(", ")}
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-3">
                                                                <div className="relative h-10 w-10 shrink-0">
                                                                    <svg className="h-10 w-10 -rotate-90" viewBox="0 0 40 40">
                                                                        <circle cx="20" cy="20" r={radius} stroke="currentColor" strokeWidth="4" className="text-muted-foreground/20 fill-none" />
                                                                        <circle cx="20" cy="20" r={radius} stroke="currentColor" strokeWidth="4" strokeDasharray={circumference} strokeDashoffset={dashOffset} className="text-purple-600 transition-all duration-500 ease-out fill-none" />
                                                                    </svg>
                                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                                        <span className="text-[10px]">{percent}%</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <Progress value={percent} className="h-2" />
                                                                    <div className="mt-1 text-[10px] text-muted-foreground truncate">{completed}/{total} completed</div>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                {/* Assign/Invite Button */}
                                                                {s.isMember ? (
                                                                    <Button size="sm" className="h-7 px-2 text-xs" disabled={newTask.isOpenBounty} onClick={() => setNewTask({ ...newTask, assigneeId: s.user.id })}>
                                                                        Assign
                                                                    </Button>
                                                                ) : (
                                                                    <Button size="sm" variant="secondary" className="h-7 px-2 text-xs" onClick={async () => {
                                                                        try {
                                                                            if (!currentProject || !s.user.address || !account) return;
                                                                            await inviteUserToProject(currentProject.id, s.user.id, account, currentProject.title);
                                                                            toast({ title: "Invitation sent" });
                                                                        } catch (e) { toast({ title: "Failed to send invite", variant: "destructive" }); }
                                                                    }}>
                                                                        Invite
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-6 text-center">
                                            <UserCircle className="h-10 w-10 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
                                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">No contributors yet</p>
                                        </div>
                                    )}
                                </div>
                            </ResizablePanel>
                        )}
                        {showAnalysisPanel && userProjectRole === "admin" && <ResizableHandle withHandle className="w-8 bg-transparent after:hidden" />}

                        <ResizablePanel defaultSize={showAnalysisPanel ? 72 : 100} minSize={42} className="min-h-0 p-4 sm:p-6 bg-gradient-to-b from-slate-50/50 to-white dark:from-slate-900/50 dark:to-slate-950">
                            <div className="h-full min-h-0 overflow-y-auto overscroll-contain space-y-4 sm:space-y-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                <DialogHeader className="mb-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <DialogTitle>Create New Task {projectId ? "in Project" : ""}</DialogTitle>
                                            <DialogDescription>
                                                Add a new task to your board. Fill in the details below.
                                            </DialogDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {userProjectRole === "admin" && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setShowAnalysisPanel((v) => !v)}
                                                    className="hidden md:flex rounded-full text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                                                >
                                                    {showAnalysisPanel ? "Hide Analysis" : "Show Analysis"}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </DialogHeader>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="title" className="text-xs font-semibold uppercase text-muted-foreground">Title</Label>
                                        <Input
                                            id="title"
                                            placeholder="Task title"
                                            value={newTask.title || ""}
                                            onChange={(e) =>
                                                setNewTask({ ...newTask, title: e.target.value })
                                            }
                                            className="font-medium"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description" className="text-xs font-semibold uppercase text-muted-foreground">Description</Label>
                                        <Textarea
                                            id="description"
                                            placeholder="Task description"
                                            value={newTask.description || ""}
                                            onChange={(e) =>
                                                setNewTask({ ...newTask, description: e.target.value })
                                            }
                                            className="min-h-[100px]"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <StatusSelect
                                            value={newTask.status || "todo"}
                                            onValueChange={(value) =>
                                                setNewTask({ ...newTask, status: value })
                                            }
                                        />
                                        <PrioritySelect
                                            value={newTask.priority || "medium"}
                                            onValueChange={(value) =>
                                                setNewTask({ ...newTask, priority: value })
                                            }
                                        />
                                    </div>

                                    {/* Tags */}
                                    <TagsSelect
                                        selected={newTask.tags || []}
                                        onChange={(tags) => setNewTask({ ...newTask, tags })}
                                        options={currentProject?.tags || []}
                                    />

                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center space-x-2 mb-4">
                                            <Checkbox
                                                id="show-reward"
                                                checked={showRewardSection}
                                                onCheckedChange={(checked) => setShowRewardSection(checked === true)}
                                            />
                                            <label
                                                htmlFor="show-reward"
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                                            >
                                                Add Bounty / Payment
                                                <Badge variant="outline" className="text-[10px] h-5">Optional</Badge>
                                            </label>
                                        </div>

                                        {showRewardSection && (
                                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg space-y-4 animate-in fade-in slide-in-from-top-2">
                                                <RewardInput
                                                    reward={newTask.reward}
                                                    rewardAmount={newTask.rewardAmount}
                                                    onRewardChange={(val) => setNewTask({ ...newTask, reward: val })}
                                                    onAmountChange={(val) => setNewTask({ ...newTask, rewardAmount: val })}
                                                />

                                                {/* Points and Escrow */}
                                                <div className="flex flex-col sm:flex-row gap-4">
                                                    <div className="flex-1">
                                                        <TaskPointsInput />
                                                    </div>
                                                    <div className="flex-1 flex items-end pb-2">
                                                        <div className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id="escrow-enable"
                                                                checked={newTask.escrowEnabled}
                                                                onCheckedChange={(c) => setNewTask({ ...newTask, escrowEnabled: c === true })}
                                                            />
                                                            <div className="grid gap-1.5 leading-none">
                                                                <label
                                                                    htmlFor="escrow-enable"
                                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                                >
                                                                    Enable Escrow
                                                                </label>
                                                                <p className="text-xs text-muted-foreground">
                                                                    Funds will be locked until task completion
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Open Bounty Toggle */}
                                                <div className="flex items-center space-x-2 pt-2">
                                                    <Checkbox
                                                        id="open-bounty"
                                                        checked={newTask.isOpenBounty}
                                                        onCheckedChange={(c) => {
                                                            const isBounty = c === true;
                                                            setNewTask({
                                                                ...newTask,
                                                                isOpenBounty: isBounty,
                                                                assigneeId: isBounty ? undefined : newTask.assigneeId
                                                            });
                                                        }}
                                                    />
                                                    <div className="grid gap-1.5 leading-none">
                                                        <label
                                                            htmlFor="open-bounty"
                                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                                                        >
                                                            Open Bounty
                                                            <AlertCircle className="h-3 w-3 text-amber-500" />
                                                        </label>
                                                        <p className="text-xs text-muted-foreground">
                                                            Allow any contributor to apply for this task
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* People Assignment */}
                                    {!newTask.isOpenBounty && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold uppercase text-muted-foreground">Assignee</Label>
                                                <UserSearchSelect
                                                    users={availableUsers}
                                                    value={newTask.assigneeId || ""}
                                                    onChange={(val) => setNewTask({ ...newTask, assigneeId: val })}
                                                    placeholder="Select Assignee"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold uppercase text-muted-foreground">Reviewer</Label>
                                                <UserSearchSelect
                                                    users={availableUsers}
                                                    value={newTask.reviewerId || ""}
                                                    onChange={(val) => setNewTask({ ...newTask, reviewerId: val })}
                                                    placeholder="Select Reviewer"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <DialogFooter className="mt-8">
                                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleCreateTask} disabled={isLoading}>
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="mr-2 h-4 w-4" />
                                                Create Task
                                            </>
                                        )}
                                    </Button>
                                </DialogFooter>

                            </div>
                        </ResizablePanel>
                    </ResizablePanelGroup>

                    {/* Predictor Sidebar */}
                    <div className="w-80 border-l border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4 hidden md:block overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-sm flex items-center gap-2">
                                <Wand2 className="h-4 w-4 text-purple-500" />
                                AI Assistant
                            </h3>
                            <div className="flex items-center gap-2">
                                <Label htmlFor="ai-mode" className="text-xs text-muted-foreground cursor-pointer">Auto</Label>
                                <Checkbox
                                    id="ai-mode"
                                    checked={useAIEstimator}
                                    onCheckedChange={(c) => setUseAIEstimator(c === true)}
                                />
                            </div>
                        </div>

                        <div className="text-sm text-muted-foreground mb-4">
                            Enable AI to estimate cost and complexity based on task details.
                        </div>

                        {useAIEstimator && (
                            <TaskPredictorSidebar
                                title={newTask.title || ""}
                                description={newTask.description || ""}
                                onEstimateComplete={(estimate) => setAiEstimate(estimate)}
                            />
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog >
    );
}
