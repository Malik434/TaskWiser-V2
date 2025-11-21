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
  addProject: (project: any) => Promise<string>;
  getProjects: () => Promise<any[]>;
  getProjectById: (projectId: string) => Promise<any>;
  updateProject: (projectId: string, data: any) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
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
  getUserProfile: async () => null,
  getUserProfiles: async () => [],
  getUserProfileById: async () => null,
  createUserProfile: async () => "",
  updateUserProfile: async () => {},
  uploadProfilePicture: async () => "",
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

      // Import the IPFS utility
      const { uploadToIPFS } = await import("@/utils/ipfs-utils");

      // Check if Pinata API keys are configured
      if (
        !process.env.NEXT_PUBLIC_PINATA_API_KEY ||
        !process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY
      ) {
        console.error("Pinata API keys are not configured");
        throw new Error(
          "Pinata API keys are not configured. Please check your environment variables."
        );
      }

      // Upload to IPFS via Pinata
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

      // Provide a more detailed error message
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error occurred during upload";

      throw new Error(
        `Failed to upload profile picture to IPFS: ${errorMessage}`
      );
    }
  };

  // Task functions
  const addTask = async (task: any) => {
    if (!db) {
      console.error("Firestore is not initialized");
      return "";
    }
    try {
      const docRef = await addDoc(collection(db, "tasks"), task);
        // Also save the ID in the document itself for easier querying
        await updateDoc(docRef, { id: docRef.id });
        return docRef.id;
    } catch (error) {
      console.error("Error adding task:", error);
      return "";
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
      const querySnapshot = await getDocs(collection(db, "bounties"));
      return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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
        getUserProfile,
        getUserProfiles,
        getUserProfileById,
        createUserProfile,
        updateUserProfile,
        uploadProfilePicture,
        addProject,
        getProjects,
        getProjectById,
        updateProject,
        deleteProject,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}
