# INI Collaboration Network

Welcome to the INI (Institute for Nonpartisan Innovation) Collaboration Network. This platform is designed to power civic innovation across New York City by unsiloing collaboration across 25 CUNY campuses and 5 boroughs. It helps faculty, students, and community partners discover expertise, build cross-campus partnerships, and turn research into real-world civic impact.

## What is this project?

The INI Collaboration Network is a modern web application built to serve as a shared collaboration layer. Its core features include:
- **Expert Directory:** A searchable database of faculty, researchers, staff, and civic collaborators.
- **Interactive Network Map:** Visualizes relationships, research clusters, and collaboration opportunities in real-time.
- **AI Collaboration Copilot:** Provides contextual guidance on researchers and collaboration pathways.

The platform is co-powered by CUNY campuses and Vngle: The Civic Insights Company.

## Tech Stack & Code Maintenance

This project is built using:
- **Framework:** [Next.js](https://nextjs.org/) (App Router) with React 19.
- **Styling:** Tailwind CSS (v4) with premium aesthetic touches (glassmorphism, glowing blobs, smooth gradients).
- **Mapping & Visualization:** `mapbox-gl` and `react-force-graph-2d`.
- **Database & Auth:** Supabase.
- **Email/Communications:** Resend.
- **AI Capabilities:** `@google/genai`.

### Maintaining the Code
- **Local Development:** Run `npm run dev` to start the local development server at `http://localhost:3000`.
- **Component Architecture:** The `app/` directory handles routing, pages, and API endpoints. Reusable UI components (like Modals, Navbars, Maps) are stored in the `components/` directory.
- **Linting:** Use `npm run lint` before committing to ensure the codebase follows standard Next.js and ESLint conventions.
- **UI Updates:** When adding new UI components, strictly follow the established dynamic and premium design system. Avoid plain colors; instead, utilize the curated gradients and tailwind utility classes defined throughout the app.

## External Deployment & Services

The architecture relies on several external services that must be properly configured with environment variables in production:

1. **Vercel (Hosting & Deployment):** 
   - The application is optimized for deployment on Vercel. Continuous integration is typically set up to deploy the `main` branch automatically. 
   - Ensure all environment variables (Supabase, Resend, Mapbox, Gemini AI) are added to the Vercel project settings.

2. **Supabase (Backend as a Service):** 
   - Handles user authentication (via `@supabase/ssr` and `@supabase/auth-ui-react`) and PostgreSQL database management. 
   - When deploying, ensure the Supabase project is active, database migrations are applied (see `db_migration.py`), and Auth redirect URLs are configured to point to the production Vercel domain.

3. **Resend (Email Communications):** 
   - Used for sending transactional emails (like invites or notifications).
   - Ensure the Resend API key is provided and that your sending domain is verified in the Resend dashboard to prevent emails from going to spam.

## Possible Next Steps for Development

To further scale and improve the INI Collaboration Network, consider the following development tracks:

1. **Expanded Collaboration Hub:**
   - Introduce dedicated workspaces for cross-campus teams to manage active civic/research opportunities.
   - Implement real-time chat or forum threads integrated with the AI Copilot to facilitate communication.

2. **Advanced Network Visualization:**
   - Enhance the `react-force-graph-2d` implementation to support dynamic filtering (e.g., by borough or research topic).
   - Add richer data layers to the `mapbox-gl` map to visualize the localized community impact of specific projects.

3. **Analytics and Reporting:**
   - Build an admin dashboard to track user engagement, identify the most active research clusters, and measure the growth of cross-campus connections over time.

4. **Performance & SEO Optimization:**
   - Implement advanced caching strategies for the directory searches and map data fetching.
   - Improve dynamic metadata generation for public profiles to enhance SEO and shareability on platforms like LinkedIn.
