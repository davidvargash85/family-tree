# Family Tree Web App

A full-stack web app for creating, visualizing, and sharing family trees with role-based access (viewer/editor), member management, relationships, and photo uploads.

## Stack

- **Frontend**: React 18, Vite, React Router, TanStack Query, React Flow, Axios
- **Backend**: Node.js, Express, Prisma, PostgreSQL, JWT, Multer (uploads)

## Setup

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- PostgreSQL (local or Docker)

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set DATABASE_URL to your PostgreSQL connection string
pnpm install
pnpm exec prisma db push   # or: pnpm exec prisma migrate dev
pnpm run dev
```

Backend runs at `http://localhost:3001` by default.

### Frontend

```bash
cd frontend
pnpm install
pnpm run dev
```

Frontend runs at `http://localhost:5173` and proxies `/api` and `/uploads` to the backend.

### Environment

- **Backend** (`.env`): `DATABASE_URL`, `JWT_SECRET`, optional `PORT`, `FRONTEND_URL`
- **Frontend**: optional `VITE_API_URL` (defaults to `/api` for proxy)

### Deploy backend to Railway (env vars required)

The backend needs **`DATABASE_URL`** at runtime. Add it in Railway:

1. Open your **project** on [railway.app](https://railway.app) → click the **service** that runs this repo (the one whose deploy logs show `family-tree-app@ start`).
2. Go to the **Variables** tab (or **Settings** → **Variables**).
3. Click **+ New variable** or **Add variable**.
4. **Name:** `DATABASE_URL` (exactly).
5. **Value:** your Supabase Postgres URL, e.g.  
   `postgresql://postgres:YOUR_PASSWORD@db.eytuoditlhtekiefvkhq.supabase.co:5432/postgres`
6. Save and trigger a **new deploy** (Redeploy or push a commit).

Also set **`JWT_SECRET`** (e.g. `openssl rand -base64 32`) and **`FRONTEND_URL`** (your frontend URL) when you deploy the frontend.

## Features

- **Auth**: Register, login (JWT)
- **Trees**: Create trees, list yours and shared ones, view by role (owner/editor/viewer)
- **Members**: Add, edit, delete members; name, birth/death dates, bio
- **Photos**: Upload/remove member photo (one per member)
- **Relationships**: Add/remove parent, child, spouse, sibling between members
- **Tree view**: List view and graph view (React Flow)
- **Timeline**: Collective feed (like a Facebook timeline) for each tree. Add publications (text and/or photo), tag members; timeline photos also appear in the tree view photo library.
- **Comments**: Comment on timeline posts; threaded replies. Anyone with tree access can comment.
- **Sharing**: Owner can invite by email with role (viewer or editor); invite link can be copied and shared; accept flow for logged-in or new users
- **Settings**: Tree settings (owner only): rename, manage invitations

## API overview

- `POST /auth/register`, `POST /auth/login`
- `GET/POST /trees`, `GET/PATCH/DELETE /trees/:id`
- `GET/POST /trees/:treeId/members`, `GET/PATCH/DELETE /trees/:treeId/members/:memberId`
- `POST /trees/:treeId/members/:memberId/photo` (multipart), `DELETE .../photo`
- `GET/POST /trees/:treeId/publications`, `GET/PATCH/DELETE /trees/:treeId/publications/:id`, `POST/DELETE .../publications/:id/tags`
- `GET/POST /trees/:treeId/publications/:publicationId/comments` (threaded: `parentId` for replies)
- `GET/POST /trees/:treeId/relationships`, `DELETE /trees/:treeId/relationships/:id`
- `POST/GET/DELETE /trees/:treeId/invitations` (owner only)
- `GET /invitations/by-token/:token`, `POST /invitations/accept`

All tree-scoped routes require auth and the appropriate role (viewer can read; editor can write members/relationships/photos; owner can manage invitations and delete tree).
