"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { WalletConnect } from "@/components/wallet-connect";
import { ThemeToggle } from "@/components/theme-toggle";
import { useWeb3 } from "@/components/web3-provider";
import { useFirebase } from "@/components/firebase-provider";
import { useToast } from "@/components/ui/use-toast";
import type { Task, UserProfile, Project } from "@/lib/types";
import { ProtectedRoute } from "@/components/protected-route";
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
  Target,
  Zap,
  Award,
  Briefcase,
  Calendar,
  Check,
  FileText,
  Sparkles,
  Loader2,
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
  const { account } = useWeb3();
  const { getAllTasks, updateTask, getUserProfile, getProjects } = useFirebase();
  const { toast } = useToast();
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

  const filteredTasks = getFilteredTasks();

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          {/* Enhanced Header */}
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
            <div className="flex h-16 items-center justify-between px-4 sm:px-6">
              <div className="flex items-center gap-3 md:ml-0 ml-12">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
                  <Target className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                    Dashboard
                  </h1>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Your task overview
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                <ThemeToggle />
                <div className="hidden sm:block">
                  <WalletConnect />
                </div>
              </div>
            </div>
          </header>

          <main className="animate-in fade-in duration-500 p-4 sm:p-6">
            <div className="mx-auto max-w-7xl space-y-6">
              {/* Dashboard Statistics */}
              <div className="space-y-6">
                {/* Header */}
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    Performance Overview
                  </div>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                    Your Performance
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Track your progress and earnings across all projects
                  </p>
                </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Total Tasks Card */}
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 shadow-lg transition-all duration-300 hover:shadow-xl dark:border-slate-800 dark:from-indigo-950/30 dark:to-purple-950/30">
                <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-indigo-500/10 blur-2xl" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
                      <Target className="h-6 w-6 text-white" />
                    </div>
                    <div className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                      Total
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Tasks</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                      {stats.totalAssigned}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Assigned to you</p>
                  </div>
                </div>
              </div>

              {/* Completed Tasks Card */}
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-green-50 to-emerald-50 p-6 shadow-lg transition-all duration-300 hover:shadow-xl dark:border-slate-800 dark:from-green-950/30 dark:to-emerald-950/30">
                <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-green-500/10 blur-2xl" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                    <div className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300">
                      {stats.totalAssigned > 0
                        ? Math.round((stats.completed / stats.totalAssigned) * 100)
                        : 0}%
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Completed</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                      {stats.completed}
                    </p>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                        style={{
                          width: `${stats.totalAssigned > 0 ? (stats.completed / stats.totalAssigned) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Pending Tasks Card */}
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-lg transition-all duration-300 hover:shadow-xl dark:border-slate-800 dark:from-amber-950/30 dark:to-orange-950/30">
                <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-amber-500/10 blur-2xl" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                    <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                      Active
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Pending</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                      {stats.pending}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">In progress or to do</p>
                  </div>
                </div>
              </div>

              {/* Total Earnings Card */}
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-fuchsia-50 to-pink-50 p-6 shadow-lg transition-all duration-300 hover:shadow-xl dark:border-slate-800 dark:from-fuchsia-950/30 dark:to-pink-950/30">
                <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-fuchsia-500/10 blur-2xl" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-500 shadow-lg">
                      <Award className="h-6 w-6 text-white" />
                    </div>
                    <div className="rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-medium text-fuchsia-700 dark:bg-fuchsia-900/50 dark:text-fuchsia-300">
                      Earned
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Earnings</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                      ${stats.totalEarnings.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Paid rewards</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Task Distribution Pie Chart */}
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-lg backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                    Task Distribution
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Your task completion breakdown
                  </p>
                </div>
                <div className="flex items-center justify-center py-8">
                  {/* Simple Pie Chart using SVG */}
                  <div className="relative">
                    <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
                      {/* Completed slice */}
                      <circle
                        cx="100"
                        cy="100"
                        r="80"
                        fill="none"
                        stroke="url(#gradient-completed)"
                        strokeWidth="40"
                        strokeDasharray={`${stats.totalAssigned > 0 ? (stats.completed / stats.totalAssigned) * 502.4 : 0} 502.4`}
                        className="transition-all duration-500"
                      />
                      {/* Pending slice */}
                      <circle
                        cx="100"
                        cy="100"
                        r="80"
                        fill="none"
                        stroke="url(#gradient-pending)"
                        strokeWidth="40"
                        strokeDasharray={`${stats.totalAssigned > 0 ? (stats.pending / stats.totalAssigned) * 502.4 : 0} 502.4`}
                        strokeDashoffset={`-${stats.totalAssigned > 0 ? (stats.completed / stats.totalAssigned) * 502.4 : 0}`}
                        className="transition-all duration-500"
                      />
                      <defs>
                        <linearGradient id="gradient-completed" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                        <linearGradient id="gradient-pending" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#d97706" />
                        </linearGradient>
                      </defs>
                    </svg>
                    {/* Center text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                        {stats.totalAssigned}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Total</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="flex items-center gap-3 rounded-xl bg-green-50 p-3 dark:bg-green-950/30">
                    <div className="h-3 w-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-500" />
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Completed</p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                        {stats.completed}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-3 dark:bg-amber-950/30">
                    <div className="h-3 w-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500" />
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Pending</p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                        {stats.pending}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Earnings Overview */}
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-lg backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                    Earnings Overview
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Your payment status
                  </p>
                </div>
                <div className="space-y-6">
                  {/* Total Earnings */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
                          <CreditCard className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Total Paid
                        </span>
                      </div>
                      <span className="text-xl font-bold text-green-600 dark:text-green-400">
                        ${stats.totalEarnings.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
                        style={{
                          width: `${(stats.totalEarnings / (stats.totalEarnings + stats.pendingPayments || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Pending Payments */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
                          <AlertCircle className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Pending
                        </span>
                      </div>
                      <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                        ${stats.pendingPayments.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                        style={{
                          width: `${(stats.pendingPayments / (stats.totalEarnings + stats.pendingPayments || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Total Potential */}
                  <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-4 dark:border-slate-800 dark:from-indigo-950/30 dark:to-purple-950/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Total Potential
                        </span>
                      </div>
                      <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                        ${(stats.totalEarnings + stats.pendingPayments).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

              {/* Personal Task Board */}
              <div className="space-y-6">
                {/* Section Header */}
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                    <Briefcase className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    Task Management
                  </div>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                    My Tasks
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    All tasks assigned to you across all projects
                  </p>
                </div>

                {/* Enhanced Filters and Search */}
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-lg backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        placeholder="Search tasks by title or description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-11 rounded-xl border-slate-300 pl-10 dark:border-slate-700"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="h-11 w-[140px] rounded-xl border-slate-300 dark:border-slate-700 sm:w-[160px]">
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
                      <Select value={filterPriority} onValueChange={setFilterPriority}>
                        <SelectTrigger className="h-11 w-[140px] rounded-xl border-slate-300 dark:border-slate-700 sm:w-[160px]">
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
                </div>

                {/* Tasks List */}
                {isLoading ? (
                  <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white/80 p-16 shadow-lg backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-16 text-center dark:border-slate-700 dark:bg-slate-900/30">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-950/50 dark:to-purple-950/50">
                      <FileText className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-50">
                      {searchQuery || filterStatus !== "all" || filterPriority !== "all"
                        ? "No tasks match your filters"
                        : "No tasks assigned yet"}
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {searchQuery || filterStatus !== "all" || filterPriority !== "all"
                        ? "Try adjusting your search or filters"
                        : "Tasks assigned to you will appear here"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTasks.map((task) => (
                      <Card
                        key={task.id}
                        className="group overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-lg transition-all duration-300 hover:scale-[1.01] hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/80"
                      >
                        <CardContent className="p-6">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex-1 min-w-0 space-y-3">
                              <div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-1">
                                  {task.title}
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                                  {task.description || "No description provided"}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge className={cn(
                                  "rounded-full text-xs font-medium",
                                  getStatusColor(task.status)
                                )}>
                                  {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                                </Badge>
                                <Badge className={cn(
                                  "rounded-full text-xs font-medium",
                                  getPriorityColor(task.priority)
                                )}>
                                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                </Badge>
                                {task.reward && task.rewardAmount && (
                                  <Badge className="rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-medium">
                                    {task.rewardAmount} {task.reward}
                                  </Badge>
                                )}
                                {task.paid && (
                                  <Badge className="rounded-full bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300 text-xs font-medium">
                                    <Check className="mr-1 h-3 w-3" />
                                    Paid
                                  </Badge>
                                )}
                                {task.submission?.status === "pending" && (
                                  <Badge className="rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 text-xs font-medium">
                                    Submission Pending
                                  </Badge>
                                )}
                                {task.submission?.status === "approved" && (
                                  <Badge className="rounded-full bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300 text-xs font-medium">
                                    <Check className="mr-1 h-3 w-3" />
                                    Approved
                                  </Badge>
                                )}
                                {task.submission?.status === "rejected" && (
                                  <Badge className="rounded-full bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300 text-xs font-medium">
                                    <X className="mr-1 h-3 w-3" />
                                    Rejected
                                  </Badge>
                                )}
                              </div>
                              {/* Project and Date Info */}
                              <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                                {(() => {
                                  const project = task.projectId 
                                    ? projects.find(p => p.id === task.projectId)
                                    : null;
                                  
                                  return project ? (
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-5 w-5">
                                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-[10px] font-semibold">
                                          {project.title.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span>{project.title}</span>
                                    </div>
                                  ) : null;
                                })()}
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                              <Dialog
                                open={isSubmissionDialogOpen}
                                onOpenChange={setIsSubmissionDialogOpen}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    onClick={() => setSelectedTaskForSubmission(task)}
                                    disabled={task.status === "done"}
                                    className="h-10 gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:opacity-50"
                                  >
                                    <Upload className="h-4 w-4" />
                                    Submit Work
                                  </Button>
                                </DialogTrigger>
                                {selectedTaskForSubmission?.id === task.id && (
                                  <DialogContent className="rounded-2xl sm:max-w-[600px]">
                                    <DialogHeader className="border-b border-slate-200 pb-4 dark:border-slate-800">
                                      <div className="flex items-center gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
                                          <Upload className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                          <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                                            Submit Deliverable
                                          </DialogTitle>
                                          <p className="text-sm text-slate-600 dark:text-slate-400">
                                            Upload your completed work
                                          </p>
                                        </div>
                                      </div>
                                    </DialogHeader>
                                    <div className="space-y-5 py-6">
                                      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                                        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                          Task
                                        </Label>
                                        <p className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-50">
                                          {selectedTaskForSubmission.title}
                                        </p>
                                        {selectedTaskForSubmission.description && (
                                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                            {selectedTaskForSubmission.description}
                                          </p>
                                        )}
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="submission" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                          Submission Content *
                                        </Label>
                                        <Textarea
                                          id="submission"
                                          placeholder="Describe your deliverable, include links, or paste content..."
                                          value={submissionContent}
                                          onChange={(e) => setSubmissionContent(e.target.value)}
                                          className="min-h-[200px] rounded-xl border-slate-300 dark:border-slate-700"
                                        />
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                          Provide a detailed description of your work, including links to repositories, documents, or any relevant resources.
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                                      <Button
                                        variant="outline"
                                        onClick={() => {
                                          setIsSubmissionDialogOpen(false);
                                          setSubmissionContent("");
                                          setSelectedTaskForSubmission(null);
                                        }}
                                        disabled={isSubmitting}
                                        className="flex-1 rounded-xl"
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        onClick={handleSubmitDeliverable}
                                        disabled={isSubmitting || !submissionContent.trim()}
                                        className="flex-1 gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 font-semibold text-white shadow-lg"
                                      >
                                        {isSubmitting ? (
                                          <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Submitting...
                                          </>
                                        ) : (
                                          <>
                                            <Upload className="h-4 w-4" />
                                            Submit Deliverable
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  </DialogContent>
                                )}
                              </Dialog>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
