"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { WalletConnect } from "@/components/wallet-connect";
import { ThemeToggle } from "@/components/theme-toggle";
import { useWeb3 } from "@/components/web3-provider";
import { useFirebase } from "@/components/firebase-provider";
import { WalletConnectionCard } from "@/components/wallet-connection-card";
import type { Project } from "@/lib/types";
import { PlusCircle, Calendar, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function ProjectsPage() {
  const { isConnected, account } = useWeb3();
  const { addProject, getProjects } = useFirebase();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState<Partial<Project>>({
    title: "",
    description: "",
    status: "active",
    createdBy: account || "",
  });

  // This effect ensures we only check wallet connection status on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (account) {
      fetchProjects();
    }
  }, [account]);

  const fetchProjects = async () => {
    try {
      const fetchedProjects = await getProjects();
      setProjects(fetchedProjects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast({
        title: "Error",
        description: "Failed to fetch projects. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddProject = async () => {
    try {
      if (!newProject.title) {
        toast({
          title: "Error",
          description: "Project name is required",
          variant: "destructive",
        });
        return;
      }

      const projectToAdd = {
        ...newProject,
        createdBy: account || "",
        createdAt: new Date().toISOString(),
      } as Project;

      await addProject(projectToAdd);
      setNewProject({
        title: "",
        description: "",
        status: "active",
        createdBy: account || "",
      });
      setIsAddProjectDialogOpen(false);
      fetchProjects();
      toast({
        title: "Success",
        description: "Project added successfully",
      });
    } catch (error) {
      console.error("Error adding project:", error);
      toast({
        title: "Error",
        description: "Failed to add project. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      case "archived":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100";
    }
  };

  const getProjectCardClass = (status: string) => {
    switch (status) {
      case "active":
        return "border-t-4 border-t-green-500";
      case "completed":
        return "border-t-4 border-t-blue-500";
      case "archived":
        return "border-t-4 border-t-gray-500";
      default:
        return "";
    }
  };

  // If we're on the server or haven't initialized client-side yet, return nothing to avoid hydration issues
  if (!isClient) {
    return null;
  }

  // If wallet is not connected, show the wallet connection card
  if (!isConnected || !account) {
    return <WalletConnectionCard />;
  }

  return (
    <div className="flex h-screen dark-container">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-sm px-6 dark-header">
          <h1 className="text-xl font-bold">Projects</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <WalletConnect />
          </div>
        </header>
        <main className="animate-in fade-in duration-500 p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold">My Projects</h2>
            <Dialog
              open={isAddProjectDialogOpen}
              onOpenChange={setIsAddProjectDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="gradient-button">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] dark-card">
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name" className="dark:text-gray-300">
                      Project Name
                    </Label>
                    <Input
                      id="name"
                      value={newProject.title}
                      onChange={(e) =>
                        setNewProject({ ...newProject, title: e.target.value })
                      }
                      placeholder="Enter project name"
                      className="dark-input"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description" className="dark:text-gray-300">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={newProject.description}
                      onChange={(e) =>
                        setNewProject({
                          ...newProject,
                          description: e.target.value,
                        })
                      }
                      placeholder="Enter project description"
                      className="dark-input"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={handleAddProject}
                    className="gradient-button"
                  >
                    Create Project
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card
                key={project.id}
                className={`overflow-hidden transition-all hover:shadow-lg dark-card ${getProjectCardClass(
                  project.status
                )}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{project.title}</CardTitle>
                      <CardDescription className="mt-1 dark:text-gray-400">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 dark:hover:bg-gray-700"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="dark-dropdown"
                      >
                        <DropdownMenuItem className="dark:hover:bg-gray-700">
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="dark:hover:bg-gray-700">
                          Edit Project
                        </DropdownMenuItem>
                        <DropdownMenuItem className="dark:hover:bg-gray-700">
                          Archive Project
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                    {project.description || "No description provided."}
                  </p>
                </CardContent>
                <CardFooter className="flex justify-between pt-2 border-t dark:border-gray-700">
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Calendar className="mr-1 h-4 w-4" />
                    <span>
                      {new Date(project.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Badge className={getStatusBadgeClass(project.status)}>
                      {project.status.charAt(0).toUpperCase() +
                        project.status.slice(1)}
                    </Badge>
                    <div className="ml-2 flex -space-x-2">
                      <Avatar className="h-6 w-6 border-2 border-background dark:border-gray-800">
                        <AvatarFallback className="dark:bg-gray-700 dark:text-gray-300">
                          U1
                        </AvatarFallback>
                      </Avatar>
                      <Avatar className="h-6 w-6 border-2 border-background dark:border-gray-800">
                        <AvatarFallback className="dark:bg-gray-700 dark:text-gray-300">
                          U2
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
