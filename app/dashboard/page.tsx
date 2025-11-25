"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { WalletConnect } from "@/components/wallet-connect";
import { ThemeToggle } from "@/components/theme-toggle";
import { useWeb3 } from "@/components/web3-provider";
import { useFirebase } from "@/components/firebase-provider";
import { WalletConnectionCard } from "@/components/wallet-connection-card";
import { useToast } from "@/components/ui/use-toast";
import type { Task, UserProfile, Project } from "@/lib/types";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  CreditCard,
  TrendingUp,
  Filter,
  Search,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface DashboardStats {
  totalAssigned: number;
  completed: number;
  pending: number;
  totalEarnings: number;
  pendingPayments: number;
}

export default function MyTaskboardPage() {
  const { isConnected, account } = useWeb3();
  const { getAllTasks, updateTask, getUserProfile, getProjects } = useFirebase();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalAssigned: 0,
    completed: 0,
    pending: 0,
    totalEarnings: 0,
    pendingPayments: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [selectedTaskForSubmission, setSelectedTaskForSubmission] =
    useState<Task | null>(null);
  const [submissionContent, setSubmissionContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmissionDialogOpen, setIsSubmissionDialogOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch user profile and get their ID
  useEffect(() => {
    if (account) {
      fetchUserIdAndTasks();
    }
  }, [account]);

  const fetchUserIdAndTasks = async () => {
    try {
      setIsLoading(true);
      
      if (!account) {
        toast({
          title: "Error",
          description: "Wallet not connected",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Get user profile to retrieve the user ID
      const userProfile = await getUserProfile(account);

      if (!userProfile || !userProfile.id) {
        toast({
          title: "Error",
          description: "Could not load user profile",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      setUserId(userProfile.id);

      // Now fetch tasks using the correct user ID
      const allTasks = await getAllTasks();

      // Filter tasks assigned to the current user using their user ID
      const assignedTasks = allTasks.filter(
        (task) => task.assigneeId === userProfile.id
      );

      // Fetch projects
      const allProjects = await getProjects();
      setProjects(allProjects);

      setTasks(assignedTasks);
      calculateStats(assignedTasks);
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

  const calculateStats = (taskList: Task[]) => {
    const stats: DashboardStats = {
      totalAssigned: taskList.length,
      completed: taskList.filter((t) => t.status === "done").length,
      pending: taskList.filter((t) => t.status !== "done").length,
      totalEarnings: 0,
      pendingPayments: 0,
    };

    taskList.forEach((task) => {
      if (task.rewardAmount && task.reward) {
        if (task.paid) {
          stats.totalEarnings += task.rewardAmount;
        } else {
          stats.pendingPayments += task.rewardAmount;
        }
      }
    });

    setStats(stats);
  };

  const getFilteredTasks = () => {
    return tasks.filter((task) => {
      const matchesSearch =
        searchQuery === "" ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        filterStatus === "all" || task.status === filterStatus;

      const matchesPriority =
        filterPriority === "all" || task.priority === filterPriority;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  };

  const handleSubmitDeliverable = async () => {
    if (!selectedTaskForSubmission || !submissionContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter a submission",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const submission = {
        content: submissionContent,
        submittedAt: new Date().toISOString(),
        status: "pending" as const,
      };

      await updateTask(selectedTaskForSubmission.id, { submission });

      // Update local task
      setTasks(
        tasks.map((task) =>
          task.id === selectedTaskForSubmission.id
            ? { ...task, submission }
            : task
        )
      );

      toast({
        title: "Success",
        description: "Submission uploaded successfully",
      });

      setIsSubmissionDialogOpen(false);
      setSubmissionContent("");
      setSelectedTaskForSubmission(null);
    } catch (error) {
      console.error("Error submitting deliverable:", error);
      toast({
        title: "Error",
        description: "Failed to submit deliverable",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "todo":
        return "bg-[hsl(var(--kanban-todo))] text-muted-foreground";
      case "inprogress":
        return "bg-[hsl(var(--kanban-in-progress))] text-muted-foreground";
      case "review":
        return "bg-[hsl(var(--kanban-in-progress))] text-muted-foreground";
      case "done":
        return "bg-[hsl(var(--kanban-done))] text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "priority-badge-high";
      case "medium":
        return "priority-badge-medium";
      case "low":
        return "priority-badge-low";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (!isClient) {
    return null;
  }

  if (!isConnected || !account) {
    return <WalletConnectionCard />;
  }

  const filteredTasks = getFilteredTasks();

  return (
    <div className="flex h-screen dark-container">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-sm px-4 dark-header sm:h-16 sm:px-6">
          <h1 className="text-lg font-bold sm:text-xl md:ml-0 ml-12">Dashboard</h1>
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <div className="hidden sm:block">
              <WalletConnect />
            </div>
          </div>
        </header>

        <main className="animate-in fade-in duration-500 p-3 sm:p-4 md:p-6">
          {/* Dashboard Statistics */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl font-bold mb-3 sm:text-2xl sm:mb-4">Statistics</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-5">
              {/* Total Tasks */}
              <Card>
                <CardHeader className="pb-2 p-3 sm:p-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 sm:text-sm sm:gap-2">
                    <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Total Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                  <div className="text-xl font-bold sm:text-2xl">
                    {stats.totalAssigned}
                  </div>
                  <p className="text-[10px] text-muted-foreground sm:text-xs">
                    Assigned to you
                  </p>
                </CardContent>
              </Card>

              {/* Completed Tasks */}
              <Card>
                <CardHeader className="pb-2 p-3 sm:p-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 sm:text-sm sm:gap-2">
                    <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[hsl(var(--kanban-done-foreground))]" />
                    Completed
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                  <div className="text-xl font-bold text-[hsl(var(--kanban-done-foreground))] sm:text-2xl">
                    {stats.completed}
                  </div>
                  <p className="text-[10px] text-muted-foreground sm:text-xs">
                    {stats.totalAssigned > 0
                      ? Math.round(
                          (stats.completed / stats.totalAssigned) * 100
                        )
                      : 0}
                    % completion
                  </p>
                </CardContent>
              </Card>

              {/* Pending Tasks */}
              <Card>
                <CardHeader className="pb-2 p-3 sm:p-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 sm:text-sm sm:gap-2">
                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[hsl(var(--kanban-in-progress-foreground))]" />
                    Pending
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                  <div className="text-xl font-bold text-[hsl(var(--kanban-in-progress-foreground))] sm:text-2xl">
                    {stats.pending}
                  </div>
                  <p className="text-[10px] text-muted-foreground sm:text-xs">
                    In progress or to do
                  </p>
                </CardContent>
              </Card>

              {/* Total Earnings */}
              <Card>
                <CardHeader className="pb-2 p-3 sm:p-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 sm:text-sm sm:gap-2">
                    <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[hsl(var(--kanban-done-foreground))]" />
                    Total Earnings
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                  <div className="text-xl font-bold text-[hsl(var(--kanban-done-foreground))] sm:text-2xl">
                    {"$" + stats.totalEarnings}
                  </div>
                  <p className="text-[10px] text-muted-foreground sm:text-xs">Paid rewards</p>
                </CardContent>
              </Card>

              {/* Pending Payments */}
              <Card>
                <CardHeader className="pb-2 p-3 sm:p-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 sm:text-sm sm:gap-2">
                    <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[hsl(var(--kanban-in-progress-foreground))]" />
                    Pending Payments
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                  <div className="text-xl font-bold text-[hsl(var(--kanban-in-progress-foreground))] sm:text-2xl">
                    {"$" + stats.pendingPayments}
                  </div>
                  <p className="text-[10px] text-muted-foreground sm:text-xs">
                    Awaiting payment
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Personal Task Board */}
          <div>
            <h2 className="text-xl font-bold mb-3 sm:text-2xl sm:mb-4">My Tasks</h2>
            <p className="text-xs text-muted-foreground mb-3 sm:text-sm sm:mb-4">
              Read-only view of all tasks assigned to you across all projects
            </p>

            {/* Filters and Search */}
            <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:gap-4 md:flex-row md:items-center">
              <div className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground sm:left-3 sm:h-4 sm:w-4" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-sm sm:pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[120px] text-xs sm:w-[150px] sm:text-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="inprogress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filterPriority}
                  onValueChange={setFilterPriority}
                >
                  <SelectTrigger className="w-[120px] text-xs sm:w-[150px] sm:text-sm">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tasks List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : filteredTasks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {searchQuery ||
                    filterStatus !== "all" ||
                    filterPriority !== "all"
                      ? "No tasks match your filters"
                      : "No tasks assigned to you yet"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {filteredTasks.map((task) => (
                  <Card
                    key={task.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm mb-1 sm:text-base">
                            {task.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2 sm:text-sm sm:mb-3">
                            {task.description}
                          </p>
                          <div className="flex flex-wrap gap-1.5 items-center sm:gap-2">
                            <Badge className={cn(getStatusColor(task.status), "text-xs sm:text-sm")}>
                              {task.status.charAt(0).toUpperCase() +
                                task.status.slice(1)}
                            </Badge>
                            <Badge className={cn(getPriorityColor(task.priority), "text-xs sm:text-sm")}>
                              {task.priority.charAt(0).toUpperCase() +
                                task.priority.slice(1)}
                            </Badge>
                            {task.reward && task.rewardAmount && (
                              <Badge variant="secondary" className="text-xs sm:text-sm">
                                {task.rewardAmount} {task.reward}
                              </Badge>
                            )}
                            {task.paid && (
                              <Badge className="bg-[hsl(var(--kanban-done))] text-muted-foreground text-xs sm:text-sm">
                                ✓ Paid
                              </Badge>
                            )}
                            {task.submission?.status === "pending" && (
                              <Badge className="bg-[hsl(var(--kanban-in-progress))] text-muted-foreground text-xs sm:text-sm">
                                Submission Pending
                              </Badge>
                            )}
                            {task.submission?.status === "approved" && (
                              <Badge className="bg-[hsl(var(--kanban-done))] text-muted-foreground text-xs sm:text-sm">
                                ✓ Approved
                              </Badge>
                            )}
                            {task.submission?.status === "rejected" && (
                              <Badge className="bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] text-xs sm:text-sm">
                                ✗ Rejected
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-row items-center justify-between gap-2 sm:ml-4 sm:flex-col sm:items-end">
                          <Dialog
                            open={isSubmissionDialogOpen}
                            onOpenChange={setIsSubmissionDialogOpen}
                          >
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setSelectedTaskForSubmission(task)
                                }
                                disabled={task.status === "done"}
                                className="gap-1 h-8 text-xs sm:h-9 sm:text-sm"
                              >
                                <Upload className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                Submit
                              </Button>
                            </DialogTrigger>
                            {selectedTaskForSubmission?.id === task.id && (
                              <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                  <DialogTitle>Submit Deliverable</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="task-title">Task</Label>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {selectedTaskForSubmission.title}
                                    </p>
                                  </div>
                                  <div>
                                    <Label htmlFor="submission">
                                      Submission Content
                                    </Label>
                                    <Textarea
                                      id="submission"
                                      placeholder="Describe your deliverable, include links, or paste content..."
                                      value={submissionContent}
                                      onChange={(e) =>
                                        setSubmissionContent(e.target.value)
                                      }
                                      className="mt-2 min-h-[200px]"
                                    />
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setIsSubmissionDialogOpen(false);
                                        setSubmissionContent("");
                                        setSelectedTaskForSubmission(null);
                                      }}
                                      disabled={isSubmitting}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      onClick={handleSubmitDeliverable}
                                      disabled={
                                        isSubmitting ||
                                        !submissionContent.trim()
                                      }
                                      className="gap-1"
                                    >
                                      {isSubmitting ? (
                                        <>
                                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-foreground"></div>
                                          Submitting...
                                        </>
                                      ) : (
                                        <>
                                          <Upload className="h-4 w-4" />
                                          Submit
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            )}
                          </Dialog>
                          <div className="flex items-center gap-2 sm:flex-col sm:items-end sm:text-right">
                            {/* Project Information */}
                            {(() => {
                              const project = task.projectId 
                                ? projects.find(p => p.id === task.projectId)
                                : null;
                              
                              return (
                                <div className="flex items-center gap-1.5 sm:justify-end sm:gap-2 sm:mb-2">
                                  <Avatar className="h-5 w-5 sm:h-6 sm:w-6">
                                    <AvatarFallback className="text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 sm:text-xs">
                                      {project?.title 
                                        ? project.title.substring(0, 2).toUpperCase()
                                        : "UK"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-[10px] text-muted-foreground sm:text-xs">
                                    {project?.title || "Unknown Project"}
                                  </span>
                                </div>
                              );
                            })()}
                            <p className="text-[10px] text-muted-foreground sm:text-xs">
                              {new Date(task.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
