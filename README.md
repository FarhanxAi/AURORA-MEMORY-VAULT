<div align="center">

# ✨ Aurora Memory Vault

**Your Private, Encrypted, AI-Assisted Memory & Journal Preservation Vault**

[![Live Website](https://img.shields.io/badge/Live_Website-aurora--memory--vault.pages.dev-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://aurora-memory-vault.myfarhan-h.workers.dev)
[![GitHub Branch](https://img.shields.io/badge/Branch-Protected_main-success?style=for-the-badge&logo=github&logoColor=white)](https://github.com/FarhanxAi/AURORA-MEMORY-VAULT)
[![Next.js](https://img.shields.io/badge/Next.js-15.5.22-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Storage-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

<br />

### 🌐 Live Production Application
### 👉 **[https://aurora-memory-vault.myfarhan-h.workers.dev](https://aurora-memory-vault.myfarhan-h.workers.dev)**

<br />

[Live Access](#-live-website-access) • [Features](#-key-features) • [Tech Stack](#-tech-stack) • [Architecture](#-folder-structure) • [Roadmap](#-roadmap--future-plans) • [Contributing](#-contributing)

<br />

```
=======================================================================
   ✨ Preserve every life moment, image, and reflection with 
   pure client-side security, fluid glassmorphism, and instant search.
=======================================================================
```

</div>

---

## 🌐 Live Website Access

Aurora Memory Vault is deployed and accessible worldwide with zero installation required:

| Environment | Live Access URL | Status |
| :--- | :--- | :--- |
| **Live Web App** | **[https://aurora-memory-vault.myfarhan-h.workers.dev](https://aurora-memory-vault.myfarhan-h.workers.dev)** | 🟢 Online Worldwide |
| **GitHub Repository** | **[https://github.com/FarhanxAi/AURORA-MEMORY-VAULT](https://github.com/FarhanxAi/AURORA-MEMORY-VAULT)** | 🔒 Protected Branch (`main`) |

> **Note**: Click the **[Live Web App](https://aurora-memory-vault.myfarhan-h.workers.dev)** link above to access Aurora directly from any browser or mobile device. No local setup or installation is required!

---

## 🌟 Overview

**Aurora Memory Vault** is a high-performance web application designed for capturing, organizing, and reliving your most precious moments. Built on **Next.js 15 App Router**, **React 19**, and **Tailwind CSS**, Aurora combines aesthetics with security, featuring client-side persistence, dynamic memory analytics, fullscreen media viewers, and portable offline data exports.

---

## 🚀 Key Features

### 📸 1. High-Resolution Photo Memories
- **4K Image Support**: Upload and preserve original-quality photos without lossy compression.
- **Fluid Fullscreen Lightbox**: Full pinch-to-zoom (mobile), mouse wheel zoom, 2.5x double-tap magnification, fluid directional drag/pan, and smooth backdrop dismissal.
- **Smart Image Recovery**: Resilient multi-tier image recovery system ensuring zero broken image links.

### 📖 2. Journal & Reflection Studio
- **Rich Journal Logs**: Markdown formatting, emoji pickers, custom categories, mood indicators, and location tags.
- **Universal Text Reader**: Dedicated journal reading mode with reading-time estimation and typography tailored for long-form reading.

### ⏳ 3. Unified Timeline & Dynamic Gallery
- **Single Source of Truth**: Unified gallery rendering every single memory (photos, journals, present and future entries).
- **Infinite Progressive Rendering**: Batched progressive rendering (`PAGE_SIZE = 24`) capable of handling 10,000+ items at 60 FPS without memory leaks or DOM lockups.
- **Real-Time Filter Pills & Sorting**: Instant multi-criteria search (title, mood, tag, location, date) with sub-millisecond query responses.

### 📊 4. Vault Intelligence & Analytics
- **Live Activity Highlights**: Dynamic calculation of memory journeys, first recorded memory, yearly aggregates, and monthly frequency charts.
- **Real-Time Storage Quotas**: Accurate byte-level storage meter with warning indicators and storage breakdown cards.

### 📦 5. Portable Offline Vault Export
- **One-Click Universal Backup**: Generates an offline ZIP archive formatted with your full profile display name (e.g. `Farhan Husain Demon - Aurora Memory Vault.zip`).
- **Human-Readable Structure**: Includes original photos (`Images/`), plain text UTF-8 reflections (`Journals/`), individual memory info cards (`Memory Details/`), and a zero-dependency `README.txt`.
- **Atomic Deletion Engine**: Multi-tier transactional permanent cleanup covering storage buckets, database tables, and local persistence caches.

---

## 🛠️ Tech Stack

| Domain | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js 15 (App Router) | High-speed server & static generation |
| **UI Library** | React 19 | Declarative UI & reactive component state |
| **Language** | TypeScript 5 | End-to-end type safety & developer ergonomics |
| **Styling** | Tailwind CSS + Vanilla CSS | Dark theme glassmorphism & fluid animations |
| **Animations** | Framer Motion | Micro-animations, page transitions, and modals |
| **Icons** | Lucide React | Modern, lightweight icon system |
| **Database & Storage** | Supabase (PostgreSQL & Storage) | Row Level Security (RLS) & object storage |
| **Compression** | JSZip + Browser Image Compression | Client-side export bundling & optimization |
| **Deployment** | Cloudflare Pages + GitHub Actions | Automated continuous edge deployment |

---

## 📂 Folder Structure

```text
aurora/
├── app/                        # Next.js 15 App Router routes
│   ├── auth/callback/          # Supabase OAuth callback route handler
│   ├── dashboard/              # Main dashboard sub-views (insights, gallery, timeline, etc.)
│   ├── login/ & signup/        # Authentication pages
│   ├── globals.css             # Design tokens, gradients, and custom scrollbars
│   ├── layout.tsx              # Root SEO metadata, JSON-LD Schema, and OpenGraph
│   ├── robots.ts               # Automated production robots.txt engine
│   ├── sitemap.ts              # Dynamic multi-route XML sitemap generator
│   ├── manifest.ts             # Web App standalone manifest
│   └── page.tsx                # Landing page & feature showcase
├── components/                 # Reusable UI component layer
│   ├── account/                # User profile, storage quotas, and export vault modals
│   ├── dashboard/              # Memory cards, stats grid, and unified timeline gallery
│   ├── experience/             # Cinematic viewer, journal reader, and trash archive
│   ├── intelligence/           # Analytics charts, quick filters, and smart search
│   └── ui/                     # Glass inputs, buttons, lightboxes, and toast notifications
├── lib/                        # Core utilities and business logic
│   ├── export-vault.ts         # ZIP archive generation & human-readable exporter
│   ├── image-utils.ts          # Storage object URL resolver & multi-tier recovery
│   ├── journal-utils.ts        # Reading time & timestamp sorter
│   ├── storage-utils.ts        # Storage quota calculation engine
│   ├── supabase-db.ts          # Dynamic schema probe & atomic deletion transaction
│   └── types.ts                # TypeScript domain models & interfaces
├── public/                     # Static wallpapers, logos, and UI assets
├── open-next.config.ts         # OpenNext Cloudflare deployment config
├── wrangler.jsonc              # Cloudflare Workers/Pages configuration
├── tailwind.config.ts          # Color palettes, glows, and keyframe animations
└── tsconfig.json               # TypeScript compiler configuration
```

---

## ⚡ Deployment & Access

### 1. Direct Live Access (Recommended)
You can use the live production website directly:
👉 **[https://aurora-memory-vault.myfarhan-h.workers.dev](https://aurora-memory-vault.myfarhan-h.workers.dev)**

---

### 2. Optional: Local Development Setup
For local development, clone the repository and run:

```bash
# 1. Clone repository
git clone https://github.com/FarhanxAi/AURORA-MEMORY-VAULT.git
cd AURORA-MEMORY-VAULT

# 2. Install dependencies
npm install

# 3. Create .env.local with Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
NEXT_PUBLIC_SITE_URL=https://aurora-memory-vault.myfarhan-h.workers.dev

# 4. Start local development server
npm run dev

# 5. Open http://localhost:3000 (only while the terminal command above is running)
```

---

## 🗺️ Roadmap & Future Plans

- [x] **Universal Timeline Gallery**: Scalable infinite scroll for 10,000+ memories.
- [x] **Zero-Dependency Portable Export**: Complete offline ZIP backup generator.
- [x] **Atomic Deletion Engine**: Transactional cleanup across database and cloud storage.
- [x] **Phase 1 Technical SEO**: Dynamic XML sitemap, robots.txt, and Schema.org JSON-LD.
- [x] **Protected Branch Security**: Deletion & force-push protection on `main`.
- [ ] **AI Vector Semantic Search**: Natural language memory retrieval using OpenAI / Gemini embeddings.
- [ ] **Voice Memory Transcription**: Automatic speech-to-text for audio memories with Whisper API.
- [ ] **End-to-End Client Encryption**: Zero-knowledge password-derived client-side AES-GCM encryption.
- [ ] **Mobile Native PWA**: Offline-first progressive web application with background sync.

---

## 🤝 Contributing

Contributions make the open-source community an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

## 👤 Author

**Farhan Hussain**  
- **GitHub**: [@FarhanxAi](https://github.com/FarhanxAi)  
- **Repository**: [FarhanxAi/AURORA-MEMORY-VAULT](https://github.com/FarhanxAi/AURORA-MEMORY-VAULT)  
- **Live Application**: [https://aurora-memory-vault.myfarhan-h.workers.dev](https://aurora-memory-vault.myfarhan-h.workers.dev)

---

<div align="center">
  <sub>Built with ❤️ by Farhan Hussain • Powered by Next.js 15 & Supabase</sub>
</div>
