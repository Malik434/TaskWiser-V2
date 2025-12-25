"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { WalletConnect } from "@/components/wallet-connect";
import { KanbanBoard } from "@/components/kanban-board";
import { ThemeToggle } from "@/components/theme-toggle";
import { useWeb3 } from "@/components/web3-provider";
import { useFirebase } from "@/components/firebase-provider";
import { ProtectedRoute } from "@/components/protected-route";
import type { Project } from "@/lib/types";
import { ArrowLeft, AlertCircle, Loader2, FolderKanban, Shield, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ProjectBoardPage() {
  const { isConnected, account } = useWeb3();
  const { getProjectById, getUserProfile } = useFirebase();
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [isClient, setIsClient] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [userRole, setUserRole] = useState<"admin" | "manager" | "contributor" | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (account && projectId) {
      fetchProject();
    } else if (!isConnected && projectId) {
      setIsCheckingAccess(false);
      setIsLoading(false);
    }
  }, [account, projectId, isConnected]);

  const fetchProject = async () => {
    try {
      setIsLoading(true);
      setIsCheckingAccess(true);
      setError(null);
      setHasAccess(false);

      if (!account) {
        setError("Wallet connection required");
        setIsCheckingAccess(false);
        return;
      }

      // Fetch project
      const fetchedProject = await getProjectById(projectId);

      if (!fetchedProject) {
        setError("Project not found");
        setIsCheckingAccess(false);
        return;
      }

      setProject(fetchedProject);

      // Get user profile to check membership
      const userProfile = await getUserProfile(account);
      if (!userProfile || !userProfile.id) {
        setError("Profile not found. Please create a profile first.");
        setIsCheckingAccess(false);
        return;
      }

      // Check if user is the creator
      const isCreator = fetchedProject.createdBy?.toLowerCase() === account.toLowerCase();

      // Check if user is an active member
      const members = Array.isArray(fetchedProject.members) ? fetchedProject.members : [];
      const isMember = members.some(
        (member: any) => member.userId === userProfile.id && member.isActive !== false
      );

      if (isCreator || isMember) {
        setHasAccess(true);
        if (isCreator) {
          setUserRole("admin");
        } else {
          const member = members.find((m: any) => m.userId === userProfile.id);
          setUserRole(member?.role || "contributor");
        }
      } else {
        setError("Access Denied");
      }

      setIsCheckingAccess(false);
    } catch (err) {
      console.error("Error fetching project:", err);
      setError("Failed to load project");
      setIsCheckingAccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isClient) {
    return null;
  }

  // Show access denied if user is not a member
  if (!isCheckingAccess && !hasAccess && project) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors">
          <div className="flex-1 overflow-auto">
            <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
              <div className="flex h-16 items-center justify-between px-4 sm:px-6">
                <div className="flex items-center gap-3 md:ml-0 ml-12">
                  <Button
                    onClick={() => router.push("/projects")}
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg">
                    <Lock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                      Access Denied
                    </h1>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Restricted access
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
              <div className="mx-auto max-w-2xl">
                <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-orange-50 p-8 shadow-lg dark:border-red-900 dark:from-red-950/30 dark:to-orange-950/30">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 shadow-lg">
                      <Shield className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold text-red-900 dark:text-red-100 mb-2">
                        Access Restricted
                      </h3>
                      <p className="text-base text-red-700 dark:text-red-300 mb-1">
                        You are not a member of this project
                      </p>
                      {project && (
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {project.title}
                        </p>
                      )}
                    </div>
                    <div className="mt-6 space-y-3 w-full">
                      <Button
                        onClick={() => router.push("/projects")}
                        className="w-full gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 font-semibold text-white shadow-lg"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Projects
                      </Button>
                      <Button
                        onClick={() => router.push("/explore")}
                        variant="outline"
                        className="w-full gap-2 rounded-xl border-slate-300 dark:border-slate-700"
                      >
                        Explore Projects
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (isLoading || isCheckingAccess) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors">
          <div className="flex-1 overflow-auto">
            <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
              <div className="flex h-16 items-center justify-between px-4 sm:px-6">
                <div className="flex items-center gap-3 md:ml-0 ml-12">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
                    <FolderKanban className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                      {isCheckingAccess ? "Verifying Access..." : "Loading Project..."}
                    </h1>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {isCheckingAccess ? "Checking membership..." : "Please wait"}
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
            <main className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4 sm:p-6">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {isCheckingAccess ? "Verifying project membership..." : "Loading project board..."}
                </p>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if ((error || !project) && !hasAccess) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors">
          <div className="flex-1 overflow-auto">
            <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
              <div className="flex h-16 items-center justify-between px-4 sm:px-6">
                <div className="flex items-center gap-3 md:ml-0 ml-12">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
                    <AlertCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                      Project Error
                    </h1>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Unable to load project
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
              <div className="mx-auto max-w-2xl">
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-lg dark:border-red-900 dark:bg-red-950/30">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-1">
                        Error Loading Project
                      </h3>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {error || "Failed to load project"}
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => router.push("/projects")}
                  variant="outline"
                  className="mt-6 gap-2 rounded-xl"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Projects
                </Button>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Only render if user has access and project exists
  if (!project || !hasAccess) {
    return null;
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors">
        <div className="flex-1 overflow-auto">
          {/* Enhanced Header */}
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
            <div className="flex h-16 items-center justify-between px-4 sm:px-6">
              <div className="flex items-center gap-3 md:ml-0 ml-12">
                <Button
                  onClick={() => router.push("/projects")}
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
                  <FolderKanban className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                    {project.title}
                  </h1>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Project Board
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
            <KanbanBoard projectId={projectId} project={project} userRole={userRole} />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
