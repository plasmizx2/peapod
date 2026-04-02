# PeaPod — Target Folder Structure (Deliverable 3)

This is the **target** layout for the Next.js app (aligned with the product spec). Some paths appear as the codebase grows through phases.

```text
PeaPod/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── APPLE_MUSIC.md
│   ├── PHASED_CHECKLIST.md
│   └── PROJECT_STRUCTURE.md
├── public/
├── src/
│   ├── app/
│   │   ├── (marketing)/           # landing, features, waitlist
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── (auth)/                # sign-in, sign-up, callback routes
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── spotify/       # OAuth start + callback
│   │   ├── auth/
│   │   │   └── callback/          # Supabase auth exchange if needed
│   │   ├── dashboard/             # authenticated shell
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── accounts/          # linked providers
│   │   │   └── settings/
│   │   ├── chatbot/               # Phase 5+
│   │   ├── sessions/              # group / party
│   │   ├── layout.tsx
│   │   ├── page.tsx               # root redirect or marketing
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                    # shadcn primitives
│   │   ├── dashboard/
│   │   ├── chatbot/
│   │   ├── sessions/
│   │   └── playlists/
│   ├── lib/
│   │   ├── supabase/              # browser + server clients, middleware helpers
│   │   ├── providers/
│   │   │   ├── types.ts           # MusicProvider interface
│   │   │   ├── spotify/
│   │   │   └── apple-music/
│   │   ├── recommendation/        # solo / group / party scorers (phased)
│   │   ├── sessions/
│   │   ├── chatbot/
│   │   ├── analytics/
│   │   └── utils/
│   └── types/
│       ├── database.ts            # generated or hand-maintained Supabase types
│       ├── providers.ts
│       ├── playlists.ts
│       └── sessions.ts
├── supabase/
│   ├── migrations/
│   └── seed/                      # optional local seed data
├── middleware.ts                  # Supabase session refresh
├── package.json
├── next.config.ts
├── tsconfig.json
└── README.md
```

**Notes**

- **`(marketing)`** and **`(auth)`** use route groups for layouts without affecting URLs (adjust segment names to taste).
- **`lib/providers/*`** is the only place Spotify/Apple SDK details should live; UI and API call **abstract** methods.
- **`types/database.ts`** can be replaced by `supabase gen types typescript` when the project is linked to a remote Supabase project.
