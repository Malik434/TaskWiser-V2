"use client";

import type React from "react";
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  type Firestore,
} from "firebase/firestore";
import {
  getAuth,
  type Auth,
  onAuthStateChanged,
  type User,
  signInWithCustomToken,
} from "firebase/auth";
import { getStorage, ref, type StorageReference } from "firebase/storage";
import type { ProjectMember, UserProfile, EventLogs, Dispute } from "@/lib/types";
import { Timestamp } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

interface FirebaseContextType {
  app: FirebaseApp | null;
  db: Firestore | null;
  auth: Auth | null;
  storage: StorageReference | null;
  user: User | null;
  isInitialized: boolean;
  isAuthenticating: boolean;
  ensureFirebaseAuth: (address: string, signer: any) => Promise<void>;
  addTask: (task: any) => Promise<string>;
  addTaskWithId: (taskId: string, task: any) => Promise<void>;
  getTasks: (userId: string) => Promise<any[]>;
  getAllTasks: () => Promise<any[]>;
  updateTask: (taskId: string, data: any) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  getBounties: () => Promise<any[]>;
  addTaskSubmission: (taskId: string, submission: { userId: string; content: string }) => Promise<string>;
  approveTaskSubmission: (taskId: string, submissionId: string) => Promise<void>;
  getUserProfile: (address: string) => Promise<UserProfile | null>;
  getUserProfiles: () => Promise<UserProfile[]>;
  getUserProfileById: (userId: string) => Promise<UserProfile | null>;
  checkUsernameAvailability: (username: string) => Promise<boolean>;
  createUserProfile: (
    profile: Omit<UserProfile, "id" | "createdAt" | "updatedAt">
  ) => Promise<string>;
  updateUserProfile: (
    profileId: string,
    data: Partial<UserProfile>
  ) => Promise<void>;
  uploadProfilePicture: (file: File, address: string) => Promise<string>;
  uploadProjectLogo: (file: File) => Promise<string>;
  addProject: (project: any) => Promise<string>;
  getProjects: () => Promise<any[]>;
  getProjectById: (projectId: string) => Promise<any>;
  updateProject: (projectId: string, data: any) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  // Invitations
  inviteUserToProject: (
    projectId: string,
    inviteeUserId: string,
    inviterAddress: string,
    projectTitle?: string
  ) => Promise<string>;
  getProjectInvitationsForUser: (userId: string) => Promise<any[]>;
  respondToProjectInvitation: (
    invitationId: string,
    action: "accepted" | "rejected"
  ) => Promise<void>;
  // Join Requests
  applyToJoinProject: (
    projectId: string,
    applicantUserId: string,
    applicantAddress: string,
    message?: string
  ) => Promise<string>;
  getJoinRequestsForProject: (projectId: string) => Promise<any[]>;
  respondToProjectJoinRequest: (
    requestId: string,
    action: "accepted" | "rejected"
  ) => Promise<void>;
  // Event Logging
  logEvent: (event: Omit<EventLogs, "eventId" | "createdAt">) => Promise<string>;
  // Disputes
  getDisputes: () => Promise<any[]>;
  getDisputeById: (disputeId: string) => Promise<any>;
  createDispute: (dispute: Omit<Dispute, "id" | "createdAt" | "updatedAt">) => Promise<string>;
  updateDispute: (disputeId: string, data: any) => Promise<void>;
}

// Enhanced function to remove undefined fields recursively, handling nested objects and arrays
const removeUndefinedFields = <T extends Record<string, any>>(input: T): T => {
  if (!input || typeof input !== "object") {
    return input;
  }

  if (Array.isArray(input)) {
    return input
      .map((item) => {
        if (typeof item === "object" && item !== null && !Array.isArray(item)) {
          return removeUndefinedFields(item);
        }
        return item;
      })
      .filter((item) => item !== undefined) as any;
  }

  return Object.entries(input).reduce(
    (acc, [key, value]) => {
      if (value === undefined) {
        return acc; // Skip undefined values
      }

      // Recursively clean nested objects
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        const cleaned = removeUndefinedFields(value);
        // Only add if the cleaned object has at least one property
        if (Object.keys(cleaned).length > 0) {
          acc[key] = cleaned;
        }
      } else if (Array.isArray(value)) {
        // Clean array items recursively
        const cleanedArray = value
          .map((item) => {
            if (typeof item === "object" && item !== null && !Array.isArray(item)) {
              return removeUndefinedFields(item);
            }
            return item;
          })
          .filter((item) => item !== undefined);
        if (cleanedArray.length > 0) {
          acc[key] = cleanedArray;
        }
      } else {
        // Primitive values
        acc[key] = value;
      }
      return acc;
    },
    {} as Record<string, any>
  ) as T;
};

// Update the default context value to include isInitialized
const FirebaseContext = createContext<FirebaseContextType>({
  app: null,
  db: null,
  auth: null,
  storage: null,
  user: null,
  isInitialized: false,
  isAuthenticating: false,
  ensureFirebaseAuth: async () => {},
  addTask: async (): Promise<string> => "",
  addTaskWithId: async (): Promise<void> => {},
  getTasks: async (): Promise<any[]> => [],
  getAllTasks: async (): Promise<any[]> => [],
  updateTask: async (): Promise<void> => {},
  deleteTask: async (): Promise<void> => {},
  getBounties: async (): Promise<any[]> => [],
  addTaskSubmission: async (): Promise<string> => "",
  approveTaskSubmission: async (): Promise<void> => {},
  getUserProfile: async (): Promise<UserProfile | null> => null,
  getUserProfiles: async (): Promise<UserProfile[]> => [],
  getUserProfileById: async (): Promise<UserProfile | null> => null,
  checkUsernameAvailability: async (): Promise<boolean> => true,
  createUserProfile: async (): Promise<string> => "",
  updateUserProfile: async (): Promise<void> => {},
  uploadProfilePicture: async (): Promise<string> => "",
  uploadProjectLogo: async (): Promise<string> => "",
  addProject: async (): Promise<string> => "",
  getProjects: async (): Promise<any[]> => [],
  getProjectById: async (): Promise<any> => null,
  updateProject: async (): Promise<void> => {},
  deleteProject: async (): Promise<void> => {},
  inviteUserToProject: async (): Promise<string> => "",
  getProjectInvitationsForUser: async (): Promise<any[]> => [],
  respondToProjectInvitation: async (): Promise<void> => {},
  applyToJoinProject: async (): Promise<string> => "",
  getJoinRequestsForProject: async (): Promise<any[]> => [],
  respondToProjectJoinRequest: async (): Promise<void> => {},
  logEvent: async (): Promise<string> => "",
  // Disputes
  getDisputes: async (): Promise<any[]> => [],
  getDisputeById: async (): Promise<any> => null,
  createDispute: async (): Promise<string> => "",
  updateDispute: async (): Promise<void> => {},
});

export const useFirebase = () => useContext(FirebaseContext);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [app, setApp] = useState<FirebaseApp | null>(null);
  const [db, setDb] = useState<Firestore | null>(null);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [storage, setStorage] = useState<StorageReference | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const authInProgressRef = useRef<Promise<void> | null>(null);
  const currentAuthAddressRef = useRef<string | null>(null);

  const requireAuthenticatedUser = () => {
    if (!user && !auth?.currentUser) {
      throw new Error(
        "A signed-in Firebase user is required to perform this action."
      );
    }
  };

  const normalizeProjectMembers = async (
    members: ProjectMember[] = []
  ): Promise<{
    members: ProjectMember[];
    memberIds: string[];
    memberRoleMap: Record<string, "admin" | "manager" | "contributor">;
  }> => {
    if (!members.length) {
      return {
        members,
        memberIds: [],
        memberRoleMap: {},
      };
    }

    // Clean members by removing undefined fields and UIDs
    const cleanedMembers = members.map((member) => {
      const cleaned: any = {};
      // Only include valid fields, excluding userUid
      if (member.userId !== undefined) cleaned.userId = member.userId;
      if (member.address !== undefined) cleaned.address = member.address;
      if (member.role !== undefined) cleaned.role = member.role;
      if (member.joinedAt !== undefined) cleaned.joinedAt = member.joinedAt;
      if (member.isActive !== undefined) cleaned.isActive = member.isActive;
      return cleaned as ProjectMember;
    });

    const memberIds: string[] = [];
    const memberRoleMap: Record<
      string,
      "admin" | "manager" | "contributor"
    > = {};

    cleanedMembers.forEach((member) => {
      // Use userId for memberIds and roleMap
      if (member.userId && !memberIds.includes(member.userId)) {
        memberIds.push(member.userId);
      }
      if (member.userId && member.role) {
        memberRoleMap[member.userId] = member.role;
      }
    });

    return {
      members: cleanedMembers,
      memberIds,
      memberRoleMap,
    };
  };

  const initializeFirebase = async () => {
    try {
      // Check if all required environment variables are present
      if (
        !process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
        !process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
        !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
        !process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
        !process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
        !process.env.NEXT_PUBLIC_FIREBASE_APP_ID
      ) {
        console.error(
          "Firebase environment variables are missing. Please check your .env file."
        );
        setIsInitialized(true); // Set to true so UI can render with fallback data
        return () => {};
      }

      // Initialize Firebase if not already initialized
      if (!getApps().length) {
        console.log("Initializing Firebase...");
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        const auth = getAuth(app);
        const storage = ref(getStorage(app));

        setApp(app);
        setDb(db);
        setAuth(auth);
        setStorage(storage);

        const unsubscribe = onAuthStateChanged(auth, (user) => {
          setUser(user);
        });

        console.log("Firebase initialized successfully");
        setIsInitialized(true);

        return () => unsubscribe();
      } else {
        // Firebase already initialized
        console.log("Firebase already initialized, reusing existing instance");
        const app = getApps()[0];
        const db = getFirestore(app);
        const auth = getAuth(app);
        const storage = ref(getStorage(app));

        setApp(app);
        setDb(db);
        setAuth(auth);
        setStorage(storage);

        const unsubscribe = onAuthStateChanged(auth, (user) => {
          setUser(user);
        });

        setIsInitialized(true);

        return () => unsubscribe();
      }
    } catch (error) {
      console.error("Error initializing Firebase:", error);
      setIsInitialized(true); // Set to true even on error so UI can render
      return () => {};
    }
  };

  useEffect(() => {
    initializeFirebase();
  }, []);

  // User profile functions
  const getUserProfile = async (
    address: string
  ): Promise<UserProfile | null> => {
    if (!db) {
      console.error(
        "Firestore is not initialized when trying to get user profile"
      );
      return null;
    }

    if (!address || typeof address !== "string" || !address.trim()) {
      console.error("Invalid address provided to getUserProfile");
      return null;
    }

    try {
      const normalizedAddress = address.toLowerCase().trim();
      console.log(`Fetching user profile for address: ${normalizedAddress}`);
      
      const usersCollection = collection(db, "users");
      const q = query(
        usersCollection,
        where("address", "==", normalizedAddress)
      );
      const querySnapshot = await getDocs(q);

      console.log(
        `User profile query returned ${querySnapshot.size} documents`
      );

      if (querySnapshot.empty) {
        console.log("No user profile found for this address");
        return null;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      if (!userData) {
        console.error("User document has no data");
        return null;
      }

      console.log(`Found user profile with ID: ${userDoc.id}`);
      return { id: userDoc.id, ...userData } as UserProfile;
    } catch (error) {
      console.error("Error getting user profile:", error);
      return null;
    }
  };

  const getUserProfiles = async (): Promise<UserProfile[]> => {
    if (!db) {
      console.error(
        "Firestore is not initialized when trying to get user profiles"
      );
      return [];
    }

    try {
      const usersCollection = collection(db, "users");
      const querySnapshot = await getDocs(usersCollection);

      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as UserProfile[];
    } catch (error) {
      console.error("Error getting user profiles:", error);
      return [];
    }
  };

  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    if (!db) {
      console.error(
        "Firestore is not initialized when trying to check username availability"
      );
      return false;
    }

    if (!username || typeof username !== "string" || !username.trim()) {
      return false;
    }

    try {
      const normalizedUsername = username.trim().toLowerCase();
      if (normalizedUsername.length < 3) {
        return false; // Username too short
      }

      const usersCollection = collection(db, "users");
      const q = query(
        usersCollection,
        where("username", "==", normalizedUsername)
      );
      const querySnapshot = await getDocs(q);

      // Username is available if no documents are found
      return querySnapshot.empty;
    } catch (error) {
      console.error("Error checking username availability:", error);
      return false;
    }
  };

  const createUserProfile = async (
    profile: Omit<UserProfile, "id" | "createdAt" | "updatedAt">
  ): Promise<string> => {
    if (!db) {
      console.error(
        "Firestore is not initialized when trying to create user profile"
      );
      return "";
    }

    if (!profile || !profile.address) {
      console.error("Invalid profile data: address is required");
      return "";
    }

    try {
      console.log(
        `Creating user profile for address: ${profile.address.toLowerCase()}`
      );
      requireAuthenticatedUser(); // Just check authentication, don't need UID
      const now = new Date().toISOString();
      const userProfile = {
        ...profile,
        address: profile.address.toLowerCase(),
        username: profile.username?.toLowerCase() || profile.username || "",
        displayName: profile.displayName || profile.username || "",
        profilePicture: profile.profilePicture || "",
        specialties: Array.isArray(profile.specialties) ? profile.specialties : [],
        createdAt: now,
        updatedAt: now,
      };

      // Remove undefined fields
      const cleanProfile = removeUndefinedFields(userProfile);

      const usersCollection = collection(db, "users");
      const docRef = await addDoc(usersCollection, cleanProfile);
      console.log(`User profile created with ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error("Error creating user profile:", error);
      throw error; // Re-throw so caller can handle it
    }
  };

  const updateUserProfile = async (
    profileId: string,
    data: Partial<UserProfile>
  ): Promise<void> => {
    if (!db) {
      console.error("Firestore is not initialized");
      return;
    }

    try {
      const updateData = {
        ...data,
        updatedAt: new Date().toISOString(),
      };

      // Remove undefined fields as Firestore doesn't handle them well
      const cleanUpdateData = removeUndefinedFields(updateData);

      const userRef = doc(db, "users", profileId);
      await updateDoc(userRef, cleanUpdateData);
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw error; // Re-throw so caller can handle it
    }
  };

  const uploadProfilePicture = async (
    file: File,
    address: string
  ): Promise<string> => {
    try {
      console.log(
        `Starting upload of profile picture for address: ${address.toLowerCase()} to IPFS`
      );

      const { uploadToIPFS } = await import("@/utils/ipfs-utils");

      if (
        !process.env.NEXT_PUBLIC_PINATA_API_KEY ||
        !process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY
      ) {
        console.error("Pinata API keys are not configured");
        throw new Error(
          "Pinata API keys are not configured. Please check your environment variables."
        );
      }

      console.log("Uploading file to IPFS via Pinata...");
      const ipfsUrl = await uploadToIPFS(file, {
        compressImage: true,
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.8,
      });

      console.log(
        `Profile picture uploaded successfully to IPFS. URL: ${ipfsUrl}`
      );
      return ipfsUrl;
    } catch (error) {
      console.error("Error uploading profile picture to IPFS:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error uploading profile picture";
      throw new Error(errorMessage);
    }
  };

  const uploadProjectLogo = async (file: File): Promise<string> => {
    try {
      const { uploadToIPFS } = await import("@/utils/ipfs-utils");

      if (
        !process.env.NEXT_PUBLIC_PINATA_API_KEY ||
        !process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY
      ) {
        throw new Error(
          "Pinata API keys are not configured. Please check your environment variables."
        );
      }

      const ipfsUrl = await uploadToIPFS(file, {
        compressImage: true,
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.8,
      });

      return ipfsUrl;
    } catch (error) {
      console.error("Error uploading project logo to IPFS:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error uploading project logo";
      throw new Error(errorMessage);
    }
  };

  // Task functions
  const addTask = async (task: any) => {
    if (!db) {
      console.error("Firestore is not initialized");
      throw new Error("Firestore is not initialized");
    }
    try {
      requireAuthenticatedUser(); // Just check authentication
      const taskPayload: any = {
        ...task,
      };

      // Remove any UID fields that might be present
      delete taskPayload.userUid;
      delete taskPayload.assigneeUid;
      delete taskPayload.reviewerUid;

      // Remove undefined fields as Firestore doesn't handle them well
      const cleanTask = Object.fromEntries(
        Object.entries(taskPayload).filter(([_, value]) => value !== undefined)
      );
      
      console.log("Adding task to Firestore:", cleanTask);
      const docRef = await addDoc(collection(db, "tasks"), cleanTask);
      console.log("Task added with ID:", docRef.id);
      
      // Also save the ID in the document itself for easier querying
      await updateDoc(docRef, removeUndefinedFields({ id: docRef.id }));
      return docRef.id;
    } catch (error) {
      console.error("Error adding task to Firestore:", error);
      // Re-throw the error so the caller can handle it properly
      throw error;
    }
  };

  const addTaskWithId = async (taskId: string, task: any) => {
    if (!db) {
      console.error("Firestore is not initialized");
      throw new Error("Firestore is not initialized");
    }
    try {
      const { doc: docFn, setDoc } = await import("firebase/firestore");
      requireAuthenticatedUser(); // Just check authentication
      const taskPayload: any = {
        ...task,
        id: taskId,
      };

      // Remove any UID fields that might be present
      delete taskPayload.userUid;
      delete taskPayload.assigneeUid;
      delete taskPayload.reviewerUid;

      // Remove undefined fields as Firestore doesn't handle them well
      const cleanTask = Object.fromEntries(
        Object.entries(taskPayload).filter(([_, value]) => value !== undefined)
      );
      
      console.log("Adding task with specific ID to Firestore:", taskId, cleanTask);
      const docRef = docFn(db, "tasks", taskId);
      await setDoc(docRef, cleanTask);
      console.log("Task added with ID:", taskId);
    } catch (error) {
      console.error("Error adding task with ID to Firestore:", error);
      // Re-throw the error so the caller can handle it properly
      throw error;
    }
  };

  const getTasks = async (userId: string) => {
    if (!db) {
      console.error("Firestore is not initialized");
      return [];
    }
    try {
      const q = query(collection(db, "tasks"), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error getting tasks:", error);
      return [];
    }
  };

  const updateTask = async (taskId: string, data: any) => {
    if (!db) {
      console.error("Firestore is not initialized");
      return;
    }

    if (!taskId || typeof taskId !== "string" || !taskId.trim()) {
      console.error("Invalid taskId provided for update");
      return;
    }

    if (!data || typeof data !== "object") {
      console.error("Invalid update data provided");
      return;
    }

    try {
      const payload: any = { ...data };

      // Remove any UID fields that might be present
      delete payload.userUid;
      delete payload.assigneeUid;
      delete payload.reviewerUid;

      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, removeUndefinedFields(payload));
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!db) {
      console.error("Firestore is not initialized");
      return;
    }

    if (!taskId || typeof taskId !== "string" || !taskId.trim()) {
      console.error("Invalid taskId provided for deletion");
      return;
    }

    try {
      const taskRef = doc(db, "tasks", taskId);
      await deleteDoc(taskRef);
    } catch (error) {
      console.error("Error deleting task:", error);
      throw error; // Re-throw so caller can handle it
    }
  };

  const getBounties = async () => {
    if (!db) {
      console.error("Firestore is not initialized");
      return []; // Return empty array instead of throwing an error
    }
    try {
      const { collection, query, where, getDocs } = await import("firebase/firestore");
      const tasksQuery = query(collection(db, "tasks"), where("isOpenBounty", "==", true));
      const querySnapshot = await getDocs(tasksQuery);

      const tasks = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[];

      // Map tasks to bounty-like objects enriched with project info
      const bounties = await Promise.all(
        tasks.map(async (task) => {
          let project: any = null;
          if (task.projectId) {
            try {
              project = await getProjectById(task.projectId);
            } catch (e) {
              console.warn("Could not fetch project for bounty task", task.id, e);
            }
          }
          const daoName = project?.title || "Unknown DAO";
          const daoImage = project?.coverImage || "/placeholder.svg";
          const category = task.category || project?.category || "General";
          const reward = task.reward || "USDC";
          const rewardAmount = task.rewardAmount || 0;
          const createdAt = task.createdAt || new Date().toISOString();
          const daysAgo = Math.max(
            0,
            Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
          );
          return {
            id: task.id,
            title: task.title,
            description: task.description,
            daoName,
            daoImage,
            reward,
            rewardAmount,
            category,
            daysAgo,
            // Additional task fields for action gating
            projectId: task.projectId || null,
            status: task.status || "todo",
            assigneeId: task.assigneeId ?? null,
            userId: task.userId || null,
            reviewerId: task.reviewerId ?? null,
            proposals: Array.isArray(task.proposals) ? task.proposals : [],
            submission: task.submission || null,
            escrowEnabled: Boolean(task.escrowEnabled),
            paid: Boolean(task.paid),
          };
        })
      );

      return bounties;
    } catch (error) {
      console.error("Error getting bounties:", error);
      return [];
    }
  };

  // Task submissions for open bounties
  const addTaskSubmission = async (
    taskId: string,
    submission: { userId: string; content: string }
  ): Promise<string> => {
    if (!db) {
      console.error("Firestore is not initialized");
      return "";
    }

    if (!taskId || typeof taskId !== "string" || !taskId.trim()) {
      console.error("Invalid taskId provided for submission");
      return "";
    }

    if (!submission || typeof submission !== "object") {
      console.error("Invalid submission data provided");
      return "";
    }

    if (!submission.userId || !submission.content) {
      console.error("Submission userId and content are required");
      return "";
    }

    try {
      const { doc: docFn, getDoc } = await import("firebase/firestore");
      const taskRef = docFn(db, "tasks", taskId);
      const taskDoc = await getDoc(taskRef);
      if (!taskDoc.exists()) {
        console.error("Task not found for submission");
        return "";
      }
      const taskData = taskDoc.data() as any;
      const submissions = Array.isArray(taskData.submissions)
        ? taskData.submissions
        : [];

      const newSubmission = removeUndefinedFields({
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2),
        userId: submission.userId,
        content: submission.content.trim(),
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      
      const updatedSubmissions = [...submissions, newSubmission];
      await updateDoc(taskRef, { submissions: updatedSubmissions });
      return newSubmission.id;
    } catch (error) {
      console.error("Error adding task submission:", error);
      return "";
    }
  };

  const approveTaskSubmission = async (
    taskId: string,
    submissionId: string
  ): Promise<void> => {
    if (!db) {
      console.error("Firestore is not initialized");
      return;
    }

    if (!taskId || typeof taskId !== "string" || !taskId.trim()) {
      console.error("Invalid taskId provided");
      return;
    }

    if (!submissionId || typeof submissionId !== "string" || !submissionId.trim()) {
      console.error("Invalid submissionId provided");
      return;
    }

    try {
      const { doc: docFn, getDoc } = await import("firebase/firestore");
      const taskRef = docFn(db, "tasks", taskId);
      const taskDoc = await getDoc(taskRef);
      if (!taskDoc.exists()) {
        console.error("Task not found when approving submission");
        return;
      }
      const taskData = taskDoc.data() as any;
      const submissions = Array.isArray(taskData.submissions)
        ? taskData.submissions
        : [];
      
      const submissionIndex = submissions.findIndex((s: any) => s.id === submissionId);
      if (submissionIndex === -1) {
        console.error(`Submission with ID ${submissionId} not found`);
        return;
      }

      const updatedSubmissions = submissions.map((s: any) => {
        if (s.id === submissionId) {
          return removeUndefinedFields({
            ...s,
            status: "approved",
            approvedAt: new Date().toISOString(),
          });
        }
        return s;
      });
      
      await updateDoc(taskRef, { submissions: updatedSubmissions });
    } catch (error) {
      console.error("Error approving task submission:", error);
    }
  };

  // Project functions
  const addProject = async (project: any) => {
    if (!db) {
      console.error("Firestore is not initialized");
      return "";
    }

    if (!project || typeof project !== "object") {
      console.error("Invalid project data provided");
      return "";
    }

    try {
      requireAuthenticatedUser(); // Just check authentication

      // Validate required fields
      if (!project.title || typeof project.title !== "string" || !project.title.trim()) {
        console.error("Project title is required");
        return "";
      }

      // Get the user profile to add them as admin
      const userProfile = project.createdBy
        ? await getUserProfile(project.createdBy)
        : null;

      let initialMembers: ProjectMember[] = Array.isArray(project.members)
        ? project.members
        : [];

      if (userProfile) {
        const alreadyIncluded = initialMembers.some(
          (member) => member.userId === userProfile.id
        );
        if (!alreadyIncluded) {
          const adminMember: ProjectMember = {
            userId: userProfile.id,
            role: "admin" as const,
            joinedAt: new Date().toISOString(),
            isActive: true,
          };
          initialMembers = [adminMember, ...initialMembers];
        }
      } else if (!initialMembers.length) {
        // If no user profile found, create project without admin member
        // The creator will need to add themselves later
        initialMembers = [];
      }

      // Remove any UID-related fields from project
      const cleanProject = { ...project };
      delete (cleanProject as any).createdByUid;

      const {
        members: normalizedMembers,
        memberIds,
        memberRoleMap,
      } = await normalizeProjectMembers(initialMembers);

      // Prepare the project data
      const projectData = removeUndefinedFields({
        ...cleanProject,
        members: normalizedMembers,
        memberIds,
        memberRoleMap,
      });

      const docRef = await addDoc(collection(db, "projects"), projectData);
      // Also save the ID in the document itself for easier querying
      await updateDoc(docRef, removeUndefinedFields({ id: docRef.id }));
      return docRef.id;
    } catch (error) {
      console.error("Error adding project:", error);
      return "";
    }
  };

  const getProjects = async () => {
    if (!db) {
      console.error("Firestore is not initialized");
      return [];
    }
    try {
      const querySnapshot = await getDocs(collection(db, "projects"));
      return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error getting projects:", error);
      return [];
    }
  };

  const updateProject = async (projectId: string, data: any) => {
    if (!db) {
      console.error("Firestore is not initialized");
      return;
    }

    if (!projectId || typeof projectId !== "string" || !projectId.trim()) {
      console.error("Invalid projectId provided for update");
      return;
    }

    if (!data || typeof data !== "object") {
      console.error("Invalid update data provided");
      return;
    }

    try {
      let payload = { ...data };

      if (Array.isArray(payload.members)) {
        const {
          members: normalizedMembers,
          memberIds,
          memberRoleMap,
        } = await normalizeProjectMembers(payload.members as ProjectMember[]);
        payload.members = normalizedMembers;
        payload.memberIds = memberIds;
        payload.memberRoleMap = memberRoleMap;
      }

      const projectRef = doc(db, "projects", projectId);
      await updateDoc(projectRef, removeUndefinedFields(payload));
    } catch (error) {
      console.error("Error updating project:", error);
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!db) {
      console.error("Firestore is not initialized");
      return;
    }

    if (!projectId || typeof projectId !== "string" || !projectId.trim()) {
      console.error("Invalid projectId provided for deletion");
      return;
    }

    try {
      const projectRef = doc(db, "projects", projectId);
      await deleteDoc(projectRef);
    } catch (error) {
      console.error("Error deleting project:", error);
      throw error; // Re-throw so caller can handle it
    }
  };

  const getProjectById = async (projectId: string) => {
    if (!db) {
      console.error("Firestore is not initialized");
      return null;
    }

    if (!projectId || typeof projectId !== "string" || !projectId.trim()) {
      console.error("Invalid projectId provided");
      return null;
    }

    try {
      const { doc: docFn, getDoc } = await import("firebase/firestore");
      const projectRef = docFn(db, "projects", projectId);
      const projectDoc = await getDoc(projectRef);
      
      if (projectDoc.exists()) {
        const projectData = projectDoc.data();
        return { id: projectDoc.id, ...projectData };
      }
      
      return null;
    } catch (error) {
      console.error("Error getting project:", error);
      return null;
    }
  };

  const getAllTasks = async () => {
    if (!db) {
      console.error("Firestore is not initialized");
      return [];
    }
    try {
      const querySnapshot = await getDocs(collection(db, "tasks"));
      return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error getting all tasks:", error);
      return [];
    }
  };

  const getUserProfileById = async (
    userId: string
  ): Promise<UserProfile | null> => {
    if (!db) {
      console.error(
        "Firestore is not initialized when trying to get user profile by ID"
      );
      return null;
    }

    if (!userId || typeof userId !== "string" || !userId.trim()) {
      console.error("Invalid userId provided");
      return null;
    }

    try {
      const { doc, getDoc } = await import("firebase/firestore");
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        console.log(`No user profile found with ID: ${userId}`);
        return null;
      }

      const userData = userDoc.data();
      if (!userData) {
        console.error("User document has no data");
        return null;
      }

      console.log(`Found user profile with ID: ${userDoc.id}`);
      return { id: userDoc.id, ...userData } as UserProfile;
    } catch (error) {
      console.error("Error getting user profile by ID:", error);
      return null;
    }
  };

  // Invitations: create pending invite for a user to join a project
  const inviteUserToProject = async (
    projectId: string,
    inviteeUserId: string,
    inviterAddress: string,
    projectTitle?: string
  ) => {
    if (!db) {
      console.error("Firestore is not initialized");
      return "";
    }
    try {
      // Avoid duplicate pending invitations
      const pendingInvitesQ = query(
        collection(db, "project_invitations"),
        where("projectId", "==", projectId),
        where("inviteeUserId", "==", inviteeUserId),
        where("status", "==", "pending")
      );
      const existingPending = await getDocs(pendingInvitesQ);
      if (!existingPending.empty) {
        console.log("Pending invitation already exists");
        return existingPending.docs[0].id;
      }

      // Avoid inviting existing members
      const { doc: docFn, getDoc } = await import("firebase/firestore");
      const projectRef = docFn(db, "projects", projectId);
      const projectDoc = await getDoc(projectRef);
      if (projectDoc.exists()) {
        const projectData = projectDoc.data() as any;
        const members = Array.isArray(projectData.members) ? projectData.members : [];
        const isAlreadyMember = members.some((m: any) => m.userId === inviteeUserId);
        if (isAlreadyMember) {
          console.log("User is already a member of the project");
          return "";
        }
      }

      if (!projectId || !inviteeUserId || !inviterAddress) {
        console.error("Invalid invitation data: projectId, inviteeUserId, and inviterAddress are required");
        return "";
      }

      const invitation = removeUndefinedFields({
        projectId,
        inviteeUserId,
        inviterAddress: inviterAddress.toLowerCase(),
        status: "pending" as const,
        createdAt: new Date().toISOString(),
        projectTitle: projectTitle || "",
      });
      
      const docRef = await addDoc(collection(db, "project_invitations"), invitation);
      await updateDoc(docRef, { id: docRef.id });
      return docRef.id;
    } catch (error) {
      console.error("Error creating project invitation:", error);
      return "";
    }
  };

  // Invitations: list pending invites for given user profile id
  const getProjectInvitationsForUser = async (userId: string) => {
    if (!db) {
      console.error("Firestore is not initialized");
      return [];
    }
    try {
      const invitationsCollection = collection(db, "project_invitations");
      const q = query(invitationsCollection, where("inviteeUserId", "==", userId), where("status", "==", "pending"));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error fetching project invitations:", error);
      return [];
    }
  };

  // Invitations: respond and if accepted, add user as contributor to project
  const respondToProjectInvitation = async (
    invitationId: string,
    action: "accepted" | "rejected"
  ) => {
    if (!db) {
      console.error("Firestore is not initialized");
      return;
    }
    try {
      const { doc: docFn, getDoc } = await import("firebase/firestore");
      const invitationRef = docFn(db, "project_invitations", invitationId);
      const inviteDoc = await getDoc(invitationRef);
      if (!inviteDoc.exists()) return;
      const inviteData = inviteDoc.data() as any;

      // Update invite status
      const updateData = removeUndefinedFields({
        status: action,
        respondedAt: new Date().toISOString(),
      });
      await updateDoc(invitationRef, updateData);

      if (action === "accepted") {
        // Add member to project (as contributor)
        const projectRef = docFn(db, "projects", inviteData.projectId);
        const projectDoc = await getDoc(projectRef);
        if (projectDoc.exists()) {
          const projectData = projectDoc.data() as any;
          const members = Array.isArray(projectData.members) ? projectData.members : [];
          const alreadyMember = members.some((m: any) => m.userId === inviteData.inviteeUserId);
          if (!alreadyMember) {
            const newMember: ProjectMember = {
              userId: inviteData.inviteeUserId,
              role: "contributor" as const,
              joinedAt: new Date().toISOString(),
              isActive: true,
            }
            await updateProject(inviteData.projectId, { members: [...members, newMember] });
          }
        }
      }
    } catch (error) {
      console.error("Error responding to project invitation:", error);
    }
  };

  // Join Requests: contributors apply to join projects
  const applyToJoinProject = async (
    projectId: string,
    applicantUserId: string,
    applicantAddress: string,
    message?: string
  ): Promise<string> => {
    if (!db) {
      console.error("Firestore is not initialized")
      return ""
    }
    try {
      // Prevent duplicate pending requests
      const pendingQ = query(
        collection(db, "project_join_requests"),
        where("projectId", "==", projectId),
        where("applicantUserId", "==", applicantUserId),
        where("status", "==", "pending")
      )
      const existingPending = await getDocs(pendingQ)
      if (!existingPending.empty) {
        console.log("Pending join request already exists")
        return existingPending.docs[0].id
      }

      // Prevent requests from existing members
      const { doc: docFn, getDoc } = await import("firebase/firestore")
      const projectRef = docFn(db, "projects", projectId)
      const projectDoc = await getDoc(projectRef)
      if (projectDoc.exists()) {
        const projectData = projectDoc.data() as any
        const members = Array.isArray(projectData.members) ? projectData.members : []
        const alreadyMember = members.some(
          (m: any) => m.userId === applicantUserId || (m.address && m.address.toLowerCase() === applicantAddress.toLowerCase())
        )
        if (alreadyMember) {
          throw new Error("You are already a member of this project")
        }
      }

      if (!projectId || !applicantUserId || !applicantAddress) {
        console.error("Invalid join request data: projectId, applicantUserId, and applicantAddress are required");
        throw new Error("Missing required fields for join request");
      }

      const req = removeUndefinedFields({
        projectId,
        applicantUserId,
        applicantAddress: applicantAddress.toLowerCase(),
        message: message || "",
        status: "pending" as const,
        createdAt: new Date().toISOString(),
      });
      
      const docRef = await addDoc(collection(db, "project_join_requests"), req);
      await updateDoc(docRef, { id: docRef.id });
      return docRef.id
    } catch (error) {
      console.error("Error applying to join project:", error)
      throw error
    }
  }

  // List pending join requests for a project
  const getJoinRequestsForProject = async (projectId: string): Promise<any[]> => {
    if (!db) {
      console.error("Firestore is not initialized")
      return []
    }
    try {
      const q = query(
        collection(db, "project_join_requests"),
        where("projectId", "==", projectId),
        where("status", "==", "pending")
      )
      const qs = await getDocs(q)
      return qs.docs.map((d) => ({ id: d.id, ...d.data() }))
    } catch (error) {
      console.error("Error fetching join requests:", error)
      return []
    }
  }

  // Respond to a join request and add contributor if accepted
  const respondToProjectJoinRequest = async (
    requestId: string,
    action: "accepted" | "rejected"
  ): Promise<void> => {
    if (!db) {
      console.error("Firestore is not initialized")
      return
    }
    try {
      const { doc: docFn, getDoc } = await import("firebase/firestore")
      const reqRef = docFn(db, "project_join_requests", requestId)
      const reqDoc = await getDoc(reqRef)
      if (!reqDoc.exists()) return
      const reqData = reqDoc.data() as any

      const updateData = removeUndefinedFields({
        status: action,
        respondedAt: new Date().toISOString(),
      });
      await updateDoc(reqRef, updateData);

      if (action === "accepted") {
        const projectRef = docFn(db, "projects", reqData.projectId)
        const projectDoc = await getDoc(projectRef)
        if (projectDoc.exists()) {
          const projectData = projectDoc.data() as any
          const members = Array.isArray(projectData.members) ? projectData.members : []
          const alreadyMember = members.some(
            (m: any) => m.userId === reqData.applicantUserId || (m.address && m.address.toLowerCase() === reqData.applicantAddress.toLowerCase())
          )
          if (!alreadyMember) {
            const newMember: ProjectMember = {
              userId: reqData.applicantUserId,
              address: reqData.applicantAddress.toLowerCase(),
              role: "contributor" as const,
              joinedAt: new Date().toISOString(),
              isActive: true,
            }
            await updateProject(reqData.projectId, { members: [...members, newMember] })
          }
        }
      }
    } catch (error) {
      console.error("Error responding to join request:", error)
    }
  }

  // Event Logging function
  const logEvent = async (event: Omit<EventLogs, "eventId" | "createdAt">): Promise<string> => {
    if (!db) {
      console.error("Firestore is not initialized when trying to log event");
      return "";
    }

    try {
      // Generate unique event ID
      const eventId = typeof globalThis.crypto !== "undefined" &&
        typeof globalThis.crypto.randomUUID === "function"
          ? globalThis.crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36);

      const eventLog: EventLogs = {
        ...event,
        eventId,
        createdAt: Timestamp.now(),
      };

      const eventsCollection = collection(db, "eventLogs");
      const docRef = await addDoc(eventsCollection, eventLog);
      
      return docRef.id;
    } catch (error) {
      console.error("Error logging event:", error);
      return "";
    }
  };

  // Dispute functions
  const getDisputes = async (): Promise<any[]> => {
    if (!db) {
      console.error("Firestore is not initialized");
      return [];
    }
    try {
      const disputesCollection = collection(db, "disputes");
      const querySnapshot = await getDocs(disputesCollection);
      return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error getting disputes:", error);
      return [];
    }
  };

  const getDisputeById = async (disputeId: string): Promise<any> => {
    if (!db) {
      console.error("Firestore is not initialized");
      return null;
    }
    try {
      const { doc: docFn, getDoc } = await import("firebase/firestore");
      const disputeRef = docFn(db, "disputes", disputeId);
      const disputeDoc = await getDoc(disputeRef);
      if (!disputeDoc.exists()) {
        return null;
      }
      return { id: disputeDoc.id, ...disputeDoc.data() };
    } catch (error) {
      console.error("Error getting dispute:", error);
      return null;
    }
  };

  const createDispute = async (dispute: Omit<Dispute, "id" | "createdAt" | "updatedAt">): Promise<string> => {
    if (!db) {
      console.error("Firestore is not initialized");
      throw new Error("Firestore is not initialized");
    }
    try {
      const disputesCollection = collection(db, "disputes");
      const disputeData = {
        ...removeUndefinedFields(dispute),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const docRef = await addDoc(disputesCollection, disputeData);
      return docRef.id;
    } catch (error) {
      console.error("Error creating dispute:", error);
      throw error;
    }
  };

  const updateDispute = async (disputeId: string, data: any): Promise<void> => {
    if (!db) {
      console.error("Firestore is not initialized");
      throw new Error("Firestore is not initialized");
    }
    try {
      const { doc: docFn, updateDoc: updateDocFn } = await import("firebase/firestore");
      const disputeRef = docFn(db, "disputes", disputeId);
      const cleanData = removeUndefinedFields(data);
      await updateDocFn(disputeRef, {
        ...cleanData,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error updating dispute:", error);
      throw error;
    }
  };

  // Centralized Firebase authentication function
  const ensureFirebaseAuth = async (address: string, signer: any) => {
    if (!auth || !signer) {
      throw new Error("Wallet signer or Firebase auth not available");
    }

    const normalizedAddress = address.toLowerCase();

    // Prevent multiple simultaneous authentication requests for the same address
    if (authInProgressRef.current && currentAuthAddressRef.current === normalizedAddress) {
      // Wait for the existing authentication to complete
      await authInProgressRef.current;
      // Re-check if authentication succeeded
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const tokenResult = await currentUser.getIdTokenResult();
          const tokenWalletAddress = (
            tokenResult.claims.walletAddress as string | undefined
          )?.toLowerCase();
          if (tokenWalletAddress === normalizedAddress) {
            return; // Authentication already completed
          }
        } catch (error) {
          // Continue with authentication if token check fails
        }
      }
    }

    // Check if there's already a valid Firebase Auth session with matching wallet address
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        // Get the token with custom claims to check walletAddress
        const tokenResult = await currentUser.getIdTokenResult();
        const tokenWalletAddress = (
          tokenResult.claims.walletAddress as string | undefined
        )?.toLowerCase();

        // If the token's walletAddress matches the current wallet, we're good
        if (tokenWalletAddress === normalizedAddress) {
          return; // Session is valid, no need to re-authenticate
        }
      } catch (error) {
        // If token refresh fails, continue with authentication flow
        console.warn("Failed to get token result, re-authenticating:", error);
      }
    }

    // Create authentication promise
    const authPromise = (async () => {
      try {
        setIsAuthenticating(true);
        currentAuthAddressRef.current = normalizedAddress;

        // No valid session or wallet mismatch - proceed with authentication
        const nonceResponse = await fetch("/api/auth/nonce", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: normalizedAddress }),
        });

        const noncePayload = await nonceResponse.json();
        if (!nonceResponse.ok) {
          throw new Error(noncePayload?.error || "Failed to request nonce.");
        }

        const message = `TaskWiser authentication nonce:\n${noncePayload.nonce}`;
        
        // Ensure signer has signMessage method before attempting to sign
        if (!signer || typeof signer.signMessage !== "function") {
          throw new Error("Wallet signer is not ready. Please try again.");
        }
        
        console.log("Requesting signature for message:", message);
        let signature: string;
        try {
          signature = await signer.signMessage(message);
          console.log("Signature received successfully");
          if (!signature) {
            throw new Error("Signature was not returned from wallet");
          }
        } catch (error: any) {
          console.error("Error signing message:", error);
          // Handle user rejection or other errors
          if (error?.code === 4001 || error?.message?.toLowerCase().includes("user rejected") || error?.message?.toLowerCase().includes("denied")) {
            throw new Error("You need to sign the message to continue. Please approve the request in your wallet.");
          }
          if (error?.message) {
            throw new Error(`Failed to sign message: ${error.message}`);
          }
          throw new Error("Failed to sign message. Please check your wallet and try again.");
        }

        const tokenResponse = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: normalizedAddress, signature }),
        });

        const tokenPayload = await tokenResponse.json();
        if (!tokenResponse.ok) {
          throw new Error(tokenPayload?.error || "Failed to verify signature.");
        }

        await signInWithCustomToken(auth, tokenPayload.token);
      } finally {
        setIsAuthenticating(false);
        if (currentAuthAddressRef.current === normalizedAddress) {
          currentAuthAddressRef.current = null;
        }
        authInProgressRef.current = null;
      }
    })();

    // Store the promise to prevent duplicate requests
    authInProgressRef.current = authPromise;
    await authPromise;
  };

  return (
    <FirebaseContext.Provider
      value={{
        app,
        db,
        auth,
        storage,
        user,
        isInitialized,
        isAuthenticating,
        ensureFirebaseAuth,
        addTask,
        addTaskWithId,
        getTasks,
        getAllTasks,
        updateTask,
        deleteTask,
        getBounties,
        addTaskSubmission,
        approveTaskSubmission,
        getUserProfile,
        getUserProfiles,
        getUserProfileById,
        checkUsernameAvailability,
        createUserProfile,
        updateUserProfile,
        uploadProfilePicture,
        uploadProjectLogo,
        addProject,
        getProjects,
        getProjectById,
        updateProject,
        deleteProject,
        // Invitations
        inviteUserToProject,
        getProjectInvitationsForUser,
        respondToProjectInvitation,
        // Join Requests
        applyToJoinProject,
        getJoinRequestsForProject,
        respondToProjectJoinRequest,
        // Event Logging
        logEvent,
        // Disputes
        getDisputes,
        getDisputeById,
        createDispute,
        updateDispute,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}