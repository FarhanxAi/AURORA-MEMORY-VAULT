# Aurora — Digital Memory Vault Project Architecture & Integration Manifest

This project architecture connects all current modules (Landing Page, Authentication, Dashboard, Memory Engine, Supabase Database & Storage RLS) and is structured for future feature extensions (Prompt 03 Timeline + Gallery + Memory Viewer).

---

## 🗂️ Project Directory Structure

```
aurora/
├── app/
│   ├── auth/
│   │   ├── callback/
│   │   │   └── route.ts          # OAuth & PKCE session exchange handler
│   │   └── confirm/
│   │       └── route.ts          # Email verification handler
│   ├── dashboard/
│   │   └── page.tsx              # Authenticated Dashboard view & state coordinator
│   ├── forgot-password/
│   │   └── page.tsx              # Password recovery request form
│   ├── login/
│   │   └── page.tsx              # Email/Password & Google OAuth sign in
│   ├── reset-password/
│   │   └── page.tsx              # New password update form
│   ├── signup/
│   │   └── page.tsx              # Account creation with Strong Password Meter
│   ├── globals.css               # Apple Vision Pro liquid glass design system
│   ├── layout.tsx                # Root layout, fonts, SEO & Toast provider
│   └── page.tsx                  # Public Landing Page
├── components/
│   ├── dashboard/
│   │   ├── audio-recorder.tsx    # Live voice recorder with MediaRecorder & waveform
│   │   ├── create-memory-modal.tsx # Create Memory modal with file upload system
│   │   ├── dashboard-navbar.tsx   # Top navigation, search, quick add, notifications, profile
│   │   ├── memory-card.tsx       # Liquid glass memory card with favorite toggle
│   │   ├── memory-detail-modal.tsx # Memory detail viewer, media player & delete trigger
│   │   ├── memory-feed.tsx       # Category filters, search filter, sort order & empty state
│   │   ├── stats-grid.tsx        # Dynamic metric counts from Supabase
│   │   └── welcome-header.tsx    # Local time-aware greeting & date/time clock
│   ├── ui/
│   │   ├── aurora-background.tsx # Dual aurora mesh, mouse glow spotlight & particles canvas
│   │   ├── glass-button.tsx      # Specular glass button with ripple click effect
│   │   ├── glass-card.tsx        # Liquid glass container with glare reflection
│   │   ├── glass-input.tsx       # Vision Pro glass form text field
│   │   ├── password-strength.tsx # Strong password meter component
│   │   └── toast.tsx             # Glass toast notification banners
│   ├── about-section.tsx         # Philosophy & About section
│   ├── features.tsx              # 6 Core Feature Cards
│   ├── footer.tsx                # Specular glass footer
│   ├── hero.tsx                  # Main hero section with CTA buttons
│   ├── navbar.tsx                # Public floating glass navbar
│   └── security-section.tsx      # Security breakdown section
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase SSR client
│   │   ├── middleware.ts         # Middleware session updater & route protection
│   │   └── server.ts             # Server Component / Action Supabase client
│   ├── toast-context.tsx         # Global toast notification context
│   ├── types.ts                  # TypeScript interfaces (Memory, UserProfile, Notification)
│   └── utils.ts                  # Utility functions (cn tailwind-merge)
├── supabase/
│   └── schema.sql                # Complete database schema, triggers, buckets & RLS policies
├── middleware.ts                 # Next.js App Router middleware entry
├── next.config.ts                # Next.js configuration & image domains
├── tailwind.config.ts            # Vision Pro liquid glass design tokens
└── package.json                  # Dependencies & scripts
```

---

## 🔗 Integrated Data & Navigation Flow

1. **Unauthenticated User Flow**:
   - Visitor lands on `/` (Landing Page).
   - Clicking **"Sign In"** navigates to `/login`.
   - Clicking **"Create Account"** or **"Get Started"** navigates to `/signup`.
   - Visiting `/dashboard` directly -> Next.js `middleware.ts` intercepts request and redirects to `/login?redirectTo=/dashboard`.

2. **Authentication & Session Restore**:
   - Submitting email/password or Google OAuth authenticates session via `@supabase/ssr`.
   - On login/signup success -> user is redirected to `/dashboard`.
   - Visiting `/login` or `/signup` while logged in -> Next.js `middleware.ts` redirects user to `/dashboard`.

3. **Dashboard Real-Time Memory Cycle**:
   - `/dashboard` fetches current user session and queries Supabase `memories` table ordered by date.
   - Clicking **"Add Memory"** or Quick Action buttons (**Upload Photos**, **Upload Video**, **Record Voice**, **Create Journal**) opens `CreateMemoryModal`.
   - Submitting a new memory:
     - Uploads images to `memory-images` bucket.
     - Uploads videos to `memory-videos` bucket.
     - Uploads recorded voice audio to `memory-audio` bucket.
     - Inserts memory row into `memories` table with `user_id = auth.uid()`.
     - Appends new memory to `memories` state array.
     - Updates `StatsGrid` counts dynamically.
     - Logs a notification event in `DashboardNavbar` bell dropdown.
     - Shows glass toast banner.
   - Toggling **Favorite** heart updates `favorite` boolean in Supabase DB and updates stats.
   - Searching or clicking **Category Filters** (Photos, Videos, Voice, Journal, Favorites) filters feed in real-time.

---

## 🛡️ Database & Storage RLS Protection

- **`profiles` table**: Users can only `SELECT`, `INSERT`, `UPDATE` row where `id = auth.uid()`.
- **`memories` table**: Users can only `SELECT`, `INSERT`, `UPDATE`, `DELETE` rows where `user_id = auth.uid()`.
- **Storage Buckets** (`memory-images`, `memory-videos`, `memory-audio`, `memories`): Users can only read/write files in their own folder `(storage.foldername(name))[1] = auth.uid()::text`.

---

## 🚀 Extension Points for Future Updates (Prompt 03+)

- **Timeline View**: Consume `memories` array sorted chronologically with date grouping.
- **Advanced Memory Viewer / Gallery**: Render high-res zoomable photos, video player, audio spectrum visualizer.
- **AI Memory Search / Embeddings**: Add vector embedding column to `memories` table for semantic memory search.
