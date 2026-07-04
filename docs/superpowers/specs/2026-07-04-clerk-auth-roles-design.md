# Specification: Clerk Authentication and Role-Based Access Control

This document specifies the design for integrating Clerk Authentication, User Syncing (via webhooks), Board Owner/Member permissions, and a Platform Admin Dashboard into the Kanban Board application.

---

## 1. Objectives & Requirements
* **Authentication**: Integrate Clerk for signups, logins, and session management.
* **Onboarding & Sync**: Implement a Clerk Webhook endpoint (`/api/webhooks/clerk`) that upserts users in MongoDB when they sign up or edit their profile in Clerk.
* **Role Hierarchy**:
  * **Platform Admin**: Super-user (defined via Clerk metadata) with view/delete privileges over all boards, stats visibility, and user management access.
  * **Board Owner**: The creator of a board. Can modify board properties (name, privacy), manage board members, or delete the board.
  * **Board Member**: Collaborator added to a board. Can create lists, cards, write descriptions, assign members, and drag-and-drop cards.
  * **Guest**: Read-only view for public boards; strictly blocked from viewing private boards or editing any board.
* **Admin Control Center**: A secure `/admin` page listing metrics, boards, and users, allowing admins to promote/demote admins or delete boards.

---

## 2. System Architecture & Flows

### Webhook Sync Flow
```
[Clerk Sign Up / Update]
        │
        ▼ (POST HTTPS Webhook)
[/api/webhooks/clerk] (Signature verified using svix)
        │
        ▼ (Upsert matching clerkId)
[MongoDB User Document]
```

### Authorization Check Flow
```
[User Request] ──► [auth() session checks] ──► [Authorize Clerk role (Admin?)]
                        │
                        ▼ (If regular user)
                  [Retrieve Board from DB] ──► [Compare User ID with ownerId / userIds]
```

---

## 3. Database Schema Modifications

The Prisma schema is updated to add Clerk ID and establish the Board Creator/Owner relation:

```prisma
model User {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  clerkId     String   @unique
  name        String
  email       String   @unique
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  ownedBoards Board[]  @relation("BoardOwner")
  boards      Board[]  @relation("BoardMembers", fields: [boardIds], references: [id])
  boardIds    String[] @db.ObjectId
  cards       Card[]
}

model Board {
  id        String      @id @default(auto()) @map("_id") @db.ObjectId
  name      String
  privacy   String      @default("PUBLIC")
  url       String      @default("")
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  ownerId   String      @db.ObjectId
  owner     User        @relation("BoardOwner", fields: [ownerId], references: [id])

  userIds   String[]    @db.ObjectId
  users     User[]      @relation("BoardMembers", fields: [userIds], references: [id])
  lists     BoardList[]
}
```

---

## 4. API Endpoint Specifications

### 1. Webhook Sync Endpoint
* **Method**: `POST`
* **Route**: `/api/webhooks/clerk`
* **Payload**: Clerk event payload (verifying headers `svix-id`, `svix-timestamp`, and `svix-signature`).
* **Actions**:
  * On `user.created` / `user.updated`: Upsert User database document containing `clerkId`, `name` (first name + last name), and `email`.
  * On `user.deleted`: Delete the user and unassign their cards.

### 2. Boards Endpoint Updates (`POST /api/boards`)
* Checks active Clerk session using `@clerk/nextjs` `auth()`.
* Resolves the logged-in Clerk user in MongoDB.
* Sets `ownerId` of the new Board to the user's local database ID, and adds the owner to `userIds` by default.

### 3. Permissions Check Decorator (API Layer)
Every CRUD action inside `GET/PUT/DELETE` for boards, lists, and cards will check Clerk session:
```typescript
const { userId: clerkId } = await auth();
if (!clerkId) return Response.json({ error: "Unauthorized" }, { status: 401 });

const user = await db.user.findUnique({ where: { clerkId } });
const isAdmin = auth().sessionClaims?.metadata?.role === 'admin';

// Check if user is owner/member...
```

---

## 5. UI & Routing Setup

### Admin Panel (`/admin`)
* Safe navigation panel that redirects to `/` if `role !== 'admin'`.
* Metrics Section showing total counts.
* Lists all boards (with Delete option).
* Lists all users (with grant/revoke admin toggle calling Clerk backend SDK).

### Nav Bar Integration
* Replaces static "Manage Users" button.
* Renders `<SignInButton />` if not authenticated.
* Renders:
  * `<UserButton />`
  * Link to `/admin` dashboard (only visible if Clerk session includes `role: 'admin'`).
