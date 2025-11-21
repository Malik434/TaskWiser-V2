import { Timestamp } from "firebase/firestore"

export interface UserProfile {
  id: string
  address: string
  username: string
  profilePicture: string
  createdAt: string
  updatedAt: string
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
  assigneeId?: string
  reviewerId?: string
  projectId?: string
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
  paid?: boolean
  isOpenBounty?: boolean
  proposals?: TaskProposal[]
  escrowEnabled?: boolean
  escrowStatus?: "locked" | "released" | "refunded"
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
  members?: ProjectMember[] | null
  createdAt: string
  updatedAt?: string
  dueDate?: string
  category?: string
  tags?: string[]
  coverImage?: string
}

export interface ProjectMember {
  userId: string
  role: "admin" | "manager" | "contributor"
  joinedAt: string
  invitedBy?: string
  isActive: boolean
}

export interface EventLogs {
  eventId : string,
  taskId : string,
  projectId : string,
  actor: string,
  action : "created"|"updated"|"moved"|"assigned"|"commented"|"attachment_uploaded"|"escrow_released",
  meta: { fromColumn:string,toColumn:string },
  createdAt: Timestamp
}