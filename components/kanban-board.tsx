"use client";

import { DialogTrigger } from "@/components/ui/dialog";

import type React from "react";

import { useState, useEffect, useRef, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useFirebase } from "./firebase-provider";
import { useWeb3 } from "./web3-provider";
import { Button } from "@/components/ui/button";
import { UserSearchSelect } from "./user-search-select";
import { TaskCard } from "./task-card";
import { StatusSelect, PrioritySelect, RewardInput, TaskPointsInput } from "./task-form-fields";
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
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import type { Task, TaskProposal, UserProfile, Project } from "@/lib/types";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentPopup } from "./payment-popup";
import { Switch } from "@/components/ui/switch";

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
  } = useFirebase();
  const { account } = useWeb3();
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
  });
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isManagingProposal, setIsManagingProposal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [createdTasks, setCreatedTasks] = useState<Task[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
  const [showRewardSection, setShowRewardSection] = useState(false);
  const [showAssigneeSection, setShowAssigneeSection] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isProjectMember, setIsProjectMember] = useState(false);
  const [userProjectRole, setUserProjectRole] = useState<"admin" | "manager" | "contributor" | null>(null);
  // New states for payment popup
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [taskBeingPaid, setTaskBeingPaid] = useState<Task | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isPaymentPopupOpen, setIsPaymentPopupOpen] = useState(false);
  const [taskToPay, setTaskToPay] = useState<Task | null>(null);
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);
  const [proposalTargetTask, setProposalTargetTask] = useState<Task | null>(null);
  const [proposalContent, setProposalContent] = useState("");
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
  // Multiple Selection and batch processing
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isBatchPaymentOpen, setIsBatchPaymentOpen] = useState(false);
  const [isProcessingBatchPayment, setIsProcessingBatchPayment] =
    useState(false);

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

  // Drag state for batch operations
  const [isDraggingBatch, setIsDraggingBatch] = useState(false);
  const [draggedTasksCount, setDraggedTasksCount] = useState(0);
  const [isBatchConfirmationOpen, setIsBatchConfirmationOpen] = useState(false);
  const [pendingBatchMove, setPendingBatchMove] = useState<{
    taskIds: string[];
    destination: string;
    sourceColumn: string;
  } | null>(null);

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
      });
    }
  }, [selectedTask, isEditMode]);

  // Update columns whenever the active view or tasks change
  useEffect(() => {
    updateColumnsBasedOnView();
  }, [activeView, allTasks, createdTasks, assignedTasks]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + S: Toggle selection mode
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "S") {
        e.preventDefault();
        setIsSelectionMode((prev) => !prev);
      }

      // Escape: Clear selection and close dialogs
      if (e.key === "Escape") {
        if (isSelectionMode) {
          clearSelection();
        }
      }

      // Ctrl/Cmd + Shift + P: Process batch payment (if tasks selected and has permission)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "P") {
        if (selectedTasks.size > 0 && canProcessBatchPayment) {
          e.preventDefault();
          setIsBatchPaymentOpen(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSelectionMode, selectedTasks]);

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
      if (projectId) {
        taskToCreate.projectId = projectId;
      }
      if (newTask.escrowEnabled) {
        taskToCreate.escrowStatus = "locked";
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

      // Update our task lists
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

      // Update columns based on current view
      updateColumnsBasedOnView();

      setNewTask({
        title: "",
        description: "",
        status: "todo",
        priority: "medium",
        isOpenBounty: false,
        escrowEnabled: false,
      });

      setIsDialogOpen(false);
      setShowRewardSection(false);

      toast({
        title: "Task created",
        description: "Your task has been created successfully",
      });
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
          editedTask.reward === "no_reward" ? undefined : editedTask.reward,
        assigneeId: isOpenBountyEffective ? null : editedTask.assigneeId,
        reviewerId: editedTask.reviewerId,
        isOpenBounty: isOpenBountyEffective,
        escrowEnabled:
          typeof editedTask.escrowEnabled === "boolean"
            ? editedTask.escrowEnabled
            : selectedTask.escrowEnabled,
        escrowStatus: editedTask.escrowEnabled
          ? selectedTask.escrowStatus || "locked"
          : undefined,
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

      const updatedTask: Task = {
        ...selectedTask,
        ...editedTask,
        reward: updatedTaskData.reward,
        assignee,
        reviewer,
        isOpenBounty: updatedTaskData.isOpenBounty,
        escrowEnabled: updatedTaskData.escrowEnabled,
        escrowStatus: updatedTaskData.escrowStatus,
        updatedAt: timestamp,
      };

      await updateTask(selectedTask.id, updatedTaskData);

      // Update our task lists
      syncTaskAcrossState(updatedTask);
      // Update columns based on current view
      updateColumnsBasedOnView();

      setSelectedTask(updatedTask);
      setIsEditMode(false);

      toast({
        title: "Task updated",
        description: "The task has been updated successfully",
      });
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

      // Update our task lists
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

      toast({
        title: "Work submitted",
        description: "Your work has been submitted for review",
      });
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

      syncTaskAcrossState(updatedTask);
      if (selectedTask?.id === updatedTask.id) {
        setSelectedTask(updatedTask);
      }

      toast({
        title: "Proposal submitted",
        description: "Your proposal has been sent to the task owner.",
      });
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

      const updatedTask: Task = {
        ...targetTask,
        assigneeId: assigneeData.id,
        assignee: assigneeData,
        proposals: updatedProposals,
        isOpenBounty: false,
      };

      syncTaskAcrossState(updatedTask);
      if (selectedTask?.id === updatedTask.id) {
        setSelectedTask(updatedTask);
      }

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

      syncTaskAcrossState(updatedTask);
      if (selectedTask?.id === updatedTask.id) {
        setSelectedTask(updatedTask);
      }

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
      syncTaskAcrossState(updatedTask);
      updateColumnsBasedOnView();
      setSelectedTask(updatedTask);

      // If the task has a reward, show the payment dialog
      if (
        !reviewerAction &&
        updatedTask.reward &&
        updatedTask.rewardAmount &&
        updatedTask.assigneeId
      ) {
        setTaskBeingPaid(updatedTask);
        setIsPaymentDialogOpen(true);
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

      // Update our task lists
      const updateTaskInList = (list: Task[]) =>
        list.map((task) => (task.id === updatedTask.id ? updatedTask : task));

      setAllTasks(updateTaskInList(allTasks));
      setCreatedTasks(updateTaskInList(createdTasks));
      setAssignedTasks(updateTaskInList(assignedTasks));

      // Update columns based on current view
      updateColumnsBasedOnView();

      setSelectedTask(updatedTask);

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

  const handlePaymentComplete = async (taskId: string) => {
    setIsLoading(true);

    try {
      // Update the task with paid status
      const updatedTask = {
        ...taskToPay!,
        paid: true,
        updatedAt: new Date().toISOString(),
      };

      await updateTask(taskId, {
        paid: true,
        updatedAt: new Date().toISOString(),
      });

      // Update our task lists
      const updateTaskInList = (list: Task[]) =>
        list.map((task) => (task.id === updatedTask.id ? updatedTask : task));

      setAllTasks(updateTaskInList(allTasks));
      setCreatedTasks(updateTaskInList(createdTasks));
      setAssignedTasks(updateTaskInList(assignedTasks));

      // Update columns based on current view
      updateColumnsBasedOnView();

      // Close the payment popup
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

  // Handle payment for a task
  const handlePayTask = async () => {
    if (!taskBeingPaid) return;

    setIsProcessingPayment(true);

    try {
      // Simulate payment processing delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const updatedTask = {
        ...taskBeingPaid,
        paid: true,
        updatedAt: new Date().toISOString(),
      };

      await updateTask(taskBeingPaid.id, {
        paid: true,
        updatedAt: new Date().toISOString(),
      });

      // Update our task lists
      const updateTaskInList = (list: Task[]) =>
        list.map((task) => (task.id === updatedTask.id ? updatedTask : task));

      setAllTasks(updateTaskInList(allTasks));
      setCreatedTasks(updateTaskInList(createdTasks));
      setAssignedTasks(updateTaskInList(assignedTasks));

      // Update columns based on current view
      updateColumnsBasedOnView();

      // If the task being paid is also the selected task, update it
      if (selectedTask && selectedTask.id === updatedTask.id) {
        setSelectedTask(updatedTask);
      }

      toast({
        title: "Payment successful",
        description: `Successfully paid ${updatedTask.rewardAmount} ${updatedTask.reward} to the assignee.`,
      });

      // Close the payment dialog
      setIsPaymentDialogOpen(false);
      setTaskBeingPaid(null);
    } catch (error) {
      console.error("Error processing payment:", error);
      toast({
        title: "Payment failed",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // const onDragEnd = async (result: any) => {

  //   const { destination, source, draggableId } = result

  //   // If there's no destination or the item is dropped in the same place
  //   if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
  //     return
  //   }

  //   // Find the task that was dragged
  //   const sourceColumn = columns.find((col) => col.id === source.droppableId)
  //   if (!sourceColumn) return

  //   const task = sourceColumn.tasks.find((task) => task.id === draggableId)
  //   if (!task) return

  //   // Create a new array of columns
  //   const newColumns = [...columns]

  //   // Remove the task from the source column
  //   const sourceColumnIndex = newColumns.findIndex((col) => col.id === source.droppableId)
  //   newColumns[sourceColumnIndex].tasks.splice(source.index, 1)
  //   newColumns[sourceColumnIndex].count = newColumns[sourceColumnIndex].tasks.length

  //   // Add the task to the destination column
  //   const destinationColumnIndex = newColumns.findIndex((col) => col.id === destination.droppableId)

  //   // Update the task status to match the new column
  //   const updatedTask = {
  //     ...task,
  //     status: destination.droppableId,
  //     updatedAt: new Date().toISOString(),
  //     // Preserve the assignee information
  //     assignee: task.assignee,
  //   }

  //   newColumns[destinationColumnIndex].tasks.splice(destination.index, 0, updatedTask)
  //   newColumns[destinationColumnIndex].count = newColumns[destinationColumnIndex].tasks.length

  //   // Update state
  //   setColumns(newColumns)

  //   // Check if the task is being moved to the 'done' state and has a reward
  //   if (
  //     destination.droppableId === "done" &&
  //     source.droppableId !== "done" &&
  //     task.reward &&
  //     task.rewardAmount &&
  //     !task.paid &&
  //     task.userId === account
  //   ) {
  //     // Show payment popup
  //     setTaskToPay(task)
  //     setIsPaymentPopupOpen(true)
  //   }

  //   // Update in Firebase
  //   try {
  //     await updateTask(task.id, {
  //       status: destination.droppableId,
  //       updatedAt: new Date().toISOString(),
  //     })

  //     // Update our task lists
  //     const updateTaskInList = (list: Task[]) => list.map((t) => (t.id === updatedTask.id ? updatedTask : t))

  //     setAllTasks(updateTaskInList(allTasks))
  //     setCreatedTasks(updateTaskInList(createdTasks))
  //     setAssignedTasks(updateTaskInList(assignedTasks))
  //   } catch (error) {
  //     console.error("Error updating task:", error)
  //     toast({
  //       title: "Error",
  //       description: "Failed to update task status",
  //       variant: "destructive",
  //     })
  //     // Revert the UI change if the update fails
  //     fetchAllTasks()
  //   }
  // }
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

    // For single task moves to Done, show payment popup if payable
    const payableTask = movedTasksWithStatus.find(
      (task) =>
        destination.droppableId === "done" &&
        source.droppableId !== "done" &&
        task.reward &&
        task.rewardAmount &&
        !task.paid &&
        task.userId === account
    );

    if (payableTask) {
      setTaskToPay(payableTask);
      setIsPaymentPopupOpen(true);
    }

    try {
      await Promise.all(
        tasksBeingMoved.map((task) =>
          updateTask(task.id, {
            status: destination.droppableId,
            updatedAt: timestamp,
          })
        )
      );

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

  // Toggle individual task selection
  const toggleTaskSelection = (taskId: string, task: Task) => {
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
    setSelectedTasks(newSelection);

    // Auto-disable selection mode if no tasks selected
    if (newSelection.size === 0) {
      setIsSelectionMode(false);
    }
  };

  // Select all payable tasks in a column
  const selectAllInColumn = (columnId: string) => {
    const column = columns.find((col) => col.id === columnId);
    if (!column) return;

    const newSelection = new Set(selectedTasks);
    column.tasks.forEach((task) => {
      if (
        task.reward &&
        task.rewardAmount &&
        !task.paid &&
        task.userId === account
      ) {
        newSelection.add(task.id);
      }
    });
    setSelectedTasks(newSelection);
    setIsSelectionMode(true);
  };

  // Clear all selections
  const clearSelection = () => {
    setSelectedTasks(new Set());
    setIsSelectionMode(false);
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
  const calculateTotalPayment = () => {
    const tasks = getSelectedTasksDetails();
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

  // Process batch payment
  const processBatchPayment = async () => {
    // Check if user has permission to process batch payment
    if (!canProcessBatchPayment) {
      toast({
        title: "Permission Denied",
        description: "Only project admins can process batch payments",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingBatchPayment(true);

    try {
      const tasksToUpdate = getSelectedTasksDetails();

      // Update all tasks in parallel
      await Promise.all(
        tasksToUpdate.map((task) =>
          updateTask(task.id, {
            paid: true,
            updatedAt: new Date().toISOString(),
          })
        )
      );

      // Update local state
      const updateTaskInList = (list: Task[]) =>
        list.map((task) =>
          selectedTasks.has(task.id) ? { ...task, paid: true } : task
        );

      setAllTasks(updateTaskInList(allTasks));
      setCreatedTasks(updateTaskInList(createdTasks));
      setAssignedTasks(updateTaskInList(assignedTasks));

      // Update columns
      updateColumnsBasedOnView();

      // Clear selection
      setSelectedTasks(new Set());
      setIsSelectionMode(false);
      setIsBatchPaymentOpen(false);

      toast({
        title: "Batch payment successful",
        description: `Successfully paid ${tasksToUpdate.length} tasks`,
      });
    } catch (error) {
      console.error("Batch payment error:", error);
      toast({
        title: "Error",
        description: "Failed to process batch payment",
        variant: "destructive",
      });
    } finally {
      setIsProcessingBatchPayment(false);
    }
  };

  // Handle batch confirmation when multiple tasks are moved to Done
  const handleBatchConfirmation = async (confirmed: boolean) => {
    if (!confirmed || !pendingBatchMove) {
      setIsBatchConfirmationOpen(false);
      setPendingBatchMove(null);
      return;
    }

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
        setIsBatchPaymentOpen(true);
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
    }
  };

  return (
    <div
      className={`p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:bg-gray-900 dark:from-gray-900 dark:to-gray-800 rounded-2xl shadow-inner ${
        isProjectView
          ? "flex flex-col gap-4 h-[calc(100vh-6rem)] lg:h-[calc(100vh-5rem)] min-h-0 overflow-hidden"
          : "flex flex-col gap-4"
      }`}
    >
      {/* Project Header - Show when viewing a project board */}
      {projectId && currentProject && isProjectMember && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {currentProject.title}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {currentProject.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsManageContribOpen(false)}>
                Close
              </Button>
            </DialogFooter>
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
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
              <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center justify-between">
                  <DialogTitle>Create New Task</DialogTitle>
                </div>
              </DialogHeader>
              <div className="flex-1 overflow-hidden flex">
                {/* Left Section - Task Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 border-r">

                  {/* Task Name */}
                  <div className="space-y-2">
                    <Input
                      id="title"
                      value={newTask.title}
                      onChange={(e) =>
                        setNewTask({ ...newTask, title: e.target.value })
                      }
                      placeholder="Enter a task name..."
                      className="text-lg h-12"
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
                      className={showRewardSection ? "bg-purple-600 hover:bg-purple-700 text-white border-purple-600" : ""}
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Add Reward
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
                      className={newTask.isOpenBounty ? "bg-purple-600 hover:bg-purple-700 text-white border-purple-600" : ""}
                    >
                      <Award className="h-4 w-4 mr-2" />
                      Open Bounty
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewTask({ ...newTask, escrowEnabled: !newTask.escrowEnabled });
                      }}
                      className={newTask.escrowEnabled ? "bg-purple-600 hover:bg-purple-700 text-white border-purple-600" : ""}
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Enable Escrow
                    </Button>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Textarea
                      id="description"
                      value={newTask.description}
                      onChange={(e) =>
                        setNewTask({ ...newTask, description: e.target.value })
                      }
                      placeholder='Write your description here...'
                      className="min-h-[300px] resize-none"
                    />
                  </div>

                  {/* Create Button */}
                  <div className="pt-4">
                    <Button
                      onClick={handleCreateTask}
                      disabled={isLoading}
                      className="w-full gradient-button h-12"
                    >
                      {isLoading ? "Creating..." : "Create"}
                    </Button>
                  </div>
                </div>

                {/* Right Section - Metadata Sidebar */}
                <div className="w-80 border-l bg-muted/30 overflow-y-auto p-6 space-y-6">
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
              </div>
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
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-medium">Keyboard Shortcuts</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Toggle Selection
                      </span>
                      <kbd className="px-2 py-1 bg-muted rounded">
                        Ctrl+Shift+S
                      </kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Process Payment
                      </span>
                      <kbd className="px-2 py-1 bg-muted rounded">
                        Ctrl+Shift+P
                      </kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Undo</span>
                      <kbd className="px-2 py-1 bg-muted rounded">Ctrl+Z</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Cancel Selection
                      </span>
                      <kbd className="px-2 py-1 bg-muted rounded">Esc</kbd>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div className={`flex-1 min-h-0 ${isProjectView ? "overflow-hidden" : ""}`}>
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
            {columns.map((column) => (
              <div
                key={column.id}
                className={`kanban-column kanban-column-todo bg-white/80 dark:bg-[#1e1e1e] rounded-lg p-4 shadow-md flex flex-col ${
                  isProjectView ? "h-full min-h-0" : ""
                }`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {column.icon}
                    <h2 className="font-semibold">
                      {column.title} ({column.count})
                    </h2>
                  </div>

                  {/* Add Select All button for Done column */}
                  {isSelectionMode && column.id === "done" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => selectAllInColumn(column.id)}
                      className="text-xs h-7 px-2"
                    >
                      Select All
                    </Button>
                  )}
                </div>

                <Droppable droppableId={column.id}>
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="flex-1 overflow-y-auto overflow-x-hidden space-y-3 pr-2 -mr-2"
                      style={{ minHeight: 0 }}
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
                                  <div className="sticky top-0 z-10 flex items-center gap-2 px-2 py-2 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-lg border-l-4 border-amber-500 dark:border-amber-400">
                                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                                    <h3 className="font-semibold text-sm text-amber-900 dark:text-amber-300">
                                      Unpaid ({unpaid.length})
                                    </h3>
                                  </div>
                                  <div className="space-y-3">
                                    {unpaid.map((task, index) => {
                                      const currentIndex = globalIndex++;
                                      return (
                                        <Draggable
                                          key={task.id}
                                          draggableId={task.id}
                                          index={currentIndex}
                                          isDragDisabled={!canDragTasks}
                                        >
                                          {(provided, snapshot) => (
                                            <TaskCard
                                              task={task}
                                              isSelectionMode={isSelectionMode}
                                              isSelected={selectedTasks.has(task.id)}
                                              selectedCount={selectedTasks.size}
                                              currentUserId={currentUserId}
                                              account={account}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (isSelectionMode) {
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
                                          isDragDisabled={!canDragTasks}
                                        >
                                          {(provided, snapshot) => (
                                            <TaskCard
                                              task={task}
                                              isSelectionMode={isSelectionMode}
                                              isSelected={selectedTasks.has(task.id)}
                                              selectedCount={selectedTasks.size}
                                              currentUserId={currentUserId}
                                              account={account}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (isSelectionMode) {
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
                            isDragDisabled={!canDragTasks}
                          >
                            {(provided, snapshot) => (
                              <TaskCard
                                task={task}
                                isSelectionMode={isSelectionMode}
                                isSelected={selectedTasks.has(task.id)}
                                selectedCount={selectedTasks.size}
                                currentUserId={currentUserId}
                                account={account}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isSelectionMode) {
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
            ))}
          </div>
        </DragDropContext>
      )}
      </div>

      {/* Task Detail Dialog */}
      <Dialog open={isTaskDetailOpen} onOpenChange={setIsTaskDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          {selectedTask && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-center">
                  <DialogTitle>
                    {isEditMode ? "Edit Task" : selectedTask.title}
                  </DialogTitle>
                  {selectedTask.userId === account && !isEditMode && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setIsEditMode(true)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Task
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={handleDeleteTask}
                          className="text-red-500"
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
                    <DialogDescription>Task details</DialogDescription>
                    <div className="flex gap-2 mt-2">
                      <Badge
                        variant="outline"
                        className={
                          selectedTask.priority === "high"
                            ? "priority-badge-high"
                            : selectedTask.priority === "medium"
                            ? "priority-badge-medium"
                            : "priority-badge-low"
                        }
                      >
                        {selectedTask.priority.charAt(0).toUpperCase() +
                          selectedTask.priority.slice(1)}{" "}
                        Priority
                      </Badge>
                      <Badge variant="outline" className="bg-secondary/50">
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
                          className="bg-purple-100 dark:bg-purple-600/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-600/50"
                        >
                          {selectedTask.rewardAmount} {selectedTask.reward}
                        </Badge>
                      )}
                      {selectedTask.paid && (
                        <Badge
                          variant="outline"
                          className="bg-green-100 dark:bg-green-600/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-600/50"
                        >
                          Paid
                        </Badge>
                      )}
                      {selectedTask.isOpenBounty && (
                        <Badge
                          variant="outline"
                          className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/40"
                        >
                          Open Bounty
                        </Badge>
                      )}
                      {selectedTask.escrowEnabled && (
                        <Badge
                          variant="outline"
                          className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/40"
                        >
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
                <div className="py-4">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-title">Title</Label>
                      <Input
                        id="edit-title"
                        value={editedTask.title || ""}
                        onChange={(e) =>
                          setEditedTask({
                            ...editedTask,
                            title: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-description">Description</Label>
                      <Textarea
                        id="edit-description"
                        value={editedTask.description || ""}
                        onChange={(e) =>
                          setEditedTask({
                            ...editedTask,
                            description: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="edit-priority">Priority</Label>
                        <Select
                          value={editedTask.priority || "medium"}
                          onValueChange={(value) =>
                            setEditedTask({ ...editedTask, priority: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Assignee - Hidden when Open Bounty is enabled */}
                      {!editedTask.isOpenBounty && (
                        <div className="grid gap-2">
                          <UserSearchSelect
                            label="Assignee"
                            placeholder="Search by username or wallet address..."
                            selectedUserId={editedTask.assigneeId}
                            availableUsers={availableUsers}
                            isLoadingUsers={isLoadingUsers}
                            onSelectUser={(userId) => setEditedTask({ ...editedTask, assigneeId: userId })}
                            emptyLabel="Unassigned"
                          />
                        </div>
                      )}
                    </div>
                <div className="grid grid-cols-2 gap-4">
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
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="edit-reward">Reward</Label>
                        <Select
                          value={editedTask.reward || "no_reward"}
                          onValueChange={(value) =>
                            setEditedTask({
                              ...editedTask,
                              reward: value === "no_reward" ? undefined : value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select token" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no_reward">No Reward</SelectItem>
                            <SelectItem value="USDC">USDC</SelectItem>
                            <SelectItem value="USDT">USDT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="edit-rewardAmount">Amount</Label>
                        <Input
                          id="edit-rewardAmount"
                          type="number"
                          value={editedTask.rewardAmount || ""}
                          onChange={(e) =>
                            setEditedTask({
                              ...editedTask,
                              rewardAmount: e.target.value
                                ? Number.parseFloat(e.target.value)
                                : undefined,
                            })
                          }
                          placeholder="0.00"
                          disabled={!editedTask.reward}
                        />
                      </div>
                    </div>
                <div className="grid gap-4">
                  <div className="flex items-start justify-between rounded-md border p-3">
                    <div className="pr-4">
                      <Label className="text-sm font-medium">Open Bounty</Label>
                      <p className="text-xs text-muted-foreground">
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
                  </div>
                </div>
              ) : (
                <div className="py-4">
                  <div className="mb-4">
                    <h3 className="text-sm font-medium mb-1">Description</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedTask.description}
                    </p>
                  </div>

                  <div className="mb-4">
                    <h3 className="text-sm font-medium mb-1">Task Owner</h3>
                    <div className="flex items-center gap-2">
                      <FileEdit className="h-4 w-4 text-purple-500" />
                      <span className="text-sm">
                        {selectedTask.userId === account
                          ? "You"
                          : selectedTask.userId.substring(0, 10) + "..."}
                      </span>
                    </div>
                  </div>

                  {selectedTask.assignee ? (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium mb-1">Assigned to</h3>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage
                            src={
                              selectedTask.assignee.profilePicture ||
                              "/placeholder.svg"
                            }
                            alt={selectedTask.assignee.username}
                          />
                          <AvatarFallback>
                            {selectedTask.assignee.username.substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {selectedTask.assignee.username}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium mb-1">Assigned to</h3>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Unassigned
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mb-4">
                    <h3 className="text-sm font-medium mb-1">Reviewer</h3>
                    {selectedTask.reviewer ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage
                            src={
                              selectedTask.reviewer.profilePicture ||
                              "/placeholder.svg"
                            }
                            alt={selectedTask.reviewer.username}
                          />
                          <AvatarFallback>
                            {selectedTask.reviewer.username.substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {selectedTask.reviewer.username}
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No reviewer assigned
                      </p>
                    )}
                  </div>

                  <div className="mb-4">
                    <h3 className="text-sm font-medium mb-1">Created</h3>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {selectedTask.createdAt
                          ? format(new Date(selectedTask.createdAt), "PPP")
                          : "Unknown date"}
                      </p>
                    </div>
                  </div>

                  {/* Show payment status if task has a reward */}
                  {selectedTask.reward && selectedTask.rewardAmount && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium mb-1">
                        Payment Status
                      </h3>
                      <div className="flex items-center gap-2">
                        {selectedTask.paid ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-green-500">Paid</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm text-yellow-500">
                              Pending Payment
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedTask.isOpenBounty && (
                    <div className="mb-4 rounded-md border border-dashed border-amber-200 bg-amber-50/70 dark:border-amber-500/40 dark:bg-amber-500/10 p-3">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        Open bounty is active
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-100/80 mt-1">
                        Contributors can submit proposals. Approve one to assign
                        the task automatically.
                      </p>
                    </div>
                  )}

                  {selectedTask.escrowEnabled && (
                    <div className="mb-4 rounded-md border border-dashed border-blue-200 bg-blue-50/70 dark:border-blue-500/40 dark:bg-blue-500/10 p-3">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Escrow enabled
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-100/80 mt-1">
                        Payment is locked in escrow until the owner releases it.
                      </p>
                    </div>
                  )}

                  {selectedTask.submission && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium mb-1">Submission</h3>
                      <div className="rounded-md border p-3 bg-gray-50 dark:bg-[#2a2a2a] border-gray-200 dark:border-[#333]">
                        <div className="flex justify-between items-center mb-2">
                          <Badge
                            variant="outline"
                            className={
                              selectedTask.submission.status === "approved"
                                ? "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-500 border-green-200 dark:border-green-500/50"
                                : selectedTask.submission.status === "rejected"
                                ? "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-500 border-red-200 dark:border-red-500/50"
                                : "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 border-yellow-200 dark:border-yellow-500/50"
                            }
                          >
                            {selectedTask.submission.status
                              .charAt(0)
                              .toUpperCase() +
                              selectedTask.submission.status.slice(1)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(
                              new Date(selectedTask.submission.submittedAt),
                              "PPp"
                            )}
                          </span>
                        </div>
                        <p className="text-sm">
                          {selectedTask.submission.content}
                        </p>

                        {selectedTask.submission.feedback && (
                          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-[#333]">
                            <p className="text-xs font-medium">Feedback:</p>
                            <p className="text-sm">
                              {selectedTask.submission.feedback}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedTask.proposals && selectedTask.proposals.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium mb-2">Proposals</h3>
                      <div className="space-y-3 max-h-72 overflow-auto pr-1">
                        {selectedTask.proposals.map((proposal) => {
                          const isApplicant =
                            proposal.userId === currentUserId ||
                            proposal.userId === account;
                          return (
                            <div
                              key={proposal.id}
                              className="rounded-lg border p-3 bg-white dark:bg-[#1e1e1e] border-gray-200 dark:border-[#333]"
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
                                      className="gradient-button px-3"
                                    >
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
                                    >
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
              )}

              <DialogFooter>
                {isEditMode ? (
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditMode(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleEditTask}
                      disabled={isLoading}
                      className="gradient-button"
                    >
                      {isLoading ? "Updating..." : "Update Task"}
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
                            >
                              Submit Proposal
                            </Button>
                          )}
                          {canSubmitWork && (
                            <Button
                              onClick={() => setIsSubmitDialogOpen(true)}
                              className="gradient-button"
                            >
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
                              >
                                Reject
                              </Button>
                              <Button
                                onClick={handleApproveSubmission}
                                disabled={isLoading}
                                className="gradient-button"
                              >
                                {isLoading ? "Approving..." : "Approve"}
                              </Button>
                            </>
                          )}
                          <Button
                            variant="outline"
                            onClick={() => setIsTaskDetailOpen(false)}
                          >
                            Close
                          </Button>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Work</DialogTitle>
            <DialogDescription>
              Please provide a link to your work submission.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="submission">Submission Content</Label>
              <Textarea
                id="submission"
                placeholder="Paste your link here..."
                value={submissionContent}
                onChange={(e) => setSubmissionContent(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSubmitDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitWork}
              disabled={isSubmitting}
              className="gradient-button"
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pay for Task</DialogTitle>
            <DialogDescription>
              You are about to pay {taskBeingPaid?.rewardAmount}{" "}
              {taskBeingPaid?.reward} for this task.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to proceed?</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPaymentDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayTask}
              disabled={isProcessingPayment}
              className="gradient-button"
            >
              {isProcessingPayment ? (
                <>
                  Processing Payment...
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                </>
              ) : (
                "Pay Now"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={isProposalDialogOpen}
        onOpenChange={handleProposalDialogChange}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Proposal</DialogTitle>
            <DialogDescription>
              Share your approach for "{proposalTargetTask?.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="proposal-content">Proposal Details</Label>
              <Textarea
                id="proposal-content"
                placeholder="Explain how you plan to deliver this task..."
                value={proposalContent}
                onChange={(e) => setProposalContent(e.target.value)}
                className="min-h-[150px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleProposalDialogChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitProposal}
              disabled={isSubmittingProposal || !proposalContent.trim()}
              className="gradient-button"
            >
              {isSubmittingProposal ? "Submitting..." : "Submit Proposal"}
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
                  onClick={() => setIsBatchPaymentOpen(true)}
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
              disabled={isProcessingBatchPayment}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleBatchConfirmation(true)}
              disabled={isProcessingBatchPayment}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessingBatchPayment ? (
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
      <Dialog open={isBatchPaymentOpen} onOpenChange={setIsBatchPaymentOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Batch Payment</DialogTitle>
            <DialogDescription>
              Review and process payments for {selectedTasks.size} selected
              tasks
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
                {Object.entries(calculateTotalPayment()).map(
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
                {getSelectedTasksDetails().map((task) => (
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
                  This action will process {getSelectedTasksDetails().length}{" "}
                  payments. Make sure you have sufficient funds in your wallet.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsBatchPaymentOpen(false)}
              disabled={isProcessingBatchPayment}
            >
              Cancel
            </Button>
            <Button
              onClick={processBatchPayment}
              disabled={isProcessingBatchPayment || !canProcessBatchPayment}
              className="gradient-button gap-2"
            >
              {isProcessingBatchPayment ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Process Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaymentPopup
        isOpen={isPaymentPopupOpen}
        onClose={() => setIsPaymentPopupOpen(false)}
        task={taskToPay}
        onPaymentComplete={handlePaymentComplete}
      />
    </div>
  );
}