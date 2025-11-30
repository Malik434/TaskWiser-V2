"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWeb3 } from "@/components/web3-provider";
import { useFirebase } from "@/components/firebase-provider";
import { ProtectedRoute } from "@/components/protected-route";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Project, ProjectMember, Task, UserProfile } from "@/lib/types";
import {
  ArrowLeft,
  Loader2,
  BarChart3,
  TrendingUp,
  Users,
  Target,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  CreditCard,
  Award,
  Sparkles,
  Zap,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ProjectStats {
  totalTasks: number;
  completed: number;
  pending: number;
  inProgress: number;
  review: number;
  todo: number;
  completionRate: number;
  avgCompletionTime: number | null; // in days
  totalBudget: number;
  paidAmount: number;
  pendingAmount: number;
}

interface TeamMemberStats {
  userId: string;
  username: string;
  profilePicture?: string;
  totalAssigned: number;
  completed: number;
  inProgress: number;
  completionRate: number;
  avgCompletionTime: number | null;
  totalEarnings: number;
}

export default function ProjectAnalyticsPage() {
  const { isConnected, account } = useWeb3();
  const { getProjectById, getUserProfile, getAllTasks, getUserProfiles } = useFirebase();
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [stats, setStats] = useState<ProjectStats>({
    totalTasks: 0,
    completed: 0,
    pending: 0,
    inProgress: 0,
    review: 0,
    todo: 0,
    completionRate: 0,
    avgCompletionTime: null,
    totalBudget: 0,
    paidAmount: 0,
    pendingAmount: 0,
  });
  const [teamStats, setTeamStats] = useState<TeamMemberStats[]>([]);

  useEffect(() => {
    if (account && projectId) {
      fetchProjectData();
    } else if (!isConnected && projectId) {
      setIsLoading(false);
    }
  }, [account, projectId, isConnected]);

  const fetchProjectData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setHasAccess(false);

      if (!account) {
        setError("Please connect your wallet");
        setIsLoading(false);
        return;
      }

      const userProfile = await getUserProfile(account);
      if (!userProfile) {
        setError("User profile not found");
        setIsLoading(false);
        return;
      }

      // Fetch project
      const fetchedProject = await getProjectById(projectId);
      if (!fetchedProject) {
        setError("Project not found");
        setIsLoading(false);
        return;
      }

      // Check if user is a member of the project
      const members = fetchedProject.members || [];
      const isMember = members.some(
        (member: ProjectMember) => member.userId === userProfile.id
      );

      if (!isMember) {
        setError("You don't have access to this project");
        setIsLoading(false);
        return;
      }

      setProject(fetchedProject);

      // Fetch all tasks and filter by project
      const allTasks = await getAllTasks();
      const projectTasks = allTasks.filter(
        (task) => task.projectId === projectId
      );
      setTasks(projectTasks);

      // Fetch all user profiles for team stats
      const profiles = await getUserProfiles();
      setUserProfiles(profiles);

      // Calculate statistics
      calculateStats(projectTasks, profiles);

      setHasAccess(true);
    } catch (error) {
      console.error("Error fetching project data:", error);
      setError("Failed to load project");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (projectTasks: Task[], profiles: UserProfile[]) => {
    const totalTasks = projectTasks.length;
    const completed = projectTasks.filter((t) => t.status === "done").length;
    const pending = projectTasks.filter((t) => t.status !== "done").length;
    const inProgress = projectTasks.filter((t) => t.status === "inprogress").length;
    const review = projectTasks.filter((t) => t.status === "review").length;
    const todo = projectTasks.filter((t) => t.status === "todo").length;

    const completionRate = totalTasks > 0 ? (completed / totalTasks) * 100 : 0;

    // Calculate average completion time
    const completedTasks = projectTasks.filter(
      (t) => t.status === "done" && t.createdAt && t.updatedAt
    );
    let avgCompletionTime: number | null = null;
    if (completedTasks.length > 0) {
      const totalTime = completedTasks.reduce((sum, task) => {
        const created = new Date(task.createdAt!).getTime();
        const updated = new Date(task.updatedAt!).getTime();
        return sum + (updated - created);
      }, 0);
      avgCompletionTime = totalTime / completedTasks.length / (1000 * 60 * 60 * 24); // Convert to days
    }

    // Calculate payment stats
    let totalBudget = 0;
    let paidAmount = 0;
    let pendingAmount = 0;

    projectTasks.forEach((task) => {
      if (task.rewardAmount) {
        totalBudget += task.rewardAmount;
        if (task.paid) {
          paidAmount += task.rewardAmount;
        } else {
          pendingAmount += task.rewardAmount;
        }
      }
    });

    setStats({
      totalTasks,
      completed,
      pending,
      inProgress,
      review,
      todo,
      completionRate,
      avgCompletionTime,
      totalBudget,
      paidAmount,
      pendingAmount,
    });

    // Calculate team member stats
    const memberStatsMap = new Map<string, TeamMemberStats>();

    // First, collect all unique assignee IDs from tasks
    const assigneeIds = new Set<string>();
    projectTasks.forEach((task) => {
      if (task.assigneeId) {
        assigneeIds.add(task.assigneeId);
      }
    });

    // Initialize stats for all assignees (not just project members)
    assigneeIds.forEach((assigneeId) => {
      const profile = profiles.find((p) => p.id === assigneeId);
      // Always create stats entry, even if profile not found
      memberStatsMap.set(assigneeId, {
        userId: assigneeId,
        username: profile
          ? profile.username || profile.address.substring(0, 6) + "..."
          : assigneeId.substring(0, 8) + "...",
        profilePicture: profile?.profilePicture,
        totalAssigned: 0,
        completed: 0,
        inProgress: 0,
        completionRate: 0,
        avgCompletionTime: null,
        totalEarnings: 0,
      });
    });

    // Calculate stats for each assignee
    projectTasks.forEach((task) => {
      if (task.assigneeId) {
        const stats = memberStatsMap.get(task.assigneeId);
        if (stats) {
          stats.totalAssigned += 1;
          if (task.status === "done") {
            stats.completed += 1;
          }
          if (task.status === "inprogress") {
            stats.inProgress += 1;
          }
          if (task.paid && task.rewardAmount) {
            stats.totalEarnings += task.rewardAmount;
          }
        }
      }
    });

    // Calculate completion rates and avg times
    memberStatsMap.forEach((memberStat) => {
      memberStat.completionRate =
        memberStat.totalAssigned > 0
          ? (memberStat.completed / memberStat.totalAssigned) * 100
          : 0;

      const memberCompletedTasks = projectTasks.filter(
        (t) =>
          t.assigneeId === memberStat.userId &&
          t.status === "done" &&
          t.createdAt &&
          t.updatedAt
      );

      if (memberCompletedTasks.length > 0) {
        const totalTime = memberCompletedTasks.reduce((sum, task) => {
          const created = new Date(task.createdAt!).getTime();
          const updated = new Date(task.updatedAt!).getTime();
          return sum + (updated - created);
        }, 0);
        memberStat.avgCompletionTime =
          totalTime / memberCompletedTasks.length / (1000 * 60 * 60 * 24);
      }
    });

    setTeamStats(Array.from(memberStatsMap.values()));
  };

  const formatDays = (days: number | null): string => {
    if (days === null) return "N/A";
    if (days < 1) return "< 1 day";
    if (days < 7) return `${days.toFixed(1)} days`;
    const weeks = days / 7;
    if (weeks < 4) return `${weeks.toFixed(1)} weeks`;
    const months = days / 30;
    return `${months.toFixed(1)} months`;
  };

  if (!isConnected || !account) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <p className="text-slate-600 dark:text-slate-400">
              Please connect your wallet
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Loading analytics...
          </p>
        </div>
      </div>
    );
  }

  if (error || !hasAccess || !project) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">
                {error || "Project not found"}
              </p>
              <Button
                onClick={() => router.push("/projects")}
                variant="outline"
                className="mt-4"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Projects
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusDistribution = [
    { 
      label: "Completed", 
      count: stats.completed, 
      color: "from-green-500 to-emerald-500",
      startColor: "#10b981",
      endColor: "#059669",
      bgColor: "bg-green-50 dark:bg-green-950/30",
    },
    { 
      label: "In Progress", 
      count: stats.inProgress, 
      color: "from-blue-500 to-cyan-500",
      startColor: "#3b82f6",
      endColor: "#06b6d4",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
    },
    { 
      label: "Review", 
      count: stats.review, 
      color: "from-purple-500 to-pink-500",
      startColor: "#a855f7",
      endColor: "#ec4899",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
    },
    { 
      label: "To Do", 
      count: stats.todo, 
      color: "from-amber-500 to-orange-500",
      startColor: "#f59e0b",
      endColor: "#f97316",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
    },
  ].filter((item) => item.count > 0);

  const circumference = 502.4; // 2 * PI * 80

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/projects`)}
              className="rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                Project Analytics
              </div>
              <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">
                {project.title}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Comprehensive project performance insights
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Tasks */}
          <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 shadow-lg transition-all duration-300 hover:shadow-xl dark:border-slate-800 dark:from-indigo-950/30 dark:to-purple-950/30">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-indigo-500/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <Badge className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  Total
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Total Tasks
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                  {stats.totalTasks}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  All project tasks
                </p>
              </div>
            </div>
          </div>

          {/* Completed Tasks */}
          <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-green-50 to-emerald-50 p-6 shadow-lg transition-all duration-300 hover:shadow-xl dark:border-slate-800 dark:from-green-950/30 dark:to-emerald-950/30">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-green-500/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <Badge className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300">
                  {stats.completionRate.toFixed(1)}%
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Completed
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                  {stats.completed}
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                    style={{
                      width: `${stats.completionRate}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Average Completion Time */}
          <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-6 shadow-lg transition-all duration-300 hover:shadow-xl dark:border-slate-800 dark:from-blue-950/30 dark:to-cyan-950/30">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-blue-500/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <Badge className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                  Avg
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Avg. Completion
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                  {formatDays(stats.avgCompletionTime)}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Time per task
                </p>
              </div>
            </div>
          </div>

          {/* Total Budget */}
          <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-fuchsia-50 to-pink-50 p-6 shadow-lg transition-all duration-300 hover:shadow-xl dark:border-slate-800 dark:from-fuchsia-950/30 dark:to-pink-950/30">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-fuchsia-500/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-500 shadow-lg">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
                <Badge className="rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-medium text-fuchsia-700 dark:bg-fuchsia-900/50 dark:text-fuchsia-300">
                  Budget
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Total Budget
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                  ${stats.totalBudget.toFixed(2)}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  ${stats.paidAmount.toFixed(2)} paid
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Task Distribution Pie Chart */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                  Task Distribution
                </CardTitle>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Breakdown by status
              </p>
            </CardHeader>
            <CardContent>
              {stats.totalTasks === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900/30">
                  <Target className="mx-auto h-10 w-10 text-slate-400" />
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    No tasks in this project yet
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="relative">
                    <svg
                      width="200"
                      height="200"
                      viewBox="0 0 200 200"
                      className="transform -rotate-90"
                    >
                      {statusDistribution.map((item, index) => {
                      const percentage = (item.count / stats.totalTasks) * 100;
                      const offset =
                        index === 0
                          ? 0
                          : statusDistribution
                              .slice(0, index)
                              .reduce((sum, prev) => sum + (prev.count / stats.totalTasks) * circumference, 0);
                      const dashArray = (percentage / 100) * circumference;

                      return (
                        <circle
                          key={item.label}
                          cx="100"
                          cy="100"
                          r="80"
                          fill="none"
                          stroke={`url(#gradient-${index})`}
                          strokeWidth="40"
                          strokeDasharray={`${dashArray} ${circumference}`}
                          strokeDashoffset={-offset}
                          className="transition-all duration-500"
                        />
                      );
                    })}
                    <defs>
                      {statusDistribution.map((item, index) => (
                        <linearGradient
                          key={index}
                          id={`gradient-${index}`}
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <stop offset="0%" stopColor={item.startColor} />
                          <stop offset="100%" stopColor={item.endColor} />
                        </linearGradient>
                      ))}
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                        {stats.totalTasks}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Tasks
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {stats.totalTasks > 0 && (
                <div className="grid grid-cols-2 gap-4 mt-6">
                {statusDistribution.map((item) => {
                  const percentage = (item.count / stats.totalTasks) * 100;

                  return (
                    <div
                      key={item.label}
                      className={cn(
                        "flex items-center gap-3 rounded-xl p-3",
                        item.bgColor
                      )}
                    >
                      <div
                        className={cn(
                          "h-3 w-3 rounded-full bg-gradient-to-r",
                          item.color
                        )}
                      />
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {item.label}
                        </p>
                        <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                          {item.count}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Overview */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                  Payment Overview
                </CardTitle>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Budget and payment status
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Total Paid */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
                        <CheckCircle className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Total Paid
                      </span>
                    </div>
                    <span className="text-xl font-bold text-green-600 dark:text-green-400">
                      ${stats.paidAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
                      style={{
                        width: `${
                          stats.totalBudget > 0
                            ? (stats.paidAmount / stats.totalBudget) * 100
                            : 0
                        }%`,
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
                      ${stats.pendingAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                      style={{
                        width: `${
                          stats.totalBudget > 0
                            ? (stats.pendingAmount / stats.totalBudget) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* Total Budget */}
                <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-4 dark:border-slate-800 dark:from-indigo-950/30 dark:to-purple-950/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Total Budget
                      </span>
                    </div>
                    <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      ${stats.totalBudget.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Performance */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                Team Performance
              </CardTitle>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Individual member contributions and metrics
            </p>
          </CardHeader>
          <CardContent>
            {teamStats.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900/30">
                <Users className="mx-auto h-10 w-10 text-slate-400" />
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  No team members with assigned tasks yet
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {teamStats.map((member) => (
                  <div
                    key={member.userId}
                    className="rounded-xl border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/80"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border-2 border-white shadow-md dark:border-slate-700">
                          <AvatarImage
                            src={member.profilePicture || "/placeholder.svg"}
                            alt={member.username}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-semibold">
                            {member.username.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-50">
                            {member.username}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {member.totalAssigned} tasks assigned
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                            {member.completed}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            Completed
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                            {member.completionRate.toFixed(0)}%
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            Rate
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-slate-900 dark:text-slate-50">
                            {formatDays(member.avgCompletionTime)}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            Avg Time
                          </p>
                        </div>
                        {member.totalEarnings > 0 && (
                          <div className="text-center">
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">
                              ${member.totalEarnings.toFixed(2)}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              Earned
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                        style={{
                          width: `${member.completionRate}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Project Status Card */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Project Status
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-2xl font-bold capitalize text-slate-900 dark:text-slate-50">
                    {project.status || "Active"}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Current status
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">
                      Created
                    </span>
                    <span className="font-medium text-slate-900 dark:text-slate-50">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Task Status Breakdown */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Status Breakdown
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    In Progress
                  </span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {stats.inProgress}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    In Review
                  </span>
                  <span className="font-semibold text-purple-600 dark:text-purple-400">
                    {stats.review}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    To Do
                  </span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {stats.todo}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Pending
                    </span>
                    <span className="font-bold text-slate-900 dark:text-slate-50">
                      {stats.pending}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Team Members
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                    {project.members?.length || 0}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Active members
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">
                      With tasks
                    </span>
                    <span className="font-medium text-slate-900 dark:text-slate-50">
                      {teamStats.length}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}