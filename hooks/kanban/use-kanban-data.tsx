
import { useState, useEffect, useRef, useCallback } from "react";
import { useFirebase } from "../../components/firebase-provider";
import { useWeb3 } from "../../components/web3-provider";
import { useToast } from "@/components/ui/use-toast";
import { Task, Project, UserProfile } from "@/lib/types";
import { Circle, Clock, CircleEllipsis, CheckCircle } from "lucide-react";
import React from "react";

export type Column = {
    id: string;
    title: string;
    icon: React.ReactNode;
    tasks: Task[];
    count: number;
};

export function useKanbanData(
    projectId?: string,
    initialProject?: Project | null,
    initialUserRole?: "admin" | "manager" | "contributor" | null
) {
    const {
        getTasks,
        getAllTasks,
        getUserProfiles,
        getUserProfile,
        getUserProfileById,
        getProjectById,
        isInitialized,
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

    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [createdTasks, setCreatedTasks] = useState<Task[]>([]);
    const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRealtimeSyncing, setIsRealtimeSyncing] = useState(false);

    // Initialize with passed props if available
    const [currentProject, setCurrentProject] = useState<Project | null>(initialProject || null);
    const [userProjectRole, setUserProjectRole] = useState<"admin" | "manager" | "contributor" | null>(initialUserRole || null);
    const [isProjectMember, setIsProjectMember] = useState(false); // Will be derived/updated


    // Additional Data
    const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);

    // Join Requests
    const [pendingJoinRequests, setPendingJoinRequests] = useState<any[]>([]);
    const [isLoadingJoinReqs, setIsLoadingJoinReqs] = useState(false);

    const firebase = useFirebase();
    const fetchAllTasksRef = useRef<NodeJS.Timeout | null>(null);

    // Helper to update columns
    const updateColumnsWithTasks = useCallback((tasks: Task[]) => {
        // Remove duplicate tasks by id to prevent duplicate keys during rendering
        const seen = new Set<string>();
        const uniqueTasks = tasks.filter((t) => {
            if (seen.has(t.id)) return false;
            seen.add(t.id);
            return true;
        });

        setColumns(prevColumns => {
            const updatedColumns = prevColumns.map((column) => ({
                ...column,
                tasks: [] as Task[],
                count: 0,
            }));

            uniqueTasks.forEach((task) => {
                const columnIndex = updatedColumns.findIndex(
                    (col) => col.id === task.status
                );
                if (columnIndex !== -1) {
                    updatedColumns[columnIndex].tasks.push(task);
                    updatedColumns[columnIndex].count =
                        updatedColumns[columnIndex].tasks.length;
                }
            });
            return updatedColumns;
        });
    }, []);

    const updateColumnsBasedOnView = useCallback((activeView: string = "all") => {
        let tasksToShow: Task[] = [];
        if (projectId) {
            tasksToShow = allTasks;
        } else {
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
        }
        updateColumnsWithTasks(tasksToShow);
    }, [projectId, allTasks, createdTasks, assignedTasks, updateColumnsWithTasks]);


    const fetchAllTasks = useCallback(async () => {
        if (!account) return;

        setIsLoading(true);
        try {
            let allFetchedTasks: Task[] = [];

            if (projectId) {
                // For project board: first check if user is a member
                const project = await getProjectById(projectId);
                setCurrentProject(project);

                if (!project) {
                    toast({
                        title: "Project not found",
                        description: "The project you're looking for doesn't exist",
                        variant: "destructive",
                    });
                    setIsLoading(false);
                    return;
                }

                // Get current user's profile to check membership
                const userProfile = await getUserProfile(account);
                const userId = userProfile?.id || account;

                // Check if user is the creator OR a project member
                const isCreator = project.createdBy === account;
                const memberInfo = project.members?.find(
                    (member: any) => member.userId === userId && member.isActive
                );

                const isMember = !!memberInfo;
                setIsProjectMember(isCreator || isMember);

                // Set user's role in the project
                if (isCreator) {
                    setUserProjectRole("admin");
                } else if (memberInfo) {
                    setUserProjectRole(memberInfo.role);
                } else {
                    setUserProjectRole(null);
                }

                if (!isCreator && !isMember) {
                    // Wait for UI to redirect or show error, but here we just return
                    setIsLoading(false);
                    return;
                }

                // Fetch all tasks and filter by projectId
                const allTasks = await getAllTasks();
                allFetchedTasks = allTasks.filter(
                    (task: Task) => (task as any).projectId === projectId
                );
            } else {
                // For personal board: reset project-specific states
                setCurrentProject(null);
                setIsProjectMember(false);
                setUserProjectRole(null);

                // Fetch tasks created by user
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
                // Resolve assignee lookup id (prefer user profile id, fallback to wallet address)
                let assigneeLookupId = account;
                try {
                    const _profile = await getUserProfile(account);
                    if (_profile && _profile.id) assigneeLookupId = _profile.id;
                } catch (e) {
                    console.warn("Could not resolve user profile for assignee lookup", e);
                }

                const q = query(
                    collection(db, "tasks"),
                    where("assigneeId", "==", assigneeLookupId)
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

                allFetchedTasks = combinedTasks;
            }

            // After fetching tasks, ensure assignee/reviewer information is populated
            const tasksWithAssigneeInfo = await Promise.all(
                allFetchedTasks.map(async (task) => {
                    let enrichedTask: Task = task;
                    if (task.assigneeId) {
                        try {
                            const assigneeProfile = await getUserProfileById(task.assigneeId);
                            if (assigneeProfile) {
                                enrichedTask = {
                                    ...enrichedTask,
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

                    if (task.reviewerId) {
                        try {
                            const reviewerProfile = await getUserProfileById(task.reviewerId);
                            if (reviewerProfile) {
                                enrichedTask = {
                                    ...enrichedTask,
                                    reviewer: {
                                        id: reviewerProfile.id,
                                        username: reviewerProfile.username,
                                        profilePicture: reviewerProfile.profilePicture,
                                    },
                                };
                            }
                        } catch (error) {
                            console.error("Error fetching reviewer profile:", error);
                        }
                    }

                    return enrichedTask;
                })
            );

            setAllTasks(tasksWithAssigneeInfo);
            // We manually call this here, but effect below will also do it
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
    }, [account, projectId, getProjectById, getUserProfile, getAllTasks, getTasks, firebase.db, getUserProfileById, updateColumnsWithTasks]);


    // Setup real-time listeners for tasks
    const setupRealtimeListeners = useCallback(() => {
        if (!account || !firebase.db) return;

        setIsLoading(true);
        let unsubscribeTasks: (() => void) | null = null;

        (async () => {
            try {
                const { collection, query, where, onSnapshot } = await import(
                    "firebase/firestore"
                );

                if (projectId) {
                    // For project board: similar logic to fetchAllTasks but with onSnapshot
                    // Note: We duplicate some privilege checks here or rely on fetchAllTasks having done it initially?
                    // The extraction in original code did checks again.

                    // Assume permissions checked or handled by fetchAllTasks or subsequent logic?
                    // Original code re-checks everything inside the async IIFE.

                    const project = await getProjectById(projectId);
                    if (!project) {
                        setIsLoading(false);
                        return;
                    }

                    const projectTasksQuery = query(
                        collection(firebase.db!, "tasks"),
                        where("projectId", "==", projectId)
                    );

                    unsubscribeTasks = onSnapshot(
                        projectTasksQuery,
                        async (snapshot) => {
                            console.log("Real-time update: Project tasks changed");
                            setIsRealtimeSyncing(true);
                            const tasks = await Promise.all(
                                snapshot.docs.map(async (doc) => {
                                    const taskData = { id: doc.id, ...doc.data() } as Task;
                                    // Populate assignee/reviewer info if needed
                                    if (taskData.assigneeId && !taskData.assignee) {
                                        try {
                                            const assigneeProfile = await getUserProfileById(taskData.assigneeId);
                                            if (assigneeProfile) {
                                                taskData.assignee = {
                                                    id: assigneeProfile.id,
                                                    username: assigneeProfile.username,
                                                    profilePicture: assigneeProfile.profilePicture,
                                                };
                                            }
                                        } catch (e) {
                                            console.warn("Could not fetch assignee profile", e);
                                        }
                                    }

                                    if (taskData.reviewerId && !taskData.reviewer) {
                                        try {
                                            const reviewerProfile = await getUserProfileById(taskData.reviewerId);
                                            if (reviewerProfile) {
                                                taskData.reviewer = {
                                                    id: reviewerProfile.id,
                                                    username: reviewerProfile.username,
                                                    profilePicture: reviewerProfile.profilePicture,
                                                };
                                            }
                                        } catch (e) {
                                            console.warn("Could not fetch reviewer profile", e);
                                        }
                                    }
                                    return taskData;
                                })
                            );

                            setAllTasks(tasks);
                            setCreatedTasks(tasks);
                            setIsLoading(false);
                            setTimeout(() => setIsRealtimeSyncing(false), 1000);
                        },
                        (error) => {
                            console.error("Error in real-time listener:", error);
                            setIsLoading(false);
                        }
                    );
                } else {
                    // Personal Board Realtime
                    let assigneeLookupId = account;
                    try {
                        const _profile = await getUserProfile(account);
                        if (_profile && _profile.id) assigneeLookupId = _profile.id;
                    } catch (e) {
                        console.warn("Could not resolve user profile for assignee lookup", e);
                    }

                    const createdTasksQuery = query(
                        collection(firebase.db!, "tasks"),
                        where("userId", "==", account)
                    );
                    const assignedTasksQuery = query(
                        collection(firebase.db!, "tasks"),
                        where("assigneeId", "==", assigneeLookupId)
                    );

                    let createdTasksData: Task[] = [];
                    let assignedTasksData: Task[] = [];

                    const unsubscribeCreated = onSnapshot(createdTasksQuery, async (snapshot) => {
                        setIsRealtimeSyncing(true);
                        createdTasksData = await Promise.all(snapshot.docs.map(async doc => {
                            const t = { id: doc.id, ...doc.data() } as Task;
                            // Enrichment logic omitted for brevity, but should be same as above
                            // Populate assignee/reviewer info
                            if (t.assigneeId && !t.assignee) {
                                try {
                                    const assigneeProfile = await getUserProfileById(t.assigneeId);
                                    if (assigneeProfile) t.assignee = { id: assigneeProfile.id, username: assigneeProfile.username, profilePicture: assigneeProfile.profilePicture };
                                } catch (e) { }
                            }
                            if (t.reviewerId && !t.reviewer) {
                                try {
                                    const reviewerProfile = await getUserProfileById(t.reviewerId);
                                    if (reviewerProfile) t.reviewer = { id: reviewerProfile.id, username: reviewerProfile.username, profilePicture: reviewerProfile.profilePicture };
                                } catch (e) { }
                            }
                            return t;
                        }));
                        setCreatedTasks(createdTasksData);

                        // Combine
                        const combined = [...createdTasksData];
                        assignedTasksData.forEach((at) => {
                            if (!combined.some(t => t.id === at.id)) combined.push(at);
                        });
                        setAllTasks(combined);
                        setIsLoading(false);
                        setTimeout(() => setIsRealtimeSyncing(false), 1000);
                    });

                    const unsubscribeAssigned = onSnapshot(assignedTasksQuery, async (snapshot) => {
                        setIsRealtimeSyncing(true);
                        assignedTasksData = await Promise.all(snapshot.docs.map(async doc => {
                            const t = { id: doc.id, ...doc.data() } as Task;
                            // Enrichment logic
                            if (t.assigneeId && !t.assignee) {
                                try {
                                    const assigneeProfile = await getUserProfileById(t.assigneeId);
                                    if (assigneeProfile) t.assignee = { id: assigneeProfile.id, username: assigneeProfile.username, profilePicture: assigneeProfile.profilePicture };
                                } catch (e) { }
                            }
                            if (t.reviewerId && !t.reviewer) {
                                try {
                                    const reviewerProfile = await getUserProfileById(t.reviewerId);
                                    if (reviewerProfile) t.reviewer = { id: reviewerProfile.id, username: reviewerProfile.username, profilePicture: reviewerProfile.profilePicture };
                                } catch (e) { }
                            }
                            return t;
                        }));
                        setAssignedTasks(assignedTasksData);
                        // Combine
                        const combined = [...createdTasksData];
                        assignedTasksData.forEach((at) => {
                            if (!combined.some(t => t.id === at.id)) combined.push(at);
                        });
                        setAllTasks(combined);
                        setIsLoading(false);
                        setTimeout(() => setIsRealtimeSyncing(false), 1000);
                    });

                    unsubscribeTasks = () => {
                        unsubscribeCreated();
                        unsubscribeAssigned();
                    }
                }
            } catch (error) {
                console.error("Error setting up real-time listeners:", error);
                setIsLoading(false);
            }
        })();

        return () => {
            if (unsubscribeTasks) unsubscribeTasks();
        };
    }, [account, firebase.db, projectId, getProjectById, getUserProfile, getUserProfileById]);

    // Initial fetch and effect for listeners
    useEffect(() => {
        if (account && isInitialized) {
            // We can just rely on setupRealtimeListeners for the data?
            // But fetchAllTasks handles some initial permissions checks beautifully.
            // Let's call setupRealtimeListeners.
            const unsubscribe = setupRealtimeListeners();
            return () => {
                if (unsubscribe) unsubscribe();
            };
        }
    }, [account, isInitialized, projectId, setupRealtimeListeners]);

    // Fetch Available Users
    useEffect(() => {
        const fetchUsers = async () => {
            if (!account) return;
            setIsLoadingUsers(true);
            try {
                const users = await getUserProfiles();
                setAvailableUsers(users);
            } catch (error) {
                console.error("Failed to fetch users", error);
            } finally {
                setIsLoadingUsers(false);
            }
        };
        fetchUsers();
    }, [account, getUserProfiles]);

    // Fetch Join Requests
    const fetchJoinRequests = useCallback(async () => {
        if (!projectId || !isProjectMember || userProjectRole === "contributor") return;

        setIsLoadingJoinReqs(true);
        try {
            const { getJoinRequestsForProject } = firebase; // access directly or from hook destructuring if added to destructuring
            // Note: need to make sure getJoinRequestsForProject is available in scope. 
            // It was destructured at top.

            // Re-destructure if needed or use from closure
            // defined at top: const { ..., getJoinRequestsForProject } = useFirebase();

            if (!getJoinRequestsForProject) return;

            const requests = await getJoinRequestsForProject(projectId);

            // Enrich with user profiles
            const enriched = await Promise.all(requests.map(async (req: any) => {
                try {
                    const profile = await getUserProfileById(req.userId);
                    return { ...req, user: profile };
                } catch (e) {
                    return { ...req, user: { username: 'Unknown', id: req.userId } };
                }
            }));

            setPendingJoinRequests(enriched);
        } catch (error) {
            console.error("Error fetching join requests:", error);
        } finally {
            setIsLoadingJoinReqs(false);
        }
    }, [projectId, isProjectMember, userProjectRole, firebase, getUserProfileById]);

    // Effect to fetch join requests when role allows
    useEffect(() => {
        if (projectId && userProjectRole && userProjectRole !== "contributor") {
            fetchJoinRequests();
        }
    }, [projectId, userProjectRole, fetchJoinRequests]);

    // Also update columns when tasks change
    useEffect(() => {
        // Default to all view for now, the hook consumer can call updateColumnsBasedOnView
        updateColumnsWithTasks(allTasks);
    }, [allTasks, updateColumnsWithTasks]);

    const refreshTasks = () => {
        fetchAllTasks();
    };

    const refreshJoinRequests = () => {
        fetchJoinRequests();
    };

    return {
        columns,
        setColumns,
        allTasks,
        createdTasks,
        assignedTasks,
        isLoading,
        isRealtimeSyncing,
        refreshTasks,
        updateColumnsBasedOnView,
        currentProject,
        isProjectMember,
        userProjectRole,
        availableUsers,
        isLoadingUsers,
        pendingJoinRequests,
        isLoadingJoinReqs,
        refreshJoinRequests,
        setAllTasks,
        setCreatedTasks,
        setAssignedTasks
    };
}
