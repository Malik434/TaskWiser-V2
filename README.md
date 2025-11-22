# TaskWiser V2

A modern, full-stack task management and bounty platform for DAOs and teams. It features a Kanban board, open bounties marketplace, proposal workflows, assignee submissions, reviewer approvals, and optional escrow/payment flows.

## Features

- Kanban board with drag-and-drop statuses: `todo` → `inprogress` → `review` → `done`
- Open Bounties marketplace with proposal and assignment workflow
- Proposals: submit, approve/reject; auto-assign on approval
- Submissions: assignee submits work; reviewer/owner approves or rejects
- Project management with logos hosted over IPFS (Pinata)
- User profiles with wallet address mapping
- Firestore-backed persistence with typed data models
- Responsive UI built with Next.js, Tailwind, and shadcn/ui

## Tech Stack

- Frontend: Next.js 14 (App Router), React, Tailwind CSS, shadcn/ui
- Data & Auth: Firebase (Firestore, Auth, Storage)
- Storage: IPFS (Pinata)
- Web3: Wallet (account) integration via a custom provider

## Quick Start

1. Prerequisites
   - Node.js `>=18`
   - A Firebase project with Firestore and Auth enabled
   - Pinata account and API keys

2. Install dependencies
   - `npm install` or `pnpm install`

3. Environment variables: create `.env.local` in the project root:
   ```env
   # Firebase
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

   # Pinata for IPFS uploads
   NEXT_PUBLIC_PINATA_API_KEY=your_pinata_api_key
   NEXT_PUBLIC_PINATA_SECRET_API_KEY=your_pinata_secret
   ```

4. Run the dev server
   - `npm run dev`
   - Open `http://localhost:3000`

5. Build & start (production)
   - `npm run build`
   - `npm run start`

## Project Structure

- `app/` Next.js routes (App Router)
- `components/` UI and feature components
  - `firebase-provider.tsx` Firebase context and data access
  - `kanban-board.tsx` Board UI and task workflows
  - `bounties-list.tsx` Open bounties marketplace
  - `web3-provider.tsx` Wallet/account context
- `lib/types.ts` Shared TypeScript interfaces
- `utils/ipfs-utils.ts` Pinata helpers
- `public/` static assets

## Core Concepts & Data Models

Task (`lib/types.ts`)
- Key fields: `id`, `title`, `description`, `status`, `priority`, `projectId`, `userId` (owner), `assigneeId`, `reviewerId`, `isOpenBounty`, `proposals`, `submission`, `reward`, `rewardAmount`, `escrowEnabled`, `paid`
- Status flow: `todo` → `inprogress` → `review` → `done`

Proposal
- Fields: `id`, `userId`, `username`, `profilePicture`, `message`, `status (pending|approved|rejected)`, `submittedAt`
- Approval auto-assigns task to `userId` and closes bounty

Submission
- Fields: `id`, `userId`, `content`, `status (pending|approved|rejected)`, timestamps, `feedback?`
- Created by assignee; reviewed by task owner or reviewer

Project
- Includes metadata such as `title`, `coverImage`, `logoUrl (IPFS)`

User Profile
- Fields: `id`, `username`, `profilePicture`, mapping to wallet address via provider helpers

## Workflows

Proposals
- Anyone (not owner/reviewer/assignee) can submit a proposal to an open bounty
- Owner/reviewer approves exactly one proposal; others are marked rejected automatically
- Approval sets `assigneeId` and (optionally) transitions status

Assignment & Submission
- Assignee sees `Submit Work` in Task Details and Bounties view when assigned and no submission exists
- Submit a link/description; task moves to `review` state in typical flows
- Owner/reviewer approves or rejects with optional feedback

Kanban Board
- Create, edit, and move tasks between columns
- Proposal management, submission review, and per-project filters

Bounties List
- Browse open bounties across projects
- Submit proposals and work from a consolidated view

## Configuration Notes

- Firestore collections: `tasks`, `projects`, `profiles`, invitations/join requests
- `firebase-provider.tsx` exposes helpers: `addTask`, `getAllTasks`, `updateTask`, `getBounties`, `addTaskSubmission`, `approveTaskSubmission`, project and profile APIs
- IPFS uploads require Pinata keys; images are compressed before upload

## Common Scripts

- `npm run dev` Start local development
- `npm run build` Build for production
- `npm run start` Run production build

## Troubleshooting

- Proposals not appearing:
  - Ensure `updateTask` writes `proposals` and UI refreshes via state sync
  - Verify `getAllTasks` is called and results filtered for project boards
- `Submit Work` not visible:
  - Confirm `assigneeId` matches your user profile ID or wallet address
  - Ensure there’s no existing submission
  - Status can be `todo` or `inprogress` depending on view
- IPFS upload failures:
  - Check Pinata env vars are present and valid
  - Confirm image size/format; compression is applied in utils
- Firebase initialization:
  - All `NEXT_PUBLIC_*` Firebase vars must be set; Firestore enabled

## Contributing

- Fork and create feature branches
- Keep changes focused and aligned with existing style
- Add minimal documentation for new features

## Roadmap

- Real-time Firestore listeners for live updates across boards
- Escrow/payment integrations
- Advanced permissions (per-project roles)
- Analytics and activity feeds

## License

TBD. This repository currently does not include a license file.
