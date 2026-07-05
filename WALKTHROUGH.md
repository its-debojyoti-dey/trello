# 🎬 Walkthrough Demo Video Script & Storyboard

Use this storyboard and voiceover guide to record your demo video demonstrating all of the Clerk authentication, RBAC permissions, and Admin Dashboard features.

---

## 📋 Pre-Video Setup
1. **Deploy & Seed Database**: Ensure your database is initialized and latest code is deployed on Vercel: `https://ascendo-ai.vercel.app` (or your local environment at `http://localhost:3002`).
2. **Set Up Clerk Test Users**: Go to your Clerk Dashboard and pre-create:
   - `admin@ascendo.test` (with `{"role": "admin"}` in public metadata)
   - `viewer@ascendo.test` (a standard user without admin role)
3. **Reset State**: Delete any test boards in the database so your dashboard is clean.

---

## 📽️ Storyboard & Voiceover Timeline

### **Scene 1: Force Sign-in & Authentication Redirect (0:00 - 0:25)**
* **Visuals**: Type `https://ascendo-ai.vercel.app` in the browser address bar. Press Enter.
* **Actions**: Watch the application immediately intercept the request and redirect you to the Clerk Sign-In screen.
* **Voiceover Script**:
  > *"Hello! Today I am going to show you our updated Kanban Board application, featuring Clerk Authentication, Next.js 16 Route Protection, and a custom Admin Dashboard. Notice that when I try to access the homepage, the application immediately redirects me to the Clerk Sign-in screen. Unauthenticated guest access is blocked by default."*

---

### **Scene 2: Admin Login & Stats Overview (0:25 - 0:50)**
* **Visuals**: Enter `admin@ascendo.test` and the password to log in. You are redirected to the homepage dashboard.
* **Actions**: Click on the **"Admin Panel"** link in the header nav. Show the Admin Dashboard (`/admin`) stats cards and table.
* **Voiceover Script**:
  > *"I will log in using our admin test account. Upon logging in, we are redirected to our main workspace. As an administrator, I have access to the 'Admin Panel' in the header. Let's click it to open the Platform Admin Dashboard. Here, we can monitor total users, boards, lists, and cards across the entire platform in real-time."*

---

### **Scene 3: Admin User Pre-registration & Sync (0:50 - 1:20)**
* **Visuals**: Scroll to the **"Add Pre-registered User"** form on the right.
* **Actions**: 
  1. In the Full Name field, type `Alice`.
  2. In the Email field, type `alice@ascendo.test`.
  3. Click **"Add User"**.
  4. Point to the **"Registered Users"** list showing Alice with the status badge **"Pending Clerk Sign-in"**.
* **Voiceover Script**:
  > *"A key requirement is the ability for admins to pre-register users. I will add 'Alice' with the email 'alice@ascendo.test'. Alice immediately appears in our Registered Users list with the status 'Pending Clerk Sign-in'. When Alice signs up to Clerk with this matching email later, our webhook will automatically link her Clerk credentials to this pre-created user record."*

---

### **Scene 4: Board Management & Direct Deletions (1:20 - 1:45)**
* **Visuals**: The **"Manage Boards"** table in the Admin Panel showing the list of boards.
* **Actions**:
  1. Navigate back to the homepage and create a temporary board named `Test Board`.
  2. Go back to `/admin`, locate `Test Board` in the list, and click **"Delete"**. 
  3. Confirm the popup prompt. The board disappears instantly.
* **Voiceover Script**:
  > *"Admins also have full administrative control over boards. If I create a board, it appears here in the boards table. I can click 'Delete' to trigger a cascading deletion of the board, its lists, and all cards, keeping the database clean without manually accessing MongoDB."*

---

### **Scene 5: Interactive Boards & Role Permissive Edits (1:45 - 2:20)**
* **Visuals**: Go back to the homepage and click on an active board (e.g. `Q3 Product Launch`).
* **Actions**:
  1. Click the board title to rename it to `Q3 Release Board`.
  2. Toggle the privacy select badge from `PUBLIC` to `PRIVATE`.
  3. Add `To Do` list and a card inside it.
* **Voiceover Script**:
  > *"Let's open our 'Q3 Product Launch' board. Because I am logged in as an administrator, I have full write access. I can rename the board inline, toggle its privacy settings between Public and Private, add new lists, drag cards, and assign members."*

---

### **Scene 6: Public Board View-Only Mode for Non-Members (2:20 - 3:00)**
* **Visuals**: Click user avatar, click **"Sign Out"**. Sign back in as `viewer@ascendo.test` (a standard user).
* **Actions**:
  1. Open the board page of the public board `Q3 Release Board`.
  2. Hover your cursor over the board name title and list headers to show they are no longer clickable.
  3. Point to the missing **"+ Add Member"** select, **"Add Card"** buttons, and **"Add List"** forms.
  4. Drag a card to show that dragging is disabled. Click on a card to show the card modal where inputs are disabled and the "Save Changes" button is replaced by a "Close" button.
* **Voiceover Script**:
  > *"Finally, let's look at standard permissions. I will sign out and log back in as 'viewer@ascendo.test', who is not a member of the Q3 board. Because the board is public, I can open it and see all its lists and cards. However, notice that I cannot edit anything. The add list/card forms are hidden, inline renames are disabled, card dragging is blocked, and the card details modal is view-only. This completes our demo of secure, role-based Kanban interactions. Thank you!"*
