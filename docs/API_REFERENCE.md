# Task Wiser API & Component Reference

Last updated: 2025-11-20  
Repository root: `/workspace`

This document enumerates every exported provider, hook, utility, component, and route that is intended for app-wide consumption. Each entry includes a short description of the contract, its dependencies, and a practical usage example. Treat this file as the single source of truth when you need to wire new screens or integrate with the existing Firebase/Web3 stacks.

---

## Table of Contents

1. [Data Contracts (`lib/types.ts`)](#data-contracts-libtypests)
2. [Providers & Globals](#providers--globals)
3. [Custom Hooks](#custom-hooks)
4. [Utilities (`lib/utils.ts`, `utils/*`)](#utilities-libutilsts-utils)
5. [Domain Components](#domain-components)
6. [UI Primitives (`components/ui/*`)](#ui-primitives-componentsui)
7. [App Router Reference (`app/*`)](#app-router-reference-app)
8. [End-to-End Usage Recipes](#end-to-end-usage-recipes)

---

## Data Contracts (`lib/types.ts`)

All product features share a consistent set of TypeScript interfaces. Update these definitions before touching Firestore schemas or React props.

| Interface | Key Fields | Notes |
|-----------|-----------|-------|
| `UserProfile` | `id`, `address`, `username`, `profilePicture`, `createdAt`, `updatedAt` | `address` is always stored lowercase. |
| `Task` | `id`, `title`, `description`, `status`, `priority`, `reward`, `rewardAmount`, `userId`, `assigneeId`, `reviewerId`, `projectId`, `submission`, `proposals`, `escrowEnabled`, `paid`, timestamps | `status` aligns with Kanban columns (`todo`, `inprogress`, `review`, `done`). Optional nested `assignee`/`reviewer` metadata is populated client-side. |
| `TaskProposal` | `id`, `userId`, `username`, `message`, `status`, `submittedAt` | Used by open bounties inside the Kanban board. |
| `Bounty` | `id`, `title`, `description`, `daoName`, `daoImage`, `reward`, `rewardAmount`, `category`, `daysAgo` | `BountiesList` falls back to mock data if Firestore is empty. |
| `Project` | `id`, `title`, `description`, `status`, `createdBy`, `members`, `dueDate`, `tags`, `coverImage`, timestamps | `status` ∈ {`active`,`completed`,`archived`}. |
| `ProjectMember` | `userId`, `role`, `joinedAt`, `isActive` | Roles: `admin`, `manager`, `contributor`. |

> **Tip:** When adding new Firestore collections, extend these interfaces and re-export them from `lib/types.ts` to keep typing centralized.

---

## Providers & Globals

### `RootLayout` (`app/layout.tsx`)
- Wraps the entire Next.js app with `FirebaseProvider`, `Web3Provider`, `ThemeProvider`, and the global `Toaster`.
- Supplies the Inter font classes and light/dark background gradients.

**Usage:** Exported automatically by Next.js – add new global providers here.

### `(placeholder-layout)/layout.tsx`
- Lightweight layout for marketing/placeholder routes.
- Reuses `ThemeProvider` (dark default) and the shared `Toaster`.

### `FirebaseProvider` & `useFirebase` (`components/firebase-provider.tsx`)

| Value | Description |
|-------|-------------|
| `app`, `db`, `auth`, `storage` | Firebase SDK handles (nullable until initialization completes). |
| `user`, `isInitialized` | Currently authenticated Firebase user + init state. |
| Task ops | `addTask`, `getTasks`, `getAllTasks`, `updateTask`, `deleteTask`. |
| Profile ops | `getUserProfile`, `getUserProfiles`, `getUserProfileById`, `createUserProfile`, `updateUserProfile`, `uploadProfilePicture`. |
| Project ops | `addProject`, `getProjects`, `getProjectById`, `updateProject`, `deleteProject`. |
| Misc | `getBounties` (Firestore collection), Pinata-backed IPFS upload helper. |

**Environment variables required**

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_PINATA_API_KEY
NEXT_PUBLIC_PINATA_SECRET_API_KEY
```

**Context API**

| Member | Signature | Description |
|--------|-----------|-------------|
| `addTask` | `(task: Record<string, unknown>) => Promise<string>` | Persists a task to Firestore and returns the generated doc id (also written back into the record). |
| `getTasks` | `(userId: string) => Promise<Task[]>` | Fetches tasks created by a wallet/profile. |
| `getAllTasks` | `() => Promise<Task[]>` | Fetches every task in the collection (used for dashboards/project boards). |
| `updateTask` | `(taskId: string, data: Partial<Task>) => Promise<void>` | Shallow-merges updates into a task document. |
| `deleteTask` | `(taskId: string) => Promise<void>` | Removes a task document from Firestore. |
| `getBounties` | `() => Promise<Bounty[]>` | Reads the `bounties` collection; returns `[]` on error for graceful fallbacks. |
| `getUserProfile` | `(address: string) => Promise<UserProfile \| null>` | Looks up a profile by wallet address (case-insensitive). |
| `getUserProfiles` | `() => Promise<UserProfile[]>` | Returns every profile document (used for assignee/reviewer dropdowns). |
| `getUserProfileById` | `(userId: string) => Promise<UserProfile \| null>` | Fetches a profile by Firestore document id. |
| `createUserProfile` | `(profile: Omit<UserProfile, "id" \| "createdAt" \| "updatedAt">) => Promise<string>` | Adds a sanitized profile and returns its doc id. |
| `updateUserProfile` | `(profileId: string, data: Partial<UserProfile>) => Promise<void>` | Applies profile updates, auto-refreshing `updatedAt`. |
| `uploadProfilePicture` | `(file: File, address: string) => Promise<string>` | Compresses and uploads an avatar to IPFS via Pinata, returning the public gateway URL. |
| `addProject` | `(project: Project) => Promise<string>` | Creates a project document and returns its id. |
| `getProjects` | `() => Promise<Project[]>` | Lists all projects. |
| `getProjectById` | `(projectId: string) => Promise<Project \| null>` | Pulls a single project and merges its id into the payload. |
| `updateProject` | `(projectId: string, data: Partial<Project>) => Promise<void>` | Updates project metadata. |
| `deleteProject` | `(projectId: string) => Promise<void>` | Deletes a project. |

**Example**

```tsx
import { useFirebase } from "@/components/firebase-provider"

export function MyTasks() {
  const { isInitialized, getTasks } = useFirebase()

  useEffect(() => {
    if (!isInitialized) return
    ;(async () => {
      const tasks = await getTasks("user-wallet-or-profile-id")
      console.log(tasks)
    })()
  }, [isInitialized, getTasks])

  return null
}
```

### `Web3Provider` & `useWeb3` (`components/web3-provider.tsx`)

| Value | Description |
|-------|-------------|
| `provider`, `signer` | `ethers.BrowserProvider` and signer injected from `window.ethereum`. |
| `account`, `chainId` | Connected wallet metadata. |
| `connectWallet`, `disconnectWallet` | Async helpers wrapping `eth_requestAccounts`. |
| `isConnecting`, `isConnected` | Connection status flags. |

**Example**

```tsx
import { useWeb3 } from "@/components/web3-provider"

export function RequireWallet() {
  const { connectWallet, account, isConnected } = useWeb3()
  return isConnected ? (
    <p>Connected as {account}</p>
  ) : (
    <button onClick={connectWallet}>Connect Wallet</button>
  )
}
```

### `ThemeProvider` (`components/theme-provider.tsx`) & `ThemeToggle`
- Wraps `next-themes` with light default + system detection.
- `ThemeToggle` is a ghost button that flips between `"light"` and `"dark"` themes.

### `ProtectedRoute` (`components/protected-route.tsx`)
- Client-only guard that renders `WalletConnectionCard` unless the wallet is connected.

```tsx
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>
```

### `Sidebar` (`components/sidebar.tsx`)
- Responsive navigation rail with collapsible width, stored in `localStorage`.
- Automatically loads the connected user’s profile (via `getUserProfile`) to show avatar & username.
- Links: `/explore`, `/projects`, `/dashboard`, `/profile`.

---

## Custom Hooks

| Hook | Signature | Purpose | Example |
|------|-----------|---------|---------|
| `useClickOutside(ref, handler)` (`hooks/use-click-outside.ts`) | Registers `mousedown`/`touchstart` listeners | Close menus/dialogs when clicks land outside the referenced element. | ```tsx\nconst ref = useRef(null)\nuseClickOutside(ref, () => setOpen(false))\n``` |
| `useScrollSpy(sectionIds, offset?)` (`hooks/use-scroll-spy.ts`) | Returns currently visible section id | Powers `LandingNav` active state. | ```ts\nconst active = useScrollSpy([\"features\",\"ai\"], 100)\n``` |
| `useIsMobile()` (`hooks/use-mobile.tsx`) | `boolean` | Reactively tracks `<768px` viewport. | `const isMobile = useIsMobile()` |
| `useToast()` (`components/ui/use-toast.ts`) | `{ toast, dismiss, toasts }` | App-wide toast manager with a single concurrent toast limit. | ```tsx\nconst { toast } = useToast()\ntoast({ title: \"Saved\", description: \"Task stored in Firestore\" })\n``` |

---

## Utilities (`lib/utils.ts`, `utils/*`)

### `cn(...classes)` (`lib/utils.ts`)
- Tailwind-friendly class concatenation via `clsx` + `twMerge`.

### `compressImage(file, maxWidth?, maxHeight?, quality?)` (`utils/image-utils.ts`)
- Browser-only helper that downscales images before upload; returns a new `File`.

### IPFS Helpers (`utils/ipfs-utils.ts`)
- `uploadToIPFS(file, options?)`: Compresses (optional) and posts the file to Pinata’s `pinFileToIPFS`. Returns a public gateway URL.
- `getIpfsHashFromUrl(url)`: Extracts CID from various URL formats.
- `ipfsHashToUrl(hash, gateway?)`: Builds a gateway URL; defaults to Pinata.

```ts
const cidUrl = await uploadToIPFS(file, { maxWidth: 512 })
const hash = getIpfsHashFromUrl(cidUrl)
const publicUrl = ipfsHashToUrl(hash!, "https://ipfs.io/ipfs/")
```

---

## Domain Components

All components live in `components/` unless noted otherwise. Each entry lists props and integration notes.

### `WalletConnect`
- Props: none; pulls state from `useWeb3`.
- Capabilities: connect/disconnect MetaMask, show username (if profile exists) or truncated address, trigger `ProfileSetupForm` when a new wallet connects.
- Landing page variant automatically renders a large button (`size="lg"`).

```tsx
import { WalletConnect } from "@/components/wallet-connect"

export function HeaderActions() {
  return (
    <div className="flex items-center gap-4">
      <WalletConnect />
    </div>
  )
}
```

### `WalletConnectionCard`
- Full-screen gate shown on any route that requires an authenticated wallet.
- Provides CTA buttons for MetaMask (active) and WalletConnect (coming soon).

### `ProfileSetupForm`
- Props: `{ isOpen: boolean; onClose: () => void }`.
- Flow: validates username, optionally uploads an avatar to IPFS (via `uploadProfilePicture`), then invokes `createUserProfile`.
- Emits shadcn toasts for every stage (processing/upload/success/failure).

```tsx
const [open, setOpen] = useState(false)
<ProfileSetupForm isOpen={open} onClose={() => setOpen(false)} />
```

### `Sidebar`
- No props; used across dashboard-style routes.
- Automatically fetches the connected user’s profile; gracefully falls back to wallet initials if none exist.

### `PlaceholderPage`
- Props: `{ title?, message?, backUrl?, backLabel? }`.
- Reusable marketing placeholder used by most static routes (Blog, Docs, Terms, etc.). Accepts custom CTA text.

```tsx
<PlaceholderPage
  title="Docs Coming Soon"
  message="Check back later for full API docs."
  backUrl="/landing"
  backLabel="Return to landing"
/>
```

### `KanbanBoard` (`components/kanban-board.tsx`)

| Prop | Type | Description |
|------|------|-------------|
| `projectId?` | `string` | When provided, filters Firebase tasks to a single project and disables the “view switcher”. |

**Core capabilities**

- **Task CRUD**: create, edit, delete tasks stored in Firestore (`addTask`, `updateTask`, `deleteTask`). Supports reward metadata, escrow toggles, tags, and optional project binding.
- **Column management**: Columns map to `todo`, `inprogress`, `review`, `done`. Drag & drop implemented via `@hello-pangea/dnd`.
- **Filtering & search**: Keyword search, priority filter, and per-view (Created / Assigned / All) toggles.
- **User assignment**: Loads all profiles via `getUserProfiles`. Provides searchable assignee/reviewer dropdowns.
- **Submissions**: Allows contributors to upload deliverables with a rich text area; stores data under `task.submission`.
- **Open bounty proposals**: Any wallet can submit a proposal, owners can approve/reject, and approval auto-assigns the task to the winning profile.
- **Payments**: Integrates `PaymentPopup` for single-task payouts plus batch payment tooling (select multiple tasks, mark them paid, export CSV).
- **Selection utilities**: Multi-select mode, CSV export, undo stack, keyboard shortcuts (`Ctrl/Cmd+Shift+S` to toggle selection, `Ctrl/Cmd+Shift+P` for batch payment).
- **Escrow indicators**: Visual cues when escrow is enabled; automatically flips statuses (`locked` → `released`) when moving to `done`.

**Usage**

```tsx
// Personal board
<KanbanBoard />

// Project-scoped board
<KanbanBoard projectId={projectIdFromParams} />
```

> **Important:** `KanbanBoard` assumes `FirebaseProvider` & `Web3Provider` are mounted above it. Without an initialized Firestore instance it renders a spinner.

### `BountiesList`
- No props; fetches DAO bounties via `getBounties()` once Firebase is ready.
- Provides search + category filters and falls back to curated sample data when Firestore is empty.

### `TopDAOs`
- No props; lists curated DAO cards with search filtering. Uses mock data until a DAO collection exists.

### `Contributors`
- No props; paginated contributor roster (9 per page). Uses mock data and skeleton loaders until Firebase is initialized.

### `PaymentPopup`
- Props: `{ isOpen, onClose, task, onPaymentComplete }`.
- Simulates a four-step payment workflow; calls `onPaymentComplete(taskId)` after finishing.
- Reused by `KanbanBoard` for both single and batch payments.

```tsx
const [open, setOpen] = useState(false)
<PaymentPopup
  isOpen={open}
  onClose={() => setOpen(false)}
  task={selectedTask}
  onPaymentComplete={async (taskId) => updateTask(taskId, { paid: true })}
/>
```

### `IpfsImage`
- Props: `{ src, alt, width?, height?, className?, fallbackSrc? }`.
- Converts any `ipfs://` or `/ipfs/` URI to a gateway URL before rendering `<Image>`.

### `IpfsInfo`
- Renders the current Pinata configuration status on the `/profile` screen.
- Offers a “Test Connection” CTA that pings Pinata’s `testAuthentication` endpoint using the configured API keys.

### Landing Page Components

| Component | Purpose | Notes |
|-----------|---------|-------|
| `LandingHero` | Hero section with CTA, screenshot card, and wallet connect button (or dashboard link if connected). | Scrolls smoothly to `#features`. |
| `LandingFeatures` | Three-column feature grid highlighting wallet integration, Kanban board, DAO support, smart contracts, reputation, and collaboration. | No props. |
| `LandingAI` | Detailed AI assistant section with cards and an illustrative screenshot. | Ensures imagery is served via `/public/images/ai-assistant.png`. |
| `LandingNav` | Sticky navigation for marketing sections; mobile-friendly menu with `useScrollSpy`. | Update `navItems` if you add or rename sections. |
| `LandingFooter` | Footer with social links, smooth-scroll shortcuts, newsletter subscription form, and policy links. | `scrollToSection` automatically offsets fixed headers. |

### `WalletConnect + ThemeToggle + Header combos`
- All dashboard-like pages share a sticky header with these components. When designing new private routes, mimic that pattern for consistency.

### Miscellaneous

| Component | Purpose |
|-----------|---------|
| `ProfilePage` (`app/profile/page.tsx`) | Full profile editor with username + IPFS avatar upload. Imports `IpfsInfo`. |
| `ProjectsPage` (`app/projects/page.tsx`) | CRUD for project metadata with modal creation dialog. |
| `ProjectsLayout` (`app/projects/layout.tsx`) | Wraps all `/projects/*` routes in `Sidebar` + auth gate. |
| `ProjectBoardPage` (`app/projects/[projectId]/page.tsx`) | Validates project access, then renders `KanbanBoard` scoped to that project. |
| `DashboardPage` (`app/dashboard/page.tsx`) | Personal dashboard summarizing assigned tasks & stats, plus submission dialogs. |
| `BoardPage` (`app/board/page.tsx`) | Thin shell around `KanbanBoard`. |
| `ExplorePage` (`app/explore/page.tsx`) | Tabbed view combining `BountiesList`, `TopDAOs`, `Contributors`. |

---

## UI Primitives (`components/ui`)

These files are generated via [shadcn/ui](https://ui.shadcn.com/) and mirror Radix UI contracts. Notable exports include:

- Feedback: `alert-dialog`, `dialog`, `drawer`, `sheet`, `toast`, `sonner`.
- Inputs: `input`, `textarea`, `select`, `checkbox`, `radio-group`, `switch`, `slider`, `input-otp`.
- Layout & data display: `card`, `accordion`, `tabs`, `table`, `badge`, `pagination`, `menubar`, `navigation-menu`, `sidebar`, `resizable`, `scroll-area`.
- Utility hooks: `use-mobile`, `use-toast` (also re-exported under `hooks`).

**Example**

```tsx
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"

export function ConfirmDelete({ onConfirm }: { onConfirm: () => void }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete</Button>
      </DialogTrigger>
      <DialogContent>
        <p>Are you sure?</p>
        <Button onClick={onConfirm}>Yes</Button>
      </DialogContent>
    </Dialog>
  )
}
```

Refer to each file under `components/ui/` for the exact prop types—they follow the shadcn defaults.

---

## App Router Reference (`app/*`)

| Route | Component | Description / Key Dependencies |
|-------|-----------|--------------------------------|
| `/` | `app/page.tsx` | Immediately redirects to `/landing`. |
| `/landing` | Marketing home built from `LandingHero`, `LandingFeatures`, `LandingAI`, `LandingFooter`, `LandingNav`, plus `WalletConnect`. |
| `/dashboard` | `DashboardPage` – personal stats, filters, and submission dialog for assigned tasks. Requires wallet auth. |
| `/dashboard/page-fixed` | Alternate styling of the same dashboard logic (kept for design comparisons). |
| `/board` | Full Kanban experience (`KanbanBoard` + `Sidebar`). |
| `/explore` | Tabbed discovery hub (bounties, DAOs, contributors). |
| `/projects` | Project index with creation dialog (uses `/projects/layout`). |
| `/projects/[projectId]` | Project-specific Kanban board after validating access rights. |
| `/profile` | Profile editor (username + avatar + IPFS info). |
| `/blog`, `/docs`, `/discover`, `/contact`, `/privacy`, `/terms`, `/tutorials`, `/tasks`, `/roadmap`, `/support`, `/landing` subpages | All reuse `PlaceholderPage` with tailored copy. Update `app/<route>/page.tsx` to swap placeholder content for real pages later. |
| `/(placeholder-layout)` variants | Marketing/placeholder routes share this layout to keep bundle size smaller. |
| `/not-found` | Custom 404 page built with `PlaceholderPage`. |

> Any new authenticated route should mimic `/board` or `/projects` by wrapping content in `Sidebar`, `ThemeToggle`, and `WalletConnect`, and by deferring rendering until `useWeb3` confirms a connected wallet.

---

## End-to-End Usage Recipes

### 1. Creating a task tied to a project

```tsx
import { useFirebase } from "@/components/firebase-provider"
import type { Task } from "@/lib/types"

function NewProjectTask({ projectId }: { projectId: string }) {
  const { addTask } = useFirebase()

  async function handleSubmit() {
    const task: Omit<Task, "id" | "createdAt" | "userId"> = {
      title: "Smart contract audit",
      description: "Review staking contract",
      status: "todo",
      priority: "high",
      reward: "USDC",
      rewardAmount: 400,
      projectId,
      isOpenBounty: true,
      escrowEnabled: true,
    }
    await addTask({ ...task, userId: "wallet-address", createdAt: new Date().toISOString() })
  }

  return <button onClick={handleSubmit}>Create task</button>
}
```

### 2. Displaying a DAO avatar stored on IPFS

```tsx
import { IpfsImage } from "@/components/ipfs-image"

function DaoCard({ logoCid }: { logoCid: string }) {
  return <IpfsImage src={`ipfs://${logoCid}`} alt="DAO logo" width={64} height={64} className="rounded-full" />
}
```

### 3. Guarding a dashboard route

```tsx
import { ProtectedRoute } from "@/components/protected-route"
import { KanbanBoard } from "@/components/kanban-board"

export default function Tasks() {
  return (
    <ProtectedRoute>
      <KanbanBoard />
    </ProtectedRoute>
  )
}
```

### 4. Submitting a proposal for an open bounty

The UI is already wired inside `KanbanBoard`. To submit programmatically:

```tsx
const { updateTask } = useFirebase()
await updateTask(taskId, {
  proposals: [
    ...(task.proposals ?? []),
    {
      id: crypto.randomUUID(),
      userId: profile.id,
      username: profile.username,
      message: "My plan for this bounty…",
      status: "pending",
      submittedAt: new Date().toISOString(),
    },
  ],
})
```

### 5. Testing Pinata connectivity from another screen

```tsx
const res = await fetch("https://api.pinata.cloud/data/testAuthentication", {
  headers: {
    pinata_api_key: process.env.NEXT_PUBLIC_PINATA_API_KEY!,
    pinata_secret_api_key: process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY!,
  },
})
if (!res.ok) throw new Error("Pinata auth failed")
```

---

## Contributing Tips

- Always wrap new authenticated pages with `WalletConnectionCard` fallbacks to avoid hydration issues when `window.ethereum` is unavailable server-side.
- Reuse `PlaceholderPage` for incomplete sections instead of duplicating markup.
- When adding new Firebase calls, colocate them inside `FirebaseProvider` to keep context consumers type-safe.
- UI primitives accept the same props as documented on shadcn/ui. Prefer importing from `@/components/ui/*` to take advantage of the local styling tokens.

Happy shipping! 🚀

