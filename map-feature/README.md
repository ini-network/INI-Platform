# Civic Signal — NYC Map

Standalone Next.js app: the current public Civic Signal experience — the NYC neighborhood-signals map, plus News and Community Stories — powered by a hosted API. No backend or database to run — you set two env vars and start it.

- `/map` — the signals map. All five boroughs, each shaded by its loudest signal; drill into a borough to see its neighborhoods, each with its own per-neighborhood signals across 7 types (Emerging, Community Concerns, Neighborhood Changes, Public Services, Safety & Wellbeing, Community Activity, Local Opportunities). Filter to one topic, or search an address/ZIP to jump to a block. A **self-driving guided tour auto-opens on the first visit** (replay it anytime with the `?` by the map toggle) and walks across the map, News, and Stories. The map also toggles to a **311 Reports** lens (the city's official view). Full phone and tablet support — on phones the reading panel is a draggable bottom sheet.
- `/map/[borough]` — the borough deep-dive (ranked neighborhood list + severity map + filters).
- `/news`, `/news/[id]` — local news feed + in-app article reader.
- `/reports` — Community Stories: vetted resident posts and the comments under them, with an in-site post reader.
- `/` — redirects to `/map`.

## Run it

Needs **Node 20+**.

```bash
npm install
cp .env.example .env.local     # then edit it (below)
npm run dev                    # http://localhost:3000
```

## `.env.local`

```ini
CIVIC_SIGNAL_API_BASE_URL=https://vngle-api-zimvnfxh7q-uc.a.run.app
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token_here
```

| Variable | Required | Notes |
|---|---|---|
| `CIVIC_SIGNAL_API_BASE_URL` | yes | Hosted backend URL, no trailing slash. **Server-only** — never reaches the browser. **Renamed** from `NEXT_PUBLIC_API_BASE_URL` in the older snapshot of this export; if you're upgrading in place, rename the key. |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | yes | Mapbox public `pk.` token. Powers both the basemap tiles and the address/ZIP search. Restrict it to your domain in the Mapbox dashboard. |
| `NEXT_PUBLIC_MAP_STYLE_URL` | no | Basemap override. Default: `mapbox://styles/mapbox/light-v11`. |

No backend key needed — the API is public read-only, and the app calls it **server-side** (so there's no CORS to set up and the URL never reaches the browser). Client components reach it only through this app's own same-origin `/api/*` proxy routes.

**About the API base:** the default is the **production** backend — the same host the main Vngle site reads. (Earlier snapshots of this export pointed at a different host; use the URL above.)

## Deploy

```bash
npm run build
npm start
```

Any Node host (Vercel, Netlify, Cloud Run). Set the two env vars there. Static export isn't supported — pages fetch data per request.

## Put it on your site

- **Subdomain (easiest):** deploy as-is, point `map.yoursite.org` at it, link to it. No code changes.
- **Iframe:**
  ```html
  <iframe src="https://map.yoursite.org" style="width:100%;height:800px;border:0"></iframe>
  ```

To change where the nav links go, edit the `ITEMS` array in `components/shell/nav-rail.tsx` (the phone tab bar reuses the same `ITEMS`, so the two navs stay in sync).

## Troubleshooting

| Problem | Fix |
|---|---|
| "Map needs a Mapbox token" | Set `NEXT_PUBLIC_MAPBOX_TOKEN` in `.env.local`, restart the dev server. |
| Map blank / tiles 401-403 | Add your domain to the token's URL restrictions (Mapbox dashboard). |
| Address/ZIP search returns nothing | The search uses the same Mapbox token; make sure it's set and its domain restriction allows the Geocoding API. |
| Empty data panels | Check `CIVIC_SIGNAL_API_BASE_URL`. Test: `curl https://vngle-api-zimvnfxh7q-uc.a.run.app/health` → `{"status":"ok"}` |
| Styles look off | Root layout imports `globals.css` first, then `design-system.css` and `redesign.css` (tokens must load first). |
