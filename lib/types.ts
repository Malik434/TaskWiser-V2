import { Timestamp } from "firebase/firestore"

export interface UserProfile {
  id: string
  address: string
  username: string
  displayName?: string
  discordUsername?: string
  email?: string
  profilePicture: string
  createdAt: string
  updatedAt: string
  specialties?: string[]
  ownerUid?: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: string
  priority: string
  reward?: string
  rewardAmount?: number
  userId: string
  userUid?: string
  assigneeId?: string
  assigneeUid?: string | null
  reviewerId?: string
  reviewerUid?: string | null
  projectId?: string
  category?: string
  tags?: string[]
  assignee?: {
    id: string
    username: string
    profilePicture: string
  }
  reviewer?: {
    id: string
    username: string
    profilePicture: string
  }
  submission?: {
    content: string
    submittedAt: string
    status: "pending" | "approved" | "rejected"
    feedback?: string
  }
  submissions?: Array<{
    id: string
    userId: string
    content: string
    submittedAt: string
    status: "pending" | "approved" | "rejected"
    feedback?: string
  }>
  paid?: boolean
  isOpenBounty?: boolean
  proposals?: TaskProposal[]
  escrowEnabled?: boolean
  escrowStatus?: "pending" | "locked" | "released" | "refunded"
  createdAt: string
  updatedAt?: string
}

export interface TaskProposal {
  id: string
  userId: string
  username: string
  profilePicture?: string
  message: string
  status: "pending" | "approved" | "rejected"
  submittedAt: string
}

export interface Bounty {
  id: string
  title: string
  description: string
  daoName: string
  daoImage: string
  reward: string
  rewardAmount: number
  category: string
  daysAgo: number
}

// Add the Project interface after the existing interfaces

export interface Project {
  id: string
  title: string
  description: string
  status: "active" | "completed" | "archived"
  createdBy: string
  createdByUid?: string
  members?: ProjectMember[] | null
  memberIds?: string[]
  memberRoleMap?: Record<string, "admin" | "manager" | "contributor">
  createdAt: string
  updatedAt?: string
  dueDate?: string
  category?: string
  tags?: string[]
  coverImage?: string
  logoUrl?: string
}

export interface ProjectMember {
  userId: string
  userUid?: string
  role: "admin" | "manager" | "contributor"
  joinedAt: string
  invitedBy?: string
  isActive: boolean
  address?: string
}

export interface EventLogs {
  eventId: string;
  taskId?: string;
  projectId?: string;
  actor: string;
  actorId?: string; // User profile ID
  action: "created" | "updated" | "moved" | "assigned" | "deleted" | "commented" | "attachment_uploaded" | "escrow_locked" | "escrow_released" | "proposal_submitted" | "proposal_approved" | "proposal_rejected" | "submission_submitted" | "submission_approved" | "submission_rejected" | "payment_processed" | "batch_payment_processed" | "project_joined" | "project_left";
  meta?: {
    fromColumn?: string;
    toColumn?: string;
    field?: string;
    oldValue?: any;
    newValue?: any;
    [key: string]: any; // Allow additional metadata
  };
  description?: string;
  createdAt: Timestamp;
}