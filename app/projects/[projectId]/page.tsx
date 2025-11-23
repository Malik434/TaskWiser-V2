"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { WalletConnect } from "@/components/wallet-connect";
import { KanbanBoard } from "@/components/kanban-board";
import { ThemeToggle } from "@/components/theme-toggle";
import { useWeb3 } from "@/components/web3-provider";
import { useFirebase } from "@/components/firebase-provider";
import type { Project } from "@/lib/types";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ProjectBoardPage() {
  const { isConnected, account } = useWeb3();
  const { getProjectById } = useFirebase();
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [isClient, setIsClient] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (account && projectId) {
      fetchProject();
    }
  }, [account, projectId]);

  const fetchProject = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedProject = await getProjectById(projectId);

      if (!fetchedProject) {
        setError("Project not found");
        return;
      }

      setProject(fetchedProject);
      // Note: Membership check is now handled in the KanbanBoard component
      // which has access to getUserProfile to properly check member IDs
    } catch (err) {
      console.error("Error fetching project:", err);
      setError("Failed to load project");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isClient) {
    return null;
  }

  if (isLoading) {
    return (
      <>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-sm px-6 dark-header">
          <h1 className="text-xl font-bold">Loading Project...</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <WalletConnect />
          </div>
        </header>
        <main className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </main>
      </>
    );
  }

  if (error || !project) {
    return (
      <>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-sm px-6 dark-header">
          <h1 className="text-xl font-bold">Project Error</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <WalletConnect />
          </div>
        </header>
        <main className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || "Failed to load project"}
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => router.push("/projects")}
            variant="outline"
            className="mt-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-sm px-6 dark-header">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.push("/projects")}
            variant="ghost"
            size="icon"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{project.title}</h1>
            <p className="text-sm text-muted-foreground">
              Project Board
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <WalletConnect />
        </div>
      </header>
      <main className="animate-in fade-in duration-500">
        <KanbanBoard projectId={projectId} />
      </main>
    </>
  );
}
