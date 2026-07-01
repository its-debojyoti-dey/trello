# Ascendo AI Kanban Board

A modern, high-performance, and feature-rich Kanban Board application built with Next.js (App Router), React 19, Tailwind CSS, Prisma, and MongoDB.

## Features

### 📋 Board Management
- Create, rename, view, and delete Kanban boards.
- Configure board privacy settings (`PUBLIC` or `PRIVATE`).
- Add multiple users as board members.

### 🗂️ List Management
- Create, rename, and delete lists inside any board.
- Deleting a list triggers a database cascade delete of all cards inside it.

### 🎴 Card Management & Constraints
- Create cards with name and description inside a list.
- **Assignee Membership Check**: Only users who are registered members of the board can be assigned to a card.
- **Card Move Constraint**: Cards can be moved across lists, but only within the *same* parent board. Cross-board moves are strictly blocked at the API layer.
- **Unassign Support**: Re-assign cards to another board member or unassign them by setting `assignedToId` to `null`.
- **Cascade Deletes**: Deleting a board cascade-deletes all nested lists and cards at the database level.

### 👤 User Management
- Create users and retrieve the list of users.
- Custom success response status code `210` on successful user creation.

---

## Tech Stack

- **Framework**: Next.js 16.2.9 (App Router)
- **Library**: React 19.2.4
- **Styling**: Tailwind CSS
- **Database**: MongoDB
- **ORM**: Prisma ORM 6.4.0

---

## Getting Started

### Prerequisites
- Node.js (version 18.x or above)
- MongoDB Database (Local instance or MongoDB Atlas cluster)

### Environment Setup

Create a `.env` file in the root directory (you can copy `.env.example` as a template):

```bash
DATABASE_URL="mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/trello-clone?retryWrites=true&w=majority"
```

### Installation

1. Clone the repository and navigate to the project directory.
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Push the database schema to MongoDB and generate the Prisma Client:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

### Running the Project

#### Development Server
Start the local server for development:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

#### Production Build
Compile the application for production:
```bash
npm run build
```
Run the compiled production server:
```bash
npm run start
```

---

## API Specification

### 1. Users API

| Method | Endpoint | Request Body | Success Status | Description |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/users` | None | `200 OK` | Retrieves all registered users. |
| **POST** | `/api/users` | `{ name: string, email: string }` | `210 Created` | Creates a new user. |

### 2. Boards API

| Method | Endpoint | Request Body | Success Status | Description |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/boards` | None | `200 OK` | Retrieves all boards. |
| **POST** | `/api/boards` | `{ name: string, privacy?: string }` | `201 Created` | Creates a board. `privacy` defaults to `PUBLIC`. |
| **GET** | `/api/boards/:id` | None | `200 OK` | Retrieves a board including its members, lists, and cards (with assignees). |
| **PUT** | `/api/boards/:id` | `{ name?: string, privacy?: string }` | `200 OK` | Updates a board's name or privacy. |
| **DELETE** | `/api/boards/:id` | None | `200 OK` | Deletes a board, cascading deletion to all nested lists and cards. |
| **POST** | `/api/boards/:id/users` | `{ userId: string }` | `200 OK` | Adds a user as a member of the board. |

### 3. Lists API

| Method | Endpoint | Request Body | Success Status | Description |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/lists` | `{ name: string, boardId: string }` | `201 Created` | Creates a new board list. |
| **GET** | `/api/lists/:id` | None | `200 OK` | Retrieves list details and its cards. |
| **PUT** | `/api/lists/:id` | `{ name: string }` | `200 OK` | Updates list name. |
| **DELETE** | `/api/lists/:id` | None | `200 OK` | Deletes a list and cascade-deletes all cards inside it. |

### 4. Cards API

| Method | Endpoint | Request Body | Success Status | Description |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/cards` | `{ name: string, description?: string, listId: string }` | `201 Created` | Creates a card. |
| **GET** | `/api/cards/:id` | None | `200 OK` | Retrieves card details with assignee information. |
| **PUT** | `/api/cards/:id` | `{ name?: string, description?: string, listId?: string, assignedToId?: string \| null }` | `200 OK` | Updates a card. Validates that `listId` belongs to the same board and `assignedToId` belongs to a board member. |
| **DELETE** | `/api/cards/:id` | None | `200 OK` | Deletes a card. |

---

## API Testing with Postman

A comprehensive Postman Collection is provided in the project root: **[POSTMAN_COLLECTION.json](file:///D:/Debojyoti/Interview%20Tasks/Ascendo%20AI/POSTMAN_COLLECTION.json)**.

### Testing Instructions:
1. Import `POSTMAN_COLLECTION.json` into Postman.
2. The collection uses an environment variable `baseUrl` (defaulting to `http://localhost:3000`).
3. Running the collection end-to-end verifies:
   - Successful creation of users and boards.
   - Adding members to boards.
   - Successful card creation.
   - **Boundary Error Validation**: Attempting to assign a card to a user who is not a board member (returns status `400`).
   - **Cross-Board Move Error Validation**: Attempting to move a card to a list belonging to a different board (returns status `400`).
   - Successful card assignments and intra-board movement.
   - **Cascade Deletes**: Deleting a board and verifying that all its lists and cards are automatically deleted from the database.
