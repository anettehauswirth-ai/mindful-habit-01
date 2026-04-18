# Mindfulness Habit Tracker 🪷

A serene, minimalist web app to log your daily meditation practice and cultivate stillness, one breath at a time.

> *"Peace is only one breath away."*

## ✨ Features

- **Daily Session Logging** — Record meditation duration, presence level, and reflections.
- **Date Selection** — Backfill sessions for any past day with an elegant calendar picker.
- **Presence Tracking** — Rate how present you felt on a 1–5 scale (Scattered → Fully here).
- **Reflections** — Capture what arose in the stillness with free-form notes.
- **History View** — Review your last 10 sessions with date, duration, presence, and notes.
- **Streak Tracking** — Stay motivated with a running streak of consecutive practice days.
- **Calendar Heatmap** — Visualize your practice consistency over time.
- **Authentication** — Secure sign-up and sign-in to keep your practice private.
- **Responsive Design** — Beautiful on mobile, tablet, and desktop.

## 🛠️ Tech Stack

- **Framework:** [TanStack Start](https://tanstack.com/start) (React 19 + Vite 7)
- **Routing:** TanStack Router (file-based)
- **Styling:** Tailwind CSS v4 with semantic design tokens
- **UI Components:** shadcn/ui + Radix primitives
- **Backend:** Lovable Cloud (auth, database, storage)
- **Language:** TypeScript (strict mode)
- **Notifications:** Sonner
- **Icons:** Lucide React

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 20+

### Installation

```bash
# Install dependencies
bun install

# Start the dev server
bun run dev
```

The app will be available at `http://localhost:5173`.

### Build

```bash
bun run build
```

## 📁 Project Structure

```
src/
├── components/        # Shared components (AppShell, Lotus, ui/)
├── hooks/             # Custom hooks (use-auth, use-sessions, use-mobile)
├── integrations/
│   └── supabase/      # Auto-generated backend client & types
├── lib/               # Utilities (sessions, utils)
├── routes/            # File-based routes
│   ├── __root.tsx     # Root layout
│   ├── index.tsx      # Log session (home)
│   ├── history.tsx    # Recent sessions
│   ├── calendar.tsx   # Calendar heatmap
│   └── auth.tsx       # Sign in / sign up
├── router.tsx         # Router configuration
└── styles.css         # Design tokens & global styles
```

## 🎨 Design Philosophy

The interface draws from the imagery of stillness — soft gold accents, a glowing lotus, and gentle bloom animations. Every element is intentional, encouraging the user to slow down rather than rush through logging. The dark, glass-like surfaces evoke the quiet of an early-morning sit.

## 🔐 Privacy

Your sessions are stored securely in your private account. No analytics, no tracking, no sharing.

## 📜 License

MIT — practice freely.

---

*Built with intention. May your practice deepen.* 🪷
