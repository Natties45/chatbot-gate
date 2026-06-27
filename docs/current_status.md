# Chatbot Gate - Current Status & Architecture

This document describes the current architecture, features, and database design of the **Chatbot Gate** application. It serves as the single source of truth, replacing previous planning documents.

---

## 1. Project Overview & Tech Stack

`chatbot-gate` is a monorepo setup consisting of a Next.js web application (`apps/web`) and shared types/libraries (`packages/shared`).

- **Frontend & Backend Bridge**: Next.js 15.2 (using App Router, React 19, TypeScript)
- **Styling**: Tailwind CSS v4.0 with Custom CSS Modules (for component layout and scoped styles)
- **Database ORM**: Prisma 7.8 (configured with SQLite for development/testing)
- **Authentication**: JWT-based session store via HTTP-only cookie using the `jose` library
- **Icons**: Lucide React

---

## 2. Directory Structure

```text
chatbot-gate/
├── apps/
│   └── web/                   # Next.js web application
│       ├── prisma/            # Prisma configuration & migrations
│       └── src/
│           ├── app/           # App Router pages and API routes
│           ├── components/    # Reusable UI components
│           ├── lib/           # Mock data and helpers
│           └── middleware.ts  # Role-based route guard middleware
├── packages/
│   └── shared/                # Shared logic and TypeScript types
└── docs/                      # Documentation
```

---

## 3. Role-Based Access Control (RBAC)

The application implements three primary roles defined in `packages/shared/src/types.ts`:
- `ADMIN`: Full access to the dashboard, user accounts, system configuration, knowledge synchronization, case logs, and all chat interfaces.
- `NOC`: Access to the NOC chatbot and case logs.
- `OPERATION`: Access to the Operations chatbot and case logs.

### Navigation Paths & Middleware Guard

Authentication and authorization are enforced server-side using Next.js Middleware in [middleware.ts](file:///C:/Users/natti/OneDrive/Documents/natties45/chatbot-gate/apps/web/src/middleware.ts):

| Path | Description | Access Control (Allowed Roles) |
|---|---|---|
| `/login` | Authentication Portal | Public |
| `/noc/chat` | Chat assistant for NOC | `NOC`, `ADMIN` |
| `/operation/chat` | Analytics chat for Operations | `OPERATION`, `ADMIN` |
| `/admin/dashboard` | Main admin analytics dashboard | `ADMIN` |
| `/admin/accounts` | User account management | `ADMIN` |
| `/admin/sync` | Knowledge base synchronization | `ADMIN` |
| `/admin/cases` | History logs and case reviews | `ADMIN`, `NOC`, `OPERATION` |
| `/admin/settings` | General system configuration | `ADMIN` |

---

## 4. UI Layout & Themes

The application layout is structured using a responsive, side-navigation design pattern:
- **Global Theme Support**: Configured with `next-themes` (Dark/Light mode switcher available at the sidebar footer).
- **Navigation Sidebar**: Renders links dynamically based on the current authenticated user's role.
- **Components**: Separated into reusable building blocks (`components/ui` for controls, `components/layout` for layouts).

---

## 5. Database Schema

The SQLite schema is defined in [schema.prisma](file:///C:/Users/natti/OneDrive/Documents/natties45/chatbot-gate/apps/web/prisma/schema.prisma):

```prisma
model User {
  id           String   @id @default(uuid())
  username     String   @unique
  email        String?  @unique
  passwordHash String
  role         String   // "ADMIN", "NOC", "OPERATION"
  status       String   @default("ACTIVE")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model CaseLog {
  id         String   @id @default(uuid())
  date       DateTime @default(now())
  role       String
  category   String
  status     String   @default("CLOSED")
  closedBy   String
  confidence Float?
  summary    String
  detail     String
  createdAt  DateTime @default(now())
}

model AuditLog {
  id        String   @id @default(uuid())
  timestamp DateTime @default(now())
  userId    String
  action    String
  target    String?
  status    String   @default("SUCCESS")
  ip        String?
  userAgent String?
  detail    String?
}

model Setting {
  id        String   @id @default(uuid())
  key       String   @unique
  value     String
  updatedAt DateTime @updatedAt
}
```

---

## 6. Current Implementation Phase (MVP status)

At the current phase, database persistence and full external API/CLI hooks are simulated via mock clients to preserve quick response iterations:
- **Session Auth**: Mock credentials are validated (`admin`, `noc01`, `noc02`, `ops01`, `ops02`) using mock users defined in `src/lib/mock-db.ts`.
- **Chat Processing**: The system mimics AI response generation, ticket drafting, and notification routing with realistic latency (1.5-second processing delay).
