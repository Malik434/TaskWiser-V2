"use client";

import { DialogTrigger } from "@/components/ui/dialog";

import type React from "react";

import { useState, useEffect, useRef, useMemo } from "react";
import { ethers } from "ethers";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useFirebase } from "./firebase-provider";
import { useWeb3 } from "./web3-provider";
import { Button } from "@/components/ui/button";
import { UserSearchSelect } from "./user-search-select";
import { TaskCard } from "./task-card";
import { StatusSelect, PrioritySelect, RewardInput, TaskPointsInput, TagsSelect } from "./task-form-fields";
import {
  Loader2,
  CheckCircle,
  CircleEllipsis,
  Circle,
  Clock,
  Edit,
  Trash2,
  User,
  Calendar,
  MoreHorizontal,
  XCircle,
  ChevronLeft,
  Search,
  Plus,
  Filter,
  SortDesc,
  UserCircle,
  FileEdit,
  AlertCircle,
  CreditCard,
  RotateCcw,
  CheckSquare,
  Download,
  HelpCircle,
  Square,
  Check,
  FileText,
  DollarSign,
  Award,
  Lock,
  X,
  ChevronUp,
  Tag,
  ChevronDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Task, TaskProposal, UserProfile, Project, EventLogs } from "@/lib/types";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PaymentPopup } from "./payment-popup";
import { PaymentComponent, type SupportedToken } from "./payment-component";
import { EscrowPopup } from "./escrow-popup";
import { DisputeDialog } from "./dispute-dialog";
import { lockEscrow, refundEscrowByAssignee, getEscrowDetails, EscrowStatus } from "@/lib/escrow-contract";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { deleteField } from "firebase/firestore";
import { ThreeBackground } from "./three-bg";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { estimateTaskCostUSD, type CostEstimate } from "@/lib/cost-estimator";
import { TaskPredictorSidebar } from "./task-predictor-sidebar";
import { SPECIALTY_OPTIONS } from "@/lib/constants";

type Column = {
  id: string;
  title: string;
  icon: React.ReactNode;
  tasks: Task[];
  count: number;
};

export function KanbanBoard({ projectId }: { projectId?: string } = {}) {
  const {
    addTask,
    addTaskWithId,
    getTasks,
    getAllTasks,
    updateTask,
    deleteTask,
    isInitialized,
    getUserProfiles,
    getUserProfile,
    getUserProfileById,
    getProjectById,
    getJoinRequestsForProject,
    respondToProjectJoinRequest,
    inviteUserToProject,
    logEvent,
    createDispute,
  } = useFirebase();
  const { account, signer, provider } = useWeb3();
  const { toast } = useToast();
  const [columns, setColumns] = useState<Column[]>([
    {
      id: "todo",
      title: "To Do",
      icon: <Circle className="h-5 w-5 text-gray-400" />,
      tasks: [],
      count: 0,
    },
    {
      id: "inprogress",
      title: "In Progress",
      icon: <Clock className="h-5 w-5 text-yellow-500" />,
      tasks: [],
      count: 0,
    },
    {
      id: "review",
      title: "In Review",
      icon: <CircleEllipsis className="h-5 w-5 text-blue-500" />,
      tasks: [],
      count: 0,
    },
    {
      id: "done",
      title: "Done",
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      tasks: [],
      count: 0,
    },
  ]);
  const [newTask, setNewTask] = useState<
    Omit<Task, "id" | "userId" | "createdAt">
  >({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    isOpenBounty: false,
    escrowEnabled: false,
    tags: [],
  });

  // Real-time cost estimate (admin-only UI will render this)
  const costEstimate = useMemo(() =>
    estimateTaskCostUSD({
      title: newTask.title || "",
      description: newTask.description || "",
      tags: newTask.tags || [],
      priority: newTask.priority || "medium",
    }),
    [newTask.title, newTask.description, newTask.tags, newTask.priority]
  );
  // AI estimator state
  const [useAIEstimator, setUseAIEstimator] = useState(false);
  const [aiEstimate, setAiEstimate] = useState<CostEstimate | null>(null);
  const [aiEstimating, setAiEstimating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [activeView, setActiveView] = useState("all");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedTask, setEditedTask] = useState<Partial<Task>>({});
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [submissionContent, setSubmissionContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const specialtyOptions = SPECIALTY_OPTIONS;
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isManagingProposal, setIsManagingProposal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [createdTasks, setCreatedTasks] = useState<Task[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
  const [showRewardSection, setShowRewardSection] = useState(false);
  const [showAssigneeSection, setShowAssigneeSection] = useState(false);
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isProjectMember, setIsProjectMember] = useState(false);
  const [userProjectRole, setUserProjectRole] = useState<"admin" | "manager" | "contributor" | null>(null);
  // Contributor analysis states
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
  // New states for payment popup
  const [isPaymentPopupOpen, setIsPaymentPopupOpen] = useState(false);
  const [taskToPay, setTaskToPay] = useState<Task | null>(null);
  // Escrow popup states
  const [isEscrowPopupOpen, setIsEscrowPopupOpen] = useState(false);
  const [escrowTask, setEscrowTask] = useState<Task | null>(null);
  const [escrowMode, setEscrowMode] = useState<"lock" | "release">("lock");
  const [isLockingEscrow, setIsLockingEscrow] = useState(false);
  // Dispute and refund states
  const [isDisputeDialogOpen, setIsDisputeDialogOpen] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);
  const [proposalTargetTask, setProposalTargetTask] = useState<Task | null>(null);
  const [proposalContent, setProposalContent] = useState("");
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
  // Multiple Selection and batch processing
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectionContext, setSelectionContext] = useState<{ columnId: string; scope?: "unpaid" } | null>(null);
  const [isBatchPaymentOpen, setIsBatchPaymentOpen] = useState(false);
  const [batchPaymentTasks, setBatchPaymentTasks] = useState<Task[]>([]);

  // Specific loading states for better UX
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);
  const [isRealtimeSyncing, setIsRealtimeSyncing] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [isFetchingTasks, setIsFetchingTasks] = useState(false);
  const [isManageContribOpen, setIsManageContribOpen] = useState(false);
  const [pendingJoinRequests, setPendingJoinRequests] = useState<any[]>([]);
  const [isLoadingJoinReqs, setIsLoadingJoinReqs] = useState(false);
  const [respondingRequestId, setRespondingRequestId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateIsMobile = () => setIsMobile(mediaQuery.matches);
    updateIsMobile();
    mediaQuery.addEventListener("change", updateIsMobile);
    return () => mediaQuery.removeEventListener("change", updateIsMobile);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setCollapsedColumns({});
    }
  }, [isMobile]);

  // Drag state for batch operations
  const [isDraggingBatch, setIsDraggingBatch] = useState(false);
  const [draggedTasksCount, setDraggedTasksCount] = useState(0);
  const [isBatchConfirmationOpen, setIsBatchConfirmationOpen] = useState(false);
  const [pendingBatchMove, setPendingBatchMove] = useState<{
    taskIds: string[];
    destination: string;
    sourceColumn: string;
  } | null>(null);
  const [isProcessingBatchMove, setIsProcessingBatchMove] = useState(false);

  // Refs for debouncing and version tracking
  const fetchAllTasksRef = useRef<NodeJS.Timeout | null>(null);
  const taskVersionsRef = useRef<Map<string, string>>(new Map());

  const firebase = useFirebase();
  const isProjectView = Boolean(projectId);
  
  // Check if user is a contributor (limited permissions)
  const isContributor = projectId && userProjectRole === "contributor";
  const canCreateTasks = !isContributor; // Contributors cannot create tasks
  const canDragTasks = !isContributor; // Contributors cannot drag tasks
  const canProcessBatchPayment = projectId ? userProjectRole === "admin" : true; // Only admins can process batch payments in projects
  
  const generateId = () =>
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  const formatAddress = (address?: string | null) => {
    if (!address) return "Unknown";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  
  // Helper function to log events
  const logEventHelper = async (
    action: EventLogs["action"],
    taskId?: string,
    meta?: EventLogs["meta"],
    description?: string
  ) => {
    if (!account || !logEvent) return;
    
    try {
      const actorProfile = await getUserProfile(account).catch(() => null);
      const actor = actorProfile?.username || formatAddress(account);
      const actorId = actorProfile?.id || account;

      await logEvent({
        taskId: taskId || undefined,
        projectId: projectId || undefined,
        actor,
        actorId,
        action,
        meta: meta || undefined,
        description,
      });
    } catch (error) {
      // Silently fail event logging to not interrupt main flow
      console.error("Failed to log event:", error);
    }
  };
  
  const parsePositiveNumber = (value: string): number | undefined => {
    if (!value.trim()) {
      return undefined;
    }
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return undefined;
    }
    return Math.abs(parsed);
  };
  const toSupportedToken = (token?: string | null): SupportedToken | null => {
    if (!token) return null;
    const normalized = token.toUpperCase();
    return normalized === "USDC" || normalized === "USDT"
      ? (normalized as SupportedToken)
      : null;
  };
  const resolveAssigneeWallet = (task: Task) => {
    const candidateId = task.assigneeId || task.assignee?.id;
    if (!candidateId) return null;
    const profile =
      availableUsers.find((user) => user.id === candidateId) ||
      availableUsers.find((user) => user.address === candidateId);
    if (profile?.address) {
      return profile.address;
    }
    if (ethers.isAddress(candidateId)) {
      return candidateId;
    }
    return null;
  };
  const openBatchPaymentDialog = (tasks: Task[]) => {
    if (!tasks.length) {
      toast({
        title: "No payable tasks selected",
        description: "Select at least one unpaid task with a reward to continue.",
        variant: "destructive",
      });
      return;
    }
    setBatchPaymentTasks(tasks);
    setIsBatchPaymentOpen(true);
  };
  const syncTaskAcrossState = (updatedTask: Task) => {
    const updater = (task: Task) =>
      task.id === updatedTask.id ? updatedTask : task;
    setAllTasks((prev) => prev.map(updater));
    setCreatedTasks((prev) => prev.map(updater));
    setAssignedTasks((prev) => prev.map(updater));
    setColumns((prev) =>
      prev.map((column) => ({
        ...column,
        tasks: column.tasks.map(updater),
      }))
    );
  };

  const loadJoinRequests = async () => {
    if (!currentProject) return;
    setIsLoadingJoinReqs(true);
    try {
      const reqs = await getJoinRequestsForProject(currentProject.id);
      const enriched = await Promise.all(
        reqs.map(async (r: any) => ({
          ...r,
          applicantProfile: await getUserProfileById(r.applicantUserId),
        }))
      );
      setPendingJoinRequests(enriched);
    } catch (error) {
      console.error("Error loading join requests:", error);
      toast({ title: "Error", description: "Failed to load join requests", variant: "destructive" });
    } finally {
      setIsLoadingJoinReqs(false);
    }
  };

  useEffect(() => {
    if (isManageContribOpen && currentProject) {
      loadJoinRequests();
    }
  }, [isManageContribOpen, currentProject]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const users = await getUserProfiles();
      setAvailableUsers(users);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (account && isInitialized) {
      fetchUsers();
      // fetch and cache current user's profile id for UI comparisons
      (async () => {
        try {
          const p = await getUserProfile(account);
          setCurrentUserId(p ? p.id : null);
        } catch (e) {
          console.warn("Could not load current user profile id", e);
          setCurrentUserId(null);
        }
      })();

      // Initialize analysis tag from task tags
      const tags = newTask.tags || [];
      if (tags.length > 0) {
        setAnalysisTag(tags[0]);
      }
      
      // Set up real-time listeners
      const unsubscribe = setupRealtimeListeners();
      
      // Cleanup function to unsubscribe from listeners
      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }
  }, [account, isInitialized, projectId]);

  useEffect(() => {
    if (selectedTask) {
      setEditedTask({
        title: selectedTask.title,
        description: selectedTask.description,
        priority: selectedTask.priority,
        reward: selectedTask.reward,
        rewardAmount: selectedTask.rewardAmount,
        assigneeId: selectedTask.assigneeId,
        reviewerId: selectedTask.reviewerId,
        isOpenBounty: selectedTask.isOpenBounty,
        escrowEnabled: selectedTask.escrowEnabled,
        tags: selectedTask.tags || [],
      });
    }
  }, [selectedTask, isEditMode]);

  // Update analysis tag when task tags change
  useEffect(() => {
    const tags = newTask.tags || [];
    if (tags.length > 0 && tags[0] !== analysisTag) {
      setAnalysisTag(tags[0]);
    } else if (tags.length === 0 && analysisTag) {
      setAnalysisTag(null);
    }
  }, [newTask.tags]);

  // Compute contributor analysis when dialog opens or data changes
  useEffect(() => {
    if (!isDialogOpen || !availableUsers.length || !allTasks.length) {
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
    
    // Set recommended contributor (top performer with availability)
    const recommended = sorted.find((s) => s.totalAssigned > 0 && s.isMember);
    setRecommendedContributor(recommended?.user || null);
  }, [isDialogOpen, availableUsers, allTasks, analysisTag, newTask.tags, currentProject]);

  // Update columns whenever the active view or tasks change
  useEffect(() => {
    updateColumnsBasedOnView();
  }, [activeView, allTasks, createdTasks, assignedTasks]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isSelectionMode) {
          clearSelection();
        }
      }

      // Ctrl/Cmd + Shift + P: Process batch payment (if tasks selected and has permission)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "P") {
        if (selectedTasks.size > 0 && canProcessBatchPayment) {
          e.preventDefault();
          const allTasks = columns.flatMap((col) => col.tasks);
          const selection = Array.from(selectedTasks)
            .map((id) => allTasks.find((task) => task.id === id))
            .filter((task): task is Task => {
              if (!task) return false;
              if (!task.reward || !task.rewardAmount) return false;
              if (task.paid) return false;
              return true;
            });
          openBatchPaymentDialog(selection);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSelectionMode, selectedTasks, canProcessBatchPayment, columns]);

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (fetchAllTasksRef.current) {
        clearTimeout(fetchAllTasksRef.current);
      }
    };
  }, []);

  if (!isInitialized) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Initializing Firebase...
          </p>
        </div>
      </div>
    );
  }

  const [undoStack, setUndoStack] = useState<
    Array<{
      action: string;
      task: Task;
      previousState: Partial<Task>;
    }>
  >([]);

  const addToUndoStack = (
    action: string,
    task: Task,
    previousState: Partial<Task>
  ) => {
    setUndoStack((prev) => [
      ...prev.slice(-9),
      { action, task, previousState },
    ]);
  };

  const handleUndo = async () => {
    if (undoStack.length === 0) return;

    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));

    try {
      await updateTask(lastAction.task.id, lastAction.previousState);
      await fetchAllTasks();

      toast({
        title: "Action undone",
        description: `Reverted: ${lastAction.action}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to undo action",
        variant: "destructive",
      });
    }
  };

  // Debounced fetch to prevent multiple rapid calls
  const debouncedFetchAllTasks = () => {
    if (fetchAllTasksRef.current) {
      clearTimeout(fetchAllTasksRef.current);
    }
    fetchAllTasksRef.current = setTimeout(() => {
      fetchAllTasks();
    }, 300);
  };

  // Version-checked task update to handle race conditions
  const updateTaskWithVersionCheck = async (
    taskId: string,
    updates: Partial<Task>
  ) => {
    const currentVersion = new Date().toISOString();
    taskVersionsRef.current.set(taskId, currentVersion);

    try {
      await updateTask(taskId, {
        ...updates,
        updatedAt: currentVersion,
      });

      // Only proceed if this is still the latest version
      if (taskVersionsRef.current.get(taskId) === currentVersion) {
        return true;
      }
      return false;
    } catch (error) {
      throw error;
    }
  };

  // Safe Firebase operation wrapper with error handling
  const safeFirebaseOperation = async <T,>(
    operation: () => Promise<T>,
    errorMessage: string
  ): Promise<T | null> => {
    try {
      return await operation();
    } catch (error) {
      console.error(`Firebase error: ${errorMessage}`, error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    }
  };

  // Export selected tasks to CSV
  const exportTasksToCSV = () => {
    const tasksToExport = getSelectedTasksDetails();
    if (tasksToExport.length === 0) {
      toast({
        title: "No tasks selected",
        description: "Please select tasks to export",
      });
      return;
    }

    const headers = [
      "Title",
      "Description",
      "Status",
      "Priority",
      "Reward",
      "Amount",
      "Assignee",
      "Paid",
    ];
    const rows = tasksToExport.map((task) => [
      task.title,
      task.description || "",
      task.status,
      task.priority,
      task.reward || "",
      task.rewardAmount?.toString() || "",
      task.assignee?.username || "Unassigned",
      task.paid ? "Yes" : "No",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tasks-export-${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: `Exported ${tasksToExport.length} tasks to CSV`,
    });
  };

  const fetchAllTasks = async () => {
    if (!account) return;

    setIsLoading(true);
    try {
      let allFetchedTasks: Task[] = [];

      if (projectId) {
        // For project board: first check if user is a member
        const project = await getProjectById(projectId);
        setCurrentProject(project);
        
        if (!project) {
          toast({
            title: "Project not found",
            description: "The project you're looking for doesn't exist",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // Get current user's profile to check membership
        const userProfile = await getUserProfile(account);
        const userId = userProfile?.id || account;

        // Check if user is the creator OR a project member
        const isCreator = project.createdBy === account;
        const memberInfo = project.members?.find(
          (member: any) => member.userId === userId && member.isActive
        );
        
        const isMember = !!memberInfo;
        setIsProjectMember(isCreator || isMember);

        // Set user's role in the project
        if (isCreator) {
          setUserProjectRole("admin");
        } else if (memberInfo) {
          setUserProjectRole(memberInfo.role);
        } else {
          setUserProjectRole(null);
        }

        if (!isCreator && !isMember) {
          toast({
            title: "Access Denied",
            description: "You are not a member of this project",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // Fetch all tasks and filter by projectId
        const allTasks = await getAllTasks();
        allFetchedTasks = allTasks.filter(
          (task: Task) => (task as any).projectId === projectId
        );
      } else {
        // For personal board: reset project-specific states
        setCurrentProject(null);
        setIsProjectMember(false);
        setUserProjectRole(null);
        
        // Fetch tasks created by user
        const userCreatedTasks = await getTasks(account);
        setCreatedTasks(userCreatedTasks);

        // Fetch tasks assigned to the user from Firestore
        const db = firebase.db;
        if (!db) {
          console.error("Firestore is not initialized");
          return;
        }

        const { collection, query, where, getDocs } = await import(
          "firebase/firestore"
        );
        // Resolve assignee lookup id (prefer user profile id, fallback to wallet address)
        let assigneeLookupId = account;
        try {
          const _profile = await getUserProfile(account);
          if (_profile && _profile.id) assigneeLookupId = _profile.id;
        } catch (e) {
          console.warn("Could not resolve user profile for assignee lookup", e);
        }

        const q = query(
          collection(db, "tasks"),
          where("assigneeId", "==", assigneeLookupId)
        );
        const querySnapshot = await getDocs(q);
        const assignedTasksData = querySnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Task)
        );
        setAssignedTasks(assignedTasksData);

        // Combine both sets of tasks, removing duplicates
        const combinedTasks = [...userCreatedTasks];

        assignedTasksData.forEach((assignedTask) => {
          if (!combinedTasks.some((task) => task.id === assignedTask.id)) {
            combinedTasks.push(assignedTask);
          }
        });

        allFetchedTasks = combinedTasks;
      }

      // After fetching tasks, ensure assignee/reviewer information is populated
      const tasksWithAssigneeInfo = await Promise.all(
        allFetchedTasks.map(async (task) => {
          let enrichedTask: Task = task;
          if (task.assigneeId) {
            try {
              const assigneeProfile = await getUserProfileById(task.assigneeId);
              if (assigneeProfile) {
                enrichedTask = {
                  ...enrichedTask,
                  assignee: {
                    id: assigneeProfile.id,
                    username: assigneeProfile.username,
                    profilePicture: assigneeProfile.profilePicture,
                  },
                };
              }
            } catch (error) {
              console.error("Error fetching assignee profile:", error);
            }
          }

          if (task.reviewerId) {
            try {
              const reviewerProfile = await getUserProfileById(task.reviewerId);
              if (reviewerProfile) {
                enrichedTask = {
                  ...enrichedTask,
                  reviewer: {
                    id: reviewerProfile.id,
                    username: reviewerProfile.username,
                    profilePicture: reviewerProfile.profilePicture,
                  },
                };
              }
            } catch (error) {
              console.error("Error fetching reviewer profile:", error);
            }
          }

          return enrichedTask;
        })
      );

      setAllTasks(tasksWithAssigneeInfo);

      updateColumnsWithTasks(tasksWithAssigneeInfo);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast({
        title: "Error",
        description: "Failed to fetch tasks",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateColumnsBasedOnView = () => {
    let tasksToShow: Task[] = [];

    // For project board, always show all tasks (no view switching)
    if (projectId) {
      tasksToShow = allTasks;
    } else {
      // For personal board, allow view switching
      switch (activeView) {
        case "created":
          tasksToShow = createdTasks;
          break;
        case "assigned":
          tasksToShow = assignedTasks;
          break;
        case "all":
        default:
          tasksToShow = allTasks;
          break;
      }
    }

    updateColumnsWithTasks(tasksToShow);
  };

  const updateColumnsWithTasks = (tasks: Task[]) => {
    // Remove duplicate tasks by id to prevent duplicate keys during rendering
    const seen = new Set<string>();
    const uniqueTasks = tasks.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });

    // Reset columns
    const updatedColumns = columns.map((column) => ({
      ...column,
      tasks: [] as Task[],
      count: 0,
    }));

    // Distribute tasks to columns
    uniqueTasks.forEach((task) => {
      const columnIndex = updatedColumns.findIndex(
        (col) => col.id === task.status
      );
      if (columnIndex !== -1) {
        updatedColumns[columnIndex].tasks.push(task);
        updatedColumns[columnIndex].count =
          updatedColumns[columnIndex].tasks.length;
      }
    });

    setColumns(updatedColumns);
  };

  // Setup real-time listeners for tasks
  const setupRealtimeListeners = () => {
    if (!account || !firebase.db) return;

    setIsLoading(true);
    let unsubscribeTasks: (() => void) | null = null;

    (async () => {
      try {
        const { collection, query, where, onSnapshot } = await import(
          "firebase/firestore"
        );

        if (projectId) {
          // For project board: verify membership first
          const project = await getProjectById(projectId);
          setCurrentProject(project);
          
          if (!project) {
            toast({
              title: "Project not found",
              description: "The project you're looking for doesn't exist",
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }

          // Get current user's profile to check membership
          const userProfile = await getUserProfile(account);
          const userId = userProfile?.id || account;

          // Check if user is the creator OR a project member
          const isCreator = project.createdBy === account;
          const memberInfo = project.members?.find(
            (member: any) => member.userId === userId && member.isActive
          );
          
          const isMember = !!memberInfo;
          setIsProjectMember(isCreator || isMember);

          // Set user's role in the project
          if (isCreator) {
            setUserProjectRole("admin");
          } else if (memberInfo) {
            setUserProjectRole(memberInfo.role);
          } else {
            setUserProjectRole(null);
          }

          if (!isCreator && !isMember) {
            toast({
              title: "Access Denied",
              description: "You are not a member of this project",
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }

          // Set up real-time listener for project tasks
          const projectTasksQuery = query(
            collection(firebase.db!, "tasks"),
            where("projectId", "==", projectId)
          );

          unsubscribeTasks = onSnapshot(
            projectTasksQuery,
            async (snapshot) => {
              console.log("Real-time update: Project tasks changed");
              setIsRealtimeSyncing(true);
              const tasks = await Promise.all(
                snapshot.docs.map(async (doc) => {
                  const taskData = { id: doc.id, ...doc.data() } as Task;
                  
                  // Populate assignee/reviewer info if needed
                  if (taskData.assigneeId && !taskData.assignee) {
                    try {
                      const assigneeProfile = await getUserProfileById(taskData.assigneeId);
                      if (assigneeProfile) {
                        taskData.assignee = {
                          id: assigneeProfile.id,
                          username: assigneeProfile.username,
                          profilePicture: assigneeProfile.profilePicture,
                        };
                      }
                    } catch (e) {
                      console.warn("Could not fetch assignee profile", e);
                    }
                  }

                  if (taskData.reviewerId && !taskData.reviewer) {
                    try {
                      const reviewerProfile = await getUserProfileById(taskData.reviewerId);
                      if (reviewerProfile) {
                        taskData.reviewer = {
                          id: reviewerProfile.id,
                          username: reviewerProfile.username,
                          profilePicture: reviewerProfile.profilePicture,
                        };
                      }
                    } catch (e) {
                      console.warn("Could not fetch reviewer profile", e);
                    }
                  }

                  return taskData;
                })
              );

              setAllTasks(tasks);
              setCreatedTasks(tasks);
              setIsLoading(false);
              setTimeout(() => setIsRealtimeSyncing(false), 1000);
            },
            (error) => {
              console.error("Error in real-time listener:", error);
              toast({
                title: "Connection Error",
                description: "Failed to sync tasks. Please refresh the page.",
                variant: "destructive",
              });
              setIsLoading(false);
            }
          );
        } else {
          // For personal board: reset project-specific states
          setCurrentProject(null);
          setIsProjectMember(false);
          setUserProjectRole(null);

          // Get user profile ID for assignee lookup
          let assigneeLookupId = account;
          try {
            const _profile = await getUserProfile(account);
            if (_profile && _profile.id) assigneeLookupId = _profile.id;
          } catch (e) {
            console.warn("Could not resolve user profile for assignee lookup", e);
          }

          // Set up real-time listener for tasks created by user
          const createdTasksQuery = query(
            collection(firebase.db!, "tasks"),
            where("userId", "==", account)
          );

          // Set up real-time listener for tasks assigned to user
          const assignedTasksQuery = query(
            collection(firebase.db!, "tasks"),
            where("assigneeId", "==", assigneeLookupId)
          );

          let createdTasksData: Task[] = [];
          let assignedTasksData: Task[] = [];

          const unsubscribeCreated = onSnapshot(
            createdTasksQuery,
            async (snapshot) => {
              console.log("Real-time update: Created tasks changed");
              setIsRealtimeSyncing(true);
              createdTasksData = await Promise.all(
                snapshot.docs.map(async (doc) => {
                  const taskData = { id: doc.id, ...doc.data() } as Task;
                  
                  // Populate assignee/reviewer info
                  if (taskData.assigneeId && !taskData.assignee) {
                    try {
                      const assigneeProfile = await getUserProfileById(taskData.assigneeId);
                      if (assigneeProfile) {
                        taskData.assignee = {
                          id: assigneeProfile.id,
                          username: assigneeProfile.username,
                          profilePicture: assigneeProfile.profilePicture,
                        };
                      }
                    } catch (e) {
                      console.warn("Could not fetch assignee profile", e);
                    }
                  }

                  if (taskData.reviewerId && !taskData.reviewer) {
                    try {
                      const reviewerProfile = await getUserProfileById(taskData.reviewerId);
                      if (reviewerProfile) {
                        taskData.reviewer = {
                          id: reviewerProfile.id,
                          username: reviewerProfile.username,
                          profilePicture: reviewerProfile.profilePicture,
                        };
                      }
                    } catch (e) {
                      console.warn("Could not fetch reviewer profile", e);
                    }
                  }

                  return taskData;
                })
              );

              setCreatedTasks(createdTasksData);
              
              // Combine and update allTasks
              const combined = [...createdTasksData];
              assignedTasksData.forEach((assignedTask) => {
                if (!combined.some((task) => task.id === assignedTask.id)) {
                  combined.push(assignedTask);
                }
              });
              setAllTasks(combined);
              setIsLoading(false);
              setTimeout(() => setIsRealtimeSyncing(false), 1000);
            },
            (error) => {
              console.error("Error in created tasks listener:", error);
              setIsLoading(false);
            }
          );

          const unsubscribeAssigned = onSnapshot(
            assignedTasksQuery,
            async (snapshot) => {
              console.log("Real-time update: Assigned tasks changed");
              setIsRealtimeSyncing(true);
              assignedTasksData = await Promise.all(
                snapshot.docs.map(async (doc) => {
                  const taskData = { id: doc.id, ...doc.data() } as Task;
                  
                  // Populate assignee/reviewer info
                  if (taskData.assigneeId && !taskData.assignee) {
                    try {
                      const assigneeProfile = await getUserProfileById(taskData.assigneeId);
                      if (assigneeProfile) {
                        taskData.assignee = {
                          id: assigneeProfile.id,
                          username: assigneeProfile.username,
                          profilePicture: assigneeProfile.profilePicture,
                        };
                      }
                    } catch (e) {
                      console.warn("Could not fetch assignee profile", e);
                    }
                  }

                  if (taskData.reviewerId && !taskData.reviewer) {
                    try {
                      const reviewerProfile = await getUserProfileById(taskData.reviewerId);
                      if (reviewerProfile) {
                        taskData.reviewer = {
                          id: reviewerProfile.id,
                          username: reviewerProfile.username,
                          profilePicture: reviewerProfile.profilePicture,
                        };
                      }
                    } catch (e) {
                      console.warn("Could not fetch reviewer profile", e);
                    }
                  }

                  return taskData;
                })
              );

              setAssignedTasks(assignedTasksData);
              
              // Combine and update allTasks
              const combined = [...createdTasksData];
              assignedTasksData.forEach((assignedTask) => {
                if (!combined.some((task) => task.id === assignedTask.id)) {
                  combined.push(assignedTask);
                }
              });
              setAllTasks(combined);
              setIsLoading(false);
              setTimeout(() => setIsRealtimeSyncing(false), 1000);
            },
            (error) => {
              console.error("Error in assigned tasks listener:", error);
              setIsLoading(false);
            }
          );

          // Return combined unsubscribe function
          unsubscribeTasks = () => {
            unsubscribeCreated();
            unsubscribeAssigned();
          };
        }
      } catch (error) {
        console.error("Error setting up real-time listeners:", error);
        toast({
          title: "Error",
          description: "Failed to initialize real-time updates",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    })();

    // Return cleanup function
    return () => {
      if (unsubscribeTasks) {
        unsubscribeTasks();
      }
    };
  };

  const handleCreateTask = async () => {
    if (!account) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to create tasks",
        variant: "destructive",
      });
      return;
    }

    if (!newTask.title) {
      toast({
        title: "Missing information",
        description: "Please provide a task title",
        variant: "destructive",
      });
      return;
    }

    // Escrow validation
    if (newTask.escrowEnabled) {
      // Only admin can create escrow tasks
      if (projectId && userProjectRole !== "admin") {
        toast({
          title: "Permission denied",
          description: "Only project admins can create escrow-enabled tasks",
          variant: "destructive",
        });
        return;
      }

      // Escrow requires reward and assignee (or open bounty)
      if (!newTask.reward || !newTask.rewardAmount || newTask.rewardAmount <= 0) {
        toast({
          title: "Escrow requires reward",
          description: "Please provide a reward amount when escrow is enabled",
          variant: "destructive",
        });
        return;
      }

      // If not open bounty, assignee is required for escrow
      if (!newTask.isOpenBounty && !newTask.assigneeId) {
        toast({
          title: "Escrow requires assignee",
          description: "Please assign a contributor or enable open bounty when escrow is enabled",
          variant: "destructive",
        });
        return;
      }

      // For open bounty with escrow, escrow will be locked when proposal is approved
      // For direct assignment with escrow, we need to lock before creating task
      // But we need task ID first, so we'll create task then lock escrow
      // Actually, let's create task first, then show escrow popup if needed
    }

    setIsCreatingTask(true);

    try {
      const timestamp = new Date().toISOString();
      
      // Build task object without undefined fields
      const taskToCreate: any = {
        title: newTask.title,
        description: newTask.description || "",
        status: newTask.status,
        priority: newTask.priority,
        userId: account,
        createdAt: timestamp,
        updatedAt: timestamp,
        isOpenBounty: Boolean(newTask.isOpenBounty),
        escrowEnabled: Boolean(newTask.escrowEnabled),
        // Persist estimated cost for reporting/analytics
        estimatedCostUSD: useAIEstimator && aiEstimate ? aiEstimate.totalUSD : costEstimate?.totalUSD,
        estimatedHours: useAIEstimator && aiEstimate ? aiEstimate.estimatedHours : costEstimate?.estimatedHours,
      };

      // Only add optional fields if they have values
      if (newTask.reward && newTask.reward !== "no_reward") {
        taskToCreate.reward = newTask.reward;
      }
      if (newTask.rewardAmount) {
        taskToCreate.rewardAmount = newTask.rewardAmount;
      }
      if (newTask.isOpenBounty) {
        taskToCreate.assigneeId = null;
      } else if (newTask.assigneeId) {
        taskToCreate.assigneeId = newTask.assigneeId;
      }
      if (newTask.reviewerId) {
        taskToCreate.reviewerId = newTask.reviewerId;
      }
      if (newTask.tags && newTask.tags.length > 0) {
        taskToCreate.tags = newTask.tags;
      }
      if (projectId) {
        taskToCreate.projectId = projectId;
      }
      if (newTask.escrowEnabled) {
        // For open bounty, escrow will be locked when proposal is approved
        // For direct assignment, escrow will be locked after task creation
        if (newTask.isOpenBounty) {
          taskToCreate.escrowStatus = "pending"; // Will be locked when proposal approved
        } else {
          taskToCreate.escrowStatus = "pending"; // Will be locked via popup
        }
      }
      if (newTask.isOpenBounty) {
        taskToCreate.proposals = [];
      }

      console.log("Creating task with data:", taskToCreate);
      const taskId = await addTask(taskToCreate);
      
      if (!taskId) {
        throw new Error("Failed to create task - no ID returned");
      }
      
      console.log("Task created successfully with ID:", taskId);

      // If an assignee was selected, find their details
      let assignee;
      if (newTask.assigneeId) {
        const assigneeProfile = availableUsers.find(
          (user) => user.id === newTask.assigneeId
        );
        if (assigneeProfile) {
          assignee = {
            id: assigneeProfile.id,
            username: assigneeProfile.username,
            profilePicture: assigneeProfile.profilePicture,
          };
        }
      }

      // Auto-invite assignee to project if not already a member
      if (currentProject && newTask.assigneeId && !newTask.isOpenBounty) {
        const isMember = !!currentProject.members?.some(
          (m) => m.userId === newTask.assigneeId
        );
        if (!isMember) {
          try {
            await inviteUserToProject(
              currentProject.id,
              newTask.assigneeId,
              account,
              currentProject.title
            );
            toast({ title: "Invitation sent" });
          } catch (e) {
            console.error("Failed to auto-invite assignee:", e);
            toast({ title: "Failed to send invite", variant: "destructive" });
          }
        }
      }

      let reviewer;
      if (newTask.reviewerId) {
        const reviewerProfile = availableUsers.find(
          (user) => user.id === newTask.reviewerId
        );
        if (reviewerProfile) {
          reviewer = {
            id: reviewerProfile.id,
            username: reviewerProfile.username,
            profilePicture: reviewerProfile.profilePicture,
          };
        }
      }

      const newTaskWithId: Task = {
        ...taskToCreate,
        id: taskId,
        assignee,
        reviewer,
      };

      // Real-time listeners will handle the updates automatically
      // But we update local state for immediate UI feedback
      setCreatedTasks((prev) => [...prev, newTaskWithId]);
      setAllTasks((prev) => [...prev, newTaskWithId]);

      // If the task is assigned to the current user, add it to assignedTasks too
      try {
        const currentProfile = await getUserProfile(account);
        const currentUserId = currentProfile?.id;
        if (
          newTask.assigneeId &&
          currentUserId &&
          newTask.assigneeId === currentUserId
        ) {
          setAssignedTasks((prev) => [...prev, newTaskWithId]);
        }
      } catch (e) {
        // fallback: if profile lookup fails and assigneeId equals wallet address
        if (newTask.assigneeId === account) {
          setAssignedTasks((prev) => [...prev, newTaskWithId]);
        }
      }

      // Train ML model if cost is provided
      if (newTask.rewardAmount && newTask.rewardAmount > 0) {
        fetch("/api/update-model", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newTask.title,
            description: newTask.description || "",
            tags: newTask.tags || [],
            actual_cost: Number(newTask.rewardAmount)
          })
        }).catch(e => console.error("Model update failed", e));
      }

      // Update columns based on current view
      updateColumnsBasedOnView();
      
      // Real-time listeners will sync any changes from Firestore automatically

      // If escrow is enabled and assignee exists (not open bounty), show escrow lock popup
      if (newTask.escrowEnabled && !newTask.isOpenBounty && newTask.assigneeId) {
        setEscrowTask(newTaskWithId);
        setEscrowMode("lock");
        setIsEscrowPopupOpen(true);
        // Don't close dialog yet - wait for escrow to be locked
      } else {
        setNewTask({
          title: "",
          description: "",
          status: "todo",
          priority: "medium",
          isOpenBounty: false,
          escrowEnabled: false,
          tags: [],
        });

        setIsDialogOpen(false);
        setShowRewardSection(false);

        toast({
          title: "Task created",
          description: "Your task has been created successfully",
        });

        // Log event
        await logEventHelper(
          "created",
          taskId,
          {
            title: newTask.title,
            status: newTask.status,
            priority: newTask.priority,
            hasAssignee: !!newTask.assigneeId,
            hasReward: !!newTask.reward,
            escrowEnabled: newTask.escrowEnabled || false,
            isOpenBounty: newTask.isOpenBounty || false,
          },
          `Task "${newTask.title}" created`
        );
      }
    } catch (error) {
      console.error("Error creating task:", error);
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskDetailOpen(true);
    setIsEditMode(false);
  };

  const handleEditTask = async () => {
    if (!selectedTask || !editedTask) return;

    // Prevent editing paid tasks
    if (selectedTask.paid) {
      toast({
        title: "Cannot edit paid task",
        description: "Tasks that have been paid cannot be edited",
        variant: "destructive",
      });
      return;
    }

    // Escrow edit restrictions
    if (selectedTask.escrowEnabled) {
      // Cannot remove escrow
      if (editedTask.escrowEnabled === false) {
        toast({
          title: "Cannot disable escrow",
          description: "Escrow cannot be removed from tasks that have it enabled",
          variant: "destructive",
        });
        return;
      }

      // Cannot change reward
      if (editedTask.reward && editedTask.reward !== selectedTask.reward) {
        toast({
          title: "Cannot change reward",
          description: "Reward token cannot be changed for escrow-enabled tasks",
          variant: "destructive",
        });
        return;
      }

      // Cannot change reward amount
      if (editedTask.rewardAmount !== undefined && editedTask.rewardAmount !== selectedTask.rewardAmount) {
        toast({
          title: "Cannot change reward amount",
          description: "Reward amount cannot be changed for escrow-enabled tasks",
          variant: "destructive",
        });
        return;
      }

      // Cannot change assignee
      if (editedTask.assigneeId !== undefined && editedTask.assigneeId !== selectedTask.assigneeId) {
        toast({
          title: "Cannot change assignee",
          description: "Assignee cannot be changed for escrow-enabled tasks",
          variant: "destructive",
        });
        return;
      }
    }

    setIsUpdatingTask(true);

    try {
      // Convert "no_reward" to undefined for the reward field
      const timestamp = new Date().toISOString();
      const isOpenBountyEffective =
        typeof editedTask.isOpenBounty === "boolean"
          ? editedTask.isOpenBounty
          : selectedTask.isOpenBounty;

      const updatedTaskData = {
        ...editedTask,
        reward:
          editedTask.reward === "no_reward" ? deleteField() : editedTask.reward,
        assigneeId: isOpenBountyEffective ? null : (typeof editedTask.assigneeId !== "undefined" ? editedTask.assigneeId : selectedTask.assigneeId ?? null),
        reviewerId: typeof editedTask.reviewerId !== "undefined" ? editedTask.reviewerId : (selectedTask.reviewerId ?? null),
        isOpenBounty: isOpenBountyEffective,
        escrowEnabled: selectedTask.escrowEnabled, // Cannot change escrow status
        escrowStatus: selectedTask.escrowStatus, // Cannot change escrow status
        updatedAt: timestamp,
      };

      // If assignee changed, fetch the assignee details
      let assignee = selectedTask.assignee;
      if (isOpenBountyEffective) {
        assignee = undefined;
      } else if (
        editedTask.assigneeId &&
        editedTask.assigneeId !== selectedTask.assigneeId
      ) {
        const assigneeProfile = availableUsers.find(
          (user) => user.id === editedTask.assigneeId
        );
        if (assigneeProfile) {
          assignee = {
            id: assigneeProfile.id,
            username: assigneeProfile.username,
            profilePicture: assigneeProfile.profilePicture,
          };
        }
      }

      let reviewer = selectedTask.reviewer;
      if (
        editedTask.reviewerId &&
        editedTask.reviewerId !== selectedTask.reviewerId
      ) {
        const reviewerProfile = availableUsers.find(
          (user) => user.id === editedTask.reviewerId
        );
        if (reviewerProfile) {
          reviewer = {
            id: reviewerProfile.id,
            username: reviewerProfile.username,
            profilePicture: reviewerProfile.profilePicture,
          };
        }
      } else if (!editedTask.reviewerId) {
        reviewer = undefined;
      }

      // Normalize FieldValue to undefined for Task object (FieldValue is only for Firestore updates)
      const normalizedReward = editedTask.reward === "no_reward" ? undefined : editedTask.reward;
      const normalizedEscrowStatus = (typeof editedTask.escrowEnabled === "boolean"
        ? editedTask.escrowEnabled
        : selectedTask.escrowEnabled)
        ? (selectedTask.escrowStatus || "locked")
        : undefined;

      const updatedTask: Task = {
        ...selectedTask,
        ...editedTask,
        reward: normalizedReward,
        assignee,
        reviewer,
        isOpenBounty: updatedTaskData.isOpenBounty,
        escrowEnabled: updatedTaskData.escrowEnabled,
        escrowStatus: normalizedEscrowStatus,
        updatedAt: timestamp,
      };

      // Auto-invite edited assignee if not already a member
      const newAssigneeId = editedTask.assigneeId;
      if (
        currentProject &&
        !isOpenBountyEffective &&
        newAssigneeId &&
        newAssigneeId !== selectedTask.assigneeId
      ) {
        const isMember = !!currentProject.members?.some(
          (m) => m.userId === newAssigneeId
        );
        if (!isMember && account) {
          try {
            await inviteUserToProject(
              currentProject.id,
              newAssigneeId,
              account,
              currentProject.title
            );
            toast({ title: "Invitation sent" });
          } catch (e) {
            console.error("Failed to auto-invite assignee:", e);
            toast({ title: "Failed to send invite", variant: "destructive" });
          }
        }
      }

      await updateTask(selectedTask.id, updatedTaskData);

      // Real-time listeners will handle the updates automatically
      // But we update local state for immediate UI feedback
      syncTaskAcrossState(updatedTask);
      // Update columns based on current view
      updateColumnsBasedOnView();

      setSelectedTask(updatedTask);
      setIsEditMode(false);
      
      // Real-time listeners will sync any changes from Firestore automatically

      toast({
        title: "Task updated",
        description: "The task has been updated successfully",
      });

      // Log event - determine what changed
      const changedFields: string[] = [];
      if (editedTask.title !== undefined && editedTask.title !== selectedTask.title) changedFields.push("title");
      if (editedTask.description !== undefined && editedTask.description !== selectedTask.description) changedFields.push("description");
      if (editedTask.priority !== undefined && editedTask.priority !== selectedTask.priority) changedFields.push("priority");
      if (editedTask.assigneeId !== undefined && editedTask.assigneeId !== selectedTask.assigneeId) changedFields.push("assignee");
      if (editedTask.reviewerId !== undefined && editedTask.reviewerId !== selectedTask.reviewerId) changedFields.push("reviewer");
      if (JSON.stringify(editedTask.tags || []) !== JSON.stringify(selectedTask.tags || [])) changedFields.push("tags");

      // Log assignment change separately if assignee changed
      if (editedTask.assigneeId !== undefined && editedTask.assigneeId !== selectedTask.assigneeId) {
        await logEventHelper(
          "assigned",
          selectedTask.id,
          {
            field: "assignee",
            oldValue: selectedTask.assigneeId || "unassigned",
            newValue: editedTask.assigneeId || "unassigned",
          },
          editedTask.assigneeId 
            ? `Task assigned to new user` 
            : `Task unassigned`
        );
      }

      // Log general update for other changes
      const otherChanges = changedFields.filter(f => f !== "assignee");
      if (otherChanges.length > 0) {
        await logEventHelper(
          "updated",
          selectedTask.id,
          {
            changedFields: otherChanges,
          },
          `Task updated: ${otherChanges.join(", ")}`
        );
      }
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingTask(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;

    // Prevent deleting paid tasks
    if (selectedTask.paid) {
      toast({
        title: "Cannot delete paid task",
        description: "Tasks that have been paid cannot be deleted",
        variant: "destructive",
      });
      return;
    }

    setIsDeletingTask(true);

    try {
      await deleteTask(selectedTask.id);

      // Remove the task from our task lists
      const removeTaskFromList = (list: Task[]) =>
        list.filter((task) => task.id !== selectedTask.id);

      setAllTasks(removeTaskFromList(allTasks));
      setCreatedTasks(removeTaskFromList(createdTasks));
      setAssignedTasks(removeTaskFromList(assignedTasks));

      // Update columns based on current view
      updateColumnsBasedOnView();

      setIsTaskDetailOpen(false);
      setSelectedTask(null);

      toast({
        title: "Task deleted",
        description: "The task has been deleted successfully",
      });

      // Log event
      await logEventHelper(
        "deleted",
        selectedTask.id,
        {
          title: selectedTask.title,
          status: selectedTask.status,
        },
        `Task "${selectedTask.title}" deleted`
      );
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    } finally {
      setIsDeletingTask(false);
    }
  };

  const handleSubmitWork = async () => {
    if (!selectedTask || !submissionContent) return;

    setIsSubmitting(true);

    try {
      const submission = {
        content: submissionContent,
        submittedAt: new Date().toISOString(),
        status: "pending" as const,
      };

      const updatedTask = {
        ...selectedTask,
        submission,
        status: "review",
        updatedAt: new Date().toISOString(),
      };

      await updateTask(selectedTask.id, {
        submission,
        status: "review",
        updatedAt: new Date().toISOString(),
      });

      // Real-time listeners will handle the updates automatically
      // But we update local state for immediate UI feedback
      const updateTaskInList = (list: Task[]) =>
        list.map((task) => (task.id === updatedTask.id ? updatedTask : task));

      setAllTasks(updateTaskInList(allTasks));
      setCreatedTasks(updateTaskInList(createdTasks));
      setAssignedTasks(updateTaskInList(assignedTasks));

      // Update columns based on current view
      updateColumnsBasedOnView();

      setSelectedTask(updatedTask);
      setIsSubmitDialogOpen(false);
      setSubmissionContent("");
      
      // Real-time listeners will sync any changes from Firestore automatically

      toast({
        title: "Work submitted",
        description: "Your work has been submitted for review",
      });

      // Log event
      await logEventHelper(
        "submission_submitted",
        selectedTask.id,
        {
          fromColumn: selectedTask.status,
          toColumn: "review",
        },
        `Work submitted for task "${selectedTask.title}"`
      );
    } catch (error) {
      console.error("Error submitting work:", error);
      toast({
        title: "Error",
        description: "Failed to submit work",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTaskById = (taskId: string): Task | null => {
    if (selectedTask && selectedTask.id === taskId) {
      return selectedTask;
    }
    return (
      allTasks.find((task) => task.id === taskId) ||
      createdTasks.find((task) => task.id === taskId) ||
      assignedTasks.find((task) => task.id === taskId) ||
      null
    );
  };

  const handleProposalDialogChange = (open: boolean) => {
    if (!open) {
      setProposalTargetTask(null);
      setProposalContent("");
    }
    setIsProposalDialogOpen(open);
  };

  const handleSubmitProposal = async () => {
    if (!proposalTargetTask || !proposalContent.trim()) {
      toast({
        title: "Proposal required",
        description: "Please add details about your proposal.",
        variant: "destructive",
      });
      return;
    }
    if (!account) {
      toast({
        title: "Wallet not connected",
        description: "Connect your wallet to submit a proposal.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingProposal(true);
    try {
      const applicantProfile =
        availableUsers.find(
          (user) =>
            user.id === currentUserId ||
            user.address.toLowerCase() === account.toLowerCase()
        ) || null;
      const applicantId = applicantProfile?.id || currentUserId || account;
      const proposal = {
        id: generateId(),
        userId: applicantId,
        username: applicantProfile?.username || formatAddress(account),
        profilePicture: applicantProfile?.profilePicture,
        message: proposalContent.trim(),
        status: "pending" as const,
        submittedAt: new Date().toISOString(),
      };

      const updatedProposals: TaskProposal[] = [
        ...(proposalTargetTask.proposals || []),
        proposal,
      ];

      await updateTask(proposalTargetTask.id, {
        proposals: updatedProposals,
        isOpenBounty: true,
      });

      const updatedTask: Task = {
        ...proposalTargetTask,
        proposals: updatedProposals,
        isOpenBounty: true,
      };

      // Real-time listeners will handle the updates automatically
      // But we update local state for immediate UI feedback
      syncTaskAcrossState(updatedTask);
      if (selectedTask?.id === updatedTask.id) {
        setSelectedTask(updatedTask);
      }
      
      // Real-time listeners will sync any changes from Firestore automatically

      toast({
        title: "Proposal submitted",
        description: "Your proposal has been sent to the task owner.",
      });
      
      // Log event
      await logEventHelper(
        "proposal_submitted",
        proposalTargetTask.id,
        {
          proposalId: proposal.id,
          proposerId: applicantId,
        },
        `Proposal submitted for task "${proposalTargetTask.title}"`
      );
      
      handleProposalDialogChange(false);
    } catch (error) {
      console.error("Error submitting proposal:", error);
      toast({
        title: "Error",
        description: "Failed to submit proposal.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  const handleApproveProposal = async (taskId: string, proposalId: string) => {
    const targetTask = getTaskById(taskId);
    if (!targetTask || !targetTask.proposals) return;

    setIsManagingProposal(true);
    try {
      const proposal = targetTask.proposals.find((p) => p.id === proposalId);
      if (!proposal) {
        setIsManagingProposal(false);
        return;
      }

      const updatedProposals = targetTask.proposals.map((p) =>
        p.id === proposalId
          ? { ...p, status: "approved" as const }
          : {
              ...p,
              status:
                p.status === "pending"
                  ? ("rejected" as const)
                  : p.status,
            }
      ) as TaskProposal[];

      const assigneeProfile =
        availableUsers.find((user) => user.id === proposal.userId) || null;
      const assigneeData = assigneeProfile
        ? {
            id: assigneeProfile.id,
            username: assigneeProfile.username,
            profilePicture: assigneeProfile.profilePicture,
          }
        : {
            id: proposal.userId,
            username: proposal.username,
            profilePicture: proposal.profilePicture || "",
          };

      await updateTask(taskId, {
        assigneeId: assigneeData.id,
        proposals: updatedProposals,
        isOpenBounty: false,
      });

      // If task has escrow enabled, lock escrow now that assignee is assigned
      if (targetTask.escrowEnabled && targetTask.escrowStatus === "pending") {
        // Resolve assignee address
        let assigneeAddress: string | null = null;
        if (assigneeProfile?.address) {
          assigneeAddress = assigneeProfile.address;
        } else if (ethers.isAddress(assigneeData.id)) {
          assigneeAddress = assigneeData.id;
        } else {
          try {
            const profile = await getUserProfileById(assigneeData.id);
            assigneeAddress = profile?.address || null;
          } catch (e) {
            console.error("Error fetching assignee profile:", e);
          }
        }

        if (assigneeAddress && signer && targetTask.reward && targetTask.rewardAmount) {
          try {
            const token = targetTask.reward as "USDC" | "USDT";
            const tx = await lockEscrow(
              signer,
              taskId,
              token,
              assigneeAddress,
              targetTask.rewardAmount
            );
            await tx.wait();
            await updateTask(taskId, { escrowStatus: "locked" });
            
            // Log escrow lock event
            await logEventHelper(
              "escrow_locked",
              taskId,
              {
                token: token,
                amount: targetTask.rewardAmount,
                assigneeAddress,
              },
              `Escrow locked for task "${targetTask.title}"`
            );
            
            toast({
              title: "Escrow locked",
              description: "Tokens locked in escrow for this task",
            });
          } catch (error: any) {
            console.error("Error locking escrow:", error);
            toast({
              title: "Failed to lock escrow",
              description: error?.message || "Please lock escrow manually",
              variant: "destructive",
            });
          }
        }
      }

      // Auto-invite newly assigned user if they arenΓÇÖt a project member
      if (currentProject && account) {
        const isMember = !!currentProject.members?.some(
          (m) => m.userId === assigneeData.id
        );
        if (!isMember) {
          try {
            await inviteUserToProject(
              currentProject.id,
              assigneeData.id,
              account,
              currentProject.title
            );
            toast({ title: "Invitation sent" });
          } catch (e) {
            console.error("Failed to auto-invite assignee:", e);
            toast({ title: "Failed to send invite", variant: "destructive" });
          }
        }
      }

      const updatedTask: Task = {
        ...targetTask,
        assigneeId: assigneeData.id,
        assignee: assigneeData,
        proposals: updatedProposals,
        isOpenBounty: false,
      };

      // Real-time listeners will handle the updates automatically
      // But we update local state for immediate UI feedback
      syncTaskAcrossState(updatedTask);
      if (selectedTask?.id === updatedTask.id) {
        setSelectedTask(updatedTask);
      }
      
      // Real-time listeners will sync any changes from Firestore automatically

      // Log event
      await logEventHelper(
        "proposal_approved",
        taskId,
        {
          proposalId,
          assignedUserId: assigneeData.id,
          assignedUsername: assigneeData.username,
        },
        `Proposal approved and "${proposal.username}" assigned to task "${targetTask.title}"`
      );

      toast({
        title: "Proposal approved",
        description: `${proposal.username} has been assigned to the task.`,
      });
    } catch (error) {
      console.error("Error approving proposal:", error);
      toast({
        title: "Error",
        description: "Failed to approve proposal.",
        variant: "destructive",
      });
    } finally {
      setIsManagingProposal(false);
    }
  };

  const handleRejectProposal = async (taskId: string, proposalId: string) => {
    const targetTask = getTaskById(taskId);
    if (!targetTask || !targetTask.proposals) return;

    setIsManagingProposal(true);
    try {
      const updatedProposals = targetTask.proposals.map((p) =>
        p.id === proposalId ? { ...p, status: "rejected" as const } : p
      ) as TaskProposal[];

      await updateTask(taskId, {
        proposals: updatedProposals,
      });

      const updatedTask: Task = {
        ...targetTask,
        proposals: updatedProposals,
      };

      // Real-time listeners will handle the updates automatically
      // But we update local state for immediate UI feedback
      syncTaskAcrossState(updatedTask);
      if (selectedTask?.id === updatedTask.id) {
        setSelectedTask(updatedTask);
      }
      
      // Real-time listeners will sync any changes from Firestore automatically

      // Log event
      const rejectedProposal = updatedProposals.find((p) => p.id === proposalId);
      await logEventHelper(
        "proposal_rejected",
        taskId,
        {
          proposalId,
          proposerId: rejectedProposal?.userId,
          proposerUsername: rejectedProposal?.username,
        },
        `Proposal rejected for task "${targetTask.title}"`
      );

      toast({
        title: "Proposal rejected",
        description: "The proposal has been rejected.",
      });
    } catch (error) {
      console.error("Error rejecting proposal:", error);
      toast({
        title: "Error",
        description: "Failed to reject proposal.",
        variant: "destructive",
      });
    } finally {
      setIsManagingProposal(false);
    }
  };

  const handleApproveSubmission = async () => {
    if (!selectedTask || !selectedTask.submission) return;

    setIsLoading(true);

    try {
      const updatedSubmission = {
        ...selectedTask.submission,
        status: "approved" as const,
      };

      const reviewerAction =
        selectedTask.reviewerId &&
        selectedTask.reviewerId === currentUserId &&
        selectedTask.userId !== account;

      const updatedTask = {
        ...selectedTask,
        submission: updatedSubmission,
        status: "done",
        updatedAt: new Date().toISOString(),
      };

      await updateTask(selectedTask.id, {
        submission: updatedSubmission,
        status: "done",
        updatedAt: new Date().toISOString(),
      });
      
      // Real-time listeners will handle the updates automatically
      // But we update local state for immediate UI feedback
      syncTaskAcrossState(updatedTask);
      updateColumnsBasedOnView();
      setSelectedTask(updatedTask);
      
      // Real-time listeners will sync any changes from Firestore automatically

      // Log submission approval event
      await logEventHelper(
        "submission_approved",
        selectedTask.id,
        {
          fromColumn: selectedTask.status,
          toColumn: "done",
          isReviewerAction: reviewerAction,
        },
        `Submission approved for task "${selectedTask.title}"`
      );

      // Check for escrow release first, then payment
      if (
        !reviewerAction &&
        updatedTask.escrowEnabled &&
        updatedTask.escrowStatus === "locked"
      ) {
        setEscrowTask(updatedTask);
        setEscrowMode("release");
        setIsEscrowPopupOpen(true);
      } else if (
        !reviewerAction &&
        updatedTask.reward &&
        updatedTask.rewardAmount &&
        updatedTask.assigneeId &&
        !updatedTask.escrowEnabled
      ) {
        // Only show payment popup if no escrow
        setTaskToPay(updatedTask);
        setIsPaymentPopupOpen(true);
      } else {
        toast({
          title: "Submission approved",
          description: "The work submission has been approved",
        });
      }
    } catch (error) {
      console.error("Error approving submission:", error);
      toast({
        title: "Error",
        description: "Failed to approve submission",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectSubmission = async () => {
    if (!selectedTask || !selectedTask.submission) return;

    setIsLoading(true);

    try {
      const updatedSubmission = {
        ...selectedTask.submission,
        status: "rejected" as const,
      };

      const updatedTask = {
        ...selectedTask,
        submission: updatedSubmission,
        status: "inprogress",
        updatedAt: new Date().toISOString(),
      };

      await updateTask(selectedTask.id, {
        submission: updatedSubmission,
        status: "inprogress",
        updatedAt: new Date().toISOString(),
      });

      // Real-time listeners will handle the updates automatically
      // But we update local state for immediate UI feedback
      const updateTaskInList = (list: Task[]) =>
        list.map((task) => (task.id === updatedTask.id ? updatedTask : task));

      setAllTasks(updateTaskInList(allTasks));
      setCreatedTasks(updateTaskInList(createdTasks));
      setAssignedTasks(updateTaskInList(assignedTasks));

      // Update columns based on current view
      updateColumnsBasedOnView();

      setSelectedTask(updatedTask);
      
      // Real-time listeners will sync any changes from Firestore automatically

      // Log event
      await logEventHelper(
        "submission_rejected",
        selectedTask.id,
        {
          fromColumn: selectedTask.status,
          toColumn: "inprogress",
        },
        `Submission rejected for task "${selectedTask.title}"`
      );

      toast({
        title: "Submission rejected",
        description: "The work submission has been rejected",
      });
    } catch (error) {
      console.error("Error rejecting submission:", error);
      toast({
        title: "Error",
        description: "Failed to reject submission",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to check if user can raise dispute
  const canRaiseDispute = (task: Task): boolean => {
    if (!account || !task) return false;
    
    // Only for escrow-enabled tasks with locked escrow
    if (!task.escrowEnabled || task.escrowStatus !== "locked") {
      return false;
    }

    // Check if user is task creator
    const isCreator = task.userId?.toLowerCase() === account.toLowerCase();
    
    // Check if user is reviewer
    const isReviewer = task.reviewerId && task.reviewerId === currentUserId;
    
    // Check if user is project admin
    let isProjectAdmin = false;
    if (projectId && currentProject) {
      const member = currentProject.members?.find(
        (m: any) => m.userId === currentUserId && m.isActive && m.role === "admin"
      );
      isProjectAdmin = !!member || currentProject.createdBy?.toLowerCase() === account.toLowerCase();
    }

    return isCreator || isReviewer || isProjectAdmin;
  };

  // Helper function to check if user can refund
  const canRefund = (task: Task): boolean => {
    if (!account || !task) return false;
    
    // Only task assignee can refund
    const userIdentifier = currentUserId || account;
    const isAssignee = task.assigneeId === userIdentifier || task.assigneeId === account;
    if (!isAssignee) return false;
    
    // Only for escrow-enabled tasks with locked escrow
    if (!task.escrowEnabled || task.escrowStatus !== "locked") {
      return false;
    }
    
    // Valid states: todo, inprogress, review
    const validStates = ["todo", "inprogress", "review"];
    return validStates.includes(task.status);
  };

  // Handle refund
  const handleRefund = async () => {
    if (!selectedTask || !signer || !provider) {
      toast({
        title: "Error",
        description: "Wallet not connected or task not selected",
        variant: "destructive",
      });
      return;
    }

    if (!canRefund(selectedTask)) {
      toast({
        title: "Error",
        description: "Refund is not available for this task",
        variant: "destructive",
      });
      return;
    }

    setIsRefunding(true);
    try {
      // Verify escrow is locked
      const escrowDetails = await getEscrowDetails(provider, selectedTask.id);
      
      if (escrowDetails.status !== EscrowStatus.Locked) {
        toast({
          title: "Error",
          description: "Escrow is not in locked state",
          variant: "destructive",
        });
        return;
      }

      // Refund escrow by assignee (refund to creator)
      const tx = await refundEscrowByAssignee(signer, selectedTask.id, "Refund requested by task assignee");
      toast({
        title: "Transaction submitted",
        description: "Waiting for confirmation...",
      });

      const receipt = await tx.wait();
      
      // Verify transaction was successful
      if (!receipt || receipt.status !== 1) {
        throw new Error("Transaction failed");
      }

      // Sync with on-chain state - verify escrow status
      const updatedEscrowDetails = await getEscrowDetails(provider, selectedTask.id);
      
      // Update task escrow status based on on-chain state
      await updateTask(selectedTask.id, {
        escrowStatus: updatedEscrowDetails.status === EscrowStatus.Refunded ? "refunded" : selectedTask.escrowStatus,
        updatedAt: new Date().toISOString(),
      });

      // Log event
      await logEvent({
        taskId: selectedTask.id,
        projectId: selectedTask.projectId,
        actor: account || "",
        actorId: currentUserId || undefined,
        action: "escrow_refunded",
        meta: {
          reason: "Refund requested by task assignee",
        },
        description: `Escrow refunded for task "${selectedTask.title}"`,
      });

      toast({
        title: "Success",
        description: "Funds have been refunded to the task creator",
      });

      // Refresh tasks
      await fetchAllTasks();
    } catch (error: any) {
      console.error("Error refunding escrow:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to refund escrow",
        variant: "destructive",
      });
    } finally {
      setIsRefunding(false);
    }
  };

  const markTasksAsPaid = async (taskIds: string[]) => {
    const uniqueIds = Array.from(new Set(taskIds));
    const timestamp = new Date().toISOString();

    await Promise.all(
      uniqueIds.map((taskId) =>
        updateTask(taskId, {
          paid: true,
          status: "done", // Automatically move to done when paid
          updatedAt: timestamp,
        })
      )
    );

      // Update our task lists
    const updateTaskInList = (list: Task[]) =>
      list.map((task) =>
        uniqueIds.includes(task.id)
          ? { ...task, paid: true, status: "done", updatedAt: timestamp }
          : task
      );

    setAllTasks((prev) => updateTaskInList(prev));
    setCreatedTasks((prev) => updateTaskInList(prev));
    setAssignedTasks((prev) => updateTaskInList(prev));
    setSelectedTask((prev) =>
      prev && uniqueIds.includes(prev.id)
        ? { ...prev, paid: true, status: "done", updatedAt: timestamp }
        : prev
    );
    updateColumnsBasedOnView();
  };

  const handlePaymentComplete = async (taskId: string) => {
    setIsLoading(true);

    try {
      await markTasksAsPaid([taskId]);
      
      // Log payment event
      const task = getTaskById(taskId);
      if (task) {
        await logEventHelper(
          "payment_processed",
          taskId,
          {
            reward: task.reward,
            rewardAmount: task.rewardAmount,
            assigneeId: task.assigneeId,
          },
          `Payment processed for task "${task.title}"`
        );
      }
      
      setIsPaymentPopupOpen(false);
      setTaskToPay(null);

      toast({
        title: "Payment successful",
        description: "The task has been marked as paid",
      });
    } catch (error) {
      console.error("Error marking task as paid:", error);
      toast({
        title: "Error",
        description: "Failed to mark task as paid",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchPaymentSuccess = async (taskIds: string[]) => {
    try {
      await markTasksAsPaid(taskIds);
      
      // Log batch payment event
      await logEventHelper(
        "batch_payment_processed",
        undefined,
        {
          taskCount: taskIds.length,
          taskIds,
        },
        `Batch payment processed for ${taskIds.length} task(s)`
      );
      
      setIsBatchPaymentOpen(false);
      setBatchPaymentTasks([]);
      clearSelection();

      toast({
        title: "Batch payment successful",
        description: `Successfully paid ${taskIds.length} task(s).`,
      });
    } catch (error) {
      console.error("Error finalizing batch payment:", error);
      toast({
        title: "Error",
        description: "Failed to update batch payment status",
        variant: "destructive",
      });
    }
  };
  const onDragEnd = async (result: any) => {
    // Prevent dragging if user doesn't have permission
    if (!canDragTasks) {
      toast({
        title: "Permission Denied",
        description: "Contributors cannot move tasks",
        variant: "destructive",
      });
      return;
    }

    const { destination, source, draggableId } = result;

    if (
      !destination ||
      (destination.droppableId === source.droppableId &&
        destination.index === source.index)
    ) {
      return;
    }

    const sourceColumnIndex = columns.findIndex(
      (col) => col.id === source.droppableId
    );
    const destinationColumnIndex = columns.findIndex(
      (col) => col.id === destination.droppableId
    );

    if (sourceColumnIndex === -1 || destinationColumnIndex === -1) {
      return;
    }

    const sourceColumn = columns[sourceColumnIndex];
    const draggedTask = sourceColumn.tasks.find(
      (task) => task.id === draggableId
    );

    if (!draggedTask) {
      return;
    }

    const isMultiDrag =
      isSelectionMode &&
      selectedTasks.size > 1 &&
      selectedTasks.has(draggableId);

    const taskIdsToMove = isMultiDrag
      ? sourceColumn.tasks
          .filter((task) => selectedTasks.has(task.id))
          .map((task) => task.id)
      : [draggableId];

    const tasksBeingMoved = sourceColumn.tasks.filter((task) =>
      taskIdsToMove.includes(task.id)
    );

    if (tasksBeingMoved.length === 0) {
      return;
    }

    // Prevent dragging paid tasks
    const paidTasks = tasksBeingMoved.filter((task) => task.paid);
    if (paidTasks.length > 0) {
      toast({
        title: "Cannot move paid tasks",
        description: "Tasks that have been paid cannot be moved",
        variant: "destructive",
      });
      return;
    }

    const timestamp = new Date().toISOString();
    const newColumns = [...columns];

    // Remove tasks from source column
    const updatedSourceTasks = sourceColumn.tasks.filter(
      (task) => !taskIdsToMove.includes(task.id)
    );
    newColumns[sourceColumnIndex] = {
      ...sourceColumn,
      tasks: updatedSourceTasks,
      count: updatedSourceTasks.length,
    };

    // Prepare tasks with updated status
    const movedTasksWithStatus = tasksBeingMoved.map((task) => ({
      ...task,
      status: destination.droppableId,
      updatedAt: timestamp,
      assignee: task.assignee,
    }));

    // Insert tasks into destination column maintaining their order
    const destinationTasks = [...newColumns[destinationColumnIndex].tasks];
    destinationTasks.splice(destination.index, 0, ...movedTasksWithStatus);

    newColumns[destinationColumnIndex] = {
      ...newColumns[destinationColumnIndex],
      tasks: destinationTasks,
      count: destinationTasks.length,
    };

    setColumns(newColumns);

    // Check if this is a batch move to Done column with multiple payable tasks
    const isBatchMoveToDone =
      isMultiDrag &&
      destination.droppableId === "done" &&
      source.droppableId !== "done";
    const payableTasksInBatch = movedTasksWithStatus.filter(
      (task) =>
        task.reward &&
        task.rewardAmount &&
        !task.paid &&
        task.userId === account
    );

    // Show confirmation dialog for batch moves to Done with payable tasks
    if (isBatchMoveToDone && payableTasksInBatch.length > 0) {
      setPendingBatchMove({
        taskIds: taskIdsToMove,
        destination: destination.droppableId,
        sourceColumn: source.droppableId,
      });
      setIsBatchConfirmationOpen(true);
      return;
    }

    // Update task status first
    try {
      await Promise.all(
        tasksBeingMoved.map((task) =>
          updateTask(task.id, {
            status: destination.droppableId,
            updatedAt: timestamp,
          })
        )
      );

      // Log events for each moved task
      await Promise.all(
        tasksBeingMoved.map((task) =>
          logEventHelper(
            "moved",
            task.id,
            {
              fromColumn: source.droppableId,
              toColumn: destination.droppableId,
              isBatchMove: isMultiDrag,
            },
            `Task "${task.title}" moved from ${source.droppableId} to ${destination.droppableId}`
          )
        )
      );

      // Update local state
      const updateTaskInList = (list: Task[]) =>
        list.map((task) =>
          taskIdsToMove.includes(task.id)
            ? {
                ...task,
                status: destination.droppableId,
                updatedAt: timestamp,
              }
            : task
        );

      setAllTasks(updateTaskInList(allTasks));
      setCreatedTasks(updateTaskInList(createdTasks));
      setAssignedTasks(updateTaskInList(assignedTasks));

      // For single task moves to Done, check for escrow release or payment
      const taskMovingToDone = movedTasksWithStatus.find(
        (task) =>
          destination.droppableId === "done" &&
          source.droppableId !== "done"
      );

      if (taskMovingToDone) {
        // Check if task has escrow that needs to be released
        if (taskMovingToDone.escrowEnabled && taskMovingToDone.escrowStatus === "locked") {
          setEscrowTask(taskMovingToDone);
          setEscrowMode("release");
          setIsEscrowPopupOpen(true);
          // Status is already updated, escrow release will mark as paid
          return;
        }

        // Otherwise, show payment popup if payable (and no escrow)
        if (
          taskMovingToDone.reward &&
          taskMovingToDone.rewardAmount &&
          !taskMovingToDone.paid &&
          taskMovingToDone.userId === account &&
          !taskMovingToDone.escrowEnabled
        ) {
          setTaskToPay(taskMovingToDone);
          setIsPaymentPopupOpen(true);
        }
      }
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
      await fetchAllTasks();
    }
  };

  // Filter tasks based on search query and priority filter
  const memoizedFilteredTasks = useMemo(
    () => (tasks: Task[]) => {
      return tasks.filter((task) => {
        const matchesSearch =
          searchQuery === "" ||
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.description?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesPriority =
          filterPriority === "all" || task.priority === filterPriority;

        return matchesSearch && matchesPriority;
      });
    },
    [searchQuery, filterPriority]
  );

  const getFilteredTasks = (tasks: Task[]) => {
    return memoizedFilteredTasks(tasks);
  };

  // Group Done column tasks by payment status (Unpaid first, then Paid)
  const getGroupedDoneTasks = (tasks: Task[], columnId: string) => {
    if (columnId !== "done") {
      return { unpaid: [], paid: [] };
    }

    const filteredTasks = getFilteredTasks(tasks);
    const unpaidTasks: Task[] = [];
    const paidTasks: Task[] = [];

    filteredTasks.forEach((task) => {
      if (task.reward && task.rewardAmount && !task.paid) {
        unpaidTasks.push(task);
      } else {
        paidTasks.push(task);
      }
    });

    return { unpaid: unpaidTasks, paid: paidTasks };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "todo":
        return <Clock className="h-4 w-4 text-gray-500" />;
      case "in-progress":
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case "done":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const getAssignedUser = (walletAddress: string) => {
    return availableUsers.find((user) => user.address === walletAddress);
  };

  const isSelectionActiveFor = (columnId: string, scope?: "unpaid") =>
    selectionContext?.columnId === columnId && selectionContext?.scope === scope;

  const toggleColumnSelectionMode = (columnId: string, scope?: "unpaid") => {
    if (isSelectionActiveFor(columnId, scope)) {
      clearSelection();
      return;
    }

    setSelectedTasks(new Set());
    setSelectionContext({ columnId, scope });
    setIsSelectionMode(true);
  };

  const toggleColumnVisibility = (columnId: string) => {
    if (!isMobile) return;
    setCollapsedColumns((prev) => ({
      ...prev,
      [columnId]: !prev[columnId],
    }));
  };

  // Toggle individual task selection
  const toggleTaskSelection = (taskId: string, task: Task) => {
    if (!selectionContext) {
      return;
    }

    const matchesColumn =
      selectionContext.columnId === "done"
        ? task.status === "done" &&
          (selectionContext.scope !== "unpaid" || !task.paid)
        : task.status === selectionContext.columnId;

    if (!matchesColumn) {
      return;
    }

    // Only allow selection of tasks with rewards that haven't been paid
    if (!task.reward || !task.rewardAmount || task.paid) {
      return;
    }

    const newSelection = new Set(selectedTasks);
    if (newSelection.has(taskId)) {
      newSelection.delete(taskId);
    } else {
      newSelection.add(taskId);
    }
    if (newSelection.size === 0) {
      clearSelection();
    } else {
      setSelectedTasks(newSelection);
    }
  };

  // Select all payable tasks in a column (optionally scoped)
  const selectAllInColumn = (columnId: string, scope?: "unpaid") => {
    const column = columns.find((col) => col.id === columnId);
    if (!column) return;

    const targetSelection = isSelectionActiveFor(columnId, scope)
      ? new Set(selectedTasks)
      : new Set<string>();

    column.tasks.forEach((task) => {
      if (
        task.reward &&
        task.rewardAmount &&
        !task.paid &&
        task.userId === account &&
        (scope !== "unpaid" || !task.paid)
      ) {
        targetSelection.add(task.id);
      }
    });

    setSelectedTasks(targetSelection);
    setSelectionContext({ columnId, scope });
    setIsSelectionMode(true);
  };

  // Clear all selections
  const clearSelection = () => {
    setSelectedTasks(new Set());
    setIsSelectionMode(false);
    setSelectionContext(null);
  };

  // Get selected tasks details
  const getSelectedTasksDetails = () => {
    const allTasks = columns.flatMap((col) => col.tasks);
    return Array.from(selectedTasks)
      .map((id) => allTasks.find((task) => task.id === id))
      .filter(
        (task): task is Task =>
          task !== undefined &&
          task.reward !== undefined &&
          task.rewardAmount !== undefined &&
          !task.paid
      );
  };

  // Calculate total payment by token
  const calculateTotalPayment = (tasksOverride?: Task[]) => {
    const tasks = (tasksOverride ?? getSelectedTasksDetails()).filter(
      (task) => task.reward && task.rewardAmount
    );
    const totals: Record<string, number> = {};

    tasks.forEach((task) => {
      if (task.reward) {
        if (!totals[task.reward]) {
          totals[task.reward] = 0;
        }
        totals[task.reward] += task.rewardAmount || 0;
      }
    });

    return totals;
  };

  const batchPaymentMeta = useMemo(() => {
    const recipients = batchPaymentTasks.map((task) => {
      const address = resolveAssigneeWallet(task);
      const token = toSupportedToken(task.reward);
      const amount = task.rewardAmount ?? 0;
      return { task, address, token, amount };
    });

    const missingAddress = recipients.filter((entry) => !entry.address);
    const invalidAmounts = recipients.filter((entry) => entry.amount <= 0);
    const missingToken = recipients.filter((entry) => !entry.token);
    const validRecipients = recipients.filter(
      (entry) => entry.address && entry.token && entry.amount > 0
    );
    const uniqueTokens = Array.from(
      new Set(validRecipients.map((entry) => entry.token as SupportedToken))
    );

    return {
      recipients,
      validRecipients,
      missingAddress,
      invalidAmounts,
      missingToken,
      batchToken: uniqueTokens.length === 1 ? uniqueTokens[0] : null,
      hasMixedTokens: uniqueTokens.length > 1,
    };
  }, [batchPaymentTasks, availableUsers]);

  const canExecuteBatchPayment =
    canProcessBatchPayment &&
    batchPaymentTasks.length > 0 &&
    batchPaymentMeta.validRecipients.length === batchPaymentTasks.length &&
    Boolean(batchPaymentMeta.batchToken);

  const batchBlockingIssues = useMemo(() => {
    const issues: string[] = [];
    if (batchPaymentMeta.missingAddress.length) {
      issues.push(
        `${batchPaymentMeta.missingAddress.length} task(s) are missing assignee wallet addresses.`
      );
    }
    if (batchPaymentMeta.invalidAmounts.length) {
      issues.push(
        `${batchPaymentMeta.invalidAmounts.length} task(s) have invalid reward amounts.`
      );
    }
    if (batchPaymentMeta.missingToken.length) {
      issues.push(
        `${batchPaymentMeta.missingToken.length} task(s) use unsupported reward tokens.`
      );
    }
    if (batchPaymentMeta.hasMixedTokens) {
      issues.push("Selected tasks must all use the same stablecoin (USDC or USDT).");
    }
    return issues;
  }, [batchPaymentMeta]);

  // Handle batch confirmation when multiple tasks are moved to Done
  const handleBatchConfirmation = async (confirmed: boolean) => {
    if (!confirmed || !pendingBatchMove) {
      setIsBatchConfirmationOpen(false);
      setPendingBatchMove(null);
      setIsProcessingBatchMove(false);
      return;
    }

    setIsProcessingBatchMove(true);
    try {
      // Find the tasks being moved
      const sourceColumn = columns.find(
        (col) => col.id === pendingBatchMove.sourceColumn
      );
      if (!sourceColumn) return;

      const tasksBeingMoved = sourceColumn.tasks.filter((task) =>
        pendingBatchMove.taskIds.includes(task.id)
      );

      // Filter for payable tasks
      const payableTasksInBatch = tasksBeingMoved.filter(
        (task) =>
          task.reward &&
          task.rewardAmount &&
          !task.paid &&
          task.userId === account
      );

      // Execute the batch move
      const sourceColumnIndex = columns.findIndex(
        (col) => col.id === pendingBatchMove.sourceColumn
      );
      const destinationColumnIndex = columns.findIndex(
        (col) => col.id === pendingBatchMove.destination
      );

      if (sourceColumnIndex === -1 || destinationColumnIndex === -1) return;

      const timestamp = new Date().toISOString();
      const newColumns = [...columns];

      // Remove tasks from source column
      const updatedSourceTasks = sourceColumn.tasks.filter(
        (task) => !pendingBatchMove.taskIds.includes(task.id)
      );
      newColumns[sourceColumnIndex] = {
        ...newColumns[sourceColumnIndex],
        tasks: updatedSourceTasks,
        count: updatedSourceTasks.length,
      };

      // Insert tasks into destination column
      const destinationTasks = [...newColumns[destinationColumnIndex].tasks];
      const movedTasksWithStatus = tasksBeingMoved.map((task) => ({
        ...task,
        status: pendingBatchMove.destination,
        updatedAt: timestamp,
      }));

      destinationTasks.splice(
        destinationColumnIndex,
        0,
        ...movedTasksWithStatus
      );
      newColumns[destinationColumnIndex] = {
        ...newColumns[destinationColumnIndex],
        tasks: destinationTasks,
        count: destinationTasks.length,
      };

      setColumns(newColumns);

      // Update tasks in Firebase
      await Promise.all(
        tasksBeingMoved.map((task) =>
          updateTask(task.id, {
            status: pendingBatchMove.destination,
            updatedAt: timestamp,
          })
        )
      );

      // Update all task lists
      const updateTaskInList = (list: Task[]) =>
        list.map((task) =>
          pendingBatchMove.taskIds.includes(task.id)
            ? {
                ...task,
                status: pendingBatchMove.destination,
                updatedAt: timestamp,
              }
            : task
        );

      setAllTasks(updateTaskInList(allTasks));
      setCreatedTasks(updateTaskInList(createdTasks));
      setAssignedTasks(updateTaskInList(assignedTasks));

      // Clear pending batch move
      setIsBatchConfirmationOpen(false);
      setPendingBatchMove(null);

      // Trigger batch payment if tasks moved to Done
      if (
        payableTasksInBatch.length > 0 &&
        pendingBatchMove.destination === "done"
      ) {
        openBatchPaymentDialog(payableTasksInBatch);
        toast({
          title: "Batch Ready for Payment",
          description: `${payableTasksInBatch.length} task(s) moved to Done and ready for batch payment`,
        });
      } else {
        toast({
          title: "Batch Moved Successfully",
          description: `${tasksBeingMoved.length} task(s) moved to ${pendingBatchMove.destination}`,
        });
      }
    } catch (error) {
      console.error("Error processing batch move:", error);
      toast({
        title: "Error",
        description: "Failed to process batch move",
        variant: "destructive",
      });
      setIsBatchConfirmationOpen(false);
      setPendingBatchMove(null);
    } finally {
      setIsProcessingBatchMove(false);
    }
  };

  const boardWrapperClasses = cn(
    "w-full max-w-7xl mx-auto rounded-2xl shadow-inner bg-gradient-to-br from-blue-50 to-purple-50 dark:bg-gray-900 dark:from-gray-900 dark:to-gray-800 flex flex-col gap-4 p-3 sm:p-4 lg:p-6",
    isProjectView
      ? "min-h-[calc(100vh-7rem)] lg:min-h-[calc(100vh-6rem)] overflow-y-auto"
      : ""
  );

  return (
    <div className={boardWrapperClasses}>
      {/* Project Header - Show when viewing a project board */}
      {projectId && currentProject && isProjectMember && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {currentProject.title}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {currentProject.description}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {(currentProject.members?.length || 0)} member{((currentProject.members?.length || 0)) !== 1 ? 's' : ''}
              </Badge>
              {userProjectRole && (
                <Badge 
                  variant={userProjectRole === "admin" ? "default" : userProjectRole === "manager" ? "secondary" : "outline"}
                  className="capitalize"
                >
                  {userProjectRole}
                </Badge>
              )}
              {isRealtimeSyncing && (
                <Badge variant="outline" className="flex items-center gap-1 animate-pulse">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-xs">Syncing...</span>
                </Badge>
              )}
              {userProjectRole === "admin" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full md:w-auto"
                  onClick={() => setIsManageContribOpen(true)}
                >
                  Manage Contributors
                </Button>
              )}
            </div>
          </div>
          {isContributor && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <p className="text-xs text-blue-600 dark:text-blue-400">
                You're viewing this project as a contributor. You can view tasks but cannot create, move, or process payments.
              </p>
            </div>
          )}
          {userProjectRole === "manager" && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <p className="text-xs text-amber-600 dark:text-amber-400">
                As a manager, you can create and manage tasks but only admins can process batch payments.
              </p>
            </div>
          )}
        </div>
      )}
      {userProjectRole === "admin" && (
        <Dialog open={isManageContribOpen} onOpenChange={setIsManageContribOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Contributors</DialogTitle>
              <DialogDescription>Review pending join requests.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {isLoadingJoinReqs ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading join requests...
                </div>
              ) : pendingJoinRequests.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No pending join requests.
                </p>
              ) : (
                pendingJoinRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={req.applicantProfile?.avatarUrl || ""} />
                        <AvatarFallback>
                          {(req.applicantProfile?.username || formatAddress(req.applicantAddress)).slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {req.applicantProfile?.username || formatAddress(req.applicantAddress)}
                        </div>
                        {req.message && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {req.message}
                          </div>
                        )}
                        <div className="text-xs text-gray-400">
                          Applied {format(new Date(req.createdAt), "PP p")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        disabled={respondingRequestId === req.id}
                        onClick={async () => {
                          setRespondingRequestId(req.id);
                          try {
                            await respondToProjectJoinRequest(req.id, "accepted");
                            setPendingJoinRequests((prev) => prev.filter((r) => r.id !== req.id));
                            toast({ title: "Contributor Added", description: "Join request accepted." });
                          } catch (e) {
                            console.error(e);
                            toast({ title: "Error", description: "Failed to accept request.", variant: "destructive" });
                          } finally {
                            setRespondingRequestId(null);
                          }
                        }}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={respondingRequestId === req.id}
                        onClick={async () => {
                          setRespondingRequestId(req.id);
                          try {
                            await respondToProjectJoinRequest(req.id, "rejected");
                            setPendingJoinRequests((prev) => prev.filter((r) => r.id !== req.id));
                            toast({ title: "Request Rejected", description: "Join request rejected." });
                          } catch (e) {
                            console.error(e);
                            toast({ title: "Error", description: "Failed to reject request.", variant: "destructive" });
                          } finally {
                            setRespondingRequestId(null);
                          }
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          {/* <Button variant="ghost" size="icon" className="rounded-full">
            <ChevronLeft className="h-5 w-5" />
          </Button> */}
          {isSelectionMode && selectedTasks.size > 0 && (
            <Badge variant="secondary" className="ml-2">
              {selectedTasks.size} selected
            </Badge>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          {canCreateTasks && (
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) {
                  setShowRewardSection(false);
                }
              }}
            > 
              <DialogTrigger asChild>
                <Button className="gradient-button">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-5xl h-[92vh] sm:h-[90vh] min-h-0 overflow-hidden flex flex-col p-0 rounded-2xl border-slate-200 dark:border-slate-800">
              <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">Create New Task</DialogTitle>
                    <p className="text-xs text-muted-foreground mt-1">Fill in the details to create a new task</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowAnalysisPanel((v) => !v)}
                      className="hidden md:flex rounded-full text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      {showAnalysisPanel ? "Hide Analysis" : "Show Analysis"}
                    </Button>
                  </div>
                </div>
              </DialogHeader>
              <ResizablePanelGroup direction="horizontal" className="flex-1 h-full min-h-0 overflow-hidden">
                {showAnalysisPanel && userProjectRole === "admin" && (
                  <ResizablePanel defaultSize={28} minSize={24} className="min-h-0 p-6">
                    <div className="relative h-full min-h-0 overflow-y-auto overscroll-contain space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                       <ThreeBackground />
                       
                       {/* AI Predictor */}
                       <TaskPredictorSidebar
                         newTask={newTask}
                         availableUsers={availableUsers}
                         onApplyReward={(amount) => setNewTask({ ...newTask, rewardAmount: amount, reward: newTask.reward || "USDC" })}
                         onEstimateChange={(estimate, isAI) => {
                           setAiEstimate(estimate);
                           setUseAIEstimator(isAI);
                         }}
                       />

                       <div className="text-xs font-semibold tracking-wide uppercase">Contributor Analysis</div>
                    <div className="text-[11px] text-muted-foreground">
                      {analysisTag ? `Tag: ${String(analysisTag)}` : "General performance"}
                    </div>

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
                                  <AvatarFallback>{name.slice(0,1).toUpperCase()}</AvatarFallback>
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
                                  {s.isMember ? (
                                    <Button size="sm" className="h-7 px-2 text-xs" title={newTask.isOpenBounty ? "Assign disabled when Open Bounty is enabled" : "Assign to this contributor"} disabled={newTask.isOpenBounty} onClick={() => setNewTask({ ...newTask, assigneeId: s.user.id })}>
                                      Assign
                                    </Button>
                                  ) : (
                                    <Button size="sm" variant="secondary" className="h-7 px-2 text-xs" onClick={async () => {
                                      try {
                                        if (!currentProject || !s.user.address || !account) return;
                                        await inviteUserToProject(currentProject.id, s.user.id, account, currentProject.title);
                                        toast({ title: "Invitation sent" });
                                      } catch (e) {
                                        toast({ title: "Failed to send invite", variant: "destructive" });
                                      }
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
                        <p className="text-xs text-slate-500 dark:text-slate-500">
                          {allTasks.length === 0 
                            ? "Create tasks with assignees to see analysis"
                            : "Assign tasks to team members to track their performance"}
                        </p>
                      </div>
                    )}
                    </div>
                  </ResizablePanel>
                )}

                <ResizableHandle withHandle className="w-8 bg-transparent after:hidden" />

                {/* Task Form Panel */}
                <ResizablePanel defaultSize={52} minSize={42} className="min-h-0 p-4 sm:p-6 bg-gradient-to-b from-slate-50/50 to-white dark:from-slate-900/50 dark:to-slate-950">
                   <div className="h-full min-h-0 overflow-y-auto overscroll-contain space-y-4 sm:space-y-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

                  {/* Task Name */}
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium text-slate-700 dark:text-slate-300">Task Title</Label>
                    <Input
                      id="title"
                      value={newTask.title}
                      onChange={(e) =>
                        setNewTask({ ...newTask, title: e.target.value })
                      }
                      placeholder="Enter a descriptive task name..."
                      className="text-base sm:text-lg h-11 sm:h-12 rounded-xl border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Reward section enable functionality
                        setShowRewardSection(!showRewardSection);
                        if (!showRewardSection && !newTask.reward) {
                          setNewTask({ ...newTask, reward: "USDC" });
                        }
                      }}
                      className={`rounded-full transition-all duration-300 ${showRewardSection ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-transparent shadow-lg shadow-purple-500/30" : "hover:border-purple-400 hover:text-purple-600 dark:hover:border-purple-500"}`}
                    >
                      <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                      <span className="text-xs sm:text-sm">Add Reward</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newOpenBountyState = !newTask.isOpenBounty;
                        setNewTask({ 
                          ...newTask, 
                          isOpenBounty: newOpenBountyState,
                          // Clear assignee when enabling open bounty
                          assigneeId: newOpenBountyState ? undefined : newTask.assigneeId
                        });
                      }}
                      className={`rounded-full transition-all duration-300 ${newTask.isOpenBounty ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-transparent shadow-lg shadow-amber-500/30" : "hover:border-amber-400 hover:text-amber-600 dark:hover:border-amber-500"}`}
                    >
                      <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                      <span className="text-xs sm:text-sm">Open Bounty</span>
                    </Button>
                    {/* Escrow - Only for project admins */}
                    {(!projectId || userProjectRole === "admin") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Validate escrow requirements before enabling
                          if (!newTask.escrowEnabled) {
                            if (!newTask.reward || !newTask.rewardAmount) {
                              toast({
                                title: "Reward required",
                                description: "Please add a reward before enabling escrow",
                                variant: "destructive",
                              });
                              return;
                            }
                            if (!newTask.isOpenBounty && !newTask.assigneeId) {
                              toast({
                                title: "Assignee required",
                                description: "Please assign a contributor or enable open bounty before enabling escrow",
                                variant: "destructive",
                              });
                              return;
                            }
                          }
                          setNewTask({ ...newTask, escrowEnabled: !newTask.escrowEnabled });
                        }}
                        className={`rounded-full transition-all duration-300 ${newTask.escrowEnabled ? "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-transparent shadow-lg shadow-blue-500/30" : "hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500"}`}
                        title={
                          newTask.escrowEnabled
                            ? "Escrow enabled - tokens will be locked"
                            : "Enable escrow protection (requires reward and assignee)"
                        }
                      >
                        <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        <span className="text-xs sm:text-sm">Enable Escrow</span>
                      </Button>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</Label>
                    <Textarea
                      id="description"
                      value={newTask.description}
                      onChange={(e) =>
                        setNewTask({ ...newTask, description: e.target.value })
                      }
                      placeholder='Provide a detailed description of the task requirements...'
                      className="min-h-[280px] sm:min-h-[300px] resize-none rounded-xl border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                    />
                  </div>

                  {/* Analysis moved to left panel */}

                  {/* Create Button */}
                  <div className="pt-4 space-y-3">
                    <Button
                      onClick={handleCreateTask}
                      disabled={isLoading}
                      className="w-full h-12 sm:h-13 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 hover:from-indigo-700 hover:via-purple-700 hover:to-fuchsia-700 text-white font-semibold shadow-lg shadow-purple-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl disabled:opacity-50 disabled:hover:scale-100"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Task...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Create Task
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                </ResizablePanel>

                {/* Handle between task form and sidebar */}
                <ResizableHandle withHandle className="w-6 bg-transparent after:hidden" />

                {/* Metadata Sidebar Panel */}
                <ResizablePanel defaultSize={20} minSize={18} className="min-h-0 border-l border-slate-200 dark:border-slate-800 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-4 sm:p-6">
                   <div className="h-full min-h-0 overflow-y-auto overscroll-contain space-y-5 sm:space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  
                  {/* AI Predictor moved to Analysis Panel */}

                  {/* Status */}
                  <StatusSelect
                    value={newTask.status}
                    onValueChange={(value) => setNewTask({ ...newTask, status: value })}
                  />

                  {/* Assignee - Hidden when Open Bounty is enabled */}
                  {!newTask.isOpenBounty && (
                    <UserSearchSelect
                      label="ASSIGNEE"
                      placeholder="Search by username or wallet address..."
                      selectedUserId={newTask.assigneeId}
                      availableUsers={availableUsers}
                      isLoadingUsers={isLoadingUsers}
                      onSelectUser={(userId) => setNewTask({ ...newTask, assigneeId: userId })}
                      emptyLabel="Unassigned"
                    />
                  )}

                  {/* Priority */}
                  <PrioritySelect
                    value={newTask.priority}
                    onValueChange={(value) => setNewTask({ ...newTask, priority: value })}
                  />

                  {/* Tags */}
                  <TagsSelect
                    selected={newTask.tags || []}
                    onChange={(tags) => setNewTask({ ...newTask, tags })}
                    label="TAGS"
                    options={specialtyOptions}
                  />


                  {/* Task Points */}
                  <TaskPointsInput />

                  {/* Reviewers */}
                  <UserSearchSelect
                    label="REVIEWERS"
                    placeholder="Search by username or wallet address..."
                    selectedUserId={newTask.reviewerId}
                    availableUsers={availableUsers}
                    isLoadingUsers={isLoadingUsers}
                    onSelectUser={(userId) => setNewTask({ ...newTask, reviewerId: userId })}
                    emptyLabel="No Reviewer"
                  />

                  {/* Reward Section (Hidden by default, shown when Add Bounty is clicked) */}
                  {showRewardSection && (
                    <RewardInput
                      reward={newTask.reward}
                      rewardAmount={newTask.rewardAmount}
                      onRewardChange={(reward) => setNewTask({ ...newTask, reward })}
                      onAmountChange={(amount) => setNewTask({ ...newTask, rewardAmount: amount })}
                      label="BOUNTY"
                    />
                  )}
                </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </DialogContent>
          </Dialog>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 h-10 bg-white dark:bg-[#1e1e1e]"
                >
                  <SortDesc className="h-4 w-4" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Newest First</DropdownMenuItem>
                <DropdownMenuItem>Oldest First</DropdownMenuItem>
                <DropdownMenuItem>Priority (High to Low)</DropdownMenuItem>
                <DropdownMenuItem>Priority (Low to High)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 h-10 bg-white dark:bg-[#1e1e1e]"
                >
                  <Filter className="h-4 w-4" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFilterPriority("all")}>
                  All Priorities
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterPriority("high")}>
                  High Priority
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterPriority("medium")}>
                  Medium Priority
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterPriority("low")}>
                  Low Priority
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 h-10 bg-white dark:bg-[#1e1e1e] border-gray-200 dark:border-[#333] w-[200px]"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={`flex-1 min-h-0 ${isProjectView ? "overflow-visible lg:overflow-hidden" : ""}`}>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#1e1e1e] rounded-lg p-4 shadow-md"
            >
              <div className="flex items-center gap-2 mb-4">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-6 w-32" />
              </div>
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, j) => (
                  <div
                    key={j}
                    className="bg-gray-50 dark:bg-[#2a2a2a] p-3 rounded-lg"
                  >
                    <Skeleton className="h-5 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4 mb-3" />
                    <div className="flex justify-between">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${
              isProjectView ? "h-full min-h-0" : ""
            }`}
          >
            {columns.map((column) => {
              const isStandardColumn = ["todo", "inprogress", "review"].includes(column.id);
              const columnSelectionActive = isStandardColumn
                ? isSelectionActiveFor(column.id)
                : false;
              const isUnpaidSelectionActive =
                column.id === "done" ? isSelectionActiveFor("done", "unpaid") : false;
              const showSelectAllButton = column.id === "done" && isUnpaidSelectionActive;

              const isColumnCollapsed = isMobile && collapsedColumns[column.id];
              return (
                <div
                  key={column.id}
                  className={`kanban-column kanban-column-todo bg-white/80 dark:bg-[#1e1e1e] rounded-lg p-4 shadow-md flex flex-col ${
                    isProjectView ? "h-full min-h-0" : ""
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {column.icon}
                      <h2 className="font-semibold">
                        {column.title} ({column.count})
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      {isMobile && (
                        <button
                          type="button"
                          onClick={() => toggleColumnVisibility(column.id)}
                          aria-expanded={!isColumnCollapsed}
                          className="h-7 w-7 rounded-full border border-muted-foreground/30 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition"
                        >
                          {isColumnCollapsed ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronUp className="h-4 w-4" />
                          )}
                        </button>
                      )}
                      {(isStandardColumn || showSelectAllButton) && (
                        <div className="flex items-center gap-2">
                          {isStandardColumn && (
                            <button
                              type="button"
                              aria-pressed={columnSelectionActive}
                              onClick={() => toggleColumnSelectionMode(column.id)}
                              className={`h-7 w-7 rounded-full border flex items-center justify-center transition text-muted-foreground ${
                                columnSelectionActive
                                  ? "border-purple-500 text-purple-600 bg-purple-50 dark:bg-purple-500/20"
                                  : "border-muted-foreground/30 hover:border-purple-400 hover:text-purple-500"
                              }`}
                              title={
                                columnSelectionActive
                                  ? "Disable multi-select for this column"
                                  : "Enable multi-select for this column"
                              }
                            >
                              {columnSelectionActive ? (
                                <CheckSquare className="h-4 w-4" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </button>
                          )}
                          {showSelectAllButton && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => selectAllInColumn(column.id, "unpaid")}
                              className="text-xs h-7 px-2"
                            >
                              Select All
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <Droppable droppableId={column.id}>
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={cn(
                          "space-y-3 pr-2 -mr-2 transition-all duration-200",
                          isColumnCollapsed
                            ? "h-0 overflow-hidden opacity-0 pointer-events-none"
                            : "flex-1 overflow-y-auto overflow-x-hidden",
                          !isMobile && !isColumnCollapsed && "max-h-[65vh]"
                        )}
                        style={{ minHeight: isColumnCollapsed ? 0 : undefined }}
                      >
                      {/* Render grouped tasks for Done column, regular tasks for others */}
                      {column.id === "done" ? (
                        (() => {
                          const { unpaid, paid } = getGroupedDoneTasks(
                            column.tasks,
                            column.id
                          );
                          const totalTasks = unpaid.length + paid.length;

                          if (totalTasks === 0) {
                            return (
                              <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-3 mb-3">
                                  <CheckCircle className="h-6 w-6 text-gray-400" />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  No completed tasks
                                </p>
                              </div>
                            );
                          }

                          let globalIndex = 0;

                          return (
                            <>
                              {/* Unpaid Tasks Group */}
                              {unpaid.length > 0 && (
                                <div className="space-y-3">
                                  <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-2 py-2 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-lg border-l-4 border-amber-500 dark:border-amber-400">
                                    <div className="flex items-center gap-2">
                                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                                      <h3 className="font-semibold text-sm text-amber-900 dark:text-amber-300">
                                        Unpaid ({unpaid.length})
                                      </h3>
                                    </div>
                                    <button
                                      type="button"
                                      aria-pressed={isUnpaidSelectionActive}
                                      onClick={() => toggleColumnSelectionMode("done", "unpaid")}
                                      className={`h-7 w-7 rounded-full border flex items-center justify-center transition text-amber-700 dark:text-amber-200 ${
                                        isUnpaidSelectionActive
                                          ? "border-purple-500 text-purple-600 bg-purple-50 dark:bg-purple-500/20"
                                          : "border-amber-300/70 hover:border-purple-400 hover:text-purple-500"
                                      }`}
                                      title={
                                        isUnpaidSelectionActive
                                          ? "Disable multi-select for unpaid tasks"
                                          : "Enable multi-select for unpaid tasks"
                                      }
                                    >
                                      {isUnpaidSelectionActive ? (
                                        <CheckSquare className="h-4 w-4" />
                                      ) : (
                                        <Square className="h-4 w-4" />
                                      )}
                                    </button>
                                  </div>
                                  <div className="space-y-3">
                                    {unpaid.map((task, index) => {
                                      const currentIndex = globalIndex++;
                                      return (
                                        <Draggable
                                          key={task.id}
                                          draggableId={task.id}
                                          index={currentIndex}
                                          isDragDisabled={!canDragTasks || task.paid}
                                        >
                                          {(provided, snapshot) => (
                                            <TaskCard
                                              task={task}
                                              isSelectionMode={isUnpaidSelectionActive}
                                              isSelected={selectedTasks.has(task.id)}
                                              selectedCount={selectedTasks.size}
                                              currentUserId={currentUserId}
                                              account={account}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (isUnpaidSelectionActive) {
                                                  toggleTaskSelection(task.id, task);
                                                } else {
                                                  handleTaskClick(task);
                                                }
                                              }}
                                              isDragging={snapshot.isDragging}
                                              provided={provided}
                                              snapshot={snapshot}
                                            />
                                          )}
                                        </Draggable>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Paid Tasks Group */}
                              {paid.length > 0 && (
                                <div className="space-y-3">
                                  <div className="sticky top-0 z-10 flex items-center gap-2 px-2 py-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg border-l-4 border-green-500 dark:border-green-400">
                                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                                    <h3 className="font-semibold text-sm text-green-900 dark:text-green-300">
                                      Paid ({paid.length})
                                    </h3>
                                  </div>
                                  <div className="space-y-3">
                                    {paid.map((task, index) => {
                                      const currentIndex = globalIndex++;
                                      return (
                                        <Draggable
                                          key={task.id}
                                          draggableId={task.id}
                                          index={currentIndex}
                                          isDragDisabled={!canDragTasks || task.paid}
                                        >
                                          {(provided, snapshot) => (
                                            <TaskCard
                                              task={task}
                                              isSelectionMode={false}
                                              isSelected={selectedTasks.has(task.id)}
                                              selectedCount={selectedTasks.size}
                                              currentUserId={currentUserId}
                                              account={account}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleTaskClick(task);
                                              }}
                                              isDragging={snapshot.isDragging}
                                              provided={provided}
                                              snapshot={snapshot}
                                            />
                                          )}
                                        </Draggable>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()
                      ) : // Regular rendering for non-Done columns
                      getFilteredTasks(column.tasks).length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-3 mb-3">
                            {column.id === "todo" && (
                              <Circle className="h-6 w-6 text-gray-400" />
                            )}
                            {column.id === "inprogress" && (
                              <Clock className="h-6 w-6 text-gray-400" />
                            )}
                            {column.id === "review" && (
                              <CircleEllipsis className="h-6 w-6 text-gray-400" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {column.id === "todo" && "No tasks to do"}
                            {column.id === "inprogress" &&
                              "No tasks in progress"}
                            {column.id === "review" && "No tasks in review"}
                          </p>
                        </div>
                      ) : (
                        getFilteredTasks(column.tasks).map((task, index) => (
                          <Draggable
                            key={task.id}
                            draggableId={task.id}
                            index={index}
                            isDragDisabled={!canDragTasks || task.paid}
                          >
                            {(provided, snapshot) => (
                              <TaskCard
                                task={task}
                                isSelectionMode={columnSelectionActive}
                                isSelected={selectedTasks.has(task.id)}
                                selectedCount={selectedTasks.size}
                                currentUserId={currentUserId}
                                account={account}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (columnSelectionActive) {
                                    toggleTaskSelection(task.id, task);
                                  } else {
                                    handleTaskClick(task);
                                  }
                                }}
                                isDragging={snapshot.isDragging}
                                provided={provided}
                                snapshot={snapshot}
                              />
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
          </div>
        </DragDropContext>
      )}
      </div>

      {/* Task Detail Dialog */}
      <Dialog open={isTaskDetailOpen} onOpenChange={setIsTaskDetailOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[650px] md:max-w-[750px] lg:max-w-[850px] max-h-[90vh] overflow-hidden flex flex-col rounded-2xl border-slate-200 dark:border-slate-800">
          {selectedTask && (
            <>
              <DialogHeader className="border-b border-slate-200 dark:border-slate-800 pb-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="break-words text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100">
                      {isEditMode ? (
                        <span className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">Edit Task</span>
                      ) : (
                        selectedTask.title
                      )}
                    </DialogTitle>
                    {!isEditMode && (
                      <DialogDescription className="break-words mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">View and manage task details</DialogDescription>
                    )}
                  </div>
                  {selectedTask.userId === account && !isEditMode && !selectedTask.paid && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl">
                        <DropdownMenuItem onClick={() => setIsEditMode(true)} className="rounded-lg cursor-pointer">
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Task
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={handleDeleteTask}
                          className="text-red-600 dark:text-red-400 rounded-lg cursor-pointer focus:bg-red-50 dark:focus:bg-red-950/30"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Task
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                {!isEditMode && (
                  <>
                    <div className="flex gap-1.5 sm:gap-2 mt-3 flex-wrap">
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full text-xs font-medium transition-colors",
                          selectedTask.priority === "high"
                            ? "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800"
                            : selectedTask.priority === "medium"
                            ? "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800"
                            : "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-800"
                        )}
                      >
                        {selectedTask.priority.charAt(0).toUpperCase() +
                          selectedTask.priority.slice(1)}{" "}
                        Priority
                      </Badge>
                      <Badge variant="outline" className="rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700">
                        {selectedTask.status === "todo"
                          ? "To Do"
                          : selectedTask.status === "inprogress"
                          ? "In Progress"
                          : selectedTask.status === "review"
                          ? "In Review"
                          : "Done"}
                      </Badge>
                      {selectedTask.reward && selectedTask.rewardAmount && (
                        <Badge
                          variant="outline"
                          className="rounded-full text-xs font-medium bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-950/30 dark:to-indigo-950/30 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-700"
                        >
                          <DollarSign className="h-3 w-3 mr-0.5" />
                          {selectedTask.rewardAmount} {selectedTask.reward}
                        </Badge>
                      )}
                      {selectedTask.paid && (
                        <Badge
                          variant="outline"
                          className="rounded-full text-xs font-medium bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-800"
                        >
                          <CheckCircle className="h-3 w-3 mr-0.5" />
                          Paid
                        </Badge>
                      )}
                      {selectedTask.isOpenBounty && (
                        <Badge
                          variant="outline"
                          className="rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                        >
                          <Award className="h-3 w-3 mr-0.5" />
                          Open Bounty
                        </Badge>
                      )}
                      {selectedTask.escrowEnabled && (
                        <Badge
                          variant="outline"
                          className="rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800"
                        >
                          <Lock className="h-3 w-3 mr-0.5" />
                          {selectedTask.escrowStatus === "locked"
                            ? "Escrow Locked"
                            : "Escrow Enabled"}
                        </Badge>
                      )}
                    </div>
                  </>
                )}
              </DialogHeader>

              {isEditMode ? (
                <div className="flex-1 overflow-y-auto py-4 px-1">
                  <div className="space-y-5 px-1">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-title" className="text-sm font-medium text-slate-700 dark:text-slate-300">Task Title</Label>
                      <Input
                        id="edit-title"
                        value={editedTask.title || ""}
                        onChange={(e) =>
                          setEditedTask({
                            ...editedTask,
                            title: e.target.value,
                          })
                        }
                        className="h-11 rounded-xl border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-description" className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</Label>
                      <Textarea
                        id="edit-description"
                        value={editedTask.description || ""}
                        onChange={(e) =>
                          setEditedTask({
                            ...editedTask,
                            description: e.target.value,
                          })
                        }
                        className="min-h-[150px] rounded-xl border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="edit-priority" className="text-sm font-medium text-slate-700 dark:text-slate-300">Priority</Label>
                        <Select
                          value={editedTask.priority || "medium"}
                          onValueChange={(value) =>
                            setEditedTask({ ...editedTask, priority: value })
                          }
                        >
                          <SelectTrigger className="h-11 rounded-xl border-slate-300 dark:border-slate-700">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="low" className="rounded-lg">Low</SelectItem>
                            <SelectItem value="medium" className="rounded-lg">Medium</SelectItem>
                            <SelectItem value="high" className="rounded-lg">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Assignee - Hidden when Open Bounty is enabled */}
                      {!editedTask.isOpenBounty && (
                        <div className="grid gap-2">
                          <UserSearchSelect
                            label={selectedTask.escrowEnabled ? "Assignee (Locked)" : "Assignee"}
                            placeholder={selectedTask.escrowEnabled ? "Assignee cannot be changed for escrow tasks" : "Search by username or wallet address..."}
                            selectedUserId={editedTask.assigneeId}
                            availableUsers={availableUsers}
                            isLoadingUsers={isLoadingUsers}
                            onSelectUser={(userId) => {
                              if (!selectedTask.escrowEnabled) {
                                setEditedTask({ ...editedTask, assigneeId: userId });
                              } else {
                                toast({
                                  title: "Cannot change assignee",
                                  description: "Assignee cannot be changed for escrow-enabled tasks",
                                  variant: "destructive",
                                });
                              }
                            }}
                            emptyLabel="Unassigned"
                          />
                        </div>
                      )}
                    </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <UserSearchSelect
                      label="Reviewer"
                      placeholder="Search by username or wallet address..."
                      selectedUserId={editedTask.reviewerId}
                      availableUsers={availableUsers}
                      isLoadingUsers={isLoadingUsers}
                      onSelectUser={(userId) => setEditedTask({ ...editedTask, reviewerId: userId })}
                      emptyLabel="No Reviewer"
                    />
                  </div>
                </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="edit-reward" className="text-sm font-medium text-slate-700 dark:text-slate-300">Reward Token</Label>
                        <Select
                          value={editedTask.reward || "no_reward"}
                          onValueChange={(value) =>
                            setEditedTask({
                              ...editedTask,
                              reward: value === "no_reward" ? undefined : value,
                            })
                          }
                        >
                          <SelectTrigger className="h-11 rounded-xl border-slate-300 dark:border-slate-700">
                            <SelectValue placeholder="Select token" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="no_reward" className="rounded-lg">No Reward</SelectItem>
                            <SelectItem value="USDC" className="rounded-lg">USDC</SelectItem>
                            <SelectItem value="USDT" className="rounded-lg">USDT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="edit-rewardAmount" className="text-sm font-medium text-slate-700 dark:text-slate-300">Amount</Label>
                        <Input
                          id="edit-rewardAmount"
                          type="number"
                          min="0.01"
                          step="0.01"
                          inputMode="decimal"
                          value={editedTask.rewardAmount ?? ""}
                          onChange={(e) =>
                            setEditedTask({
                              ...editedTask,
                              rewardAmount: parsePositiveNumber(e.target.value),
                            })
                          }
                          placeholder="0.00"
                          disabled={!editedTask.reward}
                          className="h-11 rounded-xl border-slate-300 dark:border-slate-700"
                        />
                      </div>
                    </div>
                <div className="grid gap-4">
                  <div className="flex items-start justify-between rounded-xl border border-slate-300 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 p-4 transition-all duration-200 hover:border-amber-300 dark:hover:border-amber-700">
                    <div className="pr-4">
                      <Label className="text-sm font-medium text-slate-900 dark:text-slate-100">Open Bounty</Label>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        Allow contributors to submit proposals.
                      </p>
                    </div>
                    <Switch
                      checked={Boolean(editedTask.isOpenBounty)}
                      onCheckedChange={(checked) =>
                        setEditedTask({
                          ...editedTask,
                          isOpenBounty: checked,
                          // Clear assignee when enabling open bounty
                          assigneeId: checked ? undefined : editedTask.assigneeId,
                        })
                      }
                    />
                  </div>
                </div>
                    <div className="grid gap-2">
                      <TagsSelect
                        label="Tags"
                        selected={editedTask.tags || []}
                        onChange={(tags) => setEditedTask({ ...editedTask, tags })}
                        options={specialtyOptions}
                      />
                </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto py-4 px-1">
                  <div className="space-y-4 px-1">
                  {/* Description Section */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 p-4">
                    <h3 className="text-sm font-semibold mb-2 text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-purple-500" />
                      Description
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {selectedTask.description || "No description provided"}
                    </p>
                  </div>

                  {/* Task Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Task Owner */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
                      <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-500 mb-2">Task Owner</h3>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950/30">
                          <FileEdit className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {selectedTask.userId === account
                            ? "You"
                            : selectedTask.userId.substring(0, 10) + "..."}
                        </span>
                      </div>
                    </div>

                    {/* Assigned To */}
                    {selectedTask.assignee ? (
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
                        <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-500 mb-2">Assigned To</h3>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 ring-2 ring-slate-200 dark:ring-slate-800">
                            <AvatarImage
                              src={
                                selectedTask.assignee.profilePicture ||
                                "/placeholder.svg"
                              }
                              alt={selectedTask.assignee.username}
                            />
                            <AvatarFallback className="text-xs">
                              {selectedTask.assignee.username.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {selectedTask.assignee.username}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4">
                        <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-500 mb-2">Assigned To</h3>
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800">
                            <User className="h-4 w-4 text-slate-400 dark:text-slate-600" />
                          </div>
                          <span className="text-sm text-slate-500 dark:text-slate-500">
                            Unassigned
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Reviewer */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
                      <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-500 mb-2">Reviewer</h3>
                      {selectedTask.reviewer ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 ring-2 ring-slate-200 dark:ring-slate-800">
                            <AvatarImage
                              src={
                                selectedTask.reviewer.profilePicture ||
                                "/placeholder.svg"
                              }
                              alt={selectedTask.reviewer.username}
                            />
                            <AvatarFallback className="text-xs">
                              {selectedTask.reviewer.username.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {selectedTask.reviewer.username}
                          </span>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-500">
                          No reviewer assigned
                        </p>
                      )}
                    </div>

                    {/* Created Date */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
                      <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-500 mb-2">Created</h3>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                          <Calendar className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {selectedTask.createdAt
                            ? format(new Date(selectedTask.createdAt), "PPP")
                            : "Unknown date"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Show payment status if task has a reward */}
                  {selectedTask.reward && selectedTask.rewardAmount && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
                      <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-500 mb-3">
                        Payment Status
                      </h3>
                      <div className="flex items-center gap-2.5">
                        {selectedTask.paid ? (
                          <>
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/30">
                              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                              <span className="text-sm font-semibold text-green-700 dark:text-green-400">Paid</span>
                              <p className="text-xs text-slate-500 dark:text-slate-500">Payment completed</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/30">
                              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                              <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                                Pending Payment
                              </span>
                              <p className="text-xs text-slate-500 dark:text-slate-500">Awaiting disbursement</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedTask.isOpenBounty && (
                    <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-900/50">
                          <Award className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                            Open bounty is active
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                            Contributors can submit proposals. Approve one to assign the task automatically.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedTask.escrowEnabled && (
                    <div className="rounded-xl border border-blue-300 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-200 dark:bg-blue-900/50">
                          <Lock className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                            Escrow enabled
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                            Payment is locked in escrow until the owner releases it.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedTask.submission && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 overflow-hidden">
                      <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-500 mb-3">Work Submission</h3>
                      <div className="rounded-lg bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 p-4 border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-full text-xs font-medium",
                              selectedTask.submission.status === "approved"
                                ? "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-800"
                                : selectedTask.submission.status === "rejected"
                                ? "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800"
                                : "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800"
                            )}
                          >
                            {selectedTask.submission.status
                              .charAt(0)
                              .toUpperCase() +
                              selectedTask.submission.status.slice(1)}
                          </Badge>
                          <span className="text-xs text-slate-500 dark:text-slate-500">
                            {format(
                              new Date(selectedTask.submission.submittedAt),
                              "PPp"
                            )}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          {selectedTask.submission.content}
                        </p>

                        {selectedTask.submission.feedback && (
                          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500 mb-1">Feedback:</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {selectedTask.submission.feedback}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedTask.proposals && selectedTask.proposals.length > 0 && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
                      <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-500 mb-3">Contributor Proposals ({selectedTask.proposals.length})</h3>
                      <div className="space-y-3 max-h-72 overflow-auto pr-1">
                        {selectedTask.proposals.map((proposal) => {
                          const isApplicant =
                            proposal.userId === currentUserId ||
                            proposal.userId === account;
                          return (
                            <div
                              key={proposal.id}
                              className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 transition-all duration-200 hover:shadow-md"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p className="text-sm font-medium">
                                    {proposal.username}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(
                                      new Date(proposal.submittedAt),
                                      "PPp"
                                    )}
                                  </p>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={
                                    proposal.status === "approved"
                                      ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-500/40"
                                      : proposal.status === "rejected"
                                      ? "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/40"
                                      : "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-200 border-amber-200 dark:border-amber-500/40"
                                  }
                                >
                                  {proposal.status.charAt(0).toUpperCase() +
                                    proposal.status.slice(1)}
                                </Badge>
                              </div>
                              <p className="text-sm whitespace-pre-line">
                                {proposal.message}
                              </p>
                              {isApplicant && proposal.status === "pending" && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Waiting for review
                                </p>
                              )}
                              {(selectedTask.userId === account ||
                                (selectedTask.reviewerId &&
                                  selectedTask.reviewerId === currentUserId)) &&
                                proposal.status === "pending" && (
                                  <div className="flex gap-2 justify-end mt-3">
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        handleApproveProposal(
                                          selectedTask.id,
                                          proposal.id
                                        )
                                      }
                                      disabled={isManagingProposal}
                                      className="rounded-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md transition-all duration-300 hover:scale-105"
                                    >
                                      <Check className="h-3.5 w-3.5 mr-1" />
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        handleRejectProposal(
                                          selectedTask.id,
                                          proposal.id
                                        )
                                      }
                                      disabled={isManagingProposal}
                                      className="rounded-full border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-300"
                                    >
                                      <X className="h-3.5 w-3.5 mr-1" />
                                      Reject
                                    </Button>
                                  </div>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                </div>
              )}

              <DialogFooter className="border-t border-slate-200 dark:border-slate-800 pt-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
                {isEditMode ? (
                  <div className="flex justify-end gap-2 w-full">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditMode(false)}
                      className="rounded-xl border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleEditTask}
                      disabled={isLoading}
                      className="rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 hover:from-indigo-700 hover:via-purple-700 hover:to-fuchsia-700 text-white shadow-lg shadow-purple-500/30 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Update Task"
                      )}
                    </Button>
                  </div>
                ) : (
                  (() => {
                    const userIdentifier = currentUserId || account || "";
                    const hasSubmittedProposal =
                      selectedTask.proposals?.some(
                        (proposal) =>
                          proposal.userId === userIdentifier ||
                          proposal.userId === account
                      ) ?? false;
                    const canSubmitProposal =
                      selectedTask.isOpenBounty &&
                      account &&
                      selectedTask.userId !== account &&
                      (!selectedTask.reviewerId ||
                        selectedTask.reviewerId !== currentUserId) &&
                      selectedTask.assigneeId !== userIdentifier &&
                      !hasSubmittedProposal;
                    const canSubmitWork =
                      selectedTask.assigneeId === userIdentifier &&
                      (selectedTask.status === "inprogress" || selectedTask.status === "todo") &&
                      !selectedTask.submission;
                    const canApproveSubmission =
                      selectedTask.status === "review" &&
                      selectedTask.submission &&
                      (selectedTask.userId === account ||
                        (selectedTask.reviewerId &&
                          selectedTask.reviewerId === currentUserId));
                    return (
                      <div className="flex flex-wrap gap-2 justify-between w-full">
                        <div className="flex flex-wrap gap-2">
                          {canSubmitProposal && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                setProposalTargetTask(selectedTask);
                                setProposalContent("");
                                handleProposalDialogChange(true);
                              }}
                              className="rounded-xl border-slate-300 dark:border-slate-700 hover:border-amber-400 hover:text-amber-600 dark:hover:border-amber-500 dark:hover:text-amber-400 transition-all duration-300"
                            >
                              <Award className="h-4 w-4 mr-2" />
                              Submit Proposal
                            </Button>
                          )}
                          {canSubmitWork && (
                            <Button
                              onClick={() => setIsSubmitDialogOpen(true)}
                              className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg transition-all duration-300 hover:scale-[1.02]"
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Submit Work
                            </Button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 ml-auto">
                          {canApproveSubmission && (
                            <>
                              <Button
                                variant="outline"
                                onClick={handleRejectSubmission}
                                className="rounded-xl border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-300"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                              <Button
                                onClick={handleApproveSubmission}
                                disabled={isLoading}
                                className="rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                              >
                                {isLoading ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Approving...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve
                                  </>
                                )}
                              </Button>
                            </>
                          )}

                          {/* Raise Dispute Button */}
                          {canRaiseDispute(selectedTask) && (
                            <Button
                              variant="outline"
                              onClick={() => setIsDisputeDialogOpen(true)}
                              className="rounded-xl border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-300"
                            >
                              <AlertCircle className="h-4 w-4 mr-2" />
                              Raise Dispute
                            </Button>
                          )}

                          {/* Refund Button */}
                          {canRefund(selectedTask) && (
                            <Button
                              variant="outline"
                              onClick={handleRefund}
                              disabled={isRefunding}
                              className="rounded-xl border-orange-300 dark:border-orange-800 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-all duration-300"
                            >
                              {isRefunding ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Refunding...
                                </>
                              ) : (
                                <>
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Refund
                                </>
                              )}
                            </Button>
                          )}
                          
                        </div>
                      </div>
                    );
                  })()
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Submit Work Dialog */}
      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-slate-200 dark:border-slate-800">
          <DialogHeader className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <DialogTitle className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">Submit Work</DialogTitle>
            <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
              Provide details or a link to your completed work.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="submission" className="text-sm font-medium text-slate-700 dark:text-slate-300">Submission Content</Label>
              <Textarea
                id="submission"
                placeholder="Paste your link or describe your work here..."
                value={submissionContent}
                onChange={(e) => setSubmissionContent(e.target.value)}
                className="min-h-[150px] rounded-xl border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-slate-200 dark:border-slate-800 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsSubmitDialogOpen(false)}
              className="rounded-xl border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitWork}
              disabled={isSubmitting}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Submit
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isProposalDialogOpen}
        onOpenChange={handleProposalDialogChange}
      >
        <DialogContent className="sm:max-w-md rounded-2xl border-slate-200 dark:border-slate-800">
          <DialogHeader className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <DialogTitle className="text-lg font-semibold bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">Submit Proposal</DialogTitle>
            <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
              Share your approach for "{proposalTargetTask?.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="proposal-content" className="text-sm font-medium text-slate-700 dark:text-slate-300">Proposal Details</Label>
              <Textarea
                id="proposal-content"
                placeholder="Explain how you plan to deliver this task..."
                value={proposalContent}
                onChange={(e) => setProposalContent(e.target.value)}
                className="min-h-[180px] rounded-xl border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-amber-500/20 transition-all duration-200"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-slate-200 dark:border-slate-800 pt-4">
            <Button
              variant="outline"
              onClick={() => handleProposalDialogChange(false)}
              className="rounded-xl border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitProposal}
              disabled={isSubmittingProposal || !proposalContent.trim()}
              className="rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
            >
              {isSubmittingProposal ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Award className="h-4 w-4 mr-2" />
                  Submit Proposal
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {isSelectionMode && selectedTasks.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg p-4 z-50">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="font-medium">
                  {selectedTasks.size} tasks selected
                </p>
                <p className="text-sm text-muted-foreground">
                  {Object.entries(calculateTotalPayment()).map(
                    ([token, amount], i, arr) => (
                      <span key={token}>
                        {amount} {token}
                        {i < arr.length - 1 && ", "}
                      </span>
                    )
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={clearSelection}>
                Clear Selection
              </Button>
              {canProcessBatchPayment && (
                <Button
                  onClick={() => openBatchPaymentDialog(getSelectedTasksDetails())}
                  className="gradient-button"
                >
                  Process Payment
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Batch Confirmation Dialog */}
      <Dialog
        open={isBatchConfirmationOpen}
        onOpenChange={setIsBatchConfirmationOpen}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Confirm Batch Move</DialogTitle>
            <DialogDescription>
              Review the details of your batch move operation
            </DialogDescription>
          </DialogHeader>

          {pendingBatchMove && (
            <div className="space-y-4 py-4">
              {/* Move Details */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h3 className="font-medium mb-3">Move Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Tasks to move:</span>
                    <span className="font-semibold">
                      {pendingBatchMove.taskIds.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>From:</span>
                    <span className="font-semibold capitalize">
                      {pendingBatchMove.sourceColumn}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>To:</span>
                    <span className="font-semibold capitalize text-green-600 dark:text-green-400">
                      {pendingBatchMove.destination}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tasks List */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-[300px] overflow-y-auto">
                <h3 className="font-medium mb-3">Tasks Being Moved</h3>
                <div className="space-y-2">
                  {(() => {
                    const sourceColumn = columns.find(
                      (col) => col.id === pendingBatchMove.sourceColumn
                    );
                    if (!sourceColumn) return null;

                    return sourceColumn.tasks
                      .filter((task) =>
                        pendingBatchMove.taskIds.includes(task.id)
                      )
                      .map((task) => (
                        <div
                          key={task.id}
                          className="flex items-start gap-2 text-sm border-l-2 border-purple-400 pl-3 py-2"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{task.title}</p>
                            {task.rewardAmount && task.reward && (
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Reward: {task.rewardAmount} {task.reward}
                              </p>
                            )}
                          </div>
                          {task.reward && task.rewardAmount && !task.paid && (
                            <Badge className="ml-auto flex-shrink-0 bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                              Payable
                            </Badge>
                          )}
                        </div>
                      ));
                  })()}
                </div>
              </div>

              {/* Payment Warning if moving to Done */}
              {pendingBatchMove.destination === "done" && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-amber-800 dark:text-amber-200">
                      Payment Processing
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                      Tasks with unpaid rewards will be queued for batch payment
                      processing after this move.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => handleBatchConfirmation(false)}
              disabled={isProcessingBatchMove}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleBatchConfirmation(true)}
              disabled={isProcessingBatchMove}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessingBatchMove ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Confirm & Move
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Payment Dialog */}
      <Dialog
        open={isBatchPaymentOpen}
        onOpenChange={(open) => {
          setIsBatchPaymentOpen(open);
          if (!open) {
            setBatchPaymentTasks([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Batch Payment</DialogTitle>
            <DialogDescription>
              Review and process payments for {batchPaymentTasks.length} task
              {batchPaymentTasks.length === 1 ? "" : "s"}
            </DialogDescription>
          </DialogHeader>

          {!canProcessBatchPayment && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400">
                Only project admins can process batch payments. Contact your project admin.
              </p>
            </div>
          )}

          <div className="space-y-4 py-4">
            {/* Payment Summary */}
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Summary
              </h3>
              <div className="space-y-2">
                {Object.entries(calculateTotalPayment(batchPaymentTasks)).map(
                  ([token, amount]) => (
                    <div
                      key={token}
                      className="flex justify-between items-center"
                    >
                      <span className="text-sm font-medium">
                        Total {token}:
                      </span>
                      <span className="font-bold text-lg">
                        {amount} {token}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Task List */}
            <div>
              <h3 className="font-medium mb-3">Selected Tasks</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {batchPaymentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="font-medium truncate">{task.title}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <Avatar className="h-4 w-4">
                          <AvatarImage
                            src={
                              task.assignee?.profilePicture ||
                              "/placeholder.svg"
                            }
                            alt={task.assignee?.username}
                          />
                          <AvatarFallback className="text-xs">
                            {task.assignee?.username
                              ?.substring(0, 2)
                              .toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">
                          {task.assignee?.username || "Unknown"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold">
                        {task.rewardAmount} {task.reward}
                      </div>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {task.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Warning Message */}
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium">Please confirm</p>
                <p className="mt-1">
                  This action will process {batchPaymentTasks.length} payment
                  {batchPaymentTasks.length === 1 ? "" : "s"}. Confirm that you
                  have enough balance and gas on Sepolia.
                </p>
              </div>
            </div>

            {batchBlockingIssues.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-200">
                <p className="font-medium">Resolve before paying</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {batchBlockingIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {canExecuteBatchPayment && (
              <PaymentComponent
                key={`batch-${batchPaymentTasks.length}-${batchPaymentMeta.batchToken}`}
                mode="batch"
                assignees={batchPaymentMeta.validRecipients.map(
                  ({ address, amount }) => ({
                    address: address as string,
                    amount,
                  })
                )}
                defaultToken={batchPaymentMeta.batchToken ?? undefined}
                tokenOptions={
                  batchPaymentMeta.batchToken
                    ? [batchPaymentMeta.batchToken]
                    : undefined
                }
                onSuccess={async () => {
                  const paidTaskIds = batchPaymentMeta.validRecipients.map(
                    ({ task }) => task.id
                  );
                  await handleBatchPaymentSuccess(paidTaskIds);
                }}
                onError={(error) => {
                  console.error("Batch payout failed:", error);
                }}
              />
            )}
            {!canExecuteBatchPayment && batchPaymentTasks.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Payments will be enabled once all tasks have a wallet, reward,
                and supported token.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <PaymentPopup
        isOpen={isPaymentPopupOpen}
        onClose={() => {
          setIsPaymentPopupOpen(false);
          setTaskToPay(null);
        }}
        task={taskToPay}
        onPaymentComplete={handlePaymentComplete}
      />

      {/* Escrow Popup */}
      <DisputeDialog
        isOpen={isDisputeDialogOpen}
        onClose={() => setIsDisputeDialogOpen(false)}
        task={selectedTask}
        onSuccess={async () => {
          if (!selectedTask) return;
          await fetchAllTasks();
          // Refresh selected task
          const updatedTask = allTasks.find((t) => t.id === selectedTask.id);
          if (updatedTask) {
            setSelectedTask(updatedTask);
          }
        }}
      />

      <EscrowPopup
        isOpen={isEscrowPopupOpen}
        onClose={() => {
          setIsEscrowPopupOpen(false);
          setEscrowTask(null);
        }}
        task={escrowTask}
        mode={escrowMode}
        onSuccess={async () => {
          if (!escrowTask) return;

          if (escrowMode === "lock") {
            // Update task with escrow locked status
            await updateTask(escrowTask.id, {
              escrowStatus: "locked",
            });

            // Log escrow lock event
            await logEventHelper(
              "escrow_locked",
              escrowTask.id,
              {
                reward: escrowTask.reward,
                rewardAmount: escrowTask.rewardAmount,
                assigneeId: escrowTask.assigneeId,
              },
              `Escrow locked for task "${escrowTask.title}"`
            );

            // Close dialog and reset form
            setNewTask({
              title: "",
              description: "",
              status: "todo",
              priority: "medium",
              isOpenBounty: false,
              escrowEnabled: false,
              tags: [],
            });

            setIsDialogOpen(false);
            setShowRewardSection(false);

            toast({
              title: "Task created",
              description: "Your task has been created and escrow locked successfully",
            });
          } else {
            // Release mode - update task status and mark as paid
            await updateTask(escrowTask.id, {
              escrowStatus: "released",
              paid: true,
              status: "done",
            });

            // Log escrow release event
            await logEventHelper(
              "escrow_released",
              escrowTask.id,
              {
                reward: escrowTask.reward,
                rewardAmount: escrowTask.rewardAmount,
                assigneeId: escrowTask.assigneeId,
              },
              `Escrow released for task "${escrowTask.title}"`
            );

            // Update local state
            const updatedTask = {
              ...escrowTask,
              escrowStatus: "released" as const,
              paid: true,
              status: "done",
            };
            syncTaskAcrossState(updatedTask);
            updateColumnsBasedOnView();
            if (selectedTask?.id === updatedTask.id) {
              setSelectedTask(updatedTask);
            }

            toast({
              title: "Escrow released",
              description: "Tokens have been released to the assignee",
            });
          }
        }}
      />
    </div>
  );
}