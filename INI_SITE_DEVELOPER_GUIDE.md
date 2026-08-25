# INI Site Developer Guide

Welcome to the INI Collaboration Network! If you're new to the team or just graduated, this guide is designed to help you hit the ground running. It expands on the `README.md` to provide more context on our tech stack, tools, and the mental models you'll need to contribute effectively.

## 🛠️ Recommended Setup & Tools

Before diving into the code, we highly recommend setting up your development environment for maximum productivity:

- **AI-Assisted IDE:** We strongly recommend using **Antigravity IDE** or other AI-assisted coding tools (like Cursor or GitHub Copilot). These tools are invaluable for understanding unfamiliar codebases, generating boilerplate, and catching errors early.
- **Node.js:** Ensure you have the latest LTS version of Node.js installed.
- **Git:** Familiarize yourself with standard Git workflows (branching, committing, pull requests).

## 🏗️ Project Architecture (Next.js App Router)

This project uses the **Next.js App Router** (React 19). If you learned React using Create React App or the older Next.js Pages router, here are a few things to keep in mind:

- **Server Components by Default:** In the `app/` directory, components are Server Components by default. They run on the server, which means you can't use React hooks like `useState` or `useEffect` in them. 
- **Client Components:** When you need interactivity (buttons, hooks, browser APIs), you must explicitly add `'use client'` at the very top of your file.
- **Routing:** Folders inside the `app/` directory define your routes (e.g., `app/about/page.tsx` maps to the `/about` URL). 
- **Components Directory:** Reusable UI pieces (buttons, modals, maps) live in the `components/` directory.

[Next.js App Router Documentation](https://nextjs.org/docs/app)

## 🎨 Styling with Tailwind CSS

We use **Tailwind CSS (v4)** for all our styling. Instead of writing custom CSS files, you'll apply utility classes directly in your JSX (e.g., `className="flex flex-col items-center bg-blue-500"`).

### Design Philosophy
Our site is designed to look premium and dynamic. We rely heavily on:
- **Glassmorphism:** Semi-transparent backgrounds with blur effects.
- **Gradients:** Avoid plain solid colors. We use complex gradients (e.g., `bg-linear-to-r`).
- **Animations:** Subtle micro-animations (like hover effects and glowing blobs) to make the site feel alive.

**Helpful Resource:** Keep the [Tailwind CSS Documentation](https://tailwindcss.com/docs) bookmarked. You'll reference it constantly to look up class names for margins, padding, colors, and flexbox/grid layouts.

## 🔗 External Services & Integrations

Our app relies on several powerful third-party services. You won't usually need to build backend infrastructure from scratch because these services handle the heavy lifting:

### 1. Vercel (Hosting & Deployment)
Vercel is the company behind Next.js, and it's where our application lives on the web.
- **What it does:** It automatically builds and deploys our code whenever we push to the `main` branch.
- **What you need to know:** All our environment variables (API keys, secrets) are securely stored in the Vercel dashboard. If you add a new third-party tool, you'll need to add its API key to Vercel for it to work in production.
- [Vercel Docs](https://vercel.com/docs)

### 2. Supabase (Backend & Authentication)
Supabase is our open-source Firebase alternative.
- **What it does:** It provides our PostgreSQL database and handles user authentication (logins, sessions).
- **What you need to know:** We interact with Supabase using their `@supabase/ssr` client. If you're building a feature that requires fetching user data or saving information, you'll be writing Supabase queries.
- [Supabase Docs](https://supabase.com/docs)

### 3. Resend (Email Communications)
- **What it does:** Handles sending automated, transactional emails (like invites or notifications) reliably.
- **What you need to know:** We use the Resend API to trigger these emails programmatically from our Next.js backend (Server Actions/Route Handlers).
- [Resend Docs](https://resend.com/docs)

### 4. Mapbox & React-Force-Graph-2D
- **What they do:** These tools power our interactive network maps and visualizations, allowing users to explore research clusters and relationships visually.
- **Gotcha:** Mapbox requires an API key (`NEXT_PUBLIC_MAPBOX_TOKEN`) to render the maps. Ensure this is set in your local `.env.local` file when working with map components.

## 💡 Common Gotchas & Tips for New Developers

1. **Environment Variables:** Never commit your `.env` or `.env.local` files to GitHub. Always use a `.env.example` file to show what variables are required without exposing real keys.
2. **Linting is your friend:** Run `npm run lint` before committing. It will catch stylistic errors and potential bugs early. If the linter complains about a Tailwind class (e.g., `bg-gradient-to-r` instead of `bg-linear-to-r`), follow its advice!
3. **Responsive Design:** Always test your components on mobile screen sizes. Tailwind makes this easy with prefixes like `md:` or `lg:` (e.g., `w-full md:w-1/2`).
4. **Don't reinvent the wheel:** Before building a complex component, check the `components/` directory to see if one already exists, or search if there's a well-supported library we can use.

Welcome to the team, and happy coding!
