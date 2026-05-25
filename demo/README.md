# DPR Security Demo

A complete security guard management demo built with Next.js 14 App Router, TypeScript, Tailwind CSS, Prisma, PostgreSQL, JWT authentication, and polished role-based experiences for admins, guards, and clients.

## Features

- **Admin Shift Scheduler** with weekly planning grid and pay-rate assignment
- **Guard Mobile Clock-In** with GPS capture, scenario simulation, and attendance status badges
- **Real-time Alert Dashboard** using 5-second polling for live operational visibility
- **Lone Worker Safety Panel** with a 15-minute countdown and missed check-in escalation
- **Client Portal** with today-on-site visibility, weekly timesheets, and PDF export

## Demo users

- `admin@demo.com` / `demo123`
- `guard@demo.com` / `demo123`
- `client@demo.com` / `demo123`

## Getting started

1. Copy `.env.example` to `.env` and update `DATABASE_URL` and `JWT_SECRET`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Push the Prisma schema:
   ```bash
   npm run db:push
   ```
4. Seed the demo database:
   ```bash
   npm run db:seed
   ```
5. Start the app:
   ```bash
   npm run dev
   ```

## Project structure

The app follows the requested structure under `src/app`, `src/components`, `src/lib`, `src/types`, and `prisma/`. Note: Next.js 14 build compatibility requires `next.config.mjs` instead of `next.config.ts`.

## Notes

- The alert dashboard polls every 5 seconds for demo-friendly live updates.
- The guard experience includes demo scenarios so stakeholders can easily trigger on-time, late, and wrong-location outcomes.
- The lone worker timer supports a fast-forward option for faster demonstrations while still using the same safety workflow.
