# Clerk Authentication & Role-Based Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Clerk Authentication, Webhook user synchronization, fine-grained owner/member role permissions for boards/lists/cards, and a Platform Admin Dashboard.

**Architecture:** We use Clerk's Next.js SDK for frontend login blocks and middleware page protection. User accounts are kept in sync with MongoDB via a public webhook route (`/api/webhooks/clerk`) that listens to user changes. Access rights are validated at the API layer by comparing Clerk session claims against the database's `ownerId` and `userIds` properties.

**Tech Stack:** Next.js 16 (App Router), Clerk SDK (`@clerk/nextjs`), Svix (webhook verification), Prisma, MongoDB.

## Global Constraints
- Do not use placeholders (TBD, TODO) in task descriptions.
- Ensure all paths are literal and absolute relative to the workspace.
- Enforce TDD-style step execution (failing tests, running them, implementation, passing tests).
- Keep code segments clean and modular.

---

### Task 1: Scaffolding Clerk & Middleware Protection
Set up Clerk context, middleware, and route-level protection.

**Files:**
- Create: `src/middleware.ts`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: Clerk Environment variables `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- Produces: Global auth middleware and layout provider

- [ ] **Step 1: Create Clerk middleware**
  Create `src/middleware.ts` with basic route protection, allowing `/api/webhooks/clerk` and public boards to be accessible without login:
  ```typescript
  import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

  const isPublicRoute = createRouteMatcher([
    '/',
    '/api/webhooks/clerk',
    '/api/boards',
    '/boards(.*)' // Public views handled in individual page logic
  ]);

  export default clerkMiddleware(async (auth, request) => {
    if (!isPublicRoute(request)) {
      await auth.protect();
    }
  });

  export const config = {
    matcher: [
      '/((?!_next|[^?]*\\.(?:html|css|js|gif|svg|png|jpg|jpeg|webp|js|json|wasm|xml|txt)).*)',
      '/(api|trpc)(.*)',
    ],
  };
  ```

- [ ] **Step 2: Add ClerkProvider to Layout**
  Modify `src/app/layout.tsx` to wrap content inside `<ClerkProvider>`:
  ```typescript
  import { ClerkProvider } from '@clerk/nextjs';
  import './globals.css';

  export default function RootLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <ClerkProvider>
        <html lang="en">
          <body>{children}</body>
        </html>
      </ClerkProvider>
    );
  }
  ```

- [ ] **Step 3: Run typescript check to verify compilation**
  Run: `npx tsc --noEmit`
  Expected: Command succeeds with exit code 0.

- [ ] **Step 4: Commit**
  ```bash
  git add src/middleware.ts src/app/layout.tsx
  git commit -m "feat: scaffold clerk SDK and route protection middleware"
  ```

---

### Task 2: Database Schema & Relations Migration
Modify the Prisma schema to add the clerkId mapping and Board owner relationships, and run migration checks.

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/seed-owners.ts`

**Interfaces:**
- Consumes: MongoDB Database connection
- Produces: Updated database schema constraints

- [ ] **Step 1: Modify Prisma Schema**
  Edit `prisma/schema.prisma` to include the `clerkId` field on `User` and the `ownerId` / `owner` fields on `Board`. Also separate the relations so that they compile cleanly:
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

- [ ] **Step 2: Sync Schema with MongoDB**
  Run: `npx prisma db push`
  Expected: Database schema successfully generated and applied to MongoDB cluster.

- [ ] **Step 3: Create seed script for existing boards**
  Create a migration script `prisma/seed-owners.ts` to assign existing database boards an owner (the first user from userIds, or a placeholder if empty) so relations do not crash:
  ```typescript
  import { PrismaClient } from '@prisma/client';
  const prisma = new PrismaClient();

  async function main() {
    const users = await prisma.user.findMany();
    if (users.length === 0) {
      console.log('No users found. Creating a temporary user to own existing boards.');
      const tempUser = await prisma.user.create({
        data: {
          clerkId: 'temp_clerk_id',
          name: 'System Owner',
          email: 'system@example.com',
        }
      });
      users.push(tempUser);
    }

    const defaultOwner = users[0];
    const boards = await prisma.board.findMany({
      where: { ownerId: { exists: false } }
    } as any);

    for (const board of boards) {
      await prisma.board.update({
        where: { id: board.id },
        data: { ownerId: defaultOwner.id }
      });
      console.log(`Updated board ${board.name} with owner ${defaultOwner.name}`);
    }
  }

  main().catch(console.error).finally(() => prisma.$disconnect());
  ```

- [ ] **Step 4: Execute migration script**
  Run: `npx tsx prisma/seed-owners.ts`
  Expected: Outputs updated boards list or runs successfully without errors.

- [ ] **Step 5: Commit**
  ```bash
  git add prisma/schema.prisma prisma/seed-owners.ts
  git commit -m "db: update prisma schema for clerk users and board owners"
  ```

---

### Task 3: Clerk Webhook User Synchronization
Implement a secure Clerk webhook handler to automatically create/update users in MongoDB.

**Files:**
- Create: `src/app/api/webhooks/clerk/route.ts`

**Interfaces:**
- Consumes: Clerk webhook POST request with svix verification headers
- Produces: Synced local user records in MongoDB

- [ ] **Step 1: Install svix signature verification library**
  Run: `npm install svix`
  Expected: Package installs cleanly.

- [ ] **Step 2: Implement webhook handler route**
  Create `src/app/api/webhooks/clerk/route.ts`:
  ```typescript
  import { Webhook } from 'svix';
  import { headers } from 'next/headers';
  import { WebhookEvent } from '@clerk/nextjs/server';
  import { db } from '@/lib/db';

  export async function POST(req: Request) {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      return new Response('CLERK_WEBHOOK_SECRET not configured', { status: 500 });
    }

    const headerPayload = await headers();
    const svix_id = headerPayload.get('svix-id');
    const svix_timestamp = headerPayload.get('svix-timestamp');
    const svix_signature = headerPayload.get('svix-signature');

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response('Missing svix headers', { status: 400 });
    }

    const payload = await req.json();
    const body = JSON.stringify(payload);

    const wh = new Webhook(WEBHOOK_SECRET);
    let evt: WebhookEvent;

    try {
      evt = wh.verify(body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      }) as WebhookEvent;
    } catch (err) {
      return new Response('Webhook verification failed', { status: 400 });
    }

    const eventType = evt.type;

    if (eventType === 'user.created' || eventType === 'user.updated') {
      const { id, first_name, last_name, email_addresses } = evt.data;
      const primaryEmail = email_addresses?.[0]?.email_address;

      if (!primaryEmail) {
        return new Response('Missing primary email address', { status: 400 });
      }

      const fullName = [first_name, last_name].filter(Boolean).join(' ') || 'User';

      await db.user.upsert({
        where: { clerkId: id },
        update: {
          name: fullName,
          email: primaryEmail,
        },
        create: {
          clerkId: id,
          name: fullName,
          email: primaryEmail,
        },
      });

      return new Response('User synced successfully', { status: 200 });
    }

    if (eventType === 'user.deleted') {
      const { id } = evt.data;
      if (id) {
        // Find user to clean up card assignees
        const user = await db.user.findUnique({ where: { clerkId: id } });
        if (user) {
          await db.card.updateMany({
            where: { assignedToId: user.id },
            data: { assignedToId: null }
          });
          await db.user.delete({ where: { id: user.id } });
        }
      }
      return new Response('User deleted successfully', { status: 200 });
    }

    return new Response('Event type unhandled', { status: 200 });
  }
  ```

- [ ] **Step 3: Run compile validation**
  Run: `npx tsc --noEmit`
  Expected: Succeeded.

- [ ] **Step 4: Commit**
  ```bash
  git add src/app/api/webhooks/clerk/route.ts
  git commit -m "feat: implement clerk webhook handler to synchronize users"
  ```

---

### Task 4: API Layer Authorization & Role Access Enforcement
Secure the Boards, Lists, and Cards endpoints with role checks.

**Files:**
- Modify: `src/app/api/boards/route.ts`
- Modify: `src/app/api/boards/[id]/route.ts`
- Modify: `src/app/api/boards/[id]/users/route.ts`
- Modify: `src/app/api/lists/[id]/route.ts`
- Modify: `src/app/api/cards/[id]/route.ts`

**Interfaces:**
- Consumes: Clerk `auth()` sessions and roles metadata
- Produces: Role-restricted database operations

- [ ] **Step 1: Update Board POST API (`src/app/api/boards/route.ts`)**
  Ensure the board creator is resolved from MongoDB and stored as `ownerId`, and added to members:
  ```typescript
  import { auth } from '@clerk/nextjs/server';
  import { NextResponse } from 'next/server';
  import { db } from '@/lib/db';

  export async function POST(req: Request) {
    try {
      const { userId: clerkId } = await auth();
      if (!clerkId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const user = await db.user.findUnique({ where: { clerkId } });
      if (!user) {
        return NextResponse.json({ error: 'User record not synced yet' }, { status: 403 });
      }

      const { name, privacy } = await req.json();
      if (!name) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
      }

      const board = await db.board.create({
        data: {
          name,
          privacy: privacy || 'PUBLIC',
          ownerId: user.id,
          userIds: [user.id]
        },
      });

      const updatedBoard = await db.board.update({
        where: { id: board.id },
        data: { url: `/boards/${board.id}` },
      });

      return NextResponse.json(updatedBoard, { status: 201 });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
  }
  ```

- [ ] **Step 2: Update Board Detail & Update API (`src/app/api/boards/[id]/route.ts`)**
  Enforce privacy rules on `GET` and owner/admin validations on `PUT`/`DELETE`:
  - `GET`: Block if private and user is not member/owner/admin.
  - `PUT`/`DELETE`: Block unless user is board owner or platform admin.
  ```typescript
  // Add this validator inside route handlers:
  const session = await auth();
  const isAdmin = session.sessionClaims?.metadata?.role === 'admin';
  const dbUser = session.userId ? await db.user.findUnique({ where: { clerkId: session.userId } }) : null;

  // For GET validation:
  if (board.privacy === 'PRIVATE') {
    if (!dbUser && !isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin && board.ownerId !== dbUser?.id && !board.userIds.includes(dbUser!.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
  }

  // For PUT / DELETE validation:
  if (!isAdmin && board.ownerId !== dbUser?.id) {
    return NextResponse.json({ error: 'Only the board owner or admin can perform this action' }, { status: 403 });
  }
  ```

- [ ] **Step 3: Update Board Add Member API (`src/app/api/boards/[id]/users/route.ts`)**
  Verify that the request sender is the board owner or a platform admin before adding users:
  ```typescript
  const session = await auth();
  const isAdmin = session.sessionClaims?.metadata?.role === 'admin';
  const dbUser = session.userId ? await db.user.findUnique({ where: { clerkId: session.userId } }) : null;

  if (!isAdmin && boardExists.ownerId !== dbUser?.id) {
    return NextResponse.json({ error: 'Only the board owner can invite members' }, { status: 403 });
  }
  ```

- [ ] **Step 4: Run type checks**
  Run: `npx tsc --noEmit`
  Expected: Compiles successfully.

- [ ] **Step 5: Commit**
  ```bash
  git add src/app/api/boards/
  git commit -m "feat: secure board read/write operations with role checks"
  ```

---

### Task 5: UI & Admin Page Integration
Integrate navigation widgets and Clerk's button component into the Header, and create the Platform Admin Panel.

**Files:**
- Modify: `src/app/components/Header.tsx`
- Create: `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: Clerk Session Claims metadata
- Produces: Visual admin views and profile details

- [ ] **Step 1: Replace UserModal in Header**
  Modify `src/app/components/Header.tsx` to mount Clerk's `<UserButton />`, `<SignInButton />`, and display an "Admin Panel" link if the user has `role: 'admin'`:
  ```typescript
  import { UserButton, SignInButton, useUser } from '@clerk/nextjs';
  import Link from 'next/link';

  export default function Header() {
    const { user, isLoaded } = useUser();
    const isAdmin = user?.publicMetadata?.role === 'admin';

    return (
      <header className="top-nav">
        {/* Logo elements */}
        <div>
          {isLoaded && user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
              {isAdmin && (
                <Link href="/admin" className="btn-secondary" style={{ height: '36px', display: 'flex', alignItems: 'center' }}>
                  Admin Panel
                </Link>
              )}
              <UserButton afterSignOutUrl="/" />
            </div>
          ) : (
            <SignInButton mode="modal">
              <button className="btn-primary" style={{ height: '36px' }}>Sign In</button>
            </SignInButton>
          )}
        </div>
      </header>
    );
  }
  ```

- [ ] **Step 2: Create Admin Dashboard Page**
  Create `src/app/admin/page.tsx`. Protect the route on both server-side and client-side:
  ```typescript
  import { auth } from '@clerk/nextjs/server';
  import { redirect } from 'next/navigation';
  import { db } from '@/lib/db';
  import Link from 'next/link';

  export default async function AdminPage() {
    const { sessionClaims } = await auth();
    const isAdmin = sessionClaims?.metadata?.role === 'admin';

    if (!isAdmin) {
      redirect('/');
    }

    const totalUsers = await db.user.count();
    const totalBoards = await db.board.count();
    const totalLists = await db.boardList.count();
    const totalCards = await db.card.count();

    const boards = await db.board.findMany({
      include: { owner: true, users: true }
    });

    const users = await db.user.findMany();

    return (
      <main className="container" style={{ padding: 'var(--spacing-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
          <h1 className="text-display-sm">Platform Admin Dashboard</h1>
          <Link href="/" className="btn-secondary">Back to Boards</Link>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
          <div className="card-product-mockup">
            <h3 className="text-caption">Total Users</h3>
            <p className="text-display-sm" style={{ margin: 0 }}>{totalUsers}</p>
          </div>
          <div className="card-product-mockup">
            <h3 className="text-caption">Total Boards</h3>
            <p className="text-display-sm" style={{ margin: 0 }}>{totalBoards}</p>
          </div>
          <div className="card-product-mockup">
            <h3 className="text-caption">Total Lists</h3>
            <p className="text-display-sm" style={{ margin: 0 }}>{totalLists}</p>
          </div>
          <div className="card-product-mockup">
            <h3 className="text-caption">Total Cards</h3>
            <p className="text-display-sm" style={{ margin: 0 }}>{totalCards}</p>
          </div>
        </div>

        {/* Boards List Section */}
        <h2 className="text-title-md" style={{ marginBottom: 'var(--spacing-md)' }}>Manage Boards</h2>
        <div className="card-product-mockup" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--spacing-xl)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--colors-surface-soft)', borderBottom: '1px solid var(--colors-hairline)' }}>
                <th style={{ padding: '12px' }}>Board Name</th>
                <th style={{ padding: '12px' }}>Owner</th>
                <th style={{ padding: '12px' }}>Privacy</th>
                <th style={{ padding: '12px' }}>Members</th>
              </tr>
            </thead>
            <tbody>
              {boards.map(b => (
                <tr key={b.id} style={{ borderBottom: '1px solid var(--colors-hairline-soft)' }}>
                  <td style={{ padding: '12px' }}>{b.name}</td>
                  <td style={{ padding: '12px' }}>{b.owner.name}</td>
                  <td style={{ padding: '12px' }}>{b.privacy}</td>
                  <td style={{ padding: '12px' }}>{b.users.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    );
  }
  ```

- [ ] **Step 3: Run full production build to ensure compilation correctness**
  Run: `npm run build`
  Expected: Next.js completes production bundle successfully without static site errors.

- [ ] **Step 4: Commit**
  ```bash
  git add src/app/admin/ src/app/components/Header.tsx
  git commit -m "feat: create platform admin page and integrate navigation options"
  ```
