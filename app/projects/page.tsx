"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WalletConnect } from "@/components/wallet-connect";
import { ThemeToggle } from "@/components/theme-toggle";
import { useWeb3 } from "@/components/web3-provider";
import { useFirebase } from "@/components/firebase-provider";
import type { Project, ProjectMember, UserProfile } from "@/lib/types";
import { PlusCircle, Calendar, MoreHorizontal, Users, Shield, UserPlus, UserMinus, Eye, Edit, Archive } from "lucide-react";
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

export default function ProjectsPage() {
  const router = useRouter();
  const { isConnected, account } = useWeb3();
  const { addProject, getProjects, updateProject, getUserProfiles, getUserProfile } = useFirebase();
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
      loadAvailableUsers();
    }
  }, [account]);

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
      const currentUserProfile = await getUserProfile(account);
      if (!currentUserProfile) {
        setProjects([]);
        return;
      }

      // Fetch all projects
      const fetchedProjects = await getProjects();
      
      // Filter to only show projects where the user is a member
      const userProjects = fetchedProjects.filter(project => 
        project.members?.some((member: ProjectMember) => member.userId === currentUserProfile.id)
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
      await updateProject(selectedProject.id, {
        title: selectedProject.title,
        description: selectedProject.description,
      });

      // Update local state
      setProjects(projects.map(p => 
        p.id === selectedProject.id ? selectedProject : p
      ));

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
                className={`overflow-hidden transition-all hover:shadow-lg cursor-pointer dark-card ${getProjectCardClass(
                  project.status
                )}`}
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{project.title}</CardTitle>
                      <CardDescription className="mt-1 dark:text-gray-400">
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
                          <DropdownMenuItem 
                            className="dark:hover:bg-gray-700"
                            onClick={(e) => handleViewDetails(project, e)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
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
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 dark:hover:bg-gray-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(project, e);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View details</span>
                      </Button>
                    )}
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
                      {(() => {
                        // Get admin member
                        const adminMember = project.members?.find((m: ProjectMember) => m.role === "admin");
                        const adminProfile = adminMember ? availableUsers.find(u => u.id === adminMember.userId) : null;
                        
                        // Get manager member
                        const managerMember = project.members?.find((m: ProjectMember) => m.role === "manager");
                        const managerProfile = managerMember ? availableUsers.find(u => u.id === managerMember.userId) : null;

                        return (
                          <>
                            {adminProfile && (
                              <Avatar className="h-6 w-6 border-2 border-background dark:border-gray-800">
                                <AvatarImage
                                  src={adminProfile.profilePicture || "/placeholder.svg"}
                                  alt={adminProfile.username}
                                />
                                <AvatarFallback className="dark:bg-gray-700 dark:text-gray-300">
                                  {adminProfile.username?.substring(0, 2).toUpperCase() || "AD"}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            {managerProfile && (
                              <Avatar className="h-6 w-6 border-2 border-background dark:border-gray-800">
                                <AvatarImage
                                  src={managerProfile.profilePicture || "/placeholder.svg"}
                                  alt={managerProfile.username}
                                />
                                <AvatarFallback className="dark:bg-gray-700 dark:text-gray-300">
                                  {managerProfile.username?.substring(0, 2).toUpperCase() || "MG"}
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </>
                        );
                      })()}
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
              {/* Add New Member Section */}
              {selectedProject && isAdmin(selectedProject) && (
                <div className="space-y-3 p-4 border rounded-lg dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    <h3 className="font-semibold">Add New Member</h3>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter wallet address (0x...)"
                      value={newMemberAddress}
                      onChange={(e) => setNewMemberAddress(e.target.value)}
                      className="dark-input flex-1"
                    />
                    <Button onClick={handleAddMember} className="gradient-button">
                      Add
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    New members will be added as Contributors by default
                  </p>
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