"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WalletConnect } from "@/components/wallet-connect";
import { ThemeToggle } from "@/components/theme-toggle";
import { useWeb3 } from "@/components/web3-provider";
import { useFirebase } from "@/components/firebase-provider";
import type { Project, ProjectMember, UserProfile } from "@/lib/types";
import { PlusCircle, Calendar, MoreHorizontal, Users, Shield, UserPlus, UserMinus, Eye, Edit, Archive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { UserSearchSelect } from "@/components/user-search-select";
import { cn } from "@/lib/utils";

export default function ProjectsPage() {
  const router = useRouter();
  const { isConnected, account } = useWeb3();
  const { user, addProject, getProjects, updateProject, getUserProfiles, getUserProfile, deleteProject, inviteUserToProject, getProjectInvitationsForUser, respondToProjectInvitation, uploadProjectLogo } = useFirebase();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const [isEditProjectDialogOpen, setIsEditProjectDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [newMemberAddress, setNewMemberAddress] = useState("");
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [newProject, setNewProject] = useState<Partial<Project>>({
    title: "",
    description: "",
    status: "active",
    createdBy: account || "",
  });
  const [selectedInviteUserId, setSelectedInviteUserId] = useState<string | undefined>(undefined);
  const [isInvitingUserId, setIsInvitingUserId] = useState<string | null>(null);
  const [invitedUserIds, setInvitedUserIds] = useState<Set<string>>(new Set());
  const [newProjectLogoFile, setNewProjectLogoFile] = useState<File | null>(null);
  const [newProjectLogoPreview, setNewProjectLogoPreview] = useState<string | null>(null);
  const [editProjectLogoFile, setEditProjectLogoFile] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);

  // This effect ensures we only check wallet connection status on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (account) {
      fetchProjects();
      loadAvailableUsers();
      // Removed immediate loadInvitations here to avoid race
    }
  }, [account]);

  useEffect(() => {
    if (currentUserProfile) {
      loadInvitations();
    }
  }, [currentUserProfile]);

  const loadAvailableUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const users = await getUserProfiles();
      setAvailableUsers(users);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchProjects = async () => {
    try {
      if (!account) return;

      // Get current user's profile
      const profile = await getUserProfile(account);
      setCurrentUserProfile(profile);
      if (!profile) {
        setProjects([]);
        return;
      }

      // Fetch all projects
      const fetchedProjects = await getProjects();
      
      // Filter to only show projects where the user is a member
      const userProjects = fetchedProjects.filter(project => 
        project.members?.some((member: ProjectMember) => member.userId === profile.id)
      );
      
      setProjects(userProjects);
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

      if (!user?.uid) {
        toast({
          title: "Authentication required",
          description: "Please sign in before creating a project.",
          variant: "destructive",
        });
        return;
      }

      let logoUrl: string | undefined = undefined;
      if (newProjectLogoFile) {
        try {
          setIsUploadingLogo(true);
          logoUrl = await uploadProjectLogo(newProjectLogoFile);
        } catch (e) {
          console.error("Logo upload failed:", e);
          toast({ title: "Logo Upload Failed", description: "Continuing without logo.", variant: "destructive" });
        } finally {
          setIsUploadingLogo(false);
        }
      }

      const projectToAdd = {
        ...newProject,
        createdBy: account || "",
        createdByUid: user.uid,
        createdAt: new Date().toISOString(),
        logoUrl,
      } as Project;

      await addProject(projectToAdd);
      setNewProject({
        title: "",
        description: "",
        status: "active",
        createdBy: account || "",
        createdByUid: user?.uid || "",
      });
      setNewProjectLogoFile(null);
      setNewProjectLogoPreview(null);
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

  const handleOpenMembersDialog = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProject(project);
    setIsMembersDialogOpen(true);
  };

  const handleViewDetails = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/projects/${project.id}`);
  };

  const handleEditProject = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProject(project);
    setIsEditProjectDialogOpen(true);
  };

  const handleArchiveProject = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const newStatus = project.status === "archived" ? "active" : "archived";
      await updateProject(project.id, { status: newStatus });
      
      // Update local state
      setProjects(projects.map(p => 
        p.id === project.id ? { ...p, status: newStatus } : p
      ));

      toast({
        title: "Success",
        description: `Project ${newStatus === "archived" ? "archived" : "restored"} successfully`,
      });
    } catch (error) {
      console.error("Error archiving project:", error);
      toast({
        title: "Error",
        description: "Failed to update project status",
        variant: "destructive",
      });
    }
  };

  const handleUpdateProject = async () => {
    if (!selectedProject) return;

    try {
      let logoUrl: string | undefined = selectedProject.logoUrl;
      if (editProjectLogoFile) {
        try {
          setIsUploadingLogo(true);
          logoUrl = await uploadProjectLogo(editProjectLogoFile);
        } catch (e) {
          console.error("Logo upload failed:", e);
          toast({ title: "Logo Upload Failed", description: "Continuing without updating logo.", variant: "destructive" });
        } finally {
          setIsUploadingLogo(false);
        }
      }

      await updateProject(selectedProject.id, {
        title: selectedProject.title,
        description: selectedProject.description,
        logoUrl,
      });

      // Update local state
      setProjects(projects.map(p => 
        p.id === selectedProject.id ? { ...selectedProject, logoUrl } : p
      ));

      setEditProjectLogoFile(null);
      setIsEditProjectDialogOpen(false);
      toast({
        title: "Success",
        description: "Project updated successfully",
      });
    } catch (error) {
      console.error("Error updating project:", error);
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive",
      });
    }
  };

  const handleToggleManagerRole = async (member: ProjectMember) => {
    if (!selectedProject) return;

    try {
      const updatedMembers = selectedProject.members?.map((m) => {
        if (m.userId === member.userId) {
          const newRole: "manager" | "contributor" = m.role === "manager" ? "contributor" : "manager";
          return { ...m, role: newRole };
        }
        return m;
      }) || [];

      await updateProject(selectedProject.id, { members: updatedMembers });
      setSelectedProject({ ...selectedProject, members: updatedMembers });
      
      // Update the projects list
      setProjects(projects.map(p => 
        p.id === selectedProject.id ? { ...p, members: updatedMembers } : p
      ));

      toast({
        title: "Success",
        description: `Member role updated to ${updatedMembers.find(m => m.userId === member.userId)?.role}`,
      });
    } catch (error) {
      console.error("Error updating member role:", error);
      toast({
        title: "Error",
        description: "Failed to update member role",
        variant: "destructive",
      });
    }
  };

  const handleAddMember = async () => {
    if (!selectedProject || !newMemberAddress) {
      toast({
        title: "Error",
        description: "Please enter a wallet address",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get user profile by wallet address
      const userProfile = await getUserProfile(newMemberAddress);
      
      if (!userProfile) {
        toast({
          title: "Error",
          description: "User not found. They must create a profile first.",
          variant: "destructive",
        });
        return;
      }

      // Check if user is already a member
      if (selectedProject.members?.some(m => m.userId === userProfile.id)) {
        toast({
          title: "Error",
          description: "User is already a member of this project",
          variant: "destructive",
        });
        return;
      }

      const newMember: ProjectMember = {
        userId: userProfile.id,
        userUid: userProfile.ownerUid,
        role: "contributor",
        joinedAt: new Date().toISOString(),
        isActive: true,
      };

      const updatedMembers = [...(selectedProject.members || []), newMember];
      await updateProject(selectedProject.id, { members: updatedMembers });
      
      setSelectedProject({ ...selectedProject, members: updatedMembers });
      setProjects(projects.map(p => 
        p.id === selectedProject.id ? { ...p, members: updatedMembers } : p
      ));
      
      setNewMemberAddress("");
      toast({
        title: "Success",
        description: "Member added successfully",
      });
    } catch (error) {
      console.error("Error adding member:", error);
      toast({
        title: "Error",
        description: "Failed to add member",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (member: ProjectMember) => {
    if (!selectedProject) return;

    try {
      // Prevent removing admin members
      if (member.role === "admin") {
        toast({
          title: "Error",
          description: "Cannot remove admin members",
          variant: "destructive",
        });
        return;
      }

      const updatedMembers = selectedProject.members?.filter(m => m.userId !== member.userId) || [];
      
      await updateProject(selectedProject.id, { members: updatedMembers });
      setSelectedProject({ ...selectedProject, members: updatedMembers });
      setProjects(projects.map(p => 
        p.id === selectedProject.id ? { ...p, members: updatedMembers } : p
      ));

      toast({
        title: "Success",
        description: "Member removed successfully",
      });
    } catch (error) {
      console.error("Error removing member:", error);
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive",
      });
    }
  };

  // Delete project (admin only)
  const handleDeleteProject = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!project) return;
    try {
      const confirmed = window.confirm(`Delete project "${project.title}"? This cannot be undone.`);
      if (!confirmed) return;
      await deleteProject(project.id);
      setProjects(prev => prev.filter(p => p.id !== project.id));
      toast({ title: "Success", description: "Project deleted." });
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({ title: "Error", description: "Failed to delete project.", variant: "destructive" });
    }
  };

  // Invite a registered user profile to the selected project
  const handleInviteUser = async (user: UserProfile) => {
    if (!selectedProject || !account) return;
    try {
      setIsInvitingUserId(user.id);
      const invitationId = await inviteUserToProject(selectedProject.id, user.id, account, selectedProject.title);
      if (invitationId) {
        setInvitedUserIds((prev) => new Set([...Array.from(prev), user.id]));
        toast({ title: "Invitation sent", description: `${user.username || user.address} has been invited.` });
      } else {
        toast({ title: "Warning", description: "Invitation could not be created.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error inviting user:", error);
      toast({ title: "Error", description: "Failed to send invitation.", variant: "destructive" });
    } finally {
      setIsInvitingUserId(null);
    }
  };

  // Load pending invitations for the current user
  const loadInvitations = async () => {
    try {
      if (!currentUserProfile) return;
      setIsLoadingInvites(true);
      const invites = await getProjectInvitationsForUser(currentUserProfile.id);
      setPendingInvitations(invites);
    } catch (error) {
      console.error("Error loading invitations:", error);
    } finally {
      setIsLoadingInvites(false);
    }
  };

  // Accept invitation -> adds user as contributor to project then refreshes lists
  const handleAcceptInvitation = async (inv: any) => {
    try {
      await respondToProjectInvitation(inv.id, "accepted");
      await fetchProjects();
      await loadInvitations();
      toast({ title: "Joined project", description: `You joined ${inv.projectTitle || "the project"}.` });
    } catch (error) {
      console.error("Error accepting invitation:", error);
      toast({ title: "Error", description: "Failed to accept invitation.", variant: "destructive" });
    }
  };

  // Reject invitation
  const handleRejectInvitation = async (inv: any) => {
    try {
      await respondToProjectInvitation(inv.id, "rejected");
      await loadInvitations();
      toast({ title: "Invitation rejected" });
    } catch (error) {
      console.error("Error rejecting invitation:", error);
      toast({ title: "Error", description: "Failed to reject invitation.", variant: "destructive" });
    }
  };

  const getUserRole = (project: Project | null): string => {
    if (!account || !project) return "none";
    
    // Get current user's profile
    const currentUserProfile = availableUsers.find(u => u.address.toLowerCase() === account.toLowerCase());
    if (!currentUserProfile) return "none";
    
    const member = project.members?.find(m => m.userId === currentUserProfile.id);
    return member?.role || "none";
  };

  const isAdmin = (project: Project | null): boolean => {
    if (!project) return false;
    return getUserRole(project) === "admin";
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
        return "border-t-4 border-t-purple-500";
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

  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-sm px-4 dark-header sm:h-16 sm:px-6">
        <h1 className="text-lg font-bold sm:text-xl md:ml-0 ml-12">Projects</h1>
        <div className="flex items-center gap-2 sm:gap-4">
          <ThemeToggle />
          <div className="hidden sm:block">
            <WalletConnect />
          </div>
        </div>
      </header>
      <main className="animate-in fade-in duration-500 p-3 sm:p-4 md:p-6">
        {pendingInvitations.length > 0 && (
          <Card className="mb-4 dark-card sm:mb-6">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Pending Invitations</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Accept an invitation to join a project.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              {isLoadingInvites ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                  <Loader2 className="h-3.5 w-3.5 animate-spin sm:h-4 sm:w-4" /> Loading invitations...
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {pendingInvitations.map((inv) => (
                    <div key={inv.id} className="flex flex-col gap-2 p-2 border rounded-lg dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between sm:p-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium sm:text-base">{inv.projectTitle || "Project"}</span>
                          <span className="text-[10px] text-muted-foreground sm:text-xs">Invited by {inv.inviterAddress?.substring(0, 10)}...</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="gradient-button text-xs sm:text-sm" onClick={() => handleAcceptInvitation(inv)}>Accept</Button>
                        <Button size="sm" variant="outline" className="text-xs sm:text-sm" onClick={() => handleRejectInvitation(inv)}>Reject</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
          <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold sm:text-2xl">My Projects</h2>
            <Dialog
              open={isAddProjectDialogOpen}
              onOpenChange={setIsAddProjectDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="gradient-button w-full text-sm sm:w-auto sm:text-base">
                  <PlusCircle className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
                  <div className="grid gap-2">
                    <Label className="dark:text-gray-300">Project Logo</Label>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={newProjectLogoPreview || "/placeholder.svg"} />
                        <AvatarFallback>PR</AvatarFallback>
                      </Avatar>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          if (f) {
                            setNewProjectLogoFile(f);
                            setNewProjectLogoPreview(URL.createObjectURL(f));
                          }
                        }}
                        className="dark-input"
                      />
                    </div>
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

          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {projects.map((project) => (
              <Card
                key={project.id}
                className={`overflow-hidden transition-all hover:shadow-lg cursor-pointer dark-card ${getProjectCardClass(
                  project.status
                )}`}
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-2">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base sm:text-lg md:text-xl truncate">{project.title}</CardTitle>
                      <CardDescription className="mt-1 text-xs dark:text-gray-400 sm:text-sm">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    {/* Only show dropdown if user is admin */}
                    {isAdmin(project) ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 flex-shrink-0 dark:hover:bg-gray-700 sm:h-8 sm:w-8"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="dark-dropdown"
                        >
                          <DropdownMenuItem 
                            className="dark:hover:bg-gray-700"
                            onClick={(e) => handleEditProject(project, e)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Project
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="dark:hover:bg-gray-700"
                            onClick={(e) => handleOpenMembersDialog(project, e)}
                          >
                            <Users className="mr-2 h-4 w-4" />
                            Manage Contributors
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="dark:hover:bg-gray-700"
                            onClick={(e) => handleArchiveProject(project, e)}
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            {project.status === "archived" ? "Restore Project" : "Archive Project"}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="dark:hover:bg-gray-700 text-red-600"
                            onClick={(e) => handleDeleteProject(project, e)}
                          >
                            {/* Trash icon reused from users minus for consistency */}
                            <UserMinus className="mr-2 h-4 w-4" />
                            Delete Project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 flex-shrink-0 dark:hover:bg-gray-700 sm:h-8 sm:w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(project, e);
                        }}
                      >
                        <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="sr-only">View details</span>
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 sm:text-sm">
                    {project.description || "No description provided."}
                  </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-2 p-3 pt-2 border-t dark:border-gray-700 sm:flex-row sm:justify-between sm:p-6 sm:pt-4">
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                    <Calendar className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>
                      {new Date(project.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end">
                    <Badge className={cn(getStatusBadgeClass(project.status), "text-xs sm:text-sm")}>
                      {project.status.charAt(0).toUpperCase() +
                        project.status.slice(1)}
                    </Badge>
                    <div className="ml-3">
                      <Avatar className="h-6 w-6 border border-background dark:border-gray-700 sm:h-8 sm:w-8">
                        <AvatarImage
                          src={project.logoUrl || "/placeholder.svg"}
                          alt={project.title}
                        />
                        <AvatarFallback className="text-xs dark:bg-gray-700 dark:text-gray-300 sm:text-sm">
                          {project.title?.substring(0, 2).toUpperCase() || "PJ"}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </main>

        {/* Members Management Dialog */}
        <Dialog open={isMembersDialogOpen} onOpenChange={setIsMembersDialogOpen}>
          <DialogContent className="sm:max-w-[600px] dark-card max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Manage Contributors - {selectedProject?.title}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Invite Registered Profiles */}
              {selectedProject && isAdmin(selectedProject) && (
                <div className="space-y-3 p-4 border rounded-lg dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <h3 className="font-semibold">Invite Registered Profiles</h3>
                  </div>
                  <div className="space-y-2">
                    <UserSearchSelect
                      label="Invite Contributor"
                      placeholder="Search by username or wallet address..."
                      selectedUserId={selectedInviteUserId}
                      availableUsers={(availableUsers || []).filter(u => !selectedProject.members?.some(m => m.userId === u.id))}
                      isLoadingUsers={isLoadingUsers}
                      onSelectUser={setSelectedInviteUserId}
                      emptyLabel="Clear selection"
                    />
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!selectedInviteUserId || isInvitingUserId !== null || invitedUserIds.has(selectedInviteUserId!)}
                        onClick={() => {
                          const user = availableUsers.find(u => u.id === selectedInviteUserId);
                          if (user) handleInviteUser(user);
                        }}
                      >
                        {isInvitingUserId && selectedInviteUserId === isInvitingUserId ? (
                          <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Sending...</span>
                        ) : invitedUserIds.has(selectedInviteUserId || "") ? (
                          "Invited"
                        ) : (
                          "Invite"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Current Members List */}
              <div className="space-y-3">
                <h3 className="font-semibold">Current Members ({selectedProject?.members?.length || 0})</h3>
                
                {selectedProject?.members && selectedProject.members.length > 0 ? (
                  <div className="space-y-2">
                    {selectedProject.members.map((member) => {
                      const userProfile = availableUsers.find(u => u.id === member.userId);
                      const isCurrentUserAdmin = isAdmin(selectedProject);
                      const isMemberAdmin = member.role === "admin";
                      
                      return (
                        <div
                          key={member.userId}
                          className="flex items-center justify-between p-3 border rounded-lg dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage
                                src={userProfile?.profilePicture || "/placeholder.svg"}
                                alt={userProfile?.username || "User"}
                              />
                              <AvatarFallback className="dark:bg-gray-700">
                                {userProfile?.username?.substring(0, 2).toUpperCase() || "??"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {userProfile?.username || "Unknown User"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {userProfile?.address.substring(0, 10)}...{userProfile?.address.substring(38)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <Badge
                              className={
                                member.role === "admin"
                                  ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100"
                                  : member.role === "manager"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100"
                              }
                            >
                              {member.role === "admin" && <Shield className="h-3 w-3 mr-1" />}
                              {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                            </Badge>
                            
                            {/* Toggle Manager Role - Only show for non-admin members and only if current user is admin */}
                            {!isMemberAdmin && isCurrentUserAdmin && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Manager</span>
                                <Switch
                                  checked={member.role === "manager"}
                                  onCheckedChange={() => handleToggleManagerRole(member)}
                                />
                              </div>
                            )}

                            {/* Remove Member Button - Only show for non-admin members and only if current user is admin */}
                            {!isMemberAdmin && isCurrentUserAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={() => handleRemoveMember(member)}
                              >
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No members yet. Add members to collaborate on this project.
                  </p>
                )}
              </div>

              {/* Role Permissions Info */}
              <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-semibold mb-2">Role Permissions:</h4>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <Shield className="h-3 w-3 mt-0.5 text-purple-600" />
                    <span><strong>Admin:</strong> Create, assign, move tasks, approve to done, handle payments</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users className="h-3 w-3 mt-0.5 text-blue-600" />
                    <span><strong>Manager:</strong> Create, assign, move, approve tasks (no payments)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <UserPlus className="h-3 w-3 mt-0.5 text-gray-600" />
                    <span><strong>Contributor:</strong> View tasks, submit work if assigned</span>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Project Dialog */}
        <Dialog open={isEditProjectDialogOpen} onOpenChange={setIsEditProjectDialogOpen}>
          <DialogContent className="sm:max-w-[425px] dark-card">
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name" className="dark:text-gray-300">
                  Project Name
                </Label>
                <Input
                  id="edit-name"
                  value={selectedProject?.title || ""}
                  onChange={(e) =>
                    setSelectedProject(selectedProject ? { ...selectedProject, title: e.target.value } : null)
                  }
                  placeholder="Enter project name"
                  className="dark-input"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description" className="dark:text-gray-300">
                  Description
                </Label>
                <Textarea
                  id="edit-description"
                  value={selectedProject?.description || ""}
                  onChange={(e) =>
                    setSelectedProject(selectedProject ? {
                      ...selectedProject,
                      description: e.target.value,
                    } : null)
                  }
                  placeholder="Enter project description"
                  className="dark-input"
                />
              </div>
              <div className="grid gap-2">
                <Label className="dark:text-gray-300">Project Logo</Label>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={editProjectLogoFile ? URL.createObjectURL(editProjectLogoFile) : (selectedProject?.logoUrl || "/placeholder.svg")} />
                    <AvatarFallback>PR</AvatarFallback>
                  </Avatar>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setEditProjectLogoFile(f);
                    }}
                    className="dark-input"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditProjectDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateProject}
                className="gradient-button"
              >
                Update Project
              </Button>
            </div>
          </DialogContent>
        </Dialog>
    </>
  );
}