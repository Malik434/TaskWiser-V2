"use client";

import { DialogTrigger } from "@/components/ui/dialog";

import type React from "react";

import { useState, useEffect, useRef, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useFirebase } from "./firebase-provider";
import { useWeb3 } from "./web3-provider";
import { Button } from "@/components/ui/button";
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
import type { Task, UserProfile } from "@/lib/types";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentPopup } from "./payment-popup";

type Column = {
  id: string;
  title: string;
  icon: React.ReactNode;
  tasks: Task[];
  count: number;
};

export function KanbanBoard() {
  const {
    addTask,
    getTasks,
    updateTask,
    deleteTask,
    isInitialized,
    getUserProfiles,
    getUserProfile,
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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState("");
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [createdTasks, setCreatedTasks] = useState<Task[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
  // New states for payment popup
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [taskBeingPaid, setTaskBeingPaid] = useState<Task | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isPaymentPopupOpen, setIsPaymentPopupOpen] = useState(false);
  const [taskToPay, setTaskToPay] = useState<Task | null>(null);
  // Multiple Selection and batch processing
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isBatchPaymentOpen, setIsBatchPaymentOpen] = useState(false);
  const [isProcessingBatchPayment, setIsProcessingBatchPayment] =
    useState(false);

  // Specific loading states for better UX
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [isFetchingTasks, setIsFetchingTasks] = useState(false);

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

  useEffect(() => {
    if (account && isInitialized) {
      fetchAllTasks();
      fetchUsers();
    }
  }, [account, isInitialized]);

  useEffect(() => {
    if (selectedTask) {
      setEditedTask({
        title: selectedTask.title,
        description: selectedTask.description,
        priority: selectedTask.priority,
        reward: selectedTask.reward,
        rewardAmount: selectedTask.rewardAmount,
        assigneeId: selectedTask.assigneeId,
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

      // Ctrl/Cmd + Shift + P: Process batch payment (if tasks selected)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "P") {
        if (selectedTasks.size > 0) {
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
      // Fetch tasks created by the user
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
      const q = query(
        collection(db, "tasks"),
        where("assigneeId", "==", account)
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

      // After fetching tasks, ensure assignee information is populated
      const tasksWithAssigneeInfo = await Promise.all(
        combinedTasks.map(async (task) => {
          // If task has assigneeId but no assignee info, fetch the user profile
          if (task.assigneeId) {
            try {
              const assigneeProfile = await getUserProfile(
                task.assigneeId.toLowerCase()
              );
              if (assigneeProfile) {
                return {
                  ...task,
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
          return task;
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

    updateColumnsWithTasks(tasksToShow);
  };

  const updateColumnsWithTasks = (tasks: Task[]) => {
    // Reset columns
    const updatedColumns = columns.map((column) => ({
      ...column,
      tasks: [] as Task[],
      count: 0,
    }));

    // Distribute tasks to columns
    tasks.forEach((task) => {
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
      // Convert "no_reward" to undefined for the reward field
      const taskToCreate = {
        ...newTask,
        reward: newTask.reward === "no_reward" ? undefined : newTask.reward,
        userId: account,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const taskId = await addTask(taskToCreate);

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

      const newTaskWithId = {
        id: taskId,
        ...newTask,
        userId: account,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        assignee,
      };

      // Update our task lists
      setCreatedTasks((prev) => [...prev, newTaskWithId]);
      setAllTasks((prev) => [...prev, newTaskWithId]);

      // If the task is assigned to the current user, add it to assignedTasks too
      if (newTask.assigneeId === account) {
        setAssignedTasks((prev) => [...prev, newTaskWithId]);
      }

      // Update columns based on current view
      updateColumnsBasedOnView();

      setNewTask({
        title: "",
        description: "",
        status: "todo",
        priority: "medium",
      });

      setIsDialogOpen(false);

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
      const updatedTaskData = {
        ...editedTask,
        reward:
          editedTask.reward === "no_reward" ? undefined : editedTask.reward,
        assigneeId: editedTask.assigneeId,
        updatedAt: new Date().toISOString(),
      };

      // If assignee changed, fetch the assignee details
      let assignee = selectedTask.assignee;
      if (
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

      const updatedTask = {
        ...selectedTask,
        ...editedTask,
        assignee,
        updatedAt: new Date().toISOString(),
      };

      await updateTask(selectedTask.id, updatedTaskData);

      // Update our task lists
      const updateTaskInList = (list: Task[]) =>
        list.map((task) => (task.id === updatedTask.id ? updatedTask : task));

      setAllTasks(updateTaskInList(allTasks));
      setCreatedTasks(updateTaskInList(createdTasks));
      setAssignedTasks(updateTaskInList(assignedTasks));

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

  const handleApproveSubmission = async () => {
    if (!selectedTask || !selectedTask.submission) return;

    setIsLoading(true);

    try {
      const updatedSubmission = {
        ...selectedTask.submission,
        status: "approved" as const,
      };

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

      // Update our task lists
      const updateTaskInList = (list: Task[]) =>
        list.map((task) => (task.id === updatedTask.id ? updatedTask : task));

      setAllTasks(updateTaskInList(allTasks));
      setCreatedTasks(updateTaskInList(createdTasks));
      setAssignedTasks(updateTaskInList(assignedTasks));

      // Update columns based on current view
      updateColumnsBasedOnView();

      setSelectedTask(updatedTask);

      // If the task has a reward, show the payment dialog
      if (
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

  // Filter users based on search query
  const getFilteredUsers = (users: UserProfile[], query: string) => {
    if (!query) return users;

    return users.filter(
      (user) =>
        user.username.toLowerCase().includes(query.toLowerCase()) ||
        user.address.toLowerCase().includes(query.toLowerCase())
    );
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

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case "high":
        return "priority-badge-high";
      case "medium":
        return "priority-badge-medium";
      case "low":
        return "priority-badge-low";
      default:
        return "";
    }
  };

  const getTaskCardClass = (priority: string) => {
    switch (priority) {
      case "high":
        return "priority-high";
      case "medium":
        return "priority-medium";
      case "low":
        return "priority-low";
      default:
        return "";
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
    <div className="p-4 min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:bg-gray-900 dark:from-gray-900 dark:to-gray-800">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* <Button variant="ghost" size="icon" className="rounded-full">
            <ChevronLeft className="h-5 w-5" />
          </Button> */}
          <h1 className="text-2xl font-bold"> My Task Board</h1>
          {isSelectionMode && selectedTasks.size > 0 && (
            <Badge variant="secondary" className="ml-2">
              {selectedTasks.size} selected
            </Badge>
          )}

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
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-button">
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newTask.title}
                  onChange={(e) =>
                    setNewTask({ ...newTask, title: e.target.value })
                  }
                  placeholder="Task title"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTask.description}
                  onChange={(e) =>
                    setNewTask({ ...newTask, description: e.target.value })
                  }
                  placeholder="Task description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={newTask.status}
                    onValueChange={(value) =>
                      setNewTask({ ...newTask, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="inprogress">In Progress</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value) =>
                      setNewTask({ ...newTask, priority: value })
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
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assignee">Assignee</Label>
                <div className="relative">
                  <Input
                    placeholder="Search by username or wallet address..."
                    value={assigneeSearchQuery}
                    onChange={(e) => setAssigneeSearchQuery(e.target.value)}
                    className="w-full"
                  />
                  <div
                    className={`absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md ${
                      assigneeSearchQuery ? "block" : "hidden"
                    }`}
                  >
                    <div className="max-h-60 overflow-auto p-1">
                      <div
                        className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
                        onClick={() => {
                          setNewTask({ ...newTask, assigneeId: undefined });
                          setAssigneeSearchQuery("");
                        }}
                      >
                        <User className="h-4 w-4" />
                        <span>Unassigned</span>
                      </div>
                      {isLoadingUsers ? (
                        <div className="flex items-center justify-center p-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : (
                        getFilteredUsers(
                          availableUsers,
                          assigneeSearchQuery
                        ).map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
                            onClick={() => {
                              setNewTask({ ...newTask, assigneeId: user.id });
                              setAssigneeSearchQuery("");
                            }}
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage
                                src={user.profilePicture || "/placeholder.svg"}
                                alt={user.username}
                              />
                              <AvatarFallback>
                                {user.username.substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span>{user.username}</span>
                              <span className="text-xs text-muted-foreground">
                                {user.address.substring(0, 10)}...
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                      {assigneeSearchQuery &&
                        getFilteredUsers(availableUsers, assigneeSearchQuery)
                          .length === 0 && (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No users found
                          </div>
                        )}
                    </div>
                  </div>
                </div>
                {newTask.assigneeId && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm">Selected:</span>
                    {(() => {
                      const user = availableUsers.find(
                        (user) => user.id === newTask.assigneeId
                      );
                      return (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage
                              src={user?.profilePicture || "/placeholder.svg"}
                              alt={user?.username}
                            />
                            <AvatarFallback>
                              {user?.username?.substring(0, 2) || "UN"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {user?.username || "Unknown User"}
                          </span>
                        </div>
                      );
                    })()}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 rounded-full"
                      onClick={() =>
                        setNewTask({ ...newTask, assigneeId: undefined })
                      }
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="reward">Reward (Optional)</Label>
                  <Select
                    value={newTask.reward || "no_reward"}
                    onValueChange={(value) =>
                      setNewTask({
                        ...newTask,
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
                      <SelectItem value="ETH">ETH</SelectItem>
                      <SelectItem value="BNB">BNB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rewardAmount">Amount (Optional)</Label>
                  <Input
                    id="rewardAmount"
                    type="number"
                    value={newTask.rewardAmount || ""}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        rewardAmount: e.target.value
                          ? Number.parseFloat(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder="0.00"
                    disabled={!newTask.reward}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateTask}
                disabled={isLoading}
                className="gradient-button"
              >
                {isLoading ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Tabs
            value={activeView}
            onValueChange={setActiveView}
            className="w-full md:w-auto"
          >
            <TabsList className="bg-white/80 dark:bg-[#1e1e1e] p-1 shadow-sm">
              <TabsTrigger
                value="all"
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                <Circle className="h-4 w-4" />
                All Tasks
              </TabsTrigger>
              <TabsTrigger
                value="created"
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                <FileEdit className="h-4 w-4 text-purple-500" />
                Created by Me
              </TabsTrigger>
              <TabsTrigger
                value="assigned"
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                <UserCircle className="h-4 w-4 text-blue-500" />
                Assigned to Me
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
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

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {columns.map((column) => (
              <div
                key={column.id}
                className="kanban-column kanban-column-todo bg-white/80 dark:bg-[#1e1e1e] rounded-lg p-4 shadow-md"
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
                      className="min-h-[400px] space-y-3"
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
                                          isDragDisabled={false}
                                        >
                                          {(provided, snapshot) => (
                                            <div
                                              ref={provided.innerRef}
                                              {...provided.draggableProps}
                                              {...provided.dragHandleProps}
                                              className={`task-card ${getTaskCardClass(
                                                task.priority
                                              )} bg-white dark:bg-[#2a2a2a] p-3 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-[#333] shadow-sm border transition-all relative ${
                                                selectedTasks.has(task.id)
                                                  ? "border-purple-500 ring-2 ring-purple-200 dark:ring-purple-800 bg-purple-50 dark:bg-purple-900/20"
                                                  : "border-gray-100 dark:border-gray-700"
                                              } ${
                                                snapshot.isDragging &&
                                                selectedTasks.has(task.id)
                                                  ? "shadow-lg opacity-90"
                                                  : ""
                                              }`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (isSelectionMode) {
                                                  toggleTaskSelection(
                                                    task.id,
                                                    task
                                                  );
                                                } else {
                                                  handleTaskClick(task);
                                                }
                                              }}
                                            >
                                              <div className="flex items-start gap-2">
                                                {/* Selection Checkbox */}
                                                {isSelectionMode && (
                                                  <div className="mt-1 flex-shrink-0">
                                                    {task.reward &&
                                                    task.rewardAmount &&
                                                    !task.paid ? (
                                                      selectedTasks.has(
                                                        task.id
                                                      ) ? (
                                                        <CheckSquare className="h-5 w-5 text-purple-600" />
                                                      ) : (
                                                        <Square className="h-5 w-5 text-gray-400" />
                                                      )
                                                    ) : (
                                                      <Square className="h-5 w-5 text-gray-300 opacity-50" />
                                                    )}
                                                  </div>
                                                )}

                                                <div className="flex-1 min-w-0">
                                                  <div className="mb-2 font-medium truncate">
                                                    {task.title}
                                                  </div>
                                                  <div className="mb-2 text-sm text-muted-foreground line-clamp-2">
                                                    {task.description?.length >
                                                    100
                                                      ? `${task.description.substring(
                                                          0,
                                                          100
                                                        )}...`
                                                      : task.description}
                                                  </div>

                                                  {/* Rest of task card content... */}
                                                  <div className="flex items-center justify-between">
                                                    <div
                                                      className={`rounded-full px-2 py-1 text-xs ${
                                                        task.priority === "high"
                                                          ? "priority-badge-high"
                                                          : task.priority ===
                                                            "medium"
                                                          ? "priority-badge-medium"
                                                          : "priority-badge-low"
                                                      }`}
                                                    >
                                                      {task.priority
                                                        .charAt(0)
                                                        .toUpperCase() +
                                                        task.priority.slice(1)}
                                                    </div>
                                                    {task.reward &&
                                                      task.rewardAmount && (
                                                        <div className="rounded-full bg-amber-100 dark:bg-amber-600/20 px-2 py-1 text-xs text-amber-600 dark:text-amber-400 font-semibold border border-amber-200 dark:border-amber-500/50">
                                                          {task.rewardAmount}{" "}
                                                          {task.reward}
                                                        </div>
                                                      )}
                                                  </div>

                                                  <div className="mt-2 flex items-center justify-between">
                                                    {task.assignee ? (
                                                      <div className="flex items-center gap-2">
                                                        <Avatar className="h-5 w-5">
                                                          <AvatarImage
                                                            src={
                                                              task.assignee
                                                                .profilePicture ||
                                                              "/placeholder.svg"
                                                            }
                                                            alt={
                                                              task.assignee
                                                                .username ||
                                                              "Assignee"
                                                            }
                                                          />
                                                          <AvatarFallback>
                                                            {task.assignee.username
                                                              ?.substring(0, 2)
                                                              .toUpperCase() ||
                                                              "??"}
                                                          </AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                                                          {task.assignee
                                                            .username ||
                                                            "Unknown"}
                                                        </span>
                                                      </div>
                                                    ) : (
                                                      <span className="text-xs text-muted-foreground">
                                                        Unassigned
                                                      </span>
                                                    )}
                                                    <div className="flex items-center gap-1">
                                                      {task.assigneeId ===
                                                        account &&
                                                        task.userId !==
                                                          account && (
                                                          <Badge
                                                            variant="outline"
                                                            className="text-xs bg-blue-100 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-600/20"
                                                          >
                                                            Assigned
                                                          </Badge>
                                                        )}
                                                    </div>
                                                  </div>
                                                </div>

                                                {/* Batch count badge */}
                                                {isSelectionMode &&
                                                  selectedTasks.has(task.id) &&
                                                  selectedTasks.size > 1 && (
                                                    <div className="absolute top-2 right-2 bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                                                      {selectedTasks.size}
                                                    </div>
                                                  )}
                                              </div>
                                            </div>
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
                                          isDragDisabled={false}
                                        >
                                          {(provided, snapshot) => (
                                            <div
                                              ref={provided.innerRef}
                                              {...provided.draggableProps}
                                              {...provided.dragHandleProps}
                                              className={`task-card ${getTaskCardClass(
                                                task.priority
                                              )} bg-white dark:bg-[#2a2a2a] p-3 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-[#333] shadow-sm border transition-all relative ${
                                                selectedTasks.has(task.id)
                                                  ? "border-purple-500 ring-2 ring-purple-200 dark:ring-purple-800 bg-purple-50 dark:bg-purple-900/20"
                                                  : "border-gray-100 dark:border-gray-700"
                                              } ${
                                                snapshot.isDragging &&
                                                selectedTasks.has(task.id)
                                                  ? "shadow-lg opacity-90"
                                                  : ""
                                              }`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (isSelectionMode) {
                                                  toggleTaskSelection(
                                                    task.id,
                                                    task
                                                  );
                                                } else {
                                                  handleTaskClick(task);
                                                }
                                              }}
                                            >
                                              <div className="flex items-start gap-2">
                                                {/* Selection Checkbox */}
                                                {isSelectionMode && (
                                                  <div className="mt-1 flex-shrink-0">
                                                    <Square className="h-5 w-5 text-gray-300 opacity-50" />
                                                  </div>
                                                )}

                                                <div className="flex-1 min-w-0">
                                                  <div className="mb-2 font-medium truncate">
                                                    {task.title}
                                                  </div>
                                                  <div className="mb-2 text-sm text-muted-foreground line-clamp-2">
                                                    {task.description?.length >
                                                    100
                                                      ? `${task.description.substring(
                                                          0,
                                                          100
                                                        )}...`
                                                      : task.description}
                                                  </div>

                                                  {/* Rest of task card content... */}
                                                  <div className="flex items-center justify-between">
                                                    <div
                                                      className={`rounded-full px-2 py-1 text-xs ${
                                                        task.priority === "high"
                                                          ? "priority-badge-high"
                                                          : task.priority ===
                                                            "medium"
                                                          ? "priority-badge-medium"
                                                          : "priority-badge-low"
                                                      }`}
                                                    >
                                                      {task.priority
                                                        .charAt(0)
                                                        .toUpperCase() +
                                                        task.priority.slice(1)}
                                                    </div>
                                                    {task.reward &&
                                                      task.rewardAmount && (
                                                        <div className="rounded-full bg-green-100 dark:bg-green-600/20 px-2 py-1 text-xs text-green-600 dark:text-green-400 font-semibold border border-green-200 dark:border-green-500/50">
                                                          {task.rewardAmount}{" "}
                                                          {task.reward}
                                                        </div>
                                                      )}
                                                    {task.paid && (
                                                      <Badge
                                                        variant="outline"
                                                        className="ml-1 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-500 border-green-200 dark:border-green-500/50"
                                                      >
                                                        Paid
                                                      </Badge>
                                                    )}
                                                  </div>

                                                  <div className="mt-2 flex items-center justify-between">
                                                    {task.assignee ? (
                                                      <div className="flex items-center gap-2">
                                                        <Avatar className="h-5 w-5">
                                                          <AvatarImage
                                                            src={
                                                              task.assignee
                                                                .profilePicture ||
                                                              "/placeholder.svg"
                                                            }
                                                            alt={
                                                              task.assignee
                                                                .username ||
                                                              "Assignee"
                                                            }
                                                          />
                                                          <AvatarFallback>
                                                            {task.assignee.username
                                                              ?.substring(0, 2)
                                                              .toUpperCase() ||
                                                              "??"}
                                                          </AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                                                          {task.assignee
                                                            .username ||
                                                            "Unknown"}
                                                        </span>
                                                      </div>
                                                    ) : (
                                                      <span className="text-xs text-muted-foreground">
                                                        Unassigned
                                                      </span>
                                                    )}
                                                    <div className="flex items-center gap-1">
                                                      {task.userId ===
                                                        account && (
                                                        <Badge
                                                          variant="outline"
                                                          className="text-xs bg-purple-100 dark:bg-purple-600/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-600/20"
                                                        >
                                                          Owner
                                                        </Badge>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
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
                            isDragDisabled={false} // Allow dragging even in selection mode for multi-select batch moves
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`task-card ${getTaskCardClass(
                                  task.priority
                                )} bg-white dark:bg-[#2a2a2a] p-3 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-[#333] shadow-sm border transition-all relative ${
                                  selectedTasks.has(task.id)
                                    ? "border-purple-500 ring-2 ring-purple-200 dark:ring-purple-800 bg-purple-50 dark:bg-purple-900/20"
                                    : "border-gray-100 dark:border-gray-700"
                                } ${
                                  snapshot.isDragging &&
                                  selectedTasks.has(task.id)
                                    ? "shadow-lg opacity-90"
                                    : ""
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isSelectionMode) {
                                    toggleTaskSelection(task.id, task);
                                  } else {
                                    handleTaskClick(task);
                                  }
                                }}
                              >
                                <div className="flex items-start gap-2">
                                  {/* Selection Checkbox */}
                                  {isSelectionMode && (
                                    <div className="mt-1 flex-shrink-0">
                                      {task.reward &&
                                      task.rewardAmount &&
                                      !task.paid ? (
                                        selectedTasks.has(task.id) ? (
                                          <CheckSquare className="h-5 w-5 text-purple-600" />
                                        ) : (
                                          <Square className="h-5 w-5 text-gray-400" />
                                        )
                                      ) : (
                                        <Square className="h-5 w-5 text-gray-300 opacity-50" />
                                      )}
                                    </div>
                                  )}

                                  <div className="flex-1 min-w-0">
                                    <div className="mb-2 font-medium truncate">
                                      {task.title}
                                    </div>
                                    <div className="mb-2 text-sm text-muted-foreground line-clamp-2">
                                      {task.description?.length > 100
                                        ? `${task.description.substring(
                                            0,
                                            100
                                          )}...`
                                        : task.description}
                                    </div>

                                    {/* Rest of task card content... */}
                                    <div className="flex items-center justify-between">
                                      <div
                                        className={`rounded-full px-2 py-1 text-xs ${
                                          task.priority === "high"
                                            ? "priority-badge-high"
                                            : task.priority === "medium"
                                            ? "priority-badge-medium"
                                            : "priority-badge-low"
                                        }`}
                                      >
                                        {task.priority.charAt(0).toUpperCase() +
                                          task.priority.slice(1)}
                                      </div>
                                      {task.reward && task.rewardAmount && (
                                        <div className="rounded-full bg-purple-100 dark:bg-purple-600/20 px-2 py-1 text-xs text-purple-600 dark:text-purple-400">
                                          {task.rewardAmount} {task.reward}
                                        </div>
                                      )}
                                      {task.paid && (
                                        <Badge
                                          variant="outline"
                                          className="ml-1 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-500 border-green-200 dark:border-green-500/50"
                                        >
                                          Paid
                                        </Badge>
                                      )}
                                    </div>

                                    <div className="mt-2 flex items-center justify-between">
                                      {task.assignee ? (
                                        <div className="flex items-center gap-2">
                                          <Avatar className="h-5 w-5">
                                            <AvatarImage
                                              src={
                                                task.assignee.profilePicture ||
                                                "/placeholder.svg"
                                              }
                                              alt={
                                                task.assignee.username ||
                                                "Assignee"
                                              }
                                            />
                                            <AvatarFallback>
                                              {task.assignee.username
                                                ?.substring(0, 2)
                                                .toUpperCase() || "??"}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                                            {task.assignee.username ||
                                              "Unknown"}
                                          </span>
                                        </div>
                                      ) : task.assigneeId ? (
                                        <div className="flex items-center gap-2">
                                          <Avatar className="h-5 w-5">
                                            <AvatarFallback>?</AvatarFallback>
                                          </Avatar>
                                          <span className="text-xs text-muted-foreground">
                                            {task.assigneeId === account
                                              ? "You"
                                              : "Assigned"}
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <User className="h-4 w-4 text-muted-foreground" />
                                          <span className="text-xs text-muted-foreground">
                                            Unassigned
                                          </span>
                                        </div>
                                      )}

                                      <div className="flex items-center gap-1">
                                        {/* Show paid badge if task is paid */}
                                        {task.paid && (
                                          <Badge
                                            variant="outline"
                                            className="text-xs bg-green-100 dark:bg-green-600/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-600/20"
                                          >
                                            Paid
                                          </Badge>
                                        )}

                                        {/* Show task ownership indicator */}
                                        {task.userId === account && (
                                          <Badge
                                            variant="outline"
                                            className="text-xs bg-purple-100 dark:bg-purple-600/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-600/20"
                                          >
                                            Owner
                                          </Badge>
                                        )}
                                        {task.assigneeId === account &&
                                          task.userId !== account && (
                                            <Badge
                                              variant="outline"
                                              className="text-xs bg-blue-100 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-600/20"
                                            >
                                              Assignee
                                            </Badge>
                                          )}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Batch count indicator when dragging multiple tasks */}
                                {isSelectionMode &&
                                  selectedTasks.has(task.id) &&
                                  selectedTasks.size > 1 && (
                                    <div className="absolute top-2 right-2 bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                                      {selectedTasks.size}
                                    </div>
                                  )}
                              </div>
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
                  <DialogDescription>
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
                    </div>
                  </DialogDescription>
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
                      <div className="grid gap-2">
                        <Label htmlFor="edit-assignee">Assignee</Label>
                        <div className="relative">
                          <Input
                            placeholder="Search by username or wallet address..."
                            value={assigneeSearchQuery}
                            onChange={(e) =>
                              setAssigneeSearchQuery(e.target.value)
                            }
                            className="w-full"
                          />
                          <div
                            className={`absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md ${
                              assigneeSearchQuery ? "block" : "hidden"
                            }`}
                          >
                            <div className="max-h-60 overflow-auto p-1">
                              <div
                                className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
                                onClick={() => {
                                  setEditedTask({
                                    ...editedTask,
                                    assigneeId: undefined,
                                  });
                                  setAssigneeSearchQuery("");
                                }}
                              >
                                <User className="h-4 w-4" />
                                <span>Unassigned</span>
                              </div>
                              {isLoadingUsers ? (
                                <div className="flex items-center justify-center p-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                              ) : (
                                getFilteredUsers(
                                  availableUsers,
                                  assigneeSearchQuery
                                ).map((user) => (
                                  <div
                                    key={user.id}
                                    className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
                                    onClick={() => {
                                      setEditedTask({
                                        ...editedTask,
                                        assigneeId: user.id,
                                      });
                                      setAssigneeSearchQuery("");
                                    }}
                                  >
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage
                                        src={
                                          user.profilePicture ||
                                          "/placeholder.svg"
                                        }
                                        alt={user.username}
                                      />
                                      <AvatarFallback>
                                        {user.username.substring(0, 2)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                      <span>{user.username}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {user.address.substring(0, 10)}...
                                      </span>
                                    </div>
                                  </div>
                                ))
                              )}
                              {assigneeSearchQuery &&
                                getFilteredUsers(
                                  availableUsers,
                                  assigneeSearchQuery
                                ).length === 0 && (
                                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                    No users found
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>
                        {editedTask.assigneeId && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm">Selected:</span>
                            {(() => {
                              const user = availableUsers.find(
                                (user) => user.id === editedTask.assigneeId
                              );
                              return (
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage
                                      src={
                                        user?.profilePicture ||
                                        "/placeholder.svg"
                                      }
                                      alt={user?.username}
                                    />
                                    <AvatarFallback>
                                      {user?.username?.substring(0, 2) || "UN"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">
                                    {user?.username || "Unknown User"}
                                  </span>
                                </div>
                              );
                            })()}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 rounded-full"
                              onClick={() =>
                                setEditedTask({
                                  ...editedTask,
                                  assigneeId: undefined,
                                })
                              }
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
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
                            <SelectItem value="ETH">ETH</SelectItem>
                            <SelectItem value="BNB">BNB</SelectItem>
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
                  <div className="flex justify-between">
                    {selectedTask.assigneeId === account &&
                      selectedTask.status === "inprogress" &&
                      !selectedTask.submission && (
                        <Button
                          onClick={() => setIsSubmitDialogOpen(true)}
                          className="gradient-button"
                        >
                          Submit Work
                        </Button>
                      )}

                    {selectedTask.userId === account &&
                      selectedTask.status === "review" &&
                      selectedTask.submission && (
                        <div className="flex gap-2">
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
                        </div>
                      )}

                    <Button
                      variant="outline"
                      onClick={() => setIsTaskDetailOpen(false)}
                    >
                      Close
                    </Button>
                  </div>
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
              <Button
                onClick={() => setIsBatchPaymentOpen(true)}
                className="gradient-button"
              >
                Process Payment
              </Button>
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
                <div className="pt-2 border-t border-purple-200 dark:border-purple-700">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Tasks:</span>
                    <span className="font-medium">
                      {getSelectedTasksDetails().length}
                    </span>
                  </div>
                </div>
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
              disabled={isProcessingBatchPayment}
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
