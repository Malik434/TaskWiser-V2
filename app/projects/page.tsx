"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WalletConnect } from "@/components/wallet-connect";
import { ThemeToggle } from "@/components/theme-toggle";
import { useWeb3 } from "@/components/web3-provider";
import { useFirebase } from "@/components/firebase-provider";
import type { Project, ProjectMember, UserProfile } from "@/lib/types";
import { PlusCircle, Calendar, MoreHorizontal, Users, Shield, UserPlus, UserMinus, Eye, Edit, Archive, Loader2, Sparkles, Briefcase, Check, X, Mail, Crown, Target, ArrowRight, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { UserSearchSelect } from "@/components/user-search-select";
import { cn } from "@/lib/utils";
import { ProtectedRoute } from "@/components/protected-route";

export default function ProjectsPage() {
  const router = useRouter();
  const { account } = useWeb3();
  const { user, addProject, getProjects, updateProject, getUserProfiles, getUserProfile, deleteProject, inviteUserToProject, getProjectInvitationsForUser, respondToProjectInvitation, uploadProjectLogo } = useFirebase();
  const { toast } = useToast();
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

  useEffect(() => {
    if (account) {
      fetchProjects();
      loadAvailableUsers();
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

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors">
        <div className="flex-1 overflow-auto">
          {/* Enhanced Header */}
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
            <div className="flex h-16 items-center justify-between px-4 sm:px-6">
              <div className="flex items-center gap-3 md:ml-0 ml-12">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
                  <Briefcase className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                    Projects
                  </h1>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Manage your workspaces
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
              {/* Pending Invitations */}
              {pendingInvitations.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-lg backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80">
                  <div className="border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-6 dark:border-slate-800 dark:from-indigo-950/30 dark:to-purple-950/30">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
                        <Mail className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                          Pending Invitations
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {pendingInvitations.length} invitation{pendingInvitations.length !== 1 ? 's' : ''} waiting
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    {isLoadingInvites ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400" />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pendingInvitations.map((inv) => (
                          <div
                            key={inv.id}
                            className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all hover:bg-slate-100/50 dark:border-slate-800 dark:bg-slate-800/30 dark:hover:bg-slate-800/50 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
                                <Folder className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-slate-50">
                                  {inv.projectTitle || "Project"}
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                  Invited by {inv.inviterAddress?.substring(0, 6)}...{inv.inviterAddress?.substring(38)}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleAcceptInvitation(inv)}
                                className="flex-1 gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 font-semibold text-white shadow-lg transition-all hover:scale-105 sm:flex-none"
                              >
                                <Check className="h-4 w-4" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectInvitation(inv)}
                                className="flex-1 rounded-xl border-slate-300 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:hover:bg-red-950/30 sm:flex-none"
                              >
                                <X className="h-4 w-4" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Header Section */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    Your Workspaces
                  </div>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                    My Projects
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {projects.length} active workspace{projects.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <Dialog
                  open={isAddProjectDialogOpen}
                  onOpenChange={setIsAddProjectDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="h-12 gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-6 font-semibold text-white shadow-[0_10px_40px_rgba(99,102,241,0.4)] transition-all hover:scale-[1.02] hover:shadow-[0_15px_50px_rgba(99,102,241,0.5)]">
                      <PlusCircle className="h-5 w-5" />
                      Create Project
                    </Button>
                  </DialogTrigger>
              <DialogContent className="rounded-2xl sm:max-w-[500px]">
                <DialogHeader className="border-b border-slate-200 pb-4 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
                      <PlusCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                        Create New Project
                      </DialogTitle>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Set up your collaborative workspace
                      </p>
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-5 py-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Project Name
                    </Label>
                    <Input
                      id="name"
                      value={newProject.title}
                      onChange={(e) =>
                        setNewProject({ ...newProject, title: e.target.value })
                      }
                      placeholder="Enter a memorable project name"
                      className="h-11 rounded-xl border-slate-300 dark:border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
                      placeholder="Describe what this project is about..."
                      className="min-h-[100px] rounded-xl border-slate-300 dark:border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Project Logo
                    </Label>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16 border-2 border-slate-200 shadow-lg dark:border-slate-700">
                        <AvatarImage src={newProjectLogoPreview || "/placeholder.svg"} />
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-lg font-semibold">
                          {newProject.title?.substring(0, 2).toUpperCase() || "PR"}
                        </AvatarFallback>
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
                        className="rounded-xl border-slate-300 dark:border-slate-700"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddProjectDialogOpen(false)}
                    className="flex-1 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddProject}
                    disabled={isUploadingLogo}
                    className="flex-1 gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 font-semibold text-white shadow-lg"
                  >
                    {isUploadingLogo ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <PlusCircle className="h-4 w-4" />
                        Create Project
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

              {/* Projects Grid */}
              {projects.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-16 text-center dark:border-slate-700 dark:bg-slate-900/30">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-950/50 dark:to-purple-950/50">
                    <Briefcase className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-50">
                    No projects yet
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Create your first project to start collaborating
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {projects.map((project) => (
                    <Card
                      key={project.id}
                      className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/80"
                      onClick={() => router.push(`/projects/${project.id}`)}
                    >
                      <CardContent className="p-0">
                        {/* Header with gradient */}
                        <div className={`relative overflow-hidden border-b border-slate-200 p-5 dark:border-slate-800 ${
                          project.status === "active"
                            ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30"
                            : project.status === "completed"
                            ? "bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30"
                            : "bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50"
                        }`}>
                          <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-white/50 to-transparent dark:from-slate-900/50" />
                          
                          <div className="relative flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-12 w-12 border-2 border-white shadow-lg transition-transform group-hover:scale-110 dark:border-slate-700">
                                <AvatarImage src={project.logoUrl || "/placeholder.svg"} alt={project.title} />
                                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-semibold">
                                  {project.title?.substring(0, 2).toUpperCase() || "PJ"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-slate-900 truncate dark:text-slate-50">
                                  {project.title}
                                </h3>
                                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                                  <Calendar className="h-3 w-3" />
                                  <span>
                                    {new Date(project.createdAt).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Actions Menu */}
                            {isAdmin(project) ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl">
                                  <DropdownMenuItem
                                    className="rounded-lg"
                                    onClick={(e) => handleEditProject(project, e)}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Project
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="rounded-lg"
                                    onClick={(e) => handleOpenMembersDialog(project, e)}
                                  >
                                    <Users className="mr-2 h-4 w-4" />
                                    Manage Team
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="rounded-lg"
                                    onClick={(e) => handleArchiveProject(project, e)}
                                  >
                                    <Archive className="mr-2 h-4 w-4" />
                                    {project.status === "archived" ? "Restore" : "Archive"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="rounded-lg text-red-600 dark:text-red-400"
                                    onClick={(e) => handleDeleteProject(project, e)}
                                  >
                                    <UserMinus className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDetails(project, e);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        <div className="p-5">
                          <p className="text-sm text-slate-600 line-clamp-3 dark:text-slate-400">
                            {project.description || "No description provided."}
                          </p>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                          <div className="flex items-center justify-between">
                            <Badge
                              className={cn(
                                "rounded-full",
                                project.status === "active"
                                  ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300"
                                  : project.status === "completed"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              )}
                            >
                              {project.status === "active" && <Target className="mr-1 h-3 w-3" />}
                              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                            </Badge>
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <Users className="h-4 w-4" />
                              <span>{project.members?.length || 0} members</span>
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

          {/* Members Management Dialog */}
          <Dialog open={isMembersDialogOpen} onOpenChange={setIsMembersDialogOpen}>
              <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-[700px]">
                <DialogHeader className="border-b border-slate-200 pb-4 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                        Team Management
                      </DialogTitle>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {selectedProject?.title}
                      </p>
                    </div>
                  </div>
                </DialogHeader>
            
                <div className="space-y-6 py-6">
                  {/* Invite Section */}
                  {selectedProject && isAdmin(selectedProject) && (
                    <div className="space-y-4 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-5 dark:border-indigo-900 dark:from-indigo-950/30 dark:to-purple-950/30">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
                          <UserPlus className="h-4 w-4 text-white" />
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-50">
                          Invite Contributors
                        </h3>
                      </div>
                      <div className="space-y-3">
                        <UserSearchSelect
                          label="Search Contributors"
                          placeholder="Search by username or wallet address..."
                          selectedUserId={selectedInviteUserId}
                          availableUsers={(availableUsers || []).filter(u => !selectedProject.members?.some(m => m.userId === u.id))}
                          isLoadingUsers={isLoadingUsers}
                          onSelectUser={setSelectedInviteUserId}
                          emptyLabel="Clear selection"
                        />
                        <Button
                          size="sm"
                          disabled={!selectedInviteUserId || isInvitingUserId !== null || invitedUserIds.has(selectedInviteUserId!)}
                          onClick={() => {
                            const user = availableUsers.find(u => u.id === selectedInviteUserId);
                            if (user) handleInviteUser(user);
                          }}
                          className="w-full gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 font-semibold text-white shadow-lg"
                        >
                          {isInvitingUserId && selectedInviteUserId === isInvitingUserId ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Sending Invitation...
                            </>
                          ) : invitedUserIds.has(selectedInviteUserId || "") ? (
                            <>
                              <Check className="h-4 w-4" />
                              Invitation Sent
                            </>
                          ) : (
                            <>
                              <Mail className="h-4 w-4" />
                              Send Invitation
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Current Members */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-50">
                        Team Members
                      </h3>
                      <Badge className="rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {selectedProject?.members?.length || 0} members
                      </Badge>
                    </div>
                    
                    {selectedProject?.members && selectedProject.members.length > 0 ? (
                      <div className="space-y-2">
                        {selectedProject.members.map((member) => {
                          const userProfile = availableUsers.find(u => u.id === member.userId);
                          const isCurrentUserAdmin = isAdmin(selectedProject);
                          const isMemberAdmin = member.role === "admin";
                          
                          return (
                            <div
                              key={member.userId}
                              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all hover:bg-slate-100/50 dark:border-slate-800 dark:bg-slate-800/30 dark:hover:bg-slate-800/50"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="h-12 w-12 border-2 border-white shadow-md dark:border-slate-700">
                                  <AvatarImage
                                    src={userProfile?.profilePicture || "/placeholder.svg"}
                                    alt={userProfile?.username || "User"}
                                  />
                                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-semibold">
                                    {userProfile?.username?.substring(0, 2).toUpperCase() || "??"}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-semibold text-slate-900 dark:text-slate-50">
                                    {userProfile?.username || "Unknown User"}
                                  </p>
                                  <p className="text-xs text-slate-600 dark:text-slate-400">
                                    {userProfile?.address.substring(0, 10)}...{userProfile?.address.substring(38)}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <Badge
                                  className={cn(
                                    "rounded-full",
                                    member.role === "admin"
                                      ? "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300"
                                      : member.role === "manager"
                                      ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                  )}
                                >
                                  {member.role === "admin" && <Shield className="mr-1 h-3 w-3" />}
                                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                </Badge>
                                
                                {/* Toggle Manager Role */}
                                {!isMemberAdmin && isCurrentUserAdmin && (
                                  <div className="flex items-center gap-2 rounded-lg bg-white p-2 dark:bg-slate-900">
                                    <span className="text-xs text-slate-600 dark:text-slate-400">Manager</span>
                                    <Switch
                                      checked={member.role === "manager"}
                                      onCheckedChange={() => handleToggleManagerRole(member)}
                                    />
                                  </div>
                                )}

                                {/* Remove Button */}
                                {!isMemberAdmin && isCurrentUserAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
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
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900/30">
                        <Users className="mx-auto h-10 w-10 text-slate-400" />
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                          No members yet. Invite people to collaborate.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Role Permissions Info */}
                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-800/30">
                    <h4 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-50">
                      <Shield className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      Role Permissions
                    </h4>
                    <div className="space-y-2.5 text-sm">
                      <div className="flex items-start gap-3 rounded-lg bg-purple-50 p-3 dark:bg-purple-950/20">
                        <Shield className="h-4 w-4 mt-0.5 text-purple-600 dark:text-purple-400" />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-50">Admin</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            Full access: Create, assign, move tasks, approve, handle payments
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-3 dark:bg-blue-950/20">
                        <Users className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400" />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-50">Manager</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            Create, assign, move, approve tasks (no payment access)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
                        <UserPlus className="h-4 w-4 mt-0.5 text-slate-600 dark:text-slate-400" />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-50">Contributor</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            View tasks and submit work when assigned
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

          {/* Edit Project Dialog */}
          <Dialog open={isEditProjectDialogOpen} onOpenChange={setIsEditProjectDialogOpen}>
              <DialogContent className="rounded-2xl sm:max-w-[500px]">
                <DialogHeader className="border-b border-slate-200 pb-4 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
                      <Edit className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                        Edit Project
                      </DialogTitle>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Update project information
                      </p>
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-5 py-6">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Project Name
                    </Label>
                    <Input
                      id="edit-name"
                      value={selectedProject?.title || ""}
                      onChange={(e) =>
                        setSelectedProject(selectedProject ? { ...selectedProject, title: e.target.value } : null)
                      }
                      placeholder="Enter project name"
                      className="h-11 rounded-xl border-slate-300 dark:border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-description" className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
                      placeholder="Describe your project"
                      className="min-h-[100px] rounded-xl border-slate-300 dark:border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Project Logo
                    </Label>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16 border-2 border-slate-200 shadow-lg dark:border-slate-700">
                        <AvatarImage
                          src={editProjectLogoFile ? URL.createObjectURL(editProjectLogoFile) : (selectedProject?.logoUrl || "/placeholder.svg")}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-lg font-semibold">
                          {selectedProject?.title?.substring(0, 2).toUpperCase() || "PR"}
                        </AvatarFallback>
                      </Avatar>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          setEditProjectLogoFile(f);
                        }}
                        className="rounded-xl border-slate-300 dark:border-slate-700"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditProjectDialogOpen(false)}
                    className="flex-1 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateProject}
                    disabled={isUploadingLogo}
                    className="flex-1 gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 font-semibold text-white shadow-lg"
                  >
                    {isUploadingLogo ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
        </div>
      </div>
    </ProtectedRoute>
  );
}