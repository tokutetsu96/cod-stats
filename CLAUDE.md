# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Call of Duty team stats management dashboard (Japanese UI). Tracks match results and individual player statistics across game modes (Hardpoint, S&D, Overload) with team-scoped multi-tenancy.

## Commands

- `npm run dev` — Start dev server with Turbopack
- `npm run build` — Production build
- `npm run lint` — ESLint

## Tech Stack

- **Next.js 16** (App Router, server components) + **React 19** + **TypeScript**
- **Supabase** for database (PostgreSQL) and auth (email/password)
- **Tailwind CSS v4** with oklch color system + **shadcn/ui** components
- Deployed on **Vercel**

## Architecture

### Data Flow Pattern

Server components (pages) fetch data via `getProfile()` from `src/lib/supabase/auth.ts`, which authenticates and returns the user's profile with team_id. All Supabase queries filter by `team_id` for multi-tenancy. Client components receive data as props and use `router.refresh()` after mutations.

### Supabase Client Setup

- `src/lib/supabase/server.ts` — Server-side client (uses cookies from `next/headers`)
- `src/lib/supabase/client.ts` — Browser-side client
- `src/lib/supabase/middleware.ts` — Session refresh on every request
- No API routes — components query Supabase directly, relying on RLS policies

### Component Pattern

Pages are async server components that pre-fetch all data. Interactive features (forms, CRUD) are client components (`"use client"`) receiving data as props. CRUD uses inline editing with `router.refresh()` after mutations.

### Data Model

The core hierarchy is: `series` → `games` → `game_stats`. A series groups games from a single session (scrim/tournament). Each game has a mode, map, and scores. Game stats store per-player stats with mode-specific optional fields (hill_time for HP, plants/defuses/first_bloods/first_deaths for S&D, goals for Overload).

Key tables: `teams`, `profiles`, `players`, `opponents`, `maps`, `series`, `games`, `game_stats`.

### Types

`src/lib/types.ts` defines all TypeScript interfaces. Game modes use abbreviated strings: `"hp"`, `"s&d"`, `"ol"`. Display labels use lookup objects (`modeLabel`, `typeLabel`, `resultLabel`).

### Path Aliases

`@/*` maps to `./src/*`.

## Coding Guidelines

- ソースコード修正時は `/vercel-react-best-practices` スキルを参照し、パフォーマンスやベストプラクティスに沿ったコードを書くこと。
