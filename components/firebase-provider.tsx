"use client";

import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
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
} from "firebase/auth";
import { getStorage, ref, type StorageReference } from "firebase/storage";
import type { UserProfile } from "@/lib/types";

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
  addTask: (task: any) => Promise<string>;
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
}

// Update the default context value to include isInitialized
const FirebaseContext = createContext<FirebaseContextType>({
  app: null,
  db: null,
  auth: null,
  storage: null,
  user: null,
  isInitialized: false,
  addTask: async () => "",
  getTasks: async () => [],
  getAllTasks: async () => [],
  updateTask: async () => {},
  deleteTask: async () => {},
  getBounties: async () => [],
  addTaskSubmission: async () => "",
  approveTaskSubmission: async () => {},
  getUserProfile: async () => null,
  getUserProfiles: async () => [],
  getUserProfileById: async () => null,
  createUserProfile: async () => "",
  updateUserProfile: async () => {},
  uploadProfilePicture: async () => "",
  uploadProjectLogo: async () => "",
  addProject: async () => "",
  getProjects: async () => [],
  getProjectById: async () => null,
  updateProject: async () => {},
  deleteProject: async () => {},
});

export const useFirebase = () => useContext(FirebaseContext);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [app, setApp] = useState<FirebaseApp | null>(null);
  const [db, setDb] = useState<Firestore | null>(null);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [storage, setStorage] = useState<StorageReference | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

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

    try {
      console.log(
        `Fetching user profile for address: ${address.toLowerCase()}`
      );
      const usersCollection = collection(db, "users");
      const q = query(
        usersCollection,
        where("address", "==", address.toLowerCase())
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
      console.log(`Found user profile with ID: ${userDoc.id}`);
      return { id: userDoc.id, ...userDoc.data() } as UserProfile;
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

  const createUserProfile = async (
    profile: Omit<UserProfile, "id" | "createdAt" | "updatedAt">
  ): Promise<string> => {
    if (!db) {
      console.error(
        "Firestore is not initialized when trying to create user profile"
      );
      return "";
    }

    try {
      console.log(
        `Creating user profile for address: ${profile.address.toLowerCase()}`
      );
      const now = new Date().toISOString();
      const userProfile = {
        ...profile,
        address: profile.address.toLowerCase(),
        createdAt: now,
        updatedAt: now,
      };

      const usersCollection = collection(db, "users");
      const docRef = await addDoc(usersCollection, userProfile);
      console.log(`User profile created with ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error("Error creating user profile:", error);
      return "";
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

      const userRef = doc(db, "users", profileId);
      await updateDoc(userRef, updateData);
    } catch (error) {
      console.error("Error updating user profile:", error);
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
      // Remove undefined fields as Firestore doesn't handle them well
      const cleanTask = Object.fromEntries(
        Object.entries(task).filter(([_, value]) => value !== undefined)
      );
      
      console.log("Adding task to Firestore:", cleanTask);
      const docRef = await addDoc(collection(db, "tasks"), cleanTask);
      console.log("Task added with ID:", docRef.id);
      
      // Also save the ID in the document itself for easier querying
      await updateDoc(docRef, { id: docRef.id });
      return docRef.id;
    } catch (error) {
      console.error("Error adding task to Firestore:", error);
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
    try {
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, data);
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!db) {
      console.error("Firestore is not initialized");
      return;
    }
    try {
      const taskRef = doc(db, "tasks", taskId);
      await deleteDoc(taskRef);
    } catch (error) {
      console.error("Error deleting task:", error);
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
          const tags = Array.isArray(task.tags)
            ? task.tags
            : Array.isArray(project?.tags)
            ? project.tags
            : [];
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
            tags,
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

  // Project functions
  const addProject = async (project: any) => {
    if (!db) {
      console.error("Firestore is not initialized");
      return "";
    }
    try {
      // Get the user profile to add them as admin
      const userProfile = await getUserProfile(project.createdBy);
      
      // Prepare the project data with the creator as admin
      const projectData = {
        ...project,
        members: userProfile ? [
          {
            userId: userProfile.id,
            role: "admin" as const,
            joinedAt: new Date().toISOString(),
            isActive: true,
          }
        ] : [],
      };
      
      const docRef = await addDoc(collection(db, "projects"), projectData);
      // Also save the ID in the document itself for easier querying
      await updateDoc(docRef, { id: docRef.id });
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
    try {
      const projectRef = doc(db, "projects", projectId);
      await updateDoc(projectRef, data);
    } catch (error) {
      console.error("Error updating project:", error);
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!db) {
      console.error("Firestore is not initialized");
      return;
    }
    try {
      const projectRef = doc(db, "projects", projectId);
      await deleteDoc(projectRef);
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  const getProjectById = async (projectId: string) => {
    if (!db) {
      console.error("Firestore is not initialized");
      return null;
    }
    try {
      const projectRef = doc(db, "projects", projectId);
      const docSnap = await getDocs(collection(db, "projects"));
      const projectDoc = docSnap.docs.find((doc) => doc.id === projectId);
      if (projectDoc) {
        return { id: projectDoc.id, ...projectDoc.data() };
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

    try {
      const { doc, getDoc } = await import("firebase/firestore");
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        console.log(`No user profile found with ID: ${userId}`);
        return null;
      }

      console.log(`Found user profile with ID: ${userDoc.id}`);
      return { id: userDoc.id, ...userDoc.data() } as UserProfile;
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

      const invitation = {
        projectId,
        inviteeUserId,
        inviterAddress: inviterAddress.toLowerCase(),
        status: "pending" as const,
        createdAt: new Date().toISOString(),
        projectTitle: projectTitle || "",
      };
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
      await updateDoc(invitationRef, { status: action, respondedAt: new Date().toISOString() });

      if (action === "accepted") {
        // Add member to project (as contributor)
        const projectRef = docFn(db, "projects", inviteData.projectId);
        const projectDoc = await getDoc(projectRef);
        if (projectDoc.exists()) {
          const projectData = projectDoc.data() as any;
          const members = Array.isArray(projectData.members) ? projectData.members : [];
          const alreadyMember = members.some((m: any) => m.userId === inviteData.inviteeUserId);
          if (!alreadyMember) {
            const newMember = {
              userId: inviteData.inviteeUserId,
              role: "contributor" as const,
              joinedAt: new Date().toISOString(),
              isActive: true,
            };
            await updateDoc(projectRef, { members: [...members, newMember] });
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

      const req = {
        projectId,
        applicantUserId,
        applicantAddress: applicantAddress.toLowerCase(),
        message: message || "",
        status: "pending" as const,
        createdAt: new Date().toISOString(),
      }
      const docRef = await addDoc(collection(db, "project_join_requests"), req)
      await updateDoc(docRef, { id: docRef.id })
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

      await updateDoc(reqRef, { status: action, respondedAt: new Date().toISOString() })

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
            const newMember = {
              userId: reqData.applicantUserId,
              address: reqData.applicantAddress.toLowerCase(),
              role: "contributor" as const,
              joinedAt: new Date().toISOString(),
              isActive: true,
            }
            await updateDoc(projectRef, { members: [...members, newMember] })
          }
        }
      }
    } catch (error) {
      console.error("Error responding to join request:", error)
    }
  }

  return (
    <FirebaseContext.Provider
      value={{
        app,
        db,
        auth,
        storage,
        user,
        isInitialized,
        addTask,
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
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}

// Task submissions for open bounties
const addTaskSubmission = async (
  taskId: string,
  submission: { userId: string; content: string }
): Promise<string> => {
  if (!db) {
    console.error("Firestore is not initialized")
    return ""
  }
  try {
    const { doc: docFn, getDoc } = await import("firebase/firestore")
    const taskRef = docFn(db, "tasks", taskId)
    const taskDoc = await getDoc(taskRef)
    if (!taskDoc.exists()) {
      console.error("Task not found for submission")
      return ""
    }
    const taskData = taskDoc.data() as any
    const submissions = Array.isArray(taskData.submissions) ? taskData.submissions : []
    const newSubmission = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      userId: submission.userId,
      content: submission.content,
      status: "pending",
      createdAt: new Date().toISOString(),
    }
    await updateDoc(taskRef, { submissions: [...submissions, newSubmission] })
    return newSubmission.id
  } catch (error) {
    console.error("Error adding task submission:", error)
    return ""
  }
}

const approveTaskSubmission = async (
  taskId: string,
  submissionId: string
): Promise<void> => {
  if (!db) {
    console.error("Firestore is not initialized")
    return
  }
  try {
    const { doc: docFn, getDoc } = await import("firebase/firestore")
    const taskRef = docFn(db, "tasks", taskId)
    const taskDoc = await getDoc(taskRef)
    if (!taskDoc.exists()) {
      console.error("Task not found when approving submission")
      return
    }
    const taskData = taskDoc.data() as any
    const submissions = Array.isArray(taskData.submissions) ? taskData.submissions : []
    const updatedSubmissions = submissions.map((s: any) =>
      s.id === submissionId ? { ...s, status: "approved", approvedAt: new Date().toISOString() } : s
    )
    await updateDoc(taskRef, { submissions: updatedSubmissions })
  } catch (error) {
    console.error("Error approving task submission:", error)
  }
}